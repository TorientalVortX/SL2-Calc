import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

/*
 * Truncation here is not just lost prose: the citation whitelist is derived
 * from the delivered `## file.md` headings, so a file that falls past this cap
 * silently becomes uncitable and the corpus's own source register is the last
 * thing alphabetically. Keep comfortable headroom over the corpus (~69k chars
 * since the generated status catalog landed) rather than sizing to fit.
 */
export const MAX_PERSONAL_NOTES_CHARACTERS = 120_000;

async function collectMarkdown(current: string, relative = ''): Promise<string[]> {
  const entries = (await readdir(current, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
  const files: string[] = [];
  for (const entry of entries) {
    const relativeName = path.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...await collectMarkdown(path.join(current, entry.name), relativeName));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')
      && !entry.name.startsWith('_') && !entry.name.startsWith('test-server-learning-')) files.push(relativeName);
  }
  return files;
}

export async function readPersonalNotes(root: string): Promise<string> {
  const directory = path.join(root, 'optimizer-knowledge');
  try {
    const names = await collectMarkdown(directory);
    const notes = await Promise.all(names.map(async name => `## ${name.replaceAll('\\', '/')}\n${await readFile(path.join(directory, name), 'utf8')}`));
    return notes.join('\n\n').slice(0, MAX_PERSONAL_NOTES_CHARACTERS);
  } catch {
    return '';
  }
}
