import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Bot, CheckCircle2, Play, RotateCcw, ShieldCheck, Sparkles, X } from 'lucide-react';
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
  OptimizationMetric,
  OptimizationResult,
} from './types';
import { OPTIMIZATION_PRESETS, type OptimizationProgress } from './utilities/StatOptimizer';
import { STAT_KEYS, metricValue } from './domain/buildEvaluation';
import { ARMORS } from './data/armors';
import { OPTIMIZER_REFERENCE_PROFILES, OPTIMIZER_REFERENCE_PROFILE_BY_ID } from './data/optimizerProfiles';

const metricLabels: Record<OptimizationMetric, string> = {
  str: 'Scaled STR', wil: 'Scaled WIL', ski: 'Scaled SKI', cel: 'Scaled CEL', def: 'Scaled DEF', res: 'Scaled RES',
  vit: 'Scaled VIT', fai: 'Scaled FAI', luc: 'Scaled LUC', gui: 'Scaled GUI', san: 'Scaled SAN', apt: 'Scaled APT',
  maxHP: 'Max HP', fp: 'FP', physicalDefense: 'Physical Defense', magicalDefense: 'Magical Defense', evade: 'Evade',
  armor: 'Torso Armor', magicArmor: 'Torso Magic Armor', equipmentLoad: 'Weapon + Torso Weight', battleWeightRemaining: 'Partial Battle Weight Remaining',
  criticalEvade: 'Critical Evade', statusInfliction: 'Status Infliction', statusResistance: 'Status Resistance',
  initiative: 'Initiative', youkaiCap: 'Youkai Cap', flanking: 'Flanking', skillPool: 'Skill Pool',
  battleWeight: 'Battle Weight', encumbrance: 'Encumbrance', weaponPower: 'Weapon Power', weaponHit: 'Weapon Hit',
  weaponCritical: 'Weapon Critical', weaponCriticalDamage: 'Critical Damage',
};

const metrics = Object.keys(metricLabels) as OptimizationMetric[];
type EngineMode = 'legacy' | 'v2' | 'ai';
type ItemLockMode = 'all' | 'current' | 'type';

interface OptimizerPanelProps {
  build: BuildState;
  currentEvaluation: BuildEvaluation;
  onApply: (candidate: OptimizationCandidate) => void;
  canUndo: boolean;
  onUndo: () => void;
  retroMode?: boolean;
}

