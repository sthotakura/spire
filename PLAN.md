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

- Show the note as an outline of its concepts: wrapper, redemption behavior, underlier, determination method, and payoff. Each term sits beside the concept it belongs to: principal with the wrapper, name, type and initial level with the asset under the underlier, the determination method under the underlier, and rates and protection with the payoff features. The underlier model is recorded in [docs/underlier-model.md](docs/underlier-model.md).
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

## 7. Cap the upside

- Add an optional cap: the maximum return on principal, greater than zero, applied to the payment before the protection floor.
- Allow participation above 100%, so that a cap can bind at a modest underlier rise.
- Show the cap in the outline, summary, structure JSON, chart (a line and a draggable handle), calculation, scenario table and outcome sentence, all from the same payment breakdown.
- Keep buffers, barriers, coupons and other payoff mechanics outside this increment. Whether a buffer and principal protection can be combined is still open.

## 8. Show marketing names

- Show the generic names a structure is commonly sold under, as chips under the summary sentence. Each chip opens a short reason. Rules and sources are in [docs/marketing-names.md](docs/marketing-names.md).
- Derive names from the note's terms in a pure function, `src/content/names.ts`. Several names can apply at once, and a note that fits none shows none.
- Use only generic public names: plain-language US investor material and the Swiss Structured Products Association's product types. Exclude branded names, and names that depend on buffers, barriers or coupons.
- Treat names as hints. The structure the reader built remains the authoritative description.

## Deferred questions

- Which payoff mechanics can be combined independently of wrappers?
- When should observation and valuation schedules become explicit model concepts? Observation dates look like part of the determination method, inside the underlier ([docs/underlier-model.md](docs/underlier-model.md)).
- Which terms are product economics, and which belong only to issuance?
- How should changes to authoritative terms invalidate derived results?
- Should the payoff kind be renamed now that participation is optional?
- Would a capped, leveraged note also carry "Outperformance" in its name? The Swiss taxonomy describes that product without a cap, so the name is unverified and not shown.
- Is a note with upside participation but no downside participation principal-protected, given that it repays principal on a fall? The name rules look only at the protection term.
- Parked: the payoff chart's fixed 0 to 2 × principal axis squeezes the floor-to-cap band into about 15% of its height. Options are a taller chart, a tighter fixed range (which limits dragging), or an axis fitted to the payoff that holds still during a drag and keeps zero at the bottom (recommended, but it reverses the fixed-axis decision).

## Later exploration

- **Sentence builder.** Express the product as one readable sentence with inline choices, for example "A note that redeems at maturity and pays 100% of the upside of a synthetic index…". Each phrase maps to one concept (wrapper, redemption, payoff, underlier, terms) and opens a small picker with its hint, which shows that a product is a composition of distinct concepts.
- The read-only sentence summary now exists, and its phrases select the concept they describe. Making phrases editable remains an idea to try only if the read-only version proves useful.
- Open question: dates and amounts fit poorly inline, so they may stay as ordinary fields beside the sentence.

## 9. Make the chart evident

- Give each payoff feature its own colour, used the same way in the summary sentence, the outline, and the chart: downside participation orange, principal protection blue, upside participation green, cap magenta, and principal repaid slate. The set passes the dataviz palette check for lightness, chroma and colour-vision separation; red with green was rejected because it fails that check. Direct labels and a legend carry identity as well as colour.
- Draw the payoff line in the colour of the rule that sets the payment at each level (`regimeOf` in `src/chart/geometry.ts`, derived from the payment breakdown), so the reader sees where the floor or cap binds.
- Colour the floor and cap guide lines and their handles to match, mark their labels with a matching swatch, and keep the initial-level and principal lines neutral.

## 10. Model the underlier and explain the outline

- Nest the asset and the determination method under the underlier, in the domain, the Structure JSON and the outline alike. The outline and the JSON must keep the same shape: the JSON is how we test whether a product is expressed correctly.
- Give a single underlier a `components` list with exactly one entry, so a basket later only adds entries and a combination rule. Keep the initial level beside the asset, as a term of the note. The model, decisions and open questions are in [docs/underlier-model.md](docs/underlier-model.md).
- Show a one-line meaning under each part of the outline, in neutral wording for investors and structurers alike, with fuller definitions in the ⓘ hints.
- Make determination a dropdown like the others, show digit separators in number fields, and drop the "units" label from amounts.
- Keep one **Add feature** entry point for payoff features; the empty payoff names two examples as plain text.
- Show the payment rule above the worked calculation, built from the features that are added, and name the asset wherever the final level appears, so a basket can later show one final level per asset.

## Outside this milestone

Market pricing, implied volatility, Greeks, live data, coupons, buffers, barriers, calls, baskets, booking, issuance workflows, documents, identifiers, regulatory processing, AI, and server infrastructure.
