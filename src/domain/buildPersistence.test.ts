import { describe, expect, it } from 'vitest';
import { createBuildFile, decodeSharePayload, encodeSharePayload, parseBuildFile } from './buildPersistence';

const legacy = {
  version: '0.5.0', buildName: 'Legacy Zero HP', race: 'Human', subrace: 'Imperialist', mainClass: 'Soldier', subClass: 'Soldier',
  characterLevel: 60, food: 'None', history: 'None', hpPercent: 0,
};

describe('build persistence', () => {
  it('migrates v0.5 builds without replacing valid zeroes', () => {
    const migrated = parseBuildFile(JSON.stringify(legacy));
    expect(migrated.schemaVersion).toBe(1);
    expect(migrated.build.hpPercent).toBe(0);
    expect(migrated.build.equipment.armorName).toBeNull();
  });

  it('round trips new build files transactionally', () => {
    const migrated = parseBuildFile(JSON.stringify(legacy));
    const file = createBuildFile('Round Trip', migrated.build);
    expect(parseBuildFile(JSON.stringify(file))).toEqual(file);
  });

  it('round trips compressed URL payloads', () => {
    const build = parseBuildFile(JSON.stringify(legacy)).build;
    const decoded = decodeSharePayload(encodeSharePayload('Shared', build));
    expect(decoded.buildName).toBe('Shared');
    expect(decoded.build).toEqual(build);
  });

  it('rejects unknown core references before changing UI state', () => {
    expect(() => parseBuildFile(JSON.stringify({ ...legacy, race: 'Missing Race' }))).toThrow(/unknown race/i);
  });

  it('rejects malformed, future, tampered, and oversized payloads with actionable errors', () => {
    expect(() => parseBuildFile('{broken')).toThrow();
    expect(() => parseBuildFile(JSON.stringify({ schemaVersion: 2, build: legacy }))).toThrow(/unsupported build schema/i);
    expect(() => decodeSharePayload('not-a-valid-compressed-build')).toThrow(/invalid|unsupported/i);
    expect(() => decodeSharePayload('x'.repeat(20_001))).toThrow(/too large/i);
  });

  it('preserves armor equipment in new-format round trips', () => {
    const build = parseBuildFile(JSON.stringify(legacy)).build;
    build.equipment.armorName = 'Breastplate';
    const roundTrip = parseBuildFile(JSON.stringify(createBuildFile('Equipped', build)));
    expect(roundTrip.build.equipment.armorName).toBe('Breastplate');
  });
});
