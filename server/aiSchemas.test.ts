import { describe, expect, expectTypeOf, it } from 'vitest';
import { AI_OPTIMIZER_TOOLS } from './agentCore';
import {
  AI_TOOL_ARGUMENTS,
  aiOptimizationRequestSchema,
  aiSelectionSchema,
  strictJsonSchema,
  type UnlistedEquipmentLock,
  type UnlistedOptimizationMetric,
} from './aiSchemas';
import { OPTIMIZATION_PRESETS } from '../src/utilities/StatOptimizer';

/*
 * The wire format, frozen.
 *
 * These literals are the hand-written schemas the agent shipped with before the
 * schemas became Zod. They are kept here, and only here, so that generating the
 * tool parameters is provably not a change to what the model is sent: the
 * agent's prompt and tool behaviour were tuned against exactly these bytes. A
 * deliberate schema change means changing the literal too, in the same commit.
 */
const nullableString = { type: ['string', 'null'] };
const nullableNumber = { type: ['number', 'null'], minimum: 0 };
const additionalMinimumMetrics = [
  'youkaiCap', 'weaponCritical', 'weaponHit', 'weaponPower', 'evade', 'maxHP', 'fp', 'statusInfliction', 'statusResistance',
  'fireAttack', 'iceAttack', 'windAttack', 'earthAttack', 'darkAttack', 'waterAttack', 'lightAttack', 'lightningAttack', 'acidAttack', 'soundAttack',
];
const elements = ['Fire', 'Ice', 'Wind', 'Earth', 'Dark', 'Water', 'Light', 'Lightning', 'Acid', 'Sound'];
const additionalMinimumsSchema = {
  type: 'array', maxItems: 8, items: {
    type: 'object', additionalProperties: false,
    properties: { metric: { type: 'string', enum: additionalMinimumMetrics }, minimum: { type: 'number', minimum: 0 } },
    required: ['metric', 'minimum'],
  },
};
const loadoutAxesSchema = {
  type: 'object', additionalProperties: false,
  properties: { traits: { type: 'boolean' }, skills: { type: 'boolean' }, youkai: { type: 'boolean' } },
  required: ['traits', 'skills', 'youkai'],
};
const damageSkillsSchema = {
  type: 'array', maxItems: 4, items: {
    type: 'object', additionalProperties: false,
    properties: {
      label: { type: 'string' }, swaPercent: { type: 'number', minimum: 0 },
      element: { type: ['string', 'null'], enum: [...elements, null] },
      elementalAttackPercent: { type: 'number', minimum: 0 }, weight: { type: 'number', minimum: 0 },
    },
    required: ['label', 'swaPercent', 'element', 'elementalAttackPercent', 'weight'],
  },
};
const searchTuningProperties = {
  minimumEvade: nullableNumber, preferredEvade: nullableNumber, reliableBonusEvade: nullableNumber,
  minimumScaledDefense: nullableNumber, minimumScaledResistance: nullableNumber,
  minimumArmor: nullableNumber, minimumMagicArmor: nullableNumber,
  additionalMinimums: additionalMinimumsSchema,
  damageSkills: damageSkillsSchema,
  searchLoadout: loadoutAxesSchema,
};
const searchTuningRequired = [
  'minimumEvade', 'preferredEvade', 'reliableBonusEvade', 'minimumScaledDefense', 'minimumScaledResistance',
  'minimumArmor', 'minimumMagicArmor', 'additionalMinimums', 'damageSkills', 'searchLoadout',
];

