# AI Evaluation

> **Audience:** engineers and Claude Code working in this monorepo.
> **Status:** skeleton. Sections marked `TODO` are not written yet. Don't build an evaluation harness until they are.
> **Related:** [TEST_STRATEGY.md](TEST_STRATEGY.md) covers AI output only for structure and failure handling ([§5.5](TEST_STRATEGY.md#55-other-dependencies), [§7](TEST_STRATEGY.md#7-e2e-testing-playwright)). This document covers whether the answers are good.

---

## 1. Scope

This document covers evaluating the quality of AI output: prompt regression (did a prompt or model change make answers worse?) and answer accuracy.

It doesn't cover:

- Response structure, rate limits, timeouts or refusals. Those are tested with mocks under [TEST_STRATEGY.md §5.5](TEST_STRATEGY.md#55-other-dependencies).
- Connectivity to providers. That's one smoke check per provider, under [TEST_STRATEGY.md §8](TEST_STRATEGY.md#8-smoke-testing).

## 2. What is evaluated

TODO: list each AI feature to evaluate and what a good answer means for it. Candidates in the template are in `apps/sample-a2a-mcp-rag`:

- RAG answers (`rag_search` and the specialist agent): relevant, grounded in the retrieved documents.
- Supervisor routing (`src/a2a/supervisor.ts`): sends each query to the right specialist.

## 3. Dataset

TODO: where the labelled prompt set lives, who maintains it, and how it's versioned.

- All prompts and expected answers are synthetic, the same as all test data ([TEST_STRATEGY.md non-negotiable #1](TEST_STRATEGY.md#non-negotiables)). Never build the dataset from customer conversations.

## 4. Scoring

TODO: how each answer is scored (exact match, rubric, model-graded, human review), and the pass threshold per feature.

## 5. Models, budget and schedule

TODO: which models are called, the API budget per run, and when runs happen.

- Runs happen outside PR CI: started by hand, or on a schedule.
- This is the scoped exception to [TEST_STRATEGY.md non-negotiable #5](TEST_STRATEGY.md#non-negotiables) (no real AI calls in tests). No other tests call real providers.

## 6. Results

TODO: where results are stored, how a regression is reported, and whether a regression blocks a release or is advisory.
