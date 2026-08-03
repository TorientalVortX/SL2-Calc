import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Play, RotateCcw, X } from 'lucide-react';
import type {
  BuildEvaluation,
  BuildState,
  OptimizationCandidate,
  OptimizationConstraint,
  OptimizationMetric,
  OptimizationResult,
} from './types';
import { OPTIMIZATION_PRESETS, type OptimizationProgress } from './utilities/StatOptimizer';
import { STAT_KEYS, metricValue } from './domain/buildEvaluation';
import { CLASSES } from './data/classes';
import { OPTIMIZER_REFERENCE_PROFILES, OPTIMIZER_REFERENCE_PROFILE_BY_ID } from './data/optimizerProfiles';

const metricLabels: Record<OptimizationMetric, string> = {
  str: 'Scaled STR', wil: 'Scaled WIL', ski: 'Scaled SKI', cel: 'Scaled CEL', def: 'Scaled DEF', res: 'Scaled RES',
  vit: 'Scaled VIT', fai: 'Scaled FAI', luc: 'Scaled LUC', gui: 'Scaled GUI', san: 'Scaled SAN', apt: 'Scaled APT',
  maxHP: 'Max HP', fp: 'FP', physicalDefense: 'Physical Defense', magicalDefense: 'Magical Defense', evade: 'Evade',
  criticalEvade: 'Critical Evade', statusInfliction: 'Status Infliction', statusResistance: 'Status Resistance',
  initiative: 'Initiative', youkaiCap: 'Youkai Cap', flanking: 'Flanking', skillPool: 'Skill Pool',
  battleWeight: 'Battle Weight', encumbrance: 'Encumbrance', weaponPower: 'Weapon Power', weaponHit: 'Weapon Hit',
  weaponCritical: 'Weapon Critical', weaponCriticalDamage: 'Critical Damage',
};

const metrics = Object.keys(metricLabels) as OptimizationMetric[];

interface OptimizerPanelProps {
  build: BuildState;
  currentEvaluation: BuildEvaluation;
  onApply: (candidate: OptimizationCandidate) => void;
  canUndo: boolean;
  onUndo: () => void;
  retroMode?: boolean;
}