const FROZEN_TOOL_PARAMETERS: Record<string, unknown> = {
  get_build_context: { type: 'object', additionalProperties: false, properties: {}, required: [] },
  get_reference_profiles: {
    type: 'object', additionalProperties: false,
    properties: { profileId: nullableString }, required: ['profileId'],
  },
  get_class_and_item_details: {
    type: 'object', additionalProperties: false,
    properties: {
      classNames: { type: 'array', items: { type: 'string' }, maxItems: 8 },
      weaponNames: { type: 'array', items: { type: 'string' }, maxItems: 8 },
      armorNames: { type: 'array', items: { type: 'string' }, maxItems: 8 },
    },
    required: ['classNames', 'weaponNames', 'armorNames'],
  },
  search_candidate_pool: {
    type: 'object', additionalProperties: false,
    properties: {
      presetId: { type: 'string', enum: Object.keys(OPTIMIZATION_PRESETS) },
      defensePlan: { type: 'string', enum: ['auto', 'tank', 'evade', 'bruiser', 'hybrid', 'glass'] },
      extraPackage: { type: 'string', enum: ['auto', 'critical', 'faith', 'sanctity', 'none'] },
      referenceProfileId: nullableString,
      searchDepth: { type: 'string', enum: ['standard', 'deep'] },
      resultLimit: { type: 'integer', minimum: 1, maximum: 8 },
      ...searchTuningProperties,
    },
    required: ['presetId', 'defensePlan', 'extraPackage', 'referenceProfileId', 'searchDepth', 'resultLimit', ...searchTuningRequired],
  },
  evaluate_candidates: {
    type: 'object', additionalProperties: false,
    properties: { ids: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 8 } },
    required: ['ids'],
  },
  refine_candidate: {
    type: 'object', additionalProperties: false,
    properties: {
      id: { type: 'string' },
      presetId: { type: 'string', enum: Object.keys(OPTIMIZATION_PRESETS) },
      defensePlan: { type: 'string', enum: ['auto', 'tank', 'evade', 'bruiser', 'hybrid', 'glass'] },
      extraPackage: { type: 'string', enum: ['auto', 'critical', 'faith', 'sanctity', 'none'] },
      referenceProfileId: nullableString,
      searchDepth: { type: 'string', enum: ['standard', 'deep'] },
      ...searchTuningProperties,
    },
    required: ['id', 'presetId', 'defensePlan', 'extraPackage', 'referenceProfileId', 'searchDepth', ...searchTuningRequired],
  },
  compare_with_reference: {
    type: 'object', additionalProperties: false,
    properties: { ids: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 8 }, profileId: { type: 'string' } },
    required: ['ids', 'profileId'],
  },
  validate_final_candidates: {
    type: 'object', additionalProperties: false,
    properties: { ids: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 3 } },
    required: ['ids'],
  },
};

const FROZEN_SELECTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    candidateIds: { type: 'array', items: { type: 'string' }, minItems: 0, maxItems: 3 },
    summary: { type: 'string' },
    clarification: { type: 'string' },
    rationale: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          id: { type: 'string' },
          reasons: { type: 'array', items: { type: 'string' }, maxItems: 5 },
          strengths: { type: 'array', items: { type: 'string' }, maxItems: 4 },
          weaknesses: { type: 'array', items: { type: 'string' }, maxItems: 4 },
          evidence: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 5 },
        },
        required: ['id', 'reasons', 'strengths', 'weaknesses', 'evidence'],
      },
    },
  },
  required: ['candidateIds', 'summary', 'clarification', 'rationale'],
};

const searchArguments = (overrides: Record<string, unknown> = {}) => ({
  presetId: 'hybrid',
  defensePlan: 'auto',
  extraPackage: 'auto',
  referenceProfileId: null,
  searchDepth: 'standard',
  resultLimit: 3,
  minimumEvade: null,
  preferredEvade: null,
  reliableBonusEvade: null,
  minimumScaledDefense: null,
  minimumScaledResistance: null,
  minimumArmor: null,
  minimumMagicArmor: null,
  additionalMinimums: [],
  damageSkills: [],
  searchLoadout: { traits: false, skills: false, youkai: false },
  ...overrides,
});

describe('generated tool schemas', () => {
  it('emits the wire format the agent shipped with', () => {
    for (const [name, schema] of Object.entries(AI_TOOL_ARGUMENTS)) {
      expect(strictJsonSchema(schema), name).toEqual(FROZEN_TOOL_PARAMETERS[name]);
    }
  });

  it('describes exactly the tools the server can execute', () => {
    expect(AI_OPTIMIZER_TOOLS.map(tool => tool.type === 'function' && tool.name)).toEqual(Object.keys(AI_TOOL_ARGUMENTS));
    for (const tool of AI_OPTIMIZER_TOOLS) {
      expect(tool.type).toBe('function');
      if (tool.type !== 'function') continue;
      expect(tool.strict).toBe(true);
      expect(tool.description?.length ?? 0).toBeGreaterThan(0);
      expect(tool.parameters).toEqual(FROZEN_TOOL_PARAMETERS[tool.name]);
    }
  });

  it('emits the frozen response format for the final selection', () => {
    expect(strictJsonSchema(aiSelectionSchema)).toEqual(FROZEN_SELECTION_SCHEMA);
  });
});

