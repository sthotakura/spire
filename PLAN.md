# SPIRe plan

This plan covers the first useful, public, browser-only version. It records decisions to make before implementation; it is not a promise to build later product types now.

**Status:** Milestone 1 is complete. The model separates a configurable protection floor from upside and downside participation ([docs/participation-and-protection.md](docs/participation-and-protection.md)), and every payoff feature is optional. The interface is an outline of the note with a live payoff, calculation and structure JSON, recorded in [docs/annotated-outline-task.md](docs/annotated-outline-task.md).

## 1. Settle the first product definition

- Model the agreed first example as a note wrapper with bullet redemption, 100% contractual principal repayment at maturity, and upside participation. Keep these concepts separate.
- Define the terms precisely: principal amount, underlier kind, initial level, participation rate, and point-to-point final-level determination.
- Specify allowed values, rounding for displayed amounts, and what happens when a term is invalid.
- Write a small set of synthetic scenarios, including falling, flat, and rising underlier levels.

## 2. Model and verify the domain

- Create small TypeScript types for the wrapper, redemption behavior, underlier, determination method, payoff rule, and note terms.
- Implement a pure function for the contractual maturity payment and focused tests for scenarios and invalid inputs.
- Keep scenario inputs separate from the note's authoritative terms; derive returns and payments rather than storing them as product terms.

## 3. Build the interface

- Show the note as an outline of its concepts: wrapper, redemption behavior, underlier, determination method, and payoff. Each term sits beside the concept it belongs to: principal with the wrapper, name and type with the underlier, initial level with the determination method, and rates and protection with the payoff features.
- Start with a valid note whose payoff has no features. It only repays principal, and the reader adds downside participation, principal protection, and upside participation one at a time.
- Support only the verified first structure. Unsupported wrappers, redemption behaviors, and payoff features stay visible and are marked unavailable.
- Keep these in step and let the reader select a concept to highlight it everywhere: a one-sentence summary of the note, the structure JSON, the payoff diagram with draggable handles, the worked calculation, and the scenario table.
- Recalculate all of them when terms or the hypothetical final level change.
- Keep the interface usable on narrow screens and with keyboard navigation.

## 4. Document what we learn

- Record the first product's domain meaning and assumptions.
- Record the architecture choice to keep calculations separate from Vue.
- Add at least one synthetic product example with its expected scenarios.
- Keep unresolved questions visible instead of silently choosing rules.

## 5. Separate participation and protection

- Configure principal protection as a contractual payment floor from 0% through 100% of principal.
- Allow upside participation, downside participation, or both. (Section 6 later made participation optional.)
- Apply each selected participation rate before enforcing the protection floor; an unselected direction leaves principal unchanged.
- Keep coupons, buffers, barriers, and other payoff mechanics outside this increment.

## 6. Make payoff features optional

- Let a payoff have no participation and no protection, so the starting note only repays principal.
- Make principal protection optional. Without it the floor is zero, because a holder cannot lose more than the principal amount.
- Derive the calculation, scenario table, and outcome sentence from one payment breakdown, so they cannot disagree with the maturity payment.

## Deferred questions

- Which payoff mechanics can be combined independently of wrappers?
- When should observation and valuation schedules become explicit model concepts? They are expected to belong to the payoff.
- Which terms are product economics, and which belong only to issuance?
- How should changes to authoritative terms invalidate derived results?
- Should the payoff kind be renamed now that participation is optional?

## Later exploration

- **Sentence builder.** Express the product as one readable sentence with inline choices, for example "A note that redeems at maturity and pays 100% of the upside of a synthetic index…". Each phrase maps to one concept (wrapper, redemption, payoff, underlier, terms) and opens a small picker with its hint, which shows that a product is a composition of distinct concepts.
- The read-only sentence summary now exists, and its phrases select the concept they describe. Making phrases editable remains an idea to try only if the read-only version proves useful.
- Open question: dates and amounts fit poorly inline, so they may stay as ordinary fields beside the sentence.

## Outside this milestone

Market pricing, implied volatility, Greeks, live data, coupons, caps, buffers, barriers, calls, baskets, booking, issuance workflows, documents, identifiers, regulatory processing, AI, and server infrastructure.
