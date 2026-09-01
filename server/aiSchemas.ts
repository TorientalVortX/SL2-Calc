import { z } from 'zod';
import type {
  Armor,
  ArmorConditionalPolicy,
  BuildState,
  ElementKey,
  OptimizationDefensePlan,
  OptimizationEquipmentLocks,
  OptimizationExtraPackage,
  OptimizationMetric,
} from '../src/types';
import { OPTIMIZATION_PRESETS } from '../src/utilities/StatOptimizer';

/*
 * One description per contract.
 *
 * Every schema here is both the JSON Schema the model is given and the parser
 * its reply is read with, so the two cannot drift: a tool whose arguments the
 * model was allowed to send is a tool whose arguments the server accepts, and
 * nothing else. `strictJsonSchema` emits the exact wire format these tools have
 * always been sent: aiSchemas.test.ts pins it against the hand-written schemas
 * this module replaced.
 */

export const ELEMENT_KEYS = [
  'Fire', 'Ice', 'Wind', 'Earth', 'Dark', 'Water', 'Light', 'Lightning', 'Acid', 'Sound',
] as const satisfies readonly ElementKey[];

/** Every metric a constraint may name. */
export const OPTIMIZATION_METRICS = [
  'str', 'wil', 'ski', 'cel', 'def', 'res', 'vit', 'fai', 'luc', 'gui', 'san', 'apt',
  'maxHP', 'fp', 'physicalDefense', 'magicalDefense', 'evade',
  'armor', 'magicArmor', 'equipmentLoad', 'battleWeightRemaining',
  'criticalEvade', 'statusInfliction', 'statusResistance',
  'initiative', 'youkaiCap', 'flanking', 'skillPool', 'luckStatusPercent',
  'battleWeight', 'encumbrance', 'weaponPower', 'weaponHit',
  'weaponCritical', 'weaponCriticalDamage', 'weaponSwa',
  'fireAttack', 'iceAttack', 'windAttack', 'earthAttack', 'darkAttack',
  'waterAttack', 'lightAttack', 'lightningAttack', 'acidAttack', 'soundAttack',
] as const satisfies readonly OptimizationMetric[];

/**
 * Resolves to `never` for as long as OPTIMIZATION_METRICS covers the union.
 * aiSchemas.test.ts asserts that, so adding a metric to src/types.ts without
 * listing it here fails `npm run typecheck:server`.
 */
export type UnlistedOptimizationMetric = Exclude<OptimizationMetric, (typeof OPTIMIZATION_METRICS)[number]>;

/** The subset a tool call may add a floor to. Prose may strengthen these, never weaken them. */
export const ADDITIONAL_MINIMUM_METRICS = [
  'youkaiCap', 'weaponCritical', 'weaponHit', 'weaponPower', 'evade', 'maxHP', 'fp', 'statusInfliction', 'statusResistance',
  'fireAttack', 'iceAttack', 'windAttack', 'earthAttack', 'darkAttack', 'waterAttack', 'lightAttack', 'lightningAttack', 'acidAttack', 'soundAttack',
] as const satisfies readonly OptimizationMetric[];

const DEFENSE_PLANS = ['auto', 'tank', 'evade', 'bruiser', 'hybrid', 'glass'] as const satisfies readonly OptimizationDefensePlan[];
const EXTRA_PACKAGES = ['auto', 'critical', 'faith', 'sanctity', 'none'] as const satisfies readonly OptimizationExtraPackage[];
const ARMOR_TYPES = ['Heavy', 'Light', 'Unarmored'] as const satisfies readonly Armor['type'][];
const ARMOR_CONDITIONAL_POLICIES = ['baseline', 'verified-current'] as const satisfies readonly ArmorConditionalPolicy[];
const SEARCH_DEPTHS = ['standard', 'deep'] as const;
const AI_MODES = ['standard', 'deep'] as const;

/* ------------------------------------------------------------------ *
 * JSON Schema emission
 * ------------------------------------------------------------------ */

type JsonSchemaNode = Record<string, unknown>;

const isNode = (value: unknown): value is JsonSchemaNode =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/**
 * Zod writes a nullable field as `anyOf: [{type: 'x'}, {type: 'null'}]`; the
 * strict schemas this agent has always sent use the equivalent `type: ['x', 'null']`.
 * Collapsing keeps the bytes the model sees unchanged. An `enum` has to admit
 * null explicitly once null joins the type list, or the enum would exclude it again.
 */
function collapseNullableUnions(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(collapseNullableUnions);
  if (!isNode(node)) return node;
  const mapped: JsonSchemaNode = {};
  for (const [key, value] of Object.entries(node)) mapped[key] = collapseNullableUnions(value);
  const branches = mapped.anyOf;
  if (!Array.isArray(branches) || branches.length !== 2) return mapped;
  const [value, nullBranch] = branches;
  if (!isNode(value) || !isNode(nullBranch) || nullBranch.type !== 'null' || typeof value.type !== 'string') return mapped;
  const { anyOf: _collapsed, ...siblings } = mapped;
  const result: JsonSchemaNode = { ...value, ...siblings, type: [value.type, 'null'] };
  if (Array.isArray(value.enum)) result.enum = [...value.enum, null];
  return result;
}

