# SPIRe plan

This plan covers the first useful, public, browser-only version. It records decisions to make before implementation; it is not a promise to build later product types now.

**Status:** Milestone 1 is complete. The current model also separates a configurable protection floor from upside and downside participation. That increment is recorded in [docs/participation-and-protection.md](docs/participation-and-protection.md).

## 1. Settle the first product definition

- Model the agreed first example as a note wrapper with bullet redemption, 100% contractual principal repayment at maturity, and upside participation. Keep these concepts separate.
- Define the terms precisely: principal amount, underlier kind, initial level, participation rate, and point-to-point final-level determination.
- Specify allowed values, rounding for displayed amounts, and what happens when a term is invalid.
- Write a small set of synthetic scenarios, including falling, flat, and rising underlier levels.

## 2. Model and verify the domain

- Create small TypeScript types for the wrapper, redemption behavior, underlier, determination method, payoff rule, and note terms.
- Implement a pure function for the contractual maturity payment and focused tests for scenarios and invalid inputs.
- Keep scenario inputs separate from the note's authoritative terms; derive returns and payments rather than storing them as product terms.

## 3. Build the first wizard

- Guide the learner through wrapper, redemption behavior, payoff, underlier and terms, then outcome exploration.
- Support only the verified first structure. Label future choices clearly as unavailable.
- Recalculate the payoff diagram, scenario table, and explanation when supported terms or the hypothetical final level change.
- Keep the interface usable on narrow screens and with keyboard navigation.

## 4. Document what we learn

- Record the first product's domain meaning and assumptions.
- Record the architecture choice to keep calculations separate from Vue.
- Add at least one synthetic product example with its expected scenarios.
- Keep unresolved questions visible instead of silently choosing rules.

## 5. Separate participation and protection

- Configure principal protection as a contractual payment floor from 0% through 100% of principal.
- Allow upside participation, downside participation, or both, while requiring at least one selected direction.
- Apply each selected participation rate before enforcing the protection floor; an unselected direction leaves principal unchanged.
- Keep coupons, buffers, barriers, and other payoff mechanics outside this increment.

## Deferred questions

- Which payoff mechanics can be combined independently of wrappers?
- When should observation and valuation schedules become explicit model concepts?
- Which terms are product economics, and which belong only to issuance?
- How should changes to authoritative terms invalidate derived results?

## Outside this milestone

Market pricing, implied volatility, Greeks, live data, coupons, caps, buffers, barriers, calls, baskets, booking, issuance workflows, documents, identifiers, regulatory processing, AI, and server infrastructure.
