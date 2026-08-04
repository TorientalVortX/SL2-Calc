import { describe, expect, it } from 'vitest';
import type OpenAI from 'openai';
import type { Response } from 'openai/resources/responses/responses';
import type { AiOptimizationRequest, BuildState } from '../src/types';
import { parseBuildFile } from '../src/domain/buildPersistence';
import { runAiOptimization } from './agentCore';

function build(): BuildState {
  return parseBuildFile(JSON.stringify({
    version: '0.5.0', buildName: 'Agent fixture', race: 'Human', subrace: 'Imperialist',
    mainClass: 'Soldier', subClass: 'Soldier', characterLevel: 1, food: 'None', history: 'None', hpPercent: 100,
  })).build;
}

function request(): AiOptimizationRequest {
  return {
    build: build(), presetId: 'hybrid', constraints: [], locks: {}, defensePlan: 'hybrid', extraPackage: 'none',
    intent: 'Make a durable accurate weapon build.', mode: 'standard', previousResponseId: 'resp_previous',
    assumedMainPassiveRank: 0, assumedSubPassiveRank: 0,
  };
}

function response(id: string, output: Response['output'], outputText = ''): Response {
  return {
    id, object: 'response', created_at: 0, completed_at: 0, error: null, incomplete_details: null,
    instructions: null, max_output_tokens: 5000, model: 'gpt-5.6-terra', output, output_text: outputText,
    parallel_tool_calls: false, temperature: null, tool_choice: 'auto', tools: [], top_p: null,
    background: false, conversation: null, max_tool_calls: null, metadata: {},
    previous_response_id: null, prompt: null, prompt_cache_key: null, prompt_cache_retention: null,
    reasoning: null, safety_identifier: null, service_tier: 'default', status: 'completed', store: true,
    text: { format: { type: 'text' } }, truncation: 'disabled', usage: {
      input_tokens: 10, output_tokens: 5, total_tokens: 15,
      input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 }, output_tokens_details: { reasoning_tokens: 0 },
    },
  } as Response;
}

describe('AI optimizer agent core', () => {
  it('falls back to validated V2 candidates when no API key is configured', async () => {
    const value = await runAiOptimization(request(), { apiKey: '' });
    expect(value.result.engine).toBe('ai');
    expect(value.result.ai?.fallback).toBe(true);
    expect(value.result.candidates).toHaveLength(3);
    expect(value.result.candidates.every(candidate => candidate.patch.mainClass === 'Soldier')).toBe(true);
  });

  it('executes bounded tools and accepts only server-produced candidate IDs', async () => {
    const previousIds: Array<string | null | undefined> = [];
    let call = 0;
    let ids: string[] = [];
    const client = {
      responses: {
        create: async (params: { previous_response_id?: string | null; input?: unknown }) => {
          previousIds.push(params.previous_response_id);
          call++;
          if (call === 1) return response('resp_1', [{ type: 'function_call', call_id: 'call_context', name: 'get_build_context', arguments: '{}' }]);
          if (call === 2) return response('resp_2', [{
            type: 'function_call', call_id: 'call_search', name: 'search_candidate_pool',
            arguments: JSON.stringify({ presetId: 'hybrid', defensePlan: 'hybrid', extraPackage: 'none', referenceProfileId: null, searchDepth: 'standard', resultLimit: 3 }),
          }]);
          if (call === 3) {
            const outputs = params.input as Array<{ output: string }>;
            ids = (JSON.parse(outputs[0].output) as Array<{ id: string }>).map(item => item.id);
            return response('resp_3', [{ type: 'function_call', call_id: 'call_validate', name: 'validate_final_candidates', arguments: JSON.stringify({ ids }) }]);
          }
          return response('resp_4', [], JSON.stringify({
            candidateIds: [...ids, 'invented-candidate'].slice(0, 3), summary: 'Validated exact calculator candidates.', clarification: '',
            rationale: ids.map(id => ({ id, reasons: ['Exact tools support this result.'], strengths: ['Modeled performance.'], weaknesses: ['Class skills require verification.'], evidence: ['Calculator V2.'] })),
          }));
        },
      },
    } as unknown as OpenAI;
    const value = await runAiOptimization(request(), { apiKey: 'test-key', client });
    expect(value.result.ai?.fallback).toBe(false);
    expect(value.result.ai?.toolRounds).toBe(4);
    expect(value.result.ai?.exactEvaluations).toBe(3);
    expect(value.result.candidates.every(candidate => ids.includes(candidate.id))).toBe(true);
    expect(value.result.candidates.some(candidate => candidate.id === 'invented-candidate')).toBe(false);
    expect(previousIds).toEqual(['resp_previous', 'resp_1', 'resp_2', 'resp_3']);
  });

  it('falls back after malformed model output instead of applying unvalidated data', async () => {
    const client = { responses: { create: async () => response('bad_response', [], '{bad json') } } as unknown as OpenAI;
    const value = await runAiOptimization(request(), { apiKey: 'test-key', client });
    expect(value.result.ai?.fallback).toBe(true);
    expect(value.result.candidates.every(candidate => candidate.patch.mainClass === 'Soldier')).toBe(true);
  });

  it('does not let the model activate a reference profile the user did not select', async () => {
    let call = 0;
    let ids: string[] = [];
    let surfacedProfileFits: number[] = [];
    const client = {
      responses: {
        create: async (params: { input?: unknown }) => {
          call++;
          if (call === 1) return response('profile_1', [{
            type: 'function_call', call_id: 'call_search', name: 'search_candidate_pool',
            arguments: JSON.stringify({ presetId: 'hybrid', defensePlan: 'hybrid', extraPackage: 'none', referenceProfileId: 'amalgama-ghost-black-knight', searchDepth: 'standard', resultLimit: 3 }),
          }]);
          if (call === 2) {
            const outputs = params.input as Array<{ output: string }>;
            const candidates = JSON.parse(outputs[0].output) as Array<{ id: string; objectives: { profileFit: number } }>;
            ids = candidates.map(candidate => candidate.id);
            surfacedProfileFits = candidates.map(candidate => candidate.objectives.profileFit);
            return response('profile_2', [{ type: 'function_call', call_id: 'call_validate', name: 'validate_final_candidates', arguments: JSON.stringify({ ids }) }]);
          }
          return response('profile_3', [], JSON.stringify({
            candidateIds: ids, summary: 'Mechanics-first selection.', clarification: '',
            rationale: ids.map(id => ({ id, reasons: [], strengths: [], weaknesses: [], evidence: [] })),
          }));
        },
      },
    } as unknown as OpenAI;
    const value = await runAiOptimization(request(), { apiKey: 'test-key', client });
    expect(value.result.ai?.fallback).toBe(false);
    expect(surfacedProfileFits.every(fit => fit === 0)).toBe(true);
  });
});