/** Strict-mode objects always carry `required`, including the empty ones Zod leaves it off. */
function withExplicitRequired(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(withExplicitRequired);
  if (!isNode(node)) return node;
  const mapped: JsonSchemaNode = {};
  for (const [key, value] of Object.entries(node)) mapped[key] = withExplicitRequired(value);
  if (isNode(mapped.properties) && !Array.isArray(mapped.required)) mapped.required = [];
  return mapped;
}

/** The strict-mode JSON Schema for a tool's `parameters` or a response format. */
export function strictJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const { $schema: _draft, ...emitted } = z.toJSONSchema(schema, { io: 'input', target: 'draft-2020-12' });
  return withExplicitRequired(collapseNullableUnions(emitted)) as Record<string, unknown>;
}

/* ------------------------------------------------------------------ *
 * Tool arguments
 * ------------------------------------------------------------------ */

const nullableString = z.string().nullable();
const nullableNonNegative = z.number().min(0).nullable();
const boundedNames = z.array(z.string()).max(8);
const candidateIdList = z.array(z.string()).min(1).max(8);

/**
 * The chosen-content axes a search may rewrite.
 *
 * Requesting an axis the user did not enable is a no-op, not an error: the
 * server intersects this with the user's own switches, so the model can narrow
 * but never widen.
 */
const loadoutAxes = z.strictObject({
  traits: z.boolean(),
  skills: z.boolean(),
  youkai: z.boolean(),
});

const additionalMinimums = z.array(z.strictObject({
  metric: z.enum(ADDITIONAL_MINIMUM_METRICS),
  minimum: z.number().min(0),
})).max(8);

const damageSkills = z.array(z.strictObject({
  label: z.string(),
  swaPercent: z.number().min(0),
  element: z.enum(ELEMENT_KEYS).nullable(),
  elementalAttackPercent: z.number().min(0),
  weight: z.number().min(0),
})).max(4);

/** Shared by both searches; declaration order is the order the model reads them in. */
const searchTuning = {
  minimumEvade: nullableNonNegative,
  preferredEvade: nullableNonNegative,
  reliableBonusEvade: nullableNonNegative,
  minimumScaledDefense: nullableNonNegative,
  minimumScaledResistance: nullableNonNegative,
  minimumArmor: nullableNonNegative,
  minimumMagicArmor: nullableNonNegative,
  additionalMinimums,
  damageSkills,
  searchLoadout: loadoutAxes,
} as const;

export const DEFENSE_CONTRACT_KEYS = [
  'minimumEvade', 'preferredEvade', 'reliableBonusEvade',
  'minimumScaledDefense', 'minimumScaledResistance', 'minimumArmor', 'minimumMagicArmor',
] as const;

const presetId = z.enum(Object.keys(OPTIMIZATION_PRESETS) as [string, ...string[]]);

export const AI_TOOL_ARGUMENTS = {
  get_build_context: z.strictObject({}),
  get_reference_profiles: z.strictObject({ profileId: nullableString }),
  get_class_and_item_details: z.strictObject({
    classNames: boundedNames,
    weaponNames: boundedNames,
    armorNames: boundedNames,
  }),
  search_candidate_pool: z.strictObject({
    presetId,
    defensePlan: z.enum(DEFENSE_PLANS),
    extraPackage: z.enum(EXTRA_PACKAGES),
    referenceProfileId: nullableString,
    searchDepth: z.enum(SEARCH_DEPTHS),
    resultLimit: z.int().min(1).max(8),
    ...searchTuning,
  }),
  evaluate_candidates: z.strictObject({ ids: candidateIdList }),
  refine_candidate: z.strictObject({
    id: z.string(),
    presetId,
    defensePlan: z.enum(DEFENSE_PLANS),
    extraPackage: z.enum(EXTRA_PACKAGES),
    referenceProfileId: nullableString,
    searchDepth: z.enum(SEARCH_DEPTHS),
    ...searchTuning,
  }),
  compare_with_reference: z.strictObject({ ids: candidateIdList, profileId: z.string() }),
  validate_final_candidates: z.strictObject({ ids: z.array(z.string()).min(1).max(3) }),
} as const;

export type AiToolName = keyof typeof AI_TOOL_ARGUMENTS;

/**
 * What the server accepts, as against what the tools advertise.
 *
 * The advertised schemas require every field, because OpenAI strict mode has no
 * notion of an optional one. A model that omits a tuning field anyway should not
 * lose a round to it. Every one of those falls back to the user's own setting,
 * which is the value the argument would have carried. What a tool *operates on*
 * stays required in both: candidate ids, item names and the profile being
 * compared have no sane default, so a missing one is a real error to report.
 */
