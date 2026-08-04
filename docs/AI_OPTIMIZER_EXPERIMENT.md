# Private AI-assisted optimizer experiment

This branch combines a deterministic build search with a private OpenAI planning loop. It is intended for one local user and is not a deployment design.

## Runtime and key handling

- `npm run dev:ai` starts Vite and `server/aiOptimizerServer.ts` together.
- The companion server binds to `127.0.0.1:8787` and accepts only the optimizer and health routes.
- `OPENAI_API_KEY` is read by the Node process from ignored `.env.local`; no `VITE_` key exists and the key is never serialized to the client.
- Standard mode sends `gpt-5.6-terra` with medium reasoning. Deep mode sends `gpt-5.6-sol` with high reasoning.
- Responses API state is continued with `previous_response_id` for follow-up requests.
- Missing credentials, request failures, malformed output, cancellation, and tool-limit exhaustion produce a deterministic V2 result instead of an unvalidated AI build.

## Authority boundary

The model chooses an archetype, defense plan, damage path, profile priors, and promising search regions. Typed tools expose only bounded context and calculator-created candidates. A final AI answer can reference only IDs already held in the server session.

The calculator remains authoritative for:

- point budgets and stat caps;
- fixed race, subrace, main class, level, and bonuses;
- subclass and equipment locks;
- canonical class, weapon, and armor identities;
- weapon scaling and transformations represented in structured data;
- every reported stat and derived metric;
- final candidate validation.

The loop is capped at 10 tool-call rounds and 24 exact surfaced candidate evaluations. Unknown IDs, altered fixed choices, malformed tool arguments, and unvalidated final selections are rejected.

## Deterministic V2 search

V2 searches subclass, stats, primary weapon, and torso armor. It starts from popular-profile and archetype seeds, uses Pareto beam allocation across offense, accuracy, durability, resource sustainability, utility, guide fit, and profile fit, and then performs deterministic stat-swap refinement. Candidate selection preserves meaningful class/equipment diversity instead of reducing all goals to one keyword or scalar score.

Popular builds are evidence, priors, and regression fixtures. They are not templates. Profile-specific targets can supersede generic guide defaults, and missing canonical items such as Tricky Yoyo or Hissei remain explicit data gaps.

## Knowledge maintenance

Structured evidence lives in `src/data/content/optimizer-knowledge.json`. It records archetypes, defense plans, damage paths, class-pair evidence, required mechanics, provenance, and confidence. Additional personal Markdown notes can be placed in `optimizer-knowledge/` without changing agent code.

Reference documents and notes are quoted to the planner as evidence and are marked as untrusted. They cannot create calculator facts or override locks. Historical and version-sensitive mechanics remain in the verification report until represented by authoritative structured data.

## Verification

Run the local quality gates with:

```sh
npm run check
npm run build
```

Normal tests mock the Responses API and never make a live model call. `npm run eval:ai` is the explicit live path and requires `OPENAI_API_KEY`. Its seven-profile benchmark requires the represented subclass and weapon in the top three unless the profile item is explicitly unavailable or a same-constraint candidate formally dominates it.
