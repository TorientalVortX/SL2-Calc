import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  BuildEvaluation,
  BuildState,
  OptimizationCandidate,
  OptimizationConstraint,
  OptimizationDefensePlan,
  OptimizationDefenseContract,
  OptimizationEquipmentLocks,
  OptimizationExtraPackage,
  OptimizationMetric,
  OptimizationResult,
} from './types';
import { OPTIMIZATION_PRESETS, type OptimizationProgress } from './utilities/StatOptimizer';
import { metricValue } from './domain/buildEvaluation';
import { ARMORS } from './data/armors';
import { OPTIMIZER_REFERENCE_PROFILES, OPTIMIZER_REFERENCE_PROFILE_BY_ID } from './data/optimizerProfiles';
import { metricKeys, type ItemLockMode } from './optimizerMetrics';

type EngineMode = 'legacy' | 'v2';

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
 * the advanced control panel can share one instance — two components each calling
 * this hook would otherwise run two independent searches.
 */
export function useOptimizer({ build, currentEvaluation, onApply, canUndo, onUndo }: OptimizerPanelProps) {
  void onApply; void canUndo; void onUndo;
  const [engine, setEngine] = useState<EngineMode>('v2');
  const [presetId, setPresetId] = useState('hybrid');
  const [referenceProfileId, setReferenceProfileId] = useState('');
  const [searchClasses, setSearchClasses] = useState(true);
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
  const [weaponLockMode, setWeaponLockMode] = useState<ItemLockMode>('all');
  const [armorLockMode, setArmorLockMode] = useState<ItemLockMode>('all');
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<OptimizationProgress | null>(null);
  const [error, setError] = useState('');
  const workerRef = useRef<Worker | null>(null);
  const buildSignature = useMemo(() => JSON.stringify(build), [build]);

  const applicableProfiles = useMemo(() => OPTIMIZER_REFERENCE_PROFILES.filter(profile => profile.enabled && profile.primaryClass === build.mainClass), [build.mainClass]);

  /*
   * Profiles are filtered by main class, but a chosen id survives a class
   * change. Passing it on regardless would let a Ghost profile tie-break a Mage
   * search while the picker — which no longer lists it — reads "None". Honour
   * the selection only while it still applies.
   */
  const effectiveReferenceProfileId = referenceProfileId !== ''
    && applicableProfiles.some(profile => profile.id === referenceProfileId)
    ? referenceProfileId
    : '';

  const locks = useMemo<OptimizationEquipmentLocks>(() => {
    const next: OptimizationEquipmentLocks = {};
    if (!searchClasses) next.subClass = build.subClass;
    const currentWeapon = build.equipment.primaryWeapon;
    if (weaponLockMode === 'current' && currentWeapon?.selectedWeaponName) next.weaponName = currentWeapon.selectedWeaponName;
    if (weaponLockMode === 'type' && currentWeapon?.weaponType) next.weaponType = currentWeapon.weaponType;
    const currentArmor = build.equipment.armorName ? ARMORS[build.equipment.armorName] : undefined;
    if (armorLockMode === 'current' && currentArmor) next.armorName = currentArmor.name;
    if (armorLockMode === 'type' && currentArmor) next.armorType = currentArmor.type;
    return next;
  }, [armorLockMode, build.equipment, build.subClass, searchClasses, weaponLockMode]);
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
  }, [buildSignature]);

  useEffect(() => {
    setMainRank(build.mainClassPassive);
    setSubRank(build.subClassPassive);
  }, [build.mainClassPassive, build.subClassPassive]);

  useEffect(() => () => {
    workerRef.current?.terminate();
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
        assumedMainPassiveRank: mainRank,
        assumedSubPassiveRank: subRank,
        resultLimit: 3,
        engine: workerEngine === 'v2' ? 'v2' : 'legacy',
        locks,
        defensePlan,
        defenseContract,
        extraPackage,
        searchDepth: 'standard',
      },
    });
  };

  const run = () => {
    workerRef.current?.terminate();
    setRunning(true);
    setResult(null);
    setSelectedIndex(0);
    setError('');
    startWorker(engine);
  };

  const cancel = () => {
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
    addConstraint, applicableProfiles,
    armorLockMode, cancel, candidate,
    compareMetrics, constraints, defensePlan, engine,
    error, extraPackage, locks,
    mainRank, minimumArmor, minimumDefense, minimumEvade,
    minimumMagicArmor, minimumResistance, preferredEvade, presetId,
    progress, referenceProfileId, reliableBonusEvade,
    requirePartialBattleWeight, result, run, running,
    searchClasses, selectedIndex, selectedReferenceProfile,
    setArmorLockMode, setConstraints, setDefensePlan, setEngine,
    setExtraPackage, setMainRank, setMinimumArmor,
    setMinimumDefense, setMinimumEvade, setMinimumMagicArmor, setMinimumResistance,
    setPreferredEvade, setPresetId, setReferenceProfileId, setReliableBonusEvade,
    setRequirePartialBattleWeight, setSearchClasses, setSelectedIndex, setSubRank,
    setUseVerifiedArmorConditionals, setWeaponLockMode, subRank, useVerifiedArmorConditionals,
    weaponLockMode,
  };
}

export type OptimizerState = ReturnType<typeof useOptimizer>;