const TOLERANT_TOOL_ARGUMENTS = {
  get_build_context: AI_TOOL_ARGUMENTS.get_build_context,
  get_reference_profiles: AI_TOOL_ARGUMENTS.get_reference_profiles.partial(),
  get_class_and_item_details: AI_TOOL_ARGUMENTS.get_class_and_item_details,
  search_candidate_pool: AI_TOOL_ARGUMENTS.search_candidate_pool.partial(),
  evaluate_candidates: AI_TOOL_ARGUMENTS.evaluate_candidates,
  refine_candidate: AI_TOOL_ARGUMENTS.refine_candidate.partial().extend({ id: z.string() }),
  compare_with_reference: AI_TOOL_ARGUMENTS.compare_with_reference,
  validate_final_candidates: AI_TOOL_ARGUMENTS.validate_final_candidates,
} as const satisfies Record<AiToolName, z.ZodType>;

export type AiToolArguments<Name extends AiToolName> = z.infer<(typeof TOLERANT_TOOL_ARGUMENTS)[Name]>;

/** The tuning block both searches accept, for the mappers that read it. */
export type SearchTuningArguments = AiToolArguments<'search_candidate_pool'> | AiToolArguments<'refine_candidate'>;

/* ------------------------------------------------------------------ *
 * The model's final answer
 * ------------------------------------------------------------------ */

export const aiSelectionSchema = z.strictObject({
  candidateIds: z.array(z.string()).min(0).max(3),
  summary: z.string(),
  clarification: z.string(),
  rationale: z.array(z.strictObject({
    id: z.string(),
    reasons: z.array(z.string()).max(5),
    strengths: z.array(z.string()).max(4),
    weaknesses: z.array(z.string()).max(4),
    evidence: z.array(z.string()).min(1).max(5),
  })),
});

export type AiSelection = z.infer<typeof aiSelectionSchema>;

/* ------------------------------------------------------------------ *
 * The browser's request
 * ------------------------------------------------------------------ */

const optimizationConstraint = z.object({
  metric: z.enum(OPTIMIZATION_METRICS),
  minimum: z.number(),
});

const equipmentLocks = z.object({
  mainClass: z.string().optional(),
  subClass: z.string().optional(),
  weaponName: z.string().optional(),
  weaponType: z.string().optional(),
  armorName: z.string().optional(),
  armorType: z.enum(ARMOR_TYPES).optional(),
});

const defenseContract = z.object({
  minimumEvade: z.number().optional(),
  preferredEvade: z.number().optional(),
  reliableBonusEvade: z.number().optional(),
  minimumScaledDefense: z.number().optional(),
  minimumScaledResistance: z.number().optional(),
  minimumArmor: z.number().optional(),
  minimumMagicArmor: z.number().optional(),
  requirePartialBattleWeight: z.boolean().optional(),
  armorConditionalPolicy: z.enum(ARMOR_CONDITIONAL_POLICIES).optional(),
});

/**
 * The payload the browser posts.
 *
 * `build` is checked at the edges the server itself reads and carried through
 * whole: BuildState is the entire calculator state, and the optimizer
 * normalizes what it consumes. Everything the search treats as a contract, on
 * the other hand, is validated here: this is the only place untrusted input
 * reaches the deterministic engine, and an unchecked metric name or passive
 * rank propagates into the score as silently as a valid one.
 */
export const aiOptimizationRequestSchema = z.object({
  build: z.looseObject({
    race: z.string(),
    subrace: z.string(),
    mainClass: z.string(),
    subClass: z.string(),
    characterLevel: z.number(),
    // The remaining BuildState fields are the calculator's own state, carried
    // through untouched. Only this cast asserts the whole shape, exactly as the
    // hand-written predicate this schema replaced did.
  }).transform(build => build as unknown as BuildState),
  presetId: z.string(),
  constraints: z.array(optimizationConstraint),
  locks: equipmentLocks,
  defensePlan: z.enum(DEFENSE_PLANS),
  defenseContract: defenseContract.optional(),
  extraPackage: z.enum(EXTRA_PACKAGES),
  referenceProfileId: z.string().optional(),
  intent: z.string(),
  mode: z.enum(AI_MODES),
  previousResponseId: z.string().optional(),
  searchMainClass: z.boolean().optional(),
  searchLoadout: loadoutAxes.partial().optional(),
  gauntletOpponentIds: z.array(z.string()).optional(),
  assumedMainPassiveRank: z.number(),
  assumedSubPassiveRank: z.number(),
});

/** Proves the locks schema still lists every lock the optimizer honours. */
export type ParsedEquipmentLocks = z.infer<typeof equipmentLocks>;
export type UnlistedEquipmentLock = Exclude<keyof OptimizationEquipmentLocks, keyof ParsedEquipmentLocks>;

/* ------------------------------------------------------------------ *
 * Parsing
 * ------------------------------------------------------------------ */

/** The first few problems, as a single line a model or an HTTP client can act on. */
export function formatSchemaIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 4)
    .map(issue => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ');
}

export function parseToolArguments<Name extends AiToolName>(name: Name, raw: unknown): AiToolArguments<Name> {
  const parsed = TOLERANT_TOOL_ARGUMENTS[name].safeParse(raw);
  if (!parsed.success) throw new Error(`${name} received invalid arguments: ${formatSchemaIssues(parsed.error)}`);
  return parsed.data as AiToolArguments<Name>;
}
