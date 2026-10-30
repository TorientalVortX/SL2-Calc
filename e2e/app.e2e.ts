import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

const showcase = readFileSync('scripts/social-preview-build.json', 'utf8')
const showcaseName = (JSON.parse(showcase) as { buildName: string }).buildName

function collectErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  return errors
}

async function loadShowcase(page: Page) {
  await page.addInitScript(draft => {
    if (!localStorage.getItem('sl2:aether:draft:v1')) localStorage.setItem('sl2:aether:draft:v1', draft)
  }, showcase)
}

test('plays the intro and opens the sheet without errors', async ({ page }) => {
  const errors = collectErrors(page)
  const scene = page.waitForResponse(response => /\/assets\/scene-.*\.js$/.test(response.url()))
  await page.goto('/')
  await scene
  await expect(page.locator('canvas').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Templates' })).toBeVisible({ timeout: 30_000 })
  expect(errors).toEqual([])
})

test.describe('with reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } })

  test('loads skill text on demand', async ({ page }) => {
    const errors = collectErrors(page)
    await loadShowcase(page)
    await page.goto('/')
    await page.locator('.tabs .tab', { hasText: /skills/i }).click()
    const text = page.waitForResponse(response => /\/assets\/skills-text-.*\.js$/.test(response.url()))
    await page.getByRole('button', { name: /^Read .* details$/ }).first().click()
    await text
    await expect(page.getByText('Loading skill description')).toHaveCount(0)
    expect(errors).toEqual([])
  })

  test('copies a build card image to the clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await loadShowcase(page)
    await page.goto('/')
    await page.getByRole('button', { name: 'Import / Export' }).click()
    await page.getByRole('button', { name: 'Copy card' }).click()
    await expect(page.getByText('Build card copied.')).toBeVisible()
    const type = await page.evaluate(async () => (await navigator.clipboard.read())[0].types[0])
    expect(type).toBe('image/png')
  })

  test('works offline once the service worker has cached it', async ({ page, context }) => {
    await loadShowcase(page)
    await page.goto('/')
    await page.evaluate(() => navigator.serviceWorker.ready)
    await page.reload()
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)

    await context.setOffline(true)
    await page.reload()
    await expect(page.getByRole('textbox', { name: 'Build name' })).toHaveValue(showcaseName)
  })
})
