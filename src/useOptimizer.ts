import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  AiOptimizationMode,
  AiOptimizationResponse,
  BuildEvaluation,
  BuildState,
  OptimizationCandidate,
  OptimizationConstraint,
  OptimizationDefensePlan,
  OptimizationDefenseContract,
  OptimizationEquipmentLocks,
  OptimizationExtraPackage,
  OptimizationLoadoutAxes,
  OptimizationMetric,
  OptimizationResult,
} from './types';
import { OPTIMIZATION_PRESETS, type OptimizationProgress } from './utilities/StatOptimizer';
import { metricValue } from './domain/buildEvaluation';
import { ARMORS } from './data/armors';
import { OPTIMIZER_REFERENCE_PROFILES, OPTIMIZER_REFERENCE_PROFILE_BY_ID } from './data/optimizerProfiles';
import { metricKeys, type ItemLockMode } from './optimizerMetrics';
import { FEATURES } from './featureFlags';

type EngineMode = 'legacy' | 'v2' | 'ai';

interface OptimizerPanelProps {
  build: BuildState;
  currentEvaluation: BuildEvaluation;
  onApply: (candidate: OptimizationCandidate) => void;
  canUndo: boolean;
  onUndo: () => void;
}

/**
 * All optimizer state, engine wiring and handlers.
 *
 * Lifted verbatim out of OptimizerPanel so the command deck's Optimizer tab and
 * the advanced control panel can share one instance: two components each calling
 * this hook would otherwise run two independent searches.
 */
