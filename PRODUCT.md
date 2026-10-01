# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

In priority order, all exploring the page alone with nobody guiding them:

1. **The author**, who uses SPIRe to put their understanding of structured products into a form they can test and present. If the interface cannot express something, or a payoff contradicts what the author expects, that is a gap in understanding worth seeing.
2. **Newcomers to structuring**, learning what a product pays and why.
3. **Technology teams that support structuring desks**, who know software but not the finance, and want to see how a product breaks down into concepts, data and rules.

Wording stays neutral between investors and structurers (no "you" or "your" in concept copy).

## Product Purpose

SPIRe (Structured Products Interactive Reference) is a public learning tool. A reader assembles a small structured product from its parts and sees its contractual maturity payment, the rule behind it and the assumptions it rests on.

A reader succeeds when they leave able to:

- explain in plain words what the product pays at maturity, and why;
- see the product as separate concepts (wrapper, redemption behavior, term, underlier, determination, payoff features) and how they compose;
- notice what the model cannot express, or where it disagrees with their expectations;
- recognise the generic names a structure like this is commonly sold under.

## Positioning

A product shown as an outline of its concepts rather than a form or a pricer. Every concept sits beside its terms, and selecting one highlights it everywhere it acts: the summary sentence, payoff diagram, payment rule, worked calculation, scenario table and structure JSON. The data shape and the financial meaning are visible side by side, so the same page serves a learner and an engineer.

## Operating Context

- A static single-page site on GitHub Pages (`https://sthotakura.github.io/spire/`), opened by someone who arrives alone and explores without instructions.
- Readers use a desktop or laptop browser with a mouse and keyboard. Phones and touch are not a design target: the page should not break on a small screen, but phone layout, touch targets and touch gestures are not worked on.
- The reader starts from a note that only repays principal and adds features one at a time through a single **Add feature** entry point.
- Detailed definitions, decisions and open questions live in `docs/` and `PLAN.md`, not on the page.

## Capabilities and Constraints

- Wrappers: note and deposit (a deposit with upside participation, optionally capped or with a minimum return, is a market-linked deposit). Redemption: bullet.
- One equity or equity-index underlier; basket shown as unavailable.
- Determination: initial level given or by lookback; final level on the final date or averaged.
- Payoff features: upside participation, downside participation, principal protection, buffer, barrier, cap, minimum return. A product with none repays principal.
- Outputs: summary sentence, "Often marketed as" names, payoff diagram with draggable handles, payment rule in symbols and words, worked calculation, scenario table, structure JSON.
- Unsupported combinations and missing terms are explicit in interface state, with a concise learner-facing label, never roadmap language.
- Stack: TypeScript domain modules independent of Vue; Vue 3 + Vite; static build; no backend until a concrete need.
- Out of scope: pricing, market data, valuation, booking, issuance workflows, identifiers, document generation, regulatory processing, AI.
- Amounts are rounded to two decimals and carry no currency unit; the calculator is not a production money calculation.
- Analytics: GoatCounter aggregate page views, no cookies or personal data.

## Brand Commitments

- Name: **SPIRe** — Structured Products Interactive Reference.
- Intro copy: "Structured products, built from their parts." / "See how each feature changes what the product pays, and why."
- Footer carries only the author's name and the build time. The line under the tabs reads "All amounts are illustrative."
- Public concepts and synthetic examples only. No employer-specific terminology, schemas, workflows, business rules or architecture.
- Payoffs illustrate contractual payments under stated assumptions; they are not valuations, investment advice or guarantees of issuer payment.

## Evidence on Hand

- Domain records: `docs/` (participation and protection, buffer, barrier, averaging, lookback, term, deposit, underlier model, marketing names, feature map).
- Interface design record: `docs/annotated-outline-task.md`.
- Marketing-name rules drawn from public sources: `docs/marketing-names.md`.
- No testimonials, users, usage figures or endorsements exist. Do not fabricate any.

## Product Principles

1. **Concepts stay distinct.** Wrapper, redemption, underlier, determination, payoff and terms are separate parts, shown and modelled separately.
2. **Every number is traceable.** A payment can always be followed from the rule, through the calculation, to the terms that produced it.
3. **Honest about limits.** What the model cannot express is visible as unavailable, not hidden and not implied to work.
4. **Synthetic and public.** Every example, level and name is clearly synthetic and grounded in public definitions.
5. **One reader, alone.** The page must teach without a guide, for both a finance newcomer and a software engineer.

## Accessibility & Inclusion

Not decided. No formal standard has been chosen yet.
