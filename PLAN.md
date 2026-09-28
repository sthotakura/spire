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
- When should observation and valuation schedules become explicit model concepts? A proposal models only dates on which something is observed, each on the concept that observes: the pricing and lookback dates on the initial level, and the observation dates on the final level. Issue and maturity dates belong to issuance and are left out ([docs/observation-dates.md](docs/observation-dates.md)). Dates change no payment built so far.
- Which terms are product economics, and which belong only to issuance?
- How should changes to authoritative terms invalidate derived results?
- Should the payoff kind be renamed now that participation is optional?
- Would a capped, leveraged note also carry "Outperformance" in its name? The Swiss taxonomy describes that product without a cap, so the name is unverified and not shown.
- Is a note with upside participation but no downside participation principal-protected, given that it repays principal on a fall? The name rules look only at the protection term.

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

## 11. Add a buffer

- Add an optional buffer: the fall in the underlier the holder does not bear, as a fraction of the initial level, greater than 0% and at most 100%. Downside participation applies only to the fall beyond it. The model, decisions and worked example are in [docs/buffer.md](docs/buffer.md).
- Use the existing downside rate beyond the buffer, not a separate buffer rate.
- Keep a buffer without downside participation valid, with a note on its row that it has no effect, as for a cap without upside participation. (Superseded by section 15.)
- Allow a buffer together with a protection floor. This settles the open question from section 7: the holder bears only the losses between the two.
- Show the buffer in the outline (before downside participation), summary, structure JSON, chart (a vertical guide, a sideways handle, and its own colour, #1aa3b8, checked against the feature colours it can touch), payment rule, calculation, scenario table and outcome sentence.
- Name a buffer on downside participation a "Buffered note", following FINRA's description ([docs/marketing-names.md](docs/marketing-names.md)).

## 12. Add averaging

- Add averaging as a second determination method: the final level is the arithmetic average of a stated number of observed levels, from 2 to 12. The initial level stays a single term (averaging out only). The model, decisions and worked example are in [docs/averaging.md](docs/averaging.md).
- Keep the payoff unchanged: it reads the final level the determination produces, however it was measured.
- Treat the observed levels as scenario inputs, edited in the calculation. The chart handle moves them all together; the count is a note term, shown in the outline and the Structure JSON.
- Show averaging in the summary, payment rule, calculation (a step that averages the levels), outcome sentence, chart axis and scenario table. Lookback stays unavailable.

## 13. Add lookback

- Split the determination into its two ends: the initial level is fixed (`given`) or by lookback, and the final level is on the final date or averaged. Point-to-point is a fixed initial level and a final level on the final date. The model, decisions and worked example are in [docs/lookback.md](docs/lookback.md).
- Add lookback on the initial level: the lowest of the initial-level term (the pricing-date level) and a stated number of levels observed after pricing, from 2 to 12.
- Keep the payoff rule unchanged. The payment calculation takes the determined initial and final levels, and every calculation reads the determined initial level, so the return, scenario table, payoff and buffer are all measured from the lookback level. The chart's axis stays scaled on the initial-level term.
- Treat the levels after pricing as scenario inputs, edited in the calculation (`min(100, 97, 92, 95) = 92`). Only the count is a note term.
- Show lookback in the outline (Initial level and Final level as rows nested under Determination, each its own concept with its own colour and highlights), summary, payment rule, calculation, outcome sentence, scenario table and chart (the initial level and the lookback level as separate reference lines).
- Measure the buffer from the lookback level, as public lookback notes do ([docs/lookback.md](docs/lookback.md)).

## 14. Fit the chart's vertical axis

- Fit the vertical axis to the highest amount the chart shows (the payoff, and the cap line when there is a cap), with about 5% headroom, in round steps of principal (at most seven). This replaces the fixed 0 to 2 × principal axis, which squeezed a floor-to-cap band into about 15% of the plot's height.
- Keep zero at the bottom, so the chart never exaggerates a gain or a loss. This limits what fitting can do: a 900 to 1,200 band takes about 21% of the height instead of 15%, and 25% at most. The plot is about 40% taller as well, so the band also gets more room on screen.
- Hold the axis still during a pointer drag and refit it when the drag ends, so the line does not move under the pointer. A drag stops at the top of the axis in view; after release the axis refits with headroom, so the next drag can go further. Keys and typed values refit at once.
- The drag limits (upside rate 5% to 200%, cap 1% to 100%) are fixed values now, no longer derived from the axis.
- The final-level tooltip drops below its handle when it would cover the cap or upside handle, which the taller band made more likely.

## 15. Nest the buffer and cap under their directions

- A buffer only changes the fall downside participation applies to, and a cap only limits the return upside participation adds. Each is now a sub-feature of its direction, in the domain, the Structure JSON and the outline alike: `{ "direction": "downside", "buffer": 0.1, "rate": 1 }` and `{ "direction": "upside", "rate": 1.5, "cap": 0.2 }`. Keys stay in the order the payment applies them.
- A buffer without downside participation, or a cap without upside participation, can no longer be written, so the rows that said they had no effect are gone. The payment is unchanged in every case that could be written before and had an effect.
- The Add feature menu still lists Buffer and Cap, marked "Needs downside participation" or "Needs upside participation" until their direction is added. Removing a direction removes its buffer or cap.
- Selecting a direction highlights its buffer or cap as well, as selecting the determination highlights its levels.
- Principal protection stays a feature of the whole payoff. It bounds the payment, whatever raised or lowered it.
- Next: a barrier as a sub-feature of a direction. It does no arithmetic of its own; it switches the feature it belongs to on or off (knock-in or knock-out) when the underlier crosses a level. The first case is a knock-in on downside participation, observed on the final observation date. The proposal is in [docs/barrier.md](docs/barrier.md).

Open questions:

- **One cap in several places.** A cap could limit more than one feature, or the whole payment, once something other than upside participation can raise it (a coupon or a digital amount). Nesting it under upside participation leaves that open; it does not need solving yet.
- **A cap stated as an underlier level.** Some notes may state the cap as a level of the underlier rather than a maximum return. With a rate above 100% the two differ. Not yet verified in current public notes.
- **One barrier gating several features.** Some notes appear to switch more than one feature on a single barrier event. Not yet verified.

## Later direction: a composable form

Eventually the outline should become a composable form, where the reader builds a note by dragging concepts into place. The model already suits this: the note is composed from small named parts rather than one universal object, the outline has the same shape as the Structure JSON, and each concept has its own row, colour and highlights. The form would be another way to edit the same tree. It is worth building once there are enough concepts to arrange; it is not planned yet.

Open questions:

- **Which concepts each slot accepts.** A payoff feature belongs under the payoff, not the underlier; an initial-level method belongs only in the initial level. These rules would sit in framework-independent TypeScript beside the validation.
- **Order within a slot.** The payment applies payoff features in a fixed order (buffer and participation, then the cap, then the floor), so dragging must not change the calculation. The form should snap features into that order, or show that the order is fixed.
- **Incomplete trees.** A tree is often unfinished while it is being built. The draft state and per-field issues carry over, but a dropped concept with no terms yet needs its own clear state.
- **Keyboard access.** Every drag needs a keyboard equivalent, as the Add feature palette and the chart handles have now.

## Outside this milestone

Market pricing, implied volatility, Greeks, live data, coupons, barriers, calls, baskets, booking, issuance workflows, documents, identifiers, regulatory processing, AI, and server infrastructure.
