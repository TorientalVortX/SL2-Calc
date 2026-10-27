import { readFileSync } from 'node:fs'
import { expect, test, type Locator, type Page } from '@playwright/test'

const showcase = JSON.parse(readFileSync('scripts/social-preview-build.json', 'utf8'))
const dynaxis = showcase.build.equipment.primaryWeapon

type Build = typeof showcase.build
const holding = (name: string) => ({ ...dynaxis, selectedWeaponName: name })

function withBuild(change: (build: Build) => Build): string {
  return JSON.stringify({ ...showcase, build: change(structuredClone(showcase.build)) })
}

function collectErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  return errors
}

async function openDamage(page: Page, draft: string, side: 'incoming' | 'outgoing') {
  await page.addInitScript(value => localStorage.setItem('sl2:aether:draft:v1', value), draft)
  await page.goto('/')
  await page.getByRole('button', { name: 'Simulate' }).click()
  if (side === 'outgoing') await page.getByRole('button', { name: 'outgoing' }).click()
  return page.getByRole('dialog', { name: side === 'outgoing' ? /Outgoing damage/ : /Incoming damage/ })
}

const figure = async (card: Locator, label: string) =>
  Number(await card.locator('.figure', { hasText: label }).locator('.figure__value').textContent())

const perHit = async (card: Locator) =>
  Number((await card.getByText(/per hit before defenses/).textContent())!.match(/[\d.]+/)![0])

