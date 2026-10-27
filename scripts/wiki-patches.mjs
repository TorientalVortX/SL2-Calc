// Game changes the wiki hasn't caught up with, kept out of the scraped dump so a re-scrape can't undo them.
// Each patch records the wiki's lines when it was written: if the wiki now matches the patch it is
// stale, and if the wiki changed to something else it needs a look.
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const PATCHES = path.resolve('wiki-data/patches.json');

export async function patchedEquipment(items) {
  const patches = JSON.parse(await readFile(PATCHES, 'utf8'));
  const byName = new Map(patches.map((patch) => [patch.item, patch]));
  const seen = new Set();
  const patched = items.map((item) => {
    const patch = byName.get(item.name);
    if (!patch) return item;
    seen.add(patch.item);
    const effects = item.details?.effects ?? [];
    const same = (lines) => JSON.stringify(lines) === JSON.stringify(effects);
    if (same(patch.patched)) {
      console.warn(`  ! patch for ${patch.item} is stale: the wiki now says the same, remove it from wiki-data/patches.json`);
      return item;
    }
    if (!same(patch.wiki)) {
      console.warn(`  ! wiki changed ${patch.item} since its ${patch.date} patch; check the patch still holds`);
    }
    return { ...item, details: { ...item.details, effects: patch.patched } };
  });
  for (const patch of patches) {
    if (!seen.has(patch.item) && items.some((item) => item.kind === patch.kind)) console.warn(`  ! patch for ${patch.item} matches no wiki item`);
  }
  return patched;
}
