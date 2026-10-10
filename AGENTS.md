# Working on SPIRe

SPIRe is a public learning project about structured products and their issuance concepts. Keep all examples synthetic and all explanations grounded in public concepts. Do not reproduce employer-specific terminology, schemas, workflows, business rules, or architecture.

## Scope and approach

- Build the smallest useful interactive reference first: one bullet note, one equity or equity-index underlier, and an upside participation payoff.
- Use TypeScript for domain calculations and validation, and Vue for the interface. Keep domain code independent of Vue.
- Treat the application as a static single-page app until a concrete requirement calls for a server.
- Keep instrument wrapper, redemption behavior, payoff, underlier, determination method, and terms conceptually distinct. Prefer composition and small named types over a universal `Deal` object or deep inheritance tree.
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

### Keep the book current

- Whenever introducing or materially changing a domain concept, create or update the corresponding reader-facing chapter in `docs/book/` and its entry in `docs/book-outline.md` in the same change. This is part of the definition of done.
- Keep chapter definitions, synthetic examples, assumptions, calculations, and any JSON examples consistent with the implemented domain rules. Review affected chapters when a shared rule changes.
- Keep internal discussion, implementation decisions, and unresolved research in the working documents under `docs/`. If a concept remains unresolved, mark it as planned in the outline rather than publishing an unsupported explanation.
- The payoff charts in `docs/book/charts/` are drawn from the running app by `scripts/book-charts.ts`. Run `npm run book-charts` and commit the result whenever the chart code changes, or a chapter's chart example changes. Add a chart by adding an entry to that script and embedding it with `![caption](charts/name.svg)`.
- Verify the book update as part of the change: check example calculations against the domain rules, confirm chapter links and outline status, and check rendering when adding a chapter or changing Markdown features. The book navigation discovers chapter files automatically; agents remain responsible for writing and verifying their content.

### Keep the schema current

- `docs/schema/product.schema.json` is generated from the domain types in `src/domain/note.ts`, so it shows every variant and feature of the structure. Whenever you add or change a field of the structure, write its JSDoc (a description and any numeric limits as tags such as `@exclusiveMinimum`, `@maximum` and `@asType integer`) and run `npm run schema` in the same change. This is part of the definition of done.
- Add an example product for each new feature to `scripts/product-examples.ts`. The schema publishes those examples, and the tests check that every one passes both the schema and `validateProduct`.
- A test fails if the committed schema is stale. Others check that its numeric limits and its two conditions agree with `validateProduct`, which states them a second time (extend the table of boundary cases when you add a limit), and that it reads well outside the repository: no repository file or research wording in a description, a description for every type, every union a `oneOf` with named variants, and nothing beside a `$ref`. Write descriptions for a reader of the schema, and keep file references in `//` comments, not JSDoc. Say when a limit belongs to this reference and not to the product type.
- The schema describes shape, variants and ranges, and two rules that tie fields together. The other such rules stay in `validateProduct`. Keep both lists in `scripts/product-schema.ts` (the rules written into the schema, and the rules only the validator checks) current, so a reader of the schema knows what it does not say.

## User-facing copy

- Keep option names and descriptions focused on the public financial concept they teach.
- Do not expose internal roadmap language, implementation status, planning notes, or phrases such as "later example" and "future example" in option descriptions.
- Communicate availability through interface state and a concise learner-facing label when needed; keep development rationale in `PLAN.md`, `docs/`, or code comments.

## Financial examples

Payoff diagrams and scenarios illustrate contractual payments under stated assumptions. They are not valuations, investment advice, or guarantees of issuer payment. Use clearly synthetic underliers, levels, amounts, and dates.