export default function OptimizerPanel({ build, currentEvaluation, onApply, canUndo, onUndo, retroMode = false }: OptimizerPanelProps) {
  const [presetId, setPresetId] = useState('hybrid');
  const [primaryClass, setPrimaryClass] = useState(build.mainClass);
  const [referenceProfileId, setReferenceProfileId] = useState('');
  const [searchClasses, setSearchClasses] = useState(true);
  const [mainRank, setMainRank] = useState(build.mainClassPassive);
  const [subRank, setSubRank] = useState(build.subClassPassive);
  const [constraints, setConstraints] = useState<OptimizationConstraint[]>([]);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<OptimizationProgress | null>(null);
  const [error, setError] = useState('');
  const workerRef = useRef<Worker | null>(null);
  const buildSignature = useMemo(() => JSON.stringify(build), [build]);

  useEffect(() => {
    setResult(null);
    setSelectedIndex(0);
  }, [buildSignature, presetId, primaryClass, referenceProfileId, searchClasses, mainRank, subRank, constraints]);

  useEffect(() => {
    setPrimaryClass(build.mainClass);
    setMainRank(build.mainClassPassive);
    setSubRank(build.subClassPassive);
  }, [build.mainClass, build.subClass, build.mainClassPassive, build.subClassPassive]);

  useEffect(() => () => workerRef.current?.terminate(), []);

  const run = () => {
    workerRef.current?.terminate();
    const worker = new Worker(new URL('./utilities/statOptimizer.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    setRunning(true);
    setResult(null);
    setError('');
    setProgress({ completed: 0, total: 1, message: 'Preparing class candidates' });
    worker.onmessage = (event: MessageEvent<{ type: string; progress?: OptimizationProgress; result?: OptimizationResult; message?: string }>) => {
      if (event.data.type === 'progress' && event.data.progress) setProgress(event.data.progress);
      if (event.data.type === 'result' && event.data.result) {
        setResult(event.data.result);
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
        primaryClass: primaryClass || undefined,
        referenceProfileId: referenceProfileId || undefined,
        searchClasses,
        assumedMainPassiveRank: mainRank,
        assumedSubPassiveRank: subRank,
        resultLimit: 2,
      },
    });
  };

  const cancel = () => {
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
  const compareMetrics: OptimizationMetric[] = ['maxHP', 'fp', 'physicalDefense', 'magicalDefense', 'evade', 'statusInfliction', 'statusResistance', 'weaponPower', 'weaponHit', 'weaponCritical', 'weaponCriticalDamage'];

  return (
    <section className={`mt-6 rounded-xl border border-green-500/30 bg-gray-900/70 p-4 sm:p-6 ${retroMode ? 'font-retro glow-border' : ''}`} aria-labelledby="optimizer-title">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <h3 id="optimizer-title" className="text-xl font-bold text-green-400">Optimize this build</h3>
          <p className="text-sm text-gray-400">Uses the current level-{build.characterLevel} build and all active bonuses. It can compare classes and reallocates only invested stat points.</p>
          <p className="mt-1 text-xs text-cyan-300">SL2BuildInfo baselines guide endgame ranking; unsupported mechanics are reported as assumptions or checks requiring calculator/game-data verification.</p>
        </div>
        {canUndo && <button type="button" onClick={onUndo} className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 flex items-center gap-2 self-start"><RotateCcw size={16} /> Undo optimizer</button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
        <label className="text-sm">
          <span className="block mb-1 text-green-300">Build preset</span>
          <select value={presetId} onChange={event => setPresetId(event.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2">
            {Object.values(OPTIMIZATION_PRESETS).map(preset => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
          </select>
          <span className="block text-xs text-gray-500 mt-1">{OPTIMIZATION_PRESETS[presetId].description}</span>
        </label>
        <label className="text-sm">
          <span className="block mb-1 text-cyan-300">Primary class</span>
          <select value={primaryClass} onChange={event => {
            setPrimaryClass(event.target.value);
            const profile = referenceProfileId ? OPTIMIZER_REFERENCE_PROFILE_BY_ID[referenceProfileId] : undefined;
            if (profile && profile.primaryClass !== event.target.value) setReferenceProfileId('');
          }} className="w-full bg-gray-800 border border-cyan-700 rounded px-3 py-2">
            <option value="">Any primary class</option>
            {Object.keys(CLASSES).sort().map(className => <option key={className} value={className}>{className}</option>)}
          </select>
          <span className="block text-xs text-gray-500 mt-1">{primaryClass ? `${primaryClass} remains the main class in every result.` : 'Broad discovery mode may replace both classes.'}</span>
        </label>
        <label className="text-sm">
          <span className="block mb-1 text-violet-300">Reference build</span>
          <select value={referenceProfileId} onChange={event => {
            const nextId = event.target.value;
            setReferenceProfileId(nextId);
            const profile = nextId ? OPTIMIZER_REFERENCE_PROFILE_BY_ID[nextId] : undefined;
            if (profile?.enabled) setPrimaryClass(profile.primaryClass);
          }} className="w-full bg-gray-800 border border-violet-700 rounded px-3 py-2">
            <option value="">No reference profile</option>
            {OPTIMIZER_REFERENCE_PROFILES.filter(profile => profile.enabled).map(profile => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
            {OPTIMIZER_REFERENCE_PROFILES.some(profile => !profile.enabled) && <optgroup label="Waiting for game data">
              {OPTIMIZER_REFERENCE_PROFILES.filter(profile => !profile.enabled).map(profile => <option key={profile.id} value={profile.id} disabled>{profile.name}</option>)}
            </optgroup>}
          </select>
          <span className="block text-xs text-gray-500 mt-1">Optional community-informed pairing and stat-shape guidance.</span>
        </label>
        <label className="text-sm flex items-start gap-2 pt-7">
          <input type="checkbox" checked={searchClasses} onChange={event => setSearchClasses(event.target.checked)} className="mt-1" />
          <span><span className="block text-white">Compare secondary classes</span><span className="text-xs text-gray-500">Finds the best subclass pairing; turn off to keep the current subclass.</span></span>
        </label>
        <label className="text-sm">
          <span className="block mb-1 text-blue-300">Assumed main passive rank</span>
          <input type="number" min="0" max="10" value={mainRank} onChange={event => setMainRank(Math.max(0, Number(event.target.value)))} className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="block mb-1 text-blue-300">Assumed sub passive rank</span>
          <input type="number" min="0" max="10" value={subRank} onChange={event => setSubRank(Math.max(0, Number(event.target.value)))} className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2" />
        </label>
      </div>

      {selectedReferenceProfile && (
        <div className="mt-4 rounded-lg border border-violet-700/60 bg-violet-950/20 p-3 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div><strong className="text-violet-200">{selectedReferenceProfile.archetype}</strong><div className="text-gray-400">{selectedReferenceProfile.race} / {selectedReferenceProfile.subrace} · {selectedReferenceProfile.primaryClass} / {selectedReferenceProfile.secondaryClass}</div></div>
            <div className="text-xs text-gray-400">Reference weapon: {selectedReferenceProfile.weapon.name} → {selectedReferenceProfile.weapon.effectiveType}</div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">{selectedReferenceProfile.priorityStats.map(stat => <span key={stat} className="rounded bg-violet-900/60 px-2 py-1 text-xs text-violet-100">{stat.toUpperCase()} target {selectedReferenceProfile.scaledStatTargets[stat]}</span>)}</div>
          <p className="mt-2 text-xs text-gray-400">Soft prior only: it influences ranking and allocation shape but does not replace the current race, weapon, formulas, point caps, or minimum constraints. Class-skill effects are not simulated.</p>
        </div>
      )}

      <div className="mt-5 border-t border-gray-700 pt-4">
        <div className="flex items-center justify-between mb-3">
          <div><h4 className="font-semibold">Minimum constraints</h4><p className="text-xs text-gray-500">Optional hard goals based on final calculator outputs.</p></div>
          <button type="button" onClick={addConstraint} className="px-3 py-1.5 rounded bg-blue-700 hover:bg-blue-600 text-sm">Add minimum</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {constraints.map((constraint, index) => (
            <div key={`${constraint.metric}-${index}`} className="flex gap-2">
              <select value={constraint.metric} onChange={event => setConstraints(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, metric: event.target.value as OptimizationMetric } : item))} className="min-w-0 flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-2 text-sm">
                {metrics.map(metric => <option key={metric} value={metric}>{metricLabels[metric]}</option>)}
              </select>
              <input aria-label={`Minimum ${metricLabels[constraint.metric]}`} type="number" value={constraint.minimum} onChange={event => setConstraints(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, minimum: Number(event.target.value) } : item))} className="w-28 bg-gray-800 border border-gray-600 rounded px-2 py-2 text-sm" />
              <button type="button" aria-label="Remove constraint" onClick={() => setConstraints(items => items.filter((_, itemIndex) => itemIndex !== index))} className="p-2 rounded hover:bg-gray-700"><X size={17} /></button>
            </div>
          ))}
          {!constraints.length && <p className="text-sm text-gray-500">No minimums set; the preset determines the ranking.</p>}
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button type="button" onClick={running ? cancel : run} className={`px-5 py-3 rounded-lg font-semibold flex items-center gap-2 ${running ? 'bg-red-700 hover:bg-red-600' : 'bg-green-700 hover:bg-green-600'}`}>
          {running ? <><X size={18} /> Cancel</> : <><Play size={18} /> Optimize stats and class pairing</>}
        </button>
        {progress && <div className="text-sm text-gray-400"><div>{progress.message}</div><div>{progress.completed}/{progress.total}</div></div>}
        {error && <div role="alert" className="text-sm text-red-300">{error}</div>}
      </div>

      {result && (
        <div className="mt-6 border-t border-gray-700 pt-5">
          <div className="flex flex-wrap gap-2 mb-4" role="tablist" aria-label="Optimization candidates">
            {result.candidates.map((item, index) => (
              <button key={item.id} type="button" role="tab" aria-selected={selectedIndex === index} onClick={() => setSelectedIndex(index)} className={`px-4 py-2 rounded-lg border text-left ${selectedIndex === index ? 'bg-blue-800 border-blue-400' : 'bg-gray-800 border-gray-600 hover:border-gray-400'}`}>
                <span className="block font-semibold">{index === 0 ? 'Primary' : 'Alternative'} · {item.patch.mainClass} / {item.patch.subClass}</span>
                <span className={`text-xs ${item.feasible ? 'text-green-300' : 'text-yellow-300'}`}>{item.feasible ? 'All custom minimums met' : `${Object.keys(item.constraintDeficits).length} custom minimum shortfall(s)`}</span>
                <span className={`block text-xs ${item.guideValidation.failed ? 'text-red-300' : 'text-cyan-300'}`}>Guide: {item.guideValidation.passed} pass · {item.guideValidation.failed} fail · {item.guideValidation.requiresVerification} verify</span>
              </button>
            ))}
          </div>

          {candidate && (
            <div className="space-y-4">
              <div className={`rounded-lg border p-3 flex gap-2 ${candidate.feasible && !candidate.guideValidation.failed ? 'border-green-700 bg-green-950/30' : 'border-yellow-700 bg-yellow-950/30'}`}>
                {candidate.feasible && !candidate.guideValidation.failed ? <CheckCircle2 className="text-green-400 shrink-0" /> : <AlertTriangle className="text-yellow-400 shrink-0" />}
                <div className="text-sm"><strong>{!candidate.feasible ? 'Closest custom-constraint result' : candidate.guideValidation.failed ? 'Custom constraints met; guide failures remain' : 'Custom constraints and supported guide checks met'}</strong><div className="text-gray-400">Evaluated {result.evaluatedClassPairs} ordered class pairs in {Math.round(result.durationMs)} ms.</div></div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead><tr className="text-left text-gray-400 border-b border-gray-700"><th className="py-2">Value</th><th>Current</th><th>Proposed</th><th>Change</th></tr></thead>
                  <tbody>
                    <tr className="border-b border-gray-800"><td className="py-2">Classes</td><td>{build.mainClass} / {build.subClass}</td><td>{candidate.patch.mainClass} / {candidate.patch.subClass}</td><td>Ranks {candidate.patch.mainClassPassive} / {candidate.patch.subClassPassive}</td></tr>
                    {compareMetrics.map(metric => {
                      const current = metricValue(currentEvaluation, metric);
                      const proposed = metricValue(candidate.evaluation, metric);
                      if ((metric.startsWith('weapon') && !candidate.evaluation.primaryWeapon) || (metric.startsWith('weapon') && !currentEvaluation.primaryWeapon)) return null;
                      return <tr key={metric} className="border-b border-gray-800"><td className="py-2">{metricLabels[metric]}</td><td>{Math.round(current)}</td><td>{Math.round(proposed)}</td><td className={proposed >= current ? 'text-green-300' : 'text-red-300'}>{proposed - current >= 0 ? '+' : ''}{Math.round(proposed - current)}</td></tr>;
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {STAT_KEYS.map(stat => <div key={stat} className="bg-gray-800 rounded p-2 text-center"><span className="block text-xs text-gray-500">{stat.toUpperCase()} invested</span><strong>{build.addedStats[stat]} → {candidate.patch.addedStats[stat]}</strong><span className="block text-xs text-gray-500">Scaled {Math.floor(candidate.evaluation.scaledStats[stat])}</span></div>)}
              </div>

              {!!Object.keys(candidate.constraintDeficits).length && <ul className="text-sm text-yellow-300">{Object.entries(candidate.constraintDeficits).map(([metric, deficit]) => <li key={metric}>{metricLabels[metric as OptimizationMetric]} is short by {Math.ceil(deficit ?? 0)}.</li>)}</ul>}
              <ul className="text-sm text-gray-400 list-disc pl-5">{candidate.reasoning.map(reason => <li key={reason}>{reason}</li>)}</ul>
              {candidate.warnings.map(warning => <p key={warning} className="text-sm text-yellow-300">{warning}</p>)}
              <div className="rounded-lg border border-cyan-800/70 bg-cyan-950/20 p-3">
                <h4 className="font-semibold text-cyan-200">SL2BuildInfo validation checklist</h4>
                <p className="mt-1 text-xs text-gray-400">Only checks supported by the current build state can pass or fail automatically. “Verify” items are not guessed.</p>
                <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-2">
                  {candidate.guideValidation.checks.map(check => (
                    <div key={check.id} className={`rounded border p-2 text-sm ${check.status === 'pass' ? 'border-green-800/70 bg-green-950/20' : check.status === 'fail' ? 'border-red-800/70 bg-red-950/20' : 'border-yellow-800/70 bg-yellow-950/20'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <strong>{check.label}</strong>
                        <span className={`text-xs uppercase ${check.status === 'pass' ? 'text-green-300' : check.status === 'fail' ? 'text-red-300' : 'text-yellow-300'}`}>{check.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-300">{check.summary}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">Basis: {check.basis === 'document' ? 'SL2BuildInfo document' : check.basis === 'assumption' ? 'assumption' : 'calculator data'}</p>
                    </div>
                  ))}
                </div>
              </div>
              <button type="button" onClick={() => onApply(candidate)} className="px-5 py-3 rounded-lg bg-blue-700 hover:bg-blue-600 font-semibold">Apply {selectedIndex === 0 ? 'primary build' : 'alternative build'}</button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
