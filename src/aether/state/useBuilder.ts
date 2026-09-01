/**
 * The builder's single source of truth: one build, its evaluation, and the
 * saved-slot store around them.
 *
 * The build is the only state that matters. Every number on screen is derived
 * from it by `evaluateBuild`, memoised so the twelve-stat panel, the loadout
 * sheets and the attribute rail all read one evaluation per edit rather than
 * recomputing it each.
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { BuildEvaluation, BuildState, SaveSlotV1 } from '../../types';
import { evaluateBuild } from '../../domain/buildEvaluation';
import {
  APP_VERSION,
  createBuildFile,
  decodeSharePayload,
  encodeSharePayload,
  normalizeBuildState,
  parseBuildFile,
} from '../../domain/buildPersistence';
import { skillPoolSpends } from '../../domain/skills';
import { traitPointBudget, traitPointsSpent } from '../../domain/traits';
import { TALENT_POINT_BUDGET, skillViolations, talentViolations, traitViolations, youkaiViolations } from '../../domain/loadout';
import { talentSpending } from '../../data/talents';
import { buildReducer, createDefaultBuild, type BuildAction, type LoadoutSheet } from './build';
import { AUDIO_PREFS_KEY, isAudioEnabled, play, setAudioEnabled } from './audio';

const STORAGE = {
  draft: 'sl2:aether:draft:v1',
  saves: 'sl2:aether:saves:v1',
  // The audio module reads this itself at load, so the key comes from there.
  prefs: AUDIO_PREFS_KEY,
} as const;

export interface Notice {
  id: number;
  tone: 'info' | 'good' | 'bad';
  text: string;
}

/** A build carried in the URL, waiting for the visitor to accept or refuse it. */
export interface PendingShare {
  buildName: string;
  build: BuildState;
  /** The dataset the link was made against, which may not be this one. */
  dataVersion: string;
}

/**
 * A legality problem, tagged with the sheet that can fix it.
 *
 * The domain returns prose; which sheet owns each line is knowable only from
 * which producer emitted it, so the tag is applied here rather than guessed from
 * the text downstream.
 */
export interface Violation {
  sheet: LoadoutSheet;
  text: string;
}

/** Budget counters shown next to each loadout sheet's heading. */
export interface LoadoutStatus {
  traitsSpent: number;
  traitsBudget: number;
  /** Ranks bought across all talents, against the 65 a character has. */
  talentsSpent: number;
  talentsBudget: number;
  skillPools: ReturnType<typeof skillPoolSpends>;
  skillsSpent: number;
  skillsBudget: number;
  violations: Violation[];
}

export interface Builder {
  build: BuildState;
  evaluation: BuildEvaluation;
  status: LoadoutStatus;
  buildName: string;
  setBuildName: (name: string) => void;
  dispatch: (action: BuildAction) => void;
  saves: SaveSlotV1[];
  saveAs: (name: string) => void;
  overwrite: (id: string) => void;
  loadSlot: (id: string) => void;
  deleteSlot: (id: string) => void;
  exportJSON: () => string;
  importJSON: (text: string) => void;
  downloadJSON: () => void;
  notice: Notice | null;
  notify: (tone: Notice['tone'], text: string) => void;
  sound: boolean;
  setSound: (value: boolean) => void;
  version: string;
  /** A build offered by the URL, or null. See `acceptShare` / `dismissShare`. */
  pendingShare: PendingShare | null;
  acceptShare: () => void;
  dismissShare: () => void;
  /** The current build as a shareable URL, or an error explaining why not. */
  shareLink: () => { url: string } | { error: string };
  /** The compressed payload on its own, for pasting where a URL will not go. */
  shareCode: () => string;
}

function readSaves(): SaveSlotV1[] {
  try {
    const raw = localStorage.getItem(STORAGE.saves);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((slot): SaveSlotV1[] => {
      if (!slot || typeof slot !== 'object') return [];
      const record = slot as Record<string, unknown>;
      try {
        return [{
          id: String(record.id),
          name: String(record.name),
          createdAt: String(record.createdAt),
          updatedAt: String(record.updatedAt),
          build: normalizeBuildState(record.build),
        }];
      } catch {
        // One unreadable slot must not take the whole list with it.
        return [];
      }
    });
  } catch {
    return [];
  }
}

