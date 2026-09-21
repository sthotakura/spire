# Working on SPIRe

SPIRe is a public learning project about structured products and their issuance concepts. Keep all examples synthetic and all explanations grounded in public concepts. Do not reproduce employer-specific terminology, schemas, workflows, business rules, or architecture.

## Scope and approach

- Build the smallest useful interactive reference first: one bullet note, one equity or equity-index underlier, and an upside participation payoff.
- Use TypeScript for domain calculations and validation, and Vue for the interface. Keep domain code independent of Vue.
- Treat the application as a static single-page app until a concrete requirement calls for a server.
- Keep wrapper, payoff, underlier, determination method, terms, and lifecycle behavior conceptually distinct. Prefer composition and small named types over a universal `Deal` object or deep inheritance tree.
- Make unsupported combinations and missing terms explicit. Do not assign behavior to a financial concept without a verified definition and stated assumptions.
- Do not add pricing, market data, booking, issuance workflows, identifiers, document generation, regulatory processing, AI, microservices, or distributed infrastructure to the first milestone.

## Guidance for Code Changes

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Before implementing a significant concept

1. Explain its domain meaning independently of code.
2. Propose the smallest model and describe the payoff or behavior.
3. State assumptions and unresolved questions. Explain trade-offs when more than one model is reasonable.
4. Implement only the agreed scope, with focused tests for domain rules.
5. Update the relevant Markdown documentation when understanding or decisions change.

## Documentation

Keep `README.md` as the public entry point and `PLAN.md` as the near-term work plan. As the project grows, record domain concepts, open questions, architecture decisions, and synthetic product examples under `docs/`. Distinguish established facts, example-specific assumptions, and open questions.

## Financial examples

Payoff diagrams and scenarios illustrate contractual payments under stated assumptions. They are not valuations, investment advice, or guarantees of issuer payment. Use clearly synthetic underliers, levels, amounts, and dates.