export default function OptimizerPanel({ build, currentEvaluation, onApply, canUndo, onUndo, retroMode = false }: OptimizerPanelProps) {
  const [engine, setEngine] = useState<EngineMode>('ai');
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
    setPreviousResponseId(undefined);
    setClarification('');
  }, [buildSignature]);

  useEffect(() => {
    setMainRank(build.mainClassPassive);
    setSubRank(build.subClassPassive);
  }, [build.mainClassPassive, build.subClassPassive]);

  useEffect(() => {
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
        referenceProfileId: referenceProfileId || undefined,
        searchClasses,
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
    if (engine !== 'ai') {
      startWorker(engine);
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
          referenceProfileId: referenceProfileId || undefined,
          intent: intent.trim() || `Create a ${OPTIMIZATION_PRESETS[presetId].name.toLowerCase()} build using the fixed character choices.`,
          mode: aiMode, previousResponseId, assumedMainPassiveRank: mainRank, assumedSubPassiveRank: subRank,
        }),
      });
      if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? `AI service returned ${response.status}.`);
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
    const metric = metrics.find(candidate => !constraints.some(item => item.metric === candidate)) ?? 'maxHP';
    setConstraints(items => [...items, { metric, minimum: Math.ceil(metricValue(currentEvaluation, metric)) }]);
  };

  const candidate = result?.candidates[selectedIndex];
  const selectedReferenceProfile = referenceProfileId ? OPTIMIZER_REFERENCE_PROFILE_BY_ID[referenceProfileId] : undefined;
  const compareMetrics: OptimizationMetric[] = ['maxHP', 'fp', 'physicalDefense', 'magicalDefense', 'armor', 'magicArmor', 'evade', 'equipmentLoad', 'battleWeightRemaining', 'statusInfliction', 'statusResistance', 'weaponPower', 'weaponHit', 'weaponCritical', 'weaponCriticalDamage'];

  return (
    <section className={`mt-6 rounded-xl border border-green-500/30 bg-gray-900/70 p-4 sm:p-6 ${retroMode ? 'font-retro glow-border' : ''}`} aria-labelledby="optimizer-title">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <h3 id="optimizer-title" className="text-xl font-bold text-green-400 flex items-center gap-2"><Sparkles size={20} /> Private build optimizer experiment</h3>
          <p className="text-sm text-gray-400">Fixed character: {build.race} / {build.subrace} · main class {build.mainClass} · level {build.characterLevel}.</p>
          <p className="mt-1 text-xs text-cyan-300">AI plans and explains; exact calculator tools enforce stats, locks, equipment, and point limits.</p>
        </div>
        {canUndo && <button type="button" onClick={onUndo} className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 flex items-center gap-2 self-start"><RotateCcw size={16} /> Undo optimizer</button>}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-5" role="radiogroup" aria-label="Optimizer engine">
        {([
          ['ai', 'AI planner', 'Terra/Sol with exact tools'],
          ['v2', 'V2 search', 'Pareto beam and equipment'],
          ['legacy', 'Legacy', 'Original comparison baseline'],
        ] as const).map(([value, label, description]) => (
          <button key={value} type="button" role="radio" aria-checked={engine === value} onClick={() => setEngine(value)} className={`rounded-lg border p-3 text-left ${engine === value ? 'border-violet-400 bg-violet-950/50' : 'border-gray-700 bg-gray-800/70 hover:border-gray-500'}`}>
            <strong className="block">{label}</strong><span className="text-xs text-gray-400">{description}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <label className="text-sm"><span className="block mb-1 text-green-300">Build preset</span><select value={presetId} onChange={event => setPresetId(event.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2">{Object.values(OPTIMIZATION_PRESETS).map(preset => <option key={preset.id} value={preset.id}>{preset.name}</option>)}</select><span className="block text-xs text-gray-500 mt-1">{OPTIMIZATION_PRESETS[presetId].description}</span></label>
        <label className="text-sm"><span className="block mb-1 text-cyan-300">Defense plan</span><select value={defensePlan} onChange={event => setDefensePlan(event.target.value as OptimizationDefensePlan)} className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2"><option value="auto">Infer from request</option><option value="tank">Tank / non-evade</option><option value="evade">Evade</option><option value="bruiser">Bruiser</option><option value="hybrid">Hybrid</option><option value="glass">Intentional glass</option></select></label>
        <label className="text-sm"><span className="block mb-1 text-cyan-300">Extra-stat package</span><select value={extraPackage} onChange={event => setExtraPackage(event.target.value as OptimizationExtraPackage)} className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2"><option value="auto">Infer from request</option><option value="critical">Critical</option><option value="faith">Faith</option><option value="sanctity">Sanctity</option><option value="none">None</option></select></label>
        <label className="text-sm"><span className="block mb-1 text-violet-300">Reference evidence (tie-break only)</span><select value={referenceProfileId} onChange={event => setReferenceProfileId(event.target.value)} className="w-full bg-gray-800 border border-violet-700 rounded px-3 py-2"><option value="">None</option>{applicableProfiles.map(profile => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select><span className="block text-xs text-gray-500 mt-1">Never overrides mathematically stronger candidates. Unselected references do not bias search.</span></label>
      </div>

      {engine === 'ai' && <div className="mt-4 rounded-lg border border-violet-700/60 bg-violet-950/20 p-4">
        <label className="text-sm"><span className="block mb-1 text-violet-200">Describe the build you want</span><textarea value={intent} onChange={event => setIntent(event.target.value)} rows={3} placeholder="Make a durable Ghost build that uses critical attacks without sacrificing accuracy..." className="w-full resize-y bg-gray-950 border border-violet-700 rounded px-3 py-2" /></label>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <label><span className="mr-2 text-gray-400">AI depth</span><select value={aiMode} onChange={event => setAiMode(event.target.value as AiOptimizationMode)} className="bg-gray-800 border border-gray-600 rounded px-3 py-2"><option value="standard">Standard · Terra / medium</option><option value="deep">Deep · Sol / high</option></select></label>
          <span className={`text-xs ${aiHealth?.keyConfigured ? 'text-green-300' : 'text-yellow-300'}`}>{aiHealth ? aiHealth.keyConfigured ? `Local service ready · ${aiMode === 'deep' ? aiHealth.deepModel : aiHealth.standardModel}` : 'Local service ready · API key missing, V2 fallback active' : 'Local AI service not detected · browser fallback active'}</span>
          {previousResponseId && <span className="text-xs text-cyan-300">Follow-up context active</span>}
        </div>
      </div>}

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 rounded-lg border border-gray-700 p-3">
        <label className="text-sm flex items-start gap-2"><input type="checkbox" checked={searchClasses} onChange={event => setSearchClasses(event.target.checked)} className="mt-1" /><span><span className="block">Search secondary classes</span><span className="text-xs text-gray-500">Main class always remains {build.mainClass}.</span></span></label>
        <label className="text-sm"><span className="block text-gray-400 mb-1">Weapon search</span><select value={weaponLockMode} onChange={event => setWeaponLockMode(event.target.value as ItemLockMode)} className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-2"><option value="all">All canonical weapons</option><option value="current" disabled={!build.equipment.primaryWeapon?.selectedWeaponName}>Lock current weapon</option><option value="type" disabled={!build.equipment.primaryWeapon}>Lock current type</option></select></label>
        <label className="text-sm"><span className="block text-gray-400 mb-1">Torso search</span><select value={armorLockMode} onChange={event => setArmorLockMode(event.target.value as ItemLockMode)} className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-2"><option value="all">All torso armor</option><option value="current" disabled={!build.equipment.armorName}>Lock current torso</option><option value="type" disabled={!build.equipment.armorName}>Lock current type</option></select></label>
        <div className="grid grid-cols-2 gap-2"><label className="text-xs text-gray-400">Main passive<input type="number" min="0" max="10" value={mainRank} onChange={event => setMainRank(Math.max(0, Number(event.target.value)))} className="mt-1 w-full bg-gray-800 border border-gray-600 rounded px-2 py-2 text-sm" /></label><label className="text-xs text-gray-400">Sub passive<input type="number" min="0" max="10" value={subRank} onChange={event => setSubRank(Math.max(0, Number(event.target.value)))} className="mt-1 w-full bg-gray-800 border border-gray-600 rounded px-2 py-2 text-sm" /></label></div>
      </div>

      <div className="mt-4 rounded-lg border border-cyan-800/70 bg-cyan-950/15 p-3"><div className="mb-3"><h4 className="font-semibold text-cyan-200">Defense contract</h4><p className="text-xs text-gray-500">Requirements are checked against reliable conditions before damage or utility can win the ranking.</p></div><div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {defensePlan === 'evade' && <><label className="text-xs text-gray-400">Minimum reliable Evade<input aria-label="Minimum reliable Evade" type="number" min="0" value={minimumEvade} onChange={event => setMinimumEvade(Math.max(0, Number(event.target.value)))} className="mt-1 w-full bg-gray-800 border border-gray-600 rounded px-2 py-2 text-sm" /></label><label className="text-xs text-gray-400">Preferred Evade<input aria-label="Preferred Evade" type="number" min={minimumEvade} value={preferredEvade} onChange={event => setPreferredEvade(Math.max(0, Number(event.target.value)))} className="mt-1 w-full bg-gray-800 border border-gray-600 rounded px-2 py-2 text-sm" /></label><label className="text-xs text-gray-400">Reliable bonus Evade<input aria-label="Reliable bonus Evade" type="number" min="0" max="50" value={reliableBonusEvade} onChange={event => setReliableBonusEvade(Math.max(0, Math.min(50, Number(event.target.value))))} className="mt-1 w-full bg-gray-800 border border-gray-600 rounded px-2 py-2 text-sm" /></label></>}
        {defensePlan === 'tank' && <><label className="text-xs text-gray-400">Minimum scaled DEF<input aria-label="Minimum scaled DEF" type="number" min="0" value={minimumDefense} onChange={event => setMinimumDefense(Math.max(0, Number(event.target.value)))} className="mt-1 w-full bg-gray-800 border border-gray-600 rounded px-2 py-2 text-sm" /></label><label className="text-xs text-gray-400">Minimum scaled RES<input aria-label="Minimum scaled RES" type="number" min="0" value={minimumResistance} onChange={event => setMinimumResistance(Math.max(0, Number(event.target.value)))} className="mt-1 w-full bg-gray-800 border border-gray-600 rounded px-2 py-2 text-sm" /></label></>}
        <label className="text-xs text-gray-400">Minimum torso Armor<input aria-label="Minimum torso Armor" type="number" min="0" value={minimumArmor} onChange={event => setMinimumArmor(Math.max(0, Number(event.target.value)))} className="mt-1 w-full bg-gray-800 border border-gray-600 rounded px-2 py-2 text-sm" /></label><label className="text-xs text-gray-400">Minimum Magic Armor<input aria-label="Minimum Magic Armor" type="number" min="0" value={minimumMagicArmor} onChange={event => setMinimumMagicArmor(Math.max(0, Number(event.target.value)))} className="mt-1 w-full bg-gray-800 border border-gray-600 rounded px-2 py-2 text-sm" /></label>
      </div><div className="mt-3 flex flex-wrap gap-4 text-xs"><label className="flex items-center gap-2"><input type="checkbox" checked={requirePartialBattleWeight} onChange={event => setRequirePartialBattleWeight(event.target.checked)} />Require weapon + torso within Battle Weight</label><label className="flex items-center gap-2"><input type="checkbox" checked={useVerifiedArmorConditionals} disabled={armorLockMode !== 'current'} onChange={event => setUseVerifiedArmorConditionals(event.target.checked)} />Use verified conditionals on locked current torso</label></div></div>

      {selectedReferenceProfile && <div className="mt-4 rounded-lg border border-violet-700/60 bg-violet-950/20 p-3 text-sm"><strong className="text-violet-200">{selectedReferenceProfile.archetype}</strong><div className="text-gray-400">{selectedReferenceProfile.name} · {selectedReferenceProfile.weapon.name} → {selectedReferenceProfile.weapon.effectiveType}</div><div className="mt-2 flex flex-wrap gap-1.5">{selectedReferenceProfile.priorityStats.map(stat => <span key={stat} className="rounded bg-violet-900/60 px-2 py-1 text-xs">{stat.toUpperCase()} {selectedReferenceProfile.scaledStatTargets[stat]}</span>)}</div>{selectedReferenceProfile.dataGaps?.map(gap => <p key={gap} className="mt-1 text-xs text-yellow-300">{gap}</p>)}</div>}

      <div className="mt-5 border-t border-gray-700 pt-4"><div className="flex items-center justify-between mb-3"><div><h4 className="font-semibold">Hard minimums</h4><p className="text-xs text-gray-500">These override soft guide and profile preferences.</p></div><button type="button" onClick={addConstraint} className="px-3 py-1.5 rounded bg-blue-700 hover:bg-blue-600 text-sm">Add minimum</button></div><div className="grid grid-cols-1 md:grid-cols-2 gap-2">{constraints.map((constraint, index) => <div key={`${constraint.metric}-${index}`} className="flex gap-2"><select value={constraint.metric} onChange={event => setConstraints(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, metric: event.target.value as OptimizationMetric } : item))} className="min-w-0 flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-2 text-sm">{metrics.map(metric => <option key={metric} value={metric}>{metricLabels[metric]}</option>)}</select><input aria-label={`Minimum ${metricLabels[constraint.metric]}`} type="number" value={constraint.minimum} onChange={event => setConstraints(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, minimum: Number(event.target.value) } : item))} className="w-28 bg-gray-800 border border-gray-600 rounded px-2 py-2 text-sm" /><button type="button" aria-label="Remove constraint" onClick={() => setConstraints(items => items.filter((_, itemIndex) => itemIndex !== index))} className="p-2 rounded hover:bg-gray-700"><X size={17} /></button></div>)}{!constraints.length && <p className="text-sm text-gray-500">No custom hard minimums.</p>}</div></div>

      <div className="mt-5 flex flex-wrap items-center gap-3"><button type="button" onClick={running ? cancel : run} className={`px-5 py-3 rounded-lg font-semibold flex items-center gap-2 ${running ? 'bg-red-700 hover:bg-red-600' : engine === 'ai' ? 'bg-violet-700 hover:bg-violet-600' : 'bg-green-700 hover:bg-green-600'}`}>{running ? <><X size={18} /> Cancel</> : engine === 'ai' ? <><Bot size={18} /> Plan with AI</> : <><Play size={18} /> Run {engine === 'v2' ? 'V2' : 'legacy'} optimizer</>}</button>{progress && <div className="text-sm text-gray-400"><div>{progress.message}</div>{progress.total > 1 && <div>{progress.completed}/{progress.total}</div>}</div>}{error && <div role="alert" className="text-sm text-yellow-300">{error}</div>}</div>

      {clarification && <div className="mt-4 rounded border border-cyan-700 bg-cyan-950/30 p-3 text-sm text-cyan-100"><strong>AI clarification:</strong> {clarification}</div>}

      {result && <div className="mt-6 border-t border-gray-700 pt-5">
        {result.ai && <div className="mb-4 rounded-lg border border-violet-800 bg-violet-950/20 p-3 text-sm"><div className="flex flex-wrap gap-x-4 gap-y-1"><span><Bot size={15} className="inline mr-1" />{result.ai.model}</span><span>{result.ai.fallback ? 'Deterministic fallback' : `${result.ai.toolRounds} tool rounds`}</span><span>{result.ai.exactEvaluations} surfaced candidates</span>{result.ai.usage && <span>{result.ai.usage.totalTokens.toLocaleString()} tokens</span>}</div>{result.ai.summary && <p className="mt-2 text-gray-300">{result.ai.summary}</p>}</div>}
        <div className="flex flex-wrap gap-2 mb-4" role="tablist" aria-label="Optimization candidates">{result.candidates.map((item, index) => <button key={item.id} type="button" role="tab" aria-selected={selectedIndex === index} onClick={() => setSelectedIndex(index)} className={`px-4 py-2 rounded-lg border text-left ${selectedIndex === index ? 'bg-blue-800 border-blue-400' : 'bg-gray-800 border-gray-600 hover:border-gray-400'}`}><span className="block font-semibold">{index === 0 ? 'Primary' : `Alternative ${index}`} · {item.patch.mainClass} / {item.patch.subClass}</span><span className="block text-xs text-gray-300">{item.patch.equipment?.primaryWeapon?.selectedWeaponName ?? 'Current weapon'} · {item.patch.equipment?.armorName ?? 'Current torso'}</span><span className={`text-xs ${item.feasible ? 'text-green-300' : 'text-yellow-300'}`}>{item.feasible ? 'Hard constraints met' : `${Object.keys(item.constraintDeficits).length} shortfall(s)`}</span></button>)}</div>

        {candidate && <div className="space-y-4">
          <div className={`rounded-lg border p-3 flex gap-2 ${candidate.feasible ? 'border-green-700 bg-green-950/30' : 'border-yellow-700 bg-yellow-950/30'}`}>{candidate.feasible ? <CheckCircle2 className="text-green-400 shrink-0" /> : <AlertTriangle className="text-yellow-400 shrink-0" />}<div className="text-sm"><strong>{candidate.feasible ? 'Validated candidate' : 'Closest constrained candidate'}</strong><div className="text-gray-400">{candidate.confidence && `${candidate.confidence} confidence · `}{result.engine ?? 'legacy'} engine · {Math.round(result.durationMs)} ms</div></div></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm"><div className="rounded bg-gray-800 p-3"><span className="block text-xs text-gray-500">Classes</span><strong>{candidate.patch.mainClass} / {candidate.patch.subClass}</strong></div><div className="rounded bg-gray-800 p-3"><span className="block text-xs text-gray-500">Primary weapon</span><strong>{candidate.patch.equipment?.primaryWeapon?.selectedWeaponName ?? build.equipment.primaryWeapon?.selectedWeaponName ?? 'None'}</strong></div><div className="rounded bg-gray-800 p-3"><span className="block text-xs text-gray-500">Torso</span><strong>{candidate.patch.equipment?.armorName ?? build.equipment.armorName ?? 'None'}</strong></div></div>
          {candidate.objectives && <div><h4 className="mb-2 font-semibold">Modeled objectives</h4><div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{Object.entries(candidate.objectives).map(([name, value]) => <div key={name} className="rounded bg-gray-800 p-2"><div className="flex justify-between text-xs"><span className="capitalize text-gray-400">{name.replace(/([A-Z])/g, ' $1')}</span><span>{Math.round(value * 100)}%</span></div><div className="mt-1 h-1.5 rounded bg-gray-700"><div className="h-full rounded bg-cyan-500" style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }} /></div></div>)}</div></div>}
          <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead><tr className="text-left text-gray-400 border-b border-gray-700"><th className="py-2">Value</th><th>Current</th><th>Proposed</th><th>Change</th></tr></thead><tbody>{compareMetrics.map(metric => { const current = metricValue(currentEvaluation, metric); const proposed = metricValue(candidate.evaluation, metric); if (metric.startsWith('weapon') && !candidate.evaluation.primaryWeapon) return null; return <tr key={metric} className="border-b border-gray-800"><td className="py-2">{metricLabels[metric]}</td><td>{Math.round(current)}</td><td>{Math.round(proposed)}</td><td className={proposed >= current ? 'text-green-300' : 'text-red-300'}>{proposed - current >= 0 ? '+' : ''}{Math.round(proposed - current)}</td></tr>; })}</tbody></table></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">{STAT_KEYS.map(stat => <div key={stat} className="bg-gray-800 rounded p-2 text-center"><span className="block text-xs text-gray-500">{stat.toUpperCase()} invested</span><strong>{build.addedStats[stat]} → {candidate.patch.addedStats[stat]}</strong><span className="block text-xs text-gray-500">Scaled {Math.floor(candidate.evaluation.scaledStats[stat])}</span></div>)}</div>
          {candidate.aptitudeReport && <div className={`rounded-lg border p-3 ${candidate.aptitudeReport.efficientBreakpoint ? 'border-cyan-800 bg-cyan-950/20' : 'border-yellow-700 bg-yellow-950/20'}`}><h4 className="font-semibold text-cyan-200">APT breakpoint efficiency</h4><p className="mt-1 text-sm text-gray-300">{candidate.aptitudeReport.summary}</p><div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-400"><span>Global bonus +{candidate.aptitudeReport.globalStatBonus}</span><span>{candidate.aptitudeReport.investedPoints} invested</span><span>{candidate.aptitudeReport.redundantInvestedPoints} stranded</span><span>Next breakpoint: {candidate.aptitudeReport.pointsToNextBonus ?? 'unreachable'} point(s)</span></div></div>}
          {candidate.defenseScenario && <div className={`rounded-lg border p-3 ${candidate.defenseScenario.meetsMinimum ? 'border-emerald-800 bg-emerald-950/20' : 'border-red-700 bg-red-950/20'}`}><h4 className="font-semibold text-emerald-200">Reliable defense scenario</h4><div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm"><span>Evade <strong>{Math.floor(candidate.defenseScenario.reliableEvade)}</strong></span><span>Baseline <strong>{Math.floor(candidate.defenseScenario.baselineEvade)}</strong></span><span>DEF/RES <strong>{Math.floor(candidate.defenseScenario.scaledDefense)}/{Math.floor(candidate.defenseScenario.scaledResistance)}</strong></span><span>Armor/M.Armor <strong>{candidate.defenseScenario.armor}/{candidate.defenseScenario.magicArmor}</strong></span><span>Armor Evade <strong>{candidate.defenseScenario.armorEvade >= 0 ? '+' : ''}{candidate.defenseScenario.armorEvade}</strong></span><span>Partial load <strong>{candidate.defenseScenario.equipmentLoad}/{candidate.defenseScenario.battleWeightCapacity}</strong></span></div>{candidate.defenseScenario.failures.map(failure => <p key={failure} className="mt-1 text-sm text-red-300">{failure}</p>)}{candidate.defenseScenario.assumptions.map(assumption => <p key={assumption} className="mt-1 text-xs text-gray-500">{assumption}</p>)}</div>}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3"><div className="rounded border border-gray-700 p-3"><h4 className="font-semibold">Reasoning and evidence</h4><ul className="mt-2 text-sm text-gray-300 list-disc pl-5">{candidate.reasoning.map(reason => <li key={reason}>{reason}</li>)}</ul>{candidate.evidence?.map(item => <p key={item} className="mt-1 text-xs text-cyan-300">Evidence: {item}</p>)}</div><div className="rounded border border-gray-700 p-3"><h4 className="font-semibold">Tradeoffs and verification</h4>{candidate.tradeoffs?.map(item => <p key={item} className="mt-1 text-sm text-yellow-200">{item}</p>)}{candidate.warnings.map(warning => <p key={warning} className="mt-1 text-sm text-yellow-300">{warning}</p>)}</div></div>
          <div className="rounded-lg border border-cyan-800/70 bg-cyan-950/20 p-3"><h4 className="font-semibold text-cyan-200 flex items-center gap-2"><ShieldCheck size={17} /> Validation</h4><p className="mt-1 text-xs text-gray-400">{candidate.guideValidation.passed} pass · {candidate.guideValidation.failed} fail · {candidate.guideValidation.requiresVerification} require verification.</p></div>
          <button type="button" onClick={() => onApply(candidate)} className="px-5 py-3 rounded-lg bg-blue-700 hover:bg-blue-600 font-semibold">Apply {selectedIndex === 0 ? 'primary build' : `alternative ${selectedIndex}`}</button>
        </div>}
      </div>}
    </section>
  );
}