test.describe('damage tabs', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } })

  test('adds the weapon’s on-hit damage to a basic attack as its own hit', async ({ page }) => {
    const errors = collectErrors(page)
    const card = await openDamage(page, withBuild(build => ({
      ...build,
      skillRanks: { ...build.skillRanks, main: { ...build.skillRanks.main, explosion: 1 } },
      equipment: { ...build.equipment, primaryWeapon: holding('Icebreaker') },
    })), 'outgoing')

    const rider = card.locator('.provenance__row', { hasText: 'magic Ice, ignores armor' })
    await expect(rider).toContainText('Icebreaker')
    const riderAmount = Number(await rider.locator('span').last().textContent())
    expect(riderAmount).toBeGreaterThan(0)
    // Against an open target, the attack lands whole and the rider adds its amount untouched.
    expect(await figure(card, 'Dealt')).toBe(Math.floor(await perHit(card)) + riderAmount)

    // A spell isn't a basic attack, so it doesn't carry the rider.
    await card.getByRole('combobox', { name: 'Attack' }).selectOption('explosion')
    await expect(rider).toHaveCount(0)
    expect(await figure(card, 'Dealt')).toBe(Math.floor(await perHit(card)))
    expect(errors).toEqual([])
  })

  test('applies weapon bonuses against the chosen race', async ({ page }) => {
    const card = await openDamage(page, withBuild(build => ({ ...build, equipment: { ...build.equipment, primaryWeapon: holding('Mythslayer') } })), 'outgoing')
    const before = await perHit(card)
    await card.getByRole('combobox', { name: 'Race' }).selectOption('Youkai')
    await expect(card.getByText(/Mythslayer \+25% damage vs Youkai/)).toBeVisible()
    expect(await perHit(card)).toBeCloseTo(before * 1.25, 0)
    await card.getByRole('combobox', { name: 'Race' }).selectOption('')
    expect(await perHit(card)).toBeCloseTo(before, 1)
  })

  test('raises Scaled Weapon ATK against the matching torso', async ({ page }) => {
    const card = await openDamage(page, withBuild(build => ({ ...build, equipment: { ...build.equipment, primaryWeapon: holding('Knight Slayer') } })), 'outgoing')
    const before = await perHit(card)
    await card.getByRole('combobox', { name: 'Torso' }).selectOption('Light')
    expect(await perHit(card)).toBeCloseTo(before, 1)
    await card.getByRole('combobox', { name: 'Torso' }).selectOption('Heavy')
    await expect(card.getByText(/Knight Slayer \+20% Scaled Weapon ATK vs Heavy/)).toBeVisible()
    expect(await perHit(card)).toBeCloseTo(before * 1.2, 0)
  })

  test('applies a UL bonus against bosses only', async ({ page }) => {
    const card = await openDamage(page, withBuild(build => ({ ...build, equipment: { ...build.equipment, primaryWeapon: holding('Kingslayer') } })), 'outgoing')
    const before = await perHit(card)
    await card.getByRole('switch', { name: 'Boss' }).click()
    // The copied upgrade points total 10 UL, so +10%.
    await expect(card.getByText(/Kingslayer \+10% damage vs Boss/)).toBeVisible()
    expect(await perHit(card)).toBeCloseTo(before * 1.1, 0)
  })

  test('adds flat crit damage to a critical basic attack', async ({ page }) => {
    const card = await openDamage(page, withBuild(build => ({ ...build, equipment: { ...build.equipment, primaryWeapon: holding('Guillotine') } })), 'outgoing')
    await expect(card.getByRole('spinbutton', { name: 'Crit flat damage' })).toHaveValue('10')
    const critPercent = Number(await card.getByRole('spinbutton', { name: 'Crit damage %' }).inputValue())
    const hit = await perHit(card)
    await card.getByRole('checkbox', { name: 'Crit' }).check()
    expect(await figure(card, 'Dealt')).toBe(Math.floor(hit * critPercent / 100 + 10))
  })

  test('applies item spell Power to spells of its school', async ({ page }) => {
    const card = await openDamage(page, withBuild(build => ({
      ...build,
      skillRanks: { ...build.skillRanks, main: { ...build.skillRanks.main, explosion: 1 } },
      equipment: {
        ...build.equipment,
        primaryWeapon: holding('Burngada'),
        accessory1: { itemName: 'Phoenix Fire Lantern', upgradePoints: { fortune: 0, greed: 0 } },
      },
    })), 'outgoing')
    await card.getByRole('combobox', { name: 'Attack' }).selectOption('explosion')
    await expect(card.locator('.provenance__row', { hasText: 'Nerifian spell Power' })).toContainText('2')
    await expect(card.getByText('From your items: +10% Power to Nerifian spells.')).toBeVisible()
  })

  test('fights unarmed with an empty main hand, and offers the Unstable Tendril beside a weapon', async ({ page }) => {
    const bare = await openDamage(page, withBuild(build => {
      const { primaryWeapon: _held, ...equipment } = build.equipment
      return { ...build, equipment }
    }), 'outgoing')
    await expect(bare.locator('.provenance__row', { hasText: 'Scaled Weapon ATK' })).not.toContainText('Equip')
    expect(await figure(bare, 'Dealt')).toBeGreaterThan(0)

    const tendril = withBuild(build => ({
      ...build,
      mixturePlan: ['Tendril Tonic'],
      activeMixtureEffects: [JSON.stringify(['Tendril Tonic', 'Tendril Tonic'])],
    }))
    const card = await openDamage(page, tendril, 'outgoing')
    const skill = await card.getByRole('combobox', { name: 'Attack' }).locator('option').nth(1).getAttribute('value')
    await card.getByRole('combobox', { name: 'Attack' }).selectOption(skill!)
    await expect(card.getByRole('combobox', { name: 'Hand' }).locator('option', { hasText: 'Unarmed · Unstable Tendril' })).toHaveCount(1)
  })

  test('cuts damage from the attacker’s race with worn gear', async ({ page }) => {
    const card = await openDamage(page, withBuild(build => ({
      ...build,
      equipment: { ...build.equipment, hands: { itemName: 'Beastfoe Shield Plus', upgradePoints: { hit: 0, fp: 0 } } },
    })), 'incoming')
    const damage = card.getByRole('spinbutton', { name: 'Damage per hit' })
    await damage.fill('400')
    const before = await figure(card, 'Taken')
    await card.getByRole('combobox', { name: 'Attacker race' }).selectOption('Beast')
    await expect(card.getByText('From your gear: Beastfoe Shield Plus vs Beast −15%.')).toBeVisible()
    await expect(card.getByText('Beastfoe Shield Plus vs Beast').last()).toBeVisible()
    expect(await figure(card, 'Taken')).toBeLessThan(before)
  })
})
