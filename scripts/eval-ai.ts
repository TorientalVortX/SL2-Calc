import type { AiOptimizationMode, AiOptimizationRequest, BuildState } from '../src/types';
import { parseBuildFile } from '../src/domain/buildPersistence';
import { ENABLED_OPTIMIZER_REFERENCE_PROFILES } from '../src/data/optimizerProfiles';
import { runAiOptimization } from '../server/agentCore';

if (!process.env.OPENAI_API_KEY) {
  process.stderr.write('OPENAI_API_KEY is required. This command performs opt-in live API calls.\n');
  process.exit(1);
}

const requestedMode = process.env.AI_EVAL_MODE ?? 'both';
const modes: AiOptimizationMode[] = requestedMode === 'standard' ? ['standard'] : requestedMode === 'deep' ? ['deep'] : ['standard', 'deep'];

function profileBuild(profile: (typeof ENABLED_OPTIMIZER_REFERENCE_PROFILES)[number]): BuildState {
  const build = parseBuildFile(JSON.stringify({
    version: '0.5.0', buildName: `AI eval ${profile.id}`, race: profile.race, subrace: profile.subrace,
    mainClass: profile.primaryClass, subClass: profile.secondaryClass, characterLevel: 60,
    food: 'None', history: 'None', hpPercent: 100, karakuriYoukai: profile.karakuriYoukai ?? 'None',
  })).build;
  return build;
}

const rows: Array<Record<string, unknown>> = [];
for (const profile of ENABLED_OPTIMIZER_REFERENCE_PROFILES) {
  for (const mode of modes) {
    const request: AiOptimizationRequest = {
      build: profileBuild(profile), presetId: 'hybrid', constraints: [], locks: {}, defensePlan: 'auto', extraPackage: 'auto',
      referenceProfileId: profile.id, intent: `Use the supplied ${profile.name} popular build as evidence. Recover its proven concept or return a calculator-validated Pareto improvement.`,
      mode, assumedMainPassiveRank: 3, assumedSubPassiveRank: 3,
    };
    const started = performance.now();
    const response = await runAiOptimization(request);
    const match = response.result.candidates.some(candidate => candidate.patch.subClass === profile.secondaryClass
      && (!profile.canonicalWeaponId || candidate.patch.equipment?.primaryWeapon?.selectedWeaponName === profile.weapon.name));
    rows.push({
      profile: profile.id,
      mode,
      model: response.result.ai?.model,
      fallback: response.result.ai?.fallback,
      topThreeReferenceMatch: match,
      toolRounds: response.result.ai?.toolRounds,
      exactEvaluations: response.result.ai?.exactEvaluations,
      tokens: response.result.ai?.usage?.totalTokens,
      durationMs: Math.round(performance.now() - started),
      candidateIds: response.result.candidates.map(candidate => candidate.id),
      dataGaps: profile.dataGaps,
    });
  }
}

console.table(rows.map(row => ({
  profile: row.profile, mode: row.mode, model: row.model, fallback: row.fallback,
  match: row.topThreeReferenceMatch, rounds: row.toolRounds, tokens: row.tokens, ms: row.durationMs,
})));
process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);

if (rows.some(row => row.fallback || !row.topThreeReferenceMatch)) process.exitCode = 1;
