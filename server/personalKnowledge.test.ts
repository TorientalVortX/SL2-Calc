import { describe, expect, it } from 'vitest';
import { MAX_PERSONAL_NOTES_CHARACTERS, readPersonalNotes } from './personalKnowledge';

describe('personal optimizer knowledge', () => {
  it('loads categorized notes recursively and excludes underscore-prefixed templates', async () => {
    const notes = await readPersonalNotes(process.cwd());
    expect(notes).toContain('01-core-mechanics/calculator-model-and-public-comparison.md');
    expect(notes).toContain('09-patches-and-sources/source-register-2026-08.md');
    expect(notes).not.toContain('## 00-inbox/_TEMPLATE.md');
    expect(notes).not.toContain('## 01-core-mechanics/_TEMPLATE.md');
    expect(notes).not.toContain('Copy and rename this file before filling it in.');
    expect(notes.length).toBeLessThanOrEqual(MAX_PERSONAL_NOTES_CHARACTERS);
  });
});