export function useOptimizer({ build, currentEvaluation, onApply, canUndo, onUndo }: OptimizerPanelProps) {
  void onApply; void canUndo; void onUndo;
  const [engine, setEngine] = useState<EngineMode>(FEATURES.aiPlanner ? 'ai' : 'v2');
  const [presetId, setPresetId] = useState('hybrid');
  const [referenceProfileId, setReferenceProfileId] = useState('');
  const [searchClasses, setSearchClasses] = useState(true);
  const [searchMainClass, setSearchMainClass] = useState(false);
  /*
   * Off by default, and deliberately three separate switches. These axes rewrite
   * choices the user made by hand on other screens, so opting in to having
   * Youkai reshuffled should not also opt in to having traits replaced.
   */
  const [searchTraits, setSearchTraits] = useState(false);
  const [searchSkills, setSearchSkills] = useState(false);
  const [searchYoukai, setSearchYoukai] = useState(false);
  const [mainRank, setMainRank] = useState(build.mainClassPassive);
  const [subRank, setSubRank] = useState(build.subClassPassive);
  const [constraints, setConstraints] = useState<OptimizationConstraint[]>([]);
  const [defensePlan, setDefensePlan] = useState<OptimizationDefensePlan>('auto');
  const [minimumEvade, setMinimumEvade] = useState(195);
  const [preferredEvade, setPreferredEvade] = useState(200);
  const [reliableBonusEvade, setReliableBonusEvade] = useState(0);
  const [minimumDefense, setMinimumDefense] = useState(45);
  const [minimumResistance, setMinimumResistance] = useState(45);
  const [minimumArmor, setMinimumArmor] = useState(0);
  const [minimumMagicArmor, setMinimumMagicArmor] = useState(0);
  const [requirePartialBattleWeight, setRequirePartialBattleWeight] = useState(true);
  const [useVerifiedArmorConditionals, setUseVerifiedArmorConditionals] = useState(false);
  const [extraPackage, setExtraPackage] = useState<OptimizationExtraPackage>('auto');
  /*
   * Counter-build targets. Empty means the whole roster when the gauntlet runs;
   * naming targets turns the gauntlet on under any goal preset.
   */
  const [gauntletOpponentIds, setGauntletOpponentIds] = useState<string[]>([]);
  const [weaponLockMode, setWeaponLockMode] = useState<ItemLockMode>('all');
  const [armorLockMode, setArmorLockMode] = useState<ItemLockMode>('all');
  const [intent, setIntent] = useState('');
  const [aiMode, setAiMode] = useState<AiOptimizationMode>('standard');
  const [previousResponseId, setPreviousResponseId] = useState<string>();
  const [clarification, setClarification] = useState('');
  const [aiHealth, setAiHealth] = useState<{ keyConfigured: boolean; standardModel: string; deepModel: string } | null>(null);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<OptimizationProgress | null>(null);
  const [error, setError] = useState('');
  const workerRef = useRef<Worker | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const buildSignature = useMemo(() => JSON.stringify(build), [build]);

  const applicableProfiles = useMemo(() => OPTIMIZER_REFERENCE_PROFILES.filter(profile => profile.enabled && profile.primaryClass === build.mainClass), [build.mainClass]);

  /*
   * Profiles are filtered by main class, but a chosen id survives a class
   * change. Passing it on regardless would let a Ghost profile tie-break a Mage
   * search while the picker (which no longer lists it) reads "None". Honour the
   * selection only while it still applies.
   */
  const effectiveReferenceProfileId = referenceProfileId !== ''
    && applicableProfiles.some(profile => profile.id === referenceProfileId)
    ? referenceProfileId
    : '';

  // With the gauntlet gated off, no opponent ids reach the engine, so V2 never
  // scores the counter-build pass even if state somehow held ids from before.
  const effectiveGauntletOpponentIds = FEATURES.pvpGauntlet && gauntletOpponentIds.length
    ? gauntletOpponentIds
    : undefined;

  const searchLoadout = useMemo<Partial<OptimizationLoadoutAxes>>(
    () => ({ traits: searchTraits, skills: searchSkills, youkai: searchYoukai }),
    [searchSkills, searchTraits, searchYoukai],
  );

  const locks = useMemo<OptimizationEquipmentLocks>(() => {
    const next: OptimizationEquipmentLocks = {};
    if (!searchMainClass) next.mainClass = build.mainClass;
    if (!searchClasses) next.subClass = build.subClass;
    const currentWeapon = build.equipment.primaryWeapon;
    if (weaponLockMode === 'current' && currentWeapon?.selectedWeaponName) next.weaponName = currentWeapon.selectedWeaponName;
    if (weaponLockMode === 'type' && currentWeapon?.weaponType) next.weaponType = currentWeapon.weaponType;
    const currentArmor = build.equipment.armorName ? ARMORS[build.equipment.armorName] : undefined;
    if (armorLockMode === 'current' && currentArmor) next.armorName = currentArmor.name;
    if (armorLockMode === 'type' && currentArmor) next.armorType = currentArmor.type;
    return next;
  }, [armorLockMode, build.equipment, build.mainClass, build.subClass, searchClasses, searchMainClass, weaponLockMode]);
  const defenseContract = useMemo<OptimizationDefenseContract>(() => ({
    ...(defensePlan === 'evade' ? { minimumEvade, preferredEvade: Math.max(minimumEvade, preferredEvade), reliableBonusEvade: Math.min(50, reliableBonusEvade) } : {}),
    ...(defensePlan === 'tank' ? { minimumScaledDefense: minimumDefense, minimumScaledResistance: minimumResistance } : {}),
    ...(minimumArmor > 0 ? { minimumArmor } : {}),
    ...(minimumMagicArmor > 0 ? { minimumMagicArmor } : {}),
    requirePartialBattleWeight,
    armorConditionalPolicy: useVerifiedArmorConditionals ? 'verified-current' : 'baseline',
  }), [defensePlan, minimumArmor, minimumDefense, minimumEvade, minimumMagicArmor, minimumResistance, preferredEvade, reliableBonusEvade, requirePartialBattleWeight, useVerifiedArmorConditionals]);

  useEffect(() => {
    setResult(null);
    setSelectedIndex(0);
    setPreviousResponseId(undefined);
    setClarification('');
  }, [buildSignature]);

  useEffect(() => {
    setMainRank(build.mainClassPassive);
    setSubRank(build.subClassPassive);
  }, [build.mainClassPassive, build.subClassPassive]);

  useEffect(() => {
    if (!FEATURES.aiPlanner) return;
    let active = true;
    fetch('/api/optimizer-health')
      .then(response => response.ok ? response.json() : Promise.reject(new Error('offline')))
      .then((health: { keyConfigured: boolean; standardModel: string; deepModel: string }) => { if (active) setAiHealth(health); })
      .catch(() => { if (active) setAiHealth(null); });
    return () => { active = false; };
  }, []);

  useEffect(() => () => {
    workerRef.current?.terminate();
    abortRef.current?.abort();
  }, []);

  const startWorker = (workerEngine: 'legacy' | 'v2', fallbackMessage?: string) => {
    workerRef.current?.terminate();
    const worker = new Worker(new URL('./utilities/statOptimizer.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    setRunning(true);
    setProgress({ completed: 0, total: 1, message: fallbackMessage ?? `Preparing ${workerEngine === 'v2' ? 'V2' : 'legacy'} candidates` });
    worker.onmessage = (event: MessageEvent<{ type: string; progress?: OptimizationProgress; result?: OptimizationResult; message?: string }>) => {
      if (event.data.type === 'progress' && event.data.progress) setProgress(event.data.progress);
      if (event.data.type === 'result' && event.data.result) {
        setResult(event.data.result);
        setSelectedIndex(0);
        setRunning(false);
        setProgress(null);
        worker.terminate();
      }
      if (event.data.type === 'error') {
        setError(event.data.message ?? 'Optimization failed.');
        setRunning(false);
        setProgress(null);
        worker.terminate();
      }
    };
    worker.onerror = () => {
      setError('The optimization worker stopped unexpectedly.');
      setRunning(false);
      setProgress(null);
    };
    worker.postMessage({
      type: 'optimize',
      request: {
        build,
        preset: OPTIMIZATION_PRESETS[presetId],
        constraints,
        primaryClass: build.mainClass,
        referenceProfileId: effectiveReferenceProfileId || undefined,
        searchClasses,
        searchMainClass,
        searchLoadout,
        assumedMainPassiveRank: mainRank,
        assumedSubPassiveRank: subRank,
        resultLimit: 3,
        engine: workerEngine === 'v2' ? 'v2' : 'legacy',
        locks,
        defensePlan,
        defenseContract,
        extraPackage,
        searchDepth: aiMode,
        intent,
        gauntletOpponentIds: effectiveGauntletOpponentIds,
      },
    });
  };

  const run = async () => {
    workerRef.current?.terminate();
    abortRef.current?.abort();
    setRunning(true);
    setResult(null);
    setSelectedIndex(0);
    setError('');
    setClarification('');
    if (!FEATURES.aiPlanner || engine !== 'ai') {
      startWorker(engine === 'ai' ? 'v2' : engine);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setProgress({ completed: 0, total: 10, message: `AI planning with ${aiMode === 'deep' ? 'Sol' : 'Terra'}` });
    try {
      const response = await fetch('/api/optimizer-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          build, presetId, constraints, locks, defensePlan, defenseContract, extraPackage,
          searchMainClass, searchLoadout,
          gauntletOpponentIds: effectiveGauntletOpponentIds,
          referenceProfileId: effectiveReferenceProfileId || undefined,
          intent: intent.trim() || `Create a ${OPTIMIZATION_PRESETS[presetId].name.toLowerCase()} build using the fixed character choices.`,
          mode: aiMode, previousResponseId, assumedMainPassiveRank: mainRank, assumedSubPassiveRank: subRank,
        }),
      });
      // A dead service answers through the proxy with an empty non-JSON body,
      // so the detail parse must not be the thing that names the error.
      if (!response.ok) {
        const detail = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(detail?.error ?? `AI service returned ${response.status}.`);
      }
      const payload = await response.json() as AiOptimizationResponse;
      setResult(payload.result);
      setClarification(payload.clarification ?? '');
      setPreviousResponseId(payload.result.ai?.responseId);
      setRunning(false);
      setProgress(null);
    } catch (caught) {
      if (controller.signal.aborted) {
        setRunning(false);
        setProgress(null);
        return;
      }
      setError(`${caught instanceof Error ? caught.message : 'AI service unavailable'} Falling back to deterministic V2.`);
      startWorker('v2', 'AI unavailable; running deterministic V2 fallback');
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
    workerRef.current?.postMessage({ type: 'cancel' });
    workerRef.current?.terminate();
    workerRef.current = null;
    setRunning(false);
    setProgress(null);
  };

  const addConstraint = () => {
    const metric = metricKeys.find(candidate => !constraints.some(item => item.metric === candidate)) ?? 'maxHP';
    setConstraints(items => [...items, { metric, minimum: Math.ceil(metricValue(currentEvaluation, metric)) }]);
  };

  const candidate = result?.candidates[selectedIndex];
  const selectedReferenceProfile = effectiveReferenceProfileId
    ? OPTIMIZER_REFERENCE_PROFILE_BY_ID[effectiveReferenceProfileId]
    : undefined;
  const elementMetric = { Fire: 'fireAttack', Ice: 'iceAttack', Wind: 'windAttack', Earth: 'earthAttack', Dark: 'darkAttack', Water: 'waterAttack', Light: 'lightAttack', Lightning: 'lightningAttack', Acid: 'acidAttack', Sound: 'soundAttack' } as const;
  const requestedElementMetrics = [...new Set(candidate?.damageReport?.skills.flatMap(skill => skill.element ? [elementMetric[skill.element]] : []) ?? [])];
  const compareMetrics: OptimizationMetric[] = ['maxHP', 'fp', 'physicalDefense', 'magicalDefense', 'armor', 'magicArmor', 'evade', 'equipmentLoad', 'battleWeightRemaining', 'statusInfliction', 'statusResistance', 'weaponPower', 'weaponHit', 'weaponCritical', 'weaponCriticalDamage', ...requestedElementMetrics];


  return {
    addConstraint, aiHealth, aiMode, applicableProfiles,
    armorLockMode, cancel, candidate, clarification,
    compareMetrics, constraints, defensePlan, engine,
    error, extraPackage, gauntletOpponentIds, intent, locks,
    mainRank, minimumArmor, minimumDefense, minimumEvade,
    minimumMagicArmor, minimumResistance, preferredEvade, presetId,
    previousResponseId, progress, referenceProfileId, reliableBonusEvade,
    requirePartialBattleWeight, result, run, running,
    searchClasses, searchLoadout, searchMainClass, searchSkills, searchTraits, searchYoukai,
    selectedIndex, selectedReferenceProfile, setAiMode,
    setSearchMainClass, setSearchSkills, setSearchTraits, setSearchYoukai,
    setArmorLockMode, setConstraints, setDefensePlan, setEngine,
    setExtraPackage, setGauntletOpponentIds, setIntent, setMainRank, setMinimumArmor,
    setMinimumDefense, setMinimumEvade, setMinimumMagicArmor, setMinimumResistance,
    setPreferredEvade, setPresetId, setReferenceProfileId, setReliableBonusEvade,
    setRequirePartialBattleWeight, setSearchClasses, setSelectedIndex, setSubRank,
    setUseVerifiedArmorConditionals, setWeaponLockMode, subRank, useVerifiedArmorConditionals,
    weaponLockMode,
  };
}

export type OptimizerState = ReturnType<typeof useOptimizer>;