describe('tool argument parsing', () => {
  it('accepts a complete search call', () => {
    const parsed = AI_TOOL_ARGUMENTS.search_candidate_pool.safeParse(searchArguments({
      additionalMinimums: [{ metric: 'evade', minimum: 195 }],
      damageSkills: [{ label: 'Fireball', swaPercent: 0, element: 'Fire', elementalAttackPercent: 250, weight: 1 }],
    }));
    expect(parsed.success).toBe(true);
  });

  it('rejects a metric outside the additionalMinimums vocabulary', () => {
    const parsed = AI_TOOL_ARGUMENTS.search_candidate_pool.safeParse(searchArguments({
      additionalMinimums: [{ metric: 'encumbrance', minimum: 5 }],
    }));
    expect(parsed.success).toBe(false);
  });

  it('rejects a defense plan the optimizer has no branch for', () => {
    expect(AI_TOOL_ARGUMENTS.search_candidate_pool.safeParse(searchArguments({ defensePlan: 'unkillable' })).success).toBe(false);
  });

  it('rejects an element the calculator does not model', () => {
    const parsed = AI_TOOL_ARGUMENTS.search_candidate_pool.safeParse(searchArguments({
      damageSkills: [{ label: 'Void', swaPercent: 100, element: 'Void', elementalAttackPercent: 0, weight: 1 }],
    }));
    expect(parsed.success).toBe(false);
  });

  it('rejects a result limit beyond the exact-evaluation budget', () => {
    expect(AI_TOOL_ARGUMENTS.search_candidate_pool.safeParse(searchArguments({ resultLimit: 40 })).success).toBe(false);
    expect(AI_TOOL_ARGUMENTS.search_candidate_pool.safeParse(searchArguments({ resultLimit: 2.5 })).success).toBe(false);
  });

  it('requires at least one id where the tool declares one', () => {
    expect(AI_TOOL_ARGUMENTS.evaluate_candidates.safeParse({ ids: [] }).success).toBe(false);
    expect(AI_TOOL_ARGUMENTS.validate_final_candidates.safeParse({ ids: ['a', 'b', 'c', 'd'] }).success).toBe(false);
  });

  it('rejects arguments that are not an object', () => {
    expect(AI_TOOL_ARGUMENTS.get_build_context.safeParse(null).success).toBe(false);
    expect(AI_TOOL_ARGUMENTS.get_build_context.safeParse({}).success).toBe(true);
  });
});

describe('the final selection', () => {
  const rationale = { id: 'a', reasons: [], strengths: [], weaknesses: [], evidence: ['01-core-mechanics/apt.md'] };

  it('accepts a grounded selection', () => {
    expect(aiSelectionSchema.safeParse({ candidateIds: ['a'], summary: 's', clarification: '', rationale: [rationale] }).success).toBe(true);
  });

  it('rejects a rationale that cites nothing', () => {
    const parsed = aiSelectionSchema.safeParse({
      candidateIds: ['a'], summary: 's', clarification: '', rationale: [{ ...rationale, evidence: [] }],
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects more candidates than the agent is allowed to return', () => {
    expect(aiSelectionSchema.safeParse({ candidateIds: ['a', 'b', 'c', 'd'], summary: 's', clarification: '', rationale: [] }).success).toBe(false);
  });
});

describe('the browser request', () => {
  const formatIssues = (parsed: { success: false; error: { issues: Array<{ path: PropertyKey[] }> } }) =>
    parsed.error.issues.map(issue => issue.path.join('.')).join(', ');
  const validRequest = {
    build: { race: 'Human', subrace: 'Imperialist', mainClass: 'Duelist', subClass: 'Ghost', characterLevel: 60, addedStats: {} },
    presetId: 'hybrid',
    constraints: [{ metric: 'evade', minimum: 195 }],
    locks: { subClass: 'Ghost', armorType: 'Light' },
    defensePlan: 'evade',
    extraPackage: 'auto',
    intent: 'A duelist that survives.',
    mode: 'standard',
  };

  it('accepts the payload the calculator posts and carries the build through whole', () => {
    const parsed = aiOptimizationRequestSchema.safeParse(validRequest);
    expect(parsed.success).toBe(true);
    // Fields beyond the ones the server reads are BuildState's own and must survive.
    expect(parsed.success && parsed.data.build.addedStats).toEqual({});
  });

  it('rejects a constraint naming a metric the optimizer cannot score', () => {
    const parsed = aiOptimizationRequestSchema.safeParse({ ...validRequest, constraints: [{ metric: 'vibes', minimum: 1 }] });
    expect(parsed.success).toBe(false);
    expect(parsed.success || formatIssues(parsed)).toContain('constraints.0.metric');
  });

  it('rejects an armor type lock that is not an armor type', () => {
    expect(aiOptimizationRequestSchema.safeParse({ ...validRequest, locks: { armorType: 'Plate' } }).success).toBe(false);
  });

  it('rejects a missing build', () => {
    expect(aiOptimizationRequestSchema.safeParse({ ...validRequest, build: undefined }).success).toBe(false);
    expect(aiOptimizationRequestSchema.safeParse(null).success).toBe(false);
  });
});

describe('vocabularies stay in step with src/types.ts', () => {
  it('lists every optimization metric', () => {
    expectTypeOf<UnlistedOptimizationMetric>().toBeNever();
  });

  it('lists every equipment lock the optimizer honours', () => {
    expectTypeOf<UnlistedEquipmentLock>().toBeNever();
  });
});