/**
 * A build offered in the URL fragment.
 *
 * The same `#build=` links the original calculator writes, so a link shared from
 * either front end opens in either. Read once at mount and never applied
 * automatically: a link that silently replaced the sheet would discard work.
 */
function readSharedBuild(): PendingShare | null {
  try {
    const encoded = new URLSearchParams(window.location.hash.slice(1)).get('build');
    if (!encoded) return null;
    const payload = decodeSharePayload(encoded);
    return { buildName: payload.buildName, build: payload.build, dataVersion: payload.dataVersion };
  } catch {
    // A truncated or foreign link is not worth an error dialog on first paint.
    return null;
  }
}

function readDraft(): { build: BuildState; name: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE.draft);
    if (!raw) return null;
    const file = parseBuildFile(raw);
    return { build: file.build, name: file.buildName };
  } catch {
    return null;
  }
}

function newId(): string {
  return typeof crypto?.randomUUID === 'function'
    ? crypto.randomUUID()
    : `slot-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export function useBuilder(): Builder {
  const draft = useRef(readDraft()).current;
  const [build, rawDispatch] = useReducer(buildReducer, draft?.build ?? createDefaultBuild());
  const [buildName, setBuildName] = useState(draft?.name ?? 'New Character');
  const [saves, setSaves] = useState<SaveSlotV1[]>(readSaves);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [sound, setSoundState] = useState(isAudioEnabled);
  const [pendingShare, setPendingShare] = useState<PendingShare | null>(readSharedBuild);

  useEffect(() => {
    setAudioEnabled(sound);
    try {
      localStorage.setItem(STORAGE.prefs, JSON.stringify({ sound }));
    } catch { /* private browsing; the preference simply does not persist */ }
  }, [sound]);

  const evaluation = useMemo(() => evaluateBuild(build), [build]);

  const status = useMemo<LoadoutStatus>(() => {
    const pools = skillPoolSpends(build.mainClass, build.subClass, build.skillRanks, build.destiny);
    return {
      traitsSpent: traitPointsSpent(build.traits ?? [], build.race),
      traitsBudget: traitPointBudget(build.characterLevel),
      talentsSpent: talentSpending(build.talents ?? {}).totalRanks,
      talentsBudget: TALENT_POINT_BUDGET,
      skillPools: pools,
      skillsSpent: pools.reduce((total, pool) => total + pool.spent, 0),
      skillsBudget: pools.reduce((total, pool) => total + pool.budget, 0),
      // The Youkai cap is a derived stat, so it is read off the evaluation rather
      // than recomputed here.
      violations: [
        ...traitViolations(build).map(text => ({ sheet: 'traits' as const, text })),
        ...talentViolations(build).map(text => ({ sheet: 'talents' as const, text })),
        ...skillViolations(build).map(text => ({ sheet: 'skills' as const, text })),
        ...youkaiViolations(build, evaluation.derived.youkaiCap)
          .map(text => ({ sheet: 'youkai' as const, text })),
      ],
    };
  }, [build, evaluation.derived.youkaiCap]);

  // Autosaved so a reload does not lose the sheet. Debounced because stat
  // allocation fires on every keypress and drag frame.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE.draft, JSON.stringify(createBuildFile(buildName, build)));
      } catch { /* over quota or blocked; the session still works */ }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [build, buildName]);

  const notify = useCallback((tone: Notice['tone'], text: string) => {
    setNotice({ id: Date.now(), tone, text });
    play(tone === 'bad' ? 'deny' : 'confirm');
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const dispatch = useCallback((action: BuildAction) => rawDispatch(action), []);

  const persistSaves = useCallback((next: SaveSlotV1[]) => {
    setSaves(next);
    try {
      localStorage.setItem(STORAGE.saves, JSON.stringify(next));
    } catch {
      setNotice({ id: Date.now(), tone: 'bad', text: 'Could not write to local storage.' });
    }
  }, []);

  const saveAs = useCallback((name: string) => {
    const stamp = new Date().toISOString();
    const slot: SaveSlotV1 = {
      id: newId(),
      name: name.trim() || 'Untitled Build',
      createdAt: stamp,
      updatedAt: stamp,
      build,
    };
    persistSaves([slot, ...saves]);
    setBuildName(slot.name);
    notify('good', `Saved “${slot.name}”.`);
  }, [build, saves, persistSaves, notify]);

  const overwrite = useCallback((id: string) => {
    const target = saves.find(slot => slot.id === id);
    if (!target) return;
    persistSaves(saves.map(slot => (
      slot.id === id ? { ...slot, build, updatedAt: new Date().toISOString() } : slot
    )));
    notify('good', `Updated “${target.name}”.`);
  }, [build, saves, persistSaves, notify]);

  const loadSlot = useCallback((id: string) => {
    const slot = saves.find(entry => entry.id === id);
    if (!slot) return;
    rawDispatch({ type: 'replace', build: slot.build });
    setBuildName(slot.name);
    notify('info', `Loaded “${slot.name}”.`);
  }, [saves, notify]);

  const deleteSlot = useCallback((id: string) => {
    const slot = saves.find(entry => entry.id === id);
    persistSaves(saves.filter(entry => entry.id !== id));
    if (slot) notify('info', `Deleted “${slot.name}”.`);
  }, [saves, persistSaves, notify]);

  const exportJSON = useCallback(
    () => JSON.stringify(createBuildFile(buildName, build), null, 2),
    [build, buildName],
  );

  const importJSON = useCallback((text: string) => {
    try {
      const file = parseBuildFile(text);
      rawDispatch({ type: 'replace', build: file.build });
      setBuildName(file.buildName);
      notify('good', `Imported “${file.buildName}”.`);
    } catch (error) {
      notify('bad', error instanceof Error ? error.message : 'That file could not be read.');
    }
  }, [notify]);

  const downloadJSON = useCallback(() => {
    const blob = new Blob([exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${(buildName || 'build').replace(/[^\w-]+/g, '-').toLowerCase()}.sl2build.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify('good', 'Build exported.');
  }, [exportJSON, buildName, notify]);

  /* -------------------------------------------------------------------- share */

  /**
   * Take the URL's build, and take the link out of the URL with it.
   *
   * The fragment is cleared on both paths: a share link left in the address bar
   * would re-offer the same build on every reload, and would overwrite the
   * visitor's own work if they reloaded after editing.
   */
  const clearShareFragment = useCallback(() => {
    try {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    } catch { /* a sandboxed frame may refuse; the offer is dismissed regardless */ }
    setPendingShare(null);
  }, []);

  const acceptShare = useCallback(() => {
    if (!pendingShare) return;
    rawDispatch({ type: 'replace', build: pendingShare.build });
    setBuildName(pendingShare.buildName);
    clearShareFragment();
    notify('good', `Loaded shared build “${pendingShare.buildName}”.`);
  }, [pendingShare, clearShareFragment, notify]);

  const dismissShare = useCallback(() => {
    clearShareFragment();
  }, [clearShareFragment]);

  const shareCode = useCallback(() => {
    try {
      return encodeSharePayload(buildName, build);
    } catch {
      // Too large to encode. The caller shows the JSON route instead.
      return '';
    }
  }, [buildName, build]);

  const shareLink = useCallback((): { url: string } | { error: string } => {
    try {
      const url = new URL(window.location.href);
      url.hash = new URLSearchParams({ build: encodeSharePayload(buildName, build) }).toString();
      return { url: url.toString() };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'This build cannot be shared as a link.' };
    }
  }, [buildName, build]);

  const setSound = useCallback((value: boolean) => {
    setSoundState(value);
    setAudioEnabled(value);
    if (value) play('confirm');
  }, []);

  return {
    build,
    evaluation,
    status,
    buildName,
    setBuildName,
    dispatch,
    saves,
    saveAs,
    overwrite,
    loadSlot,
    deleteSlot,
    exportJSON,
    importJSON,
    downloadJSON,
    notice,
    notify,
    sound,
    setSound,
    version: APP_VERSION,
    pendingShare,
    acceptShare,
    dismissShare,
    shareLink,
    shareCode,
  };
}
