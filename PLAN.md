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

- Which payoff mechanics can be combined independently of wrappers? [docs/feature-map.md](docs/feature-map.md) sorts common note features into the concepts they belong to.
- When should observation and valuation schedules become explicit model concepts? A proposal models only dates on which something is observed, each on the concept that observes: the pricing and lookback dates on the initial level, and the observation dates on the final level. Issue and maturity dates belong to issuance and are left out ([docs/observation-dates.md](docs/observation-dates.md)). Dates change no payment built so far. **Daily close observation** looked like the first case that would, and section 26 built it without dates: the period is part of the definition, and a scenario states the lowest or highest close. Coupons and calls, whose conditions are observed on stated dates, are the first cases that would need dates.
- Which terms are product economics, and which belong only to issuance?
- How should changes to authoritative terms invalidate derived results?
- Would a capped, leveraged note also carry "Outperformance" in its name? The Swiss taxonomy describes that product without a cap, so the name is unverified and not shown.
- Is a note with upside participation but no downside participation principal-protected, given that it repays principal on a fall? The name rules look only at the protection term.

## Later exploration

- **Sentence builder.** Express the product as one readable sentence with inline choices, for example "A note that redeems at maturity and pays 100% of the upside of a synthetic index…". Each phrase maps to one concept (wrapper, redemption, payoff, underlier, terms) and opens a small picker with its hint, which shows that a product is a composition of distinct concepts.
- The read-only sentence summary now exists, and its phrases select the concept they describe. Making phrases editable remains an idea to try only if the read-only version proves useful.
- Open question: dates and amounts fit poorly inline, so they may stay as ordinary fields beside the sentence.
- **Glossary page.** An alphabetical list of the terms the app supports. The ⓘ hints and the Add feature descriptions already define each term where it is used, so a glossary would help only if readers need terms side by side or outside the builder. Considered and deferred until that need appears.

## 9. Make the chart evident

- Give each payoff feature its own colour, used the same way in the summary sentence, the outline, and the chart: downside participation orange, principal protection blue, upside participation green, cap magenta, and principal repaid slate. The set passes the dataviz palette check for lightness, chroma and colour-vision separation; red with green was rejected because it fails that check. Direct labels and a legend carry identity as well as colour. (Section 23 replaced the legend with labels on the line and a two-entry key.)
- Draw the payoff line in the colour of the rule that sets the payment at each level (`regimeOf` in `src/chart/geometry.ts`, derived from the payment breakdown), so the reader sees where the floor or cap binds.
- Colour the floor and cap guide lines and their handles to match, mark their labels with a matching swatch, and keep the initial-level and principal lines neutral. (Section 23 replaced the guide lines with droplines and labels.)

## 10. Model the underlier and explain the outline

- Nest the asset and the determination method under the underlier, in the domain, the Structure JSON and the outline alike. The outline and the JSON must keep the same shape: the JSON is how we test whether a product is expressed correctly.
- Give a single underlier a `components` list with exactly one entry, so a basket later only adds entries and a combination rule. Keep the initial level beside the asset, as a term of the note. (Superseded by section 18.) The model, decisions and open questions are in [docs/underlier-model.md](docs/underlier-model.md).
- Show a one-line meaning under each part of the outline, in neutral wording for investors and structurers alike, with fuller definitions in the ⓘ hints. (Later removed: shown only on the selected row, they made the outline jump on every selection. The ⓘ hints hold the meanings.)
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
- Add lookback on the initial level: the lowest of the initial-level term (the pricing-date level) and a stated number of levels observed after pricing, from 2 to 12. (The term moved into the determination in section 18.)
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
- **One barrier gating several features.** Verified in one product supplement: a single upside-barrier event cancels upside participation and changes the downside rate beyond the buffer ([docs/barrier.md](docs/barrier.md)). A second public note has one event, reached through an upper or a lower barrier on closing levels, that replaces absolute return on both a rise and a fall with a fixed return. How to model it is still open.

## 16. Add a barrier on downside participation

- Add a barrier as a sub-feature of downside participation: `{ "direction": "downside", "barrier": { "level": 0.7, "observation": "final" }, "rate": 1 }`. Downside participation applies, to the whole fall, only when the final level is strictly below the barrier; at or above it a fall leaves principal unchanged. The model, sources and worked example are in [docs/barrier.md](docs/barrier.md).
- Measure the barrier from the determined initial level: the initial level, or the lookback level when the note has lookback.
- Observe it on the final observation date only. Daily observation waits for observation dates.
- Keep the barrier and the buffer as separate features, not combined on the same downside participation until a public note is verified.
- Show the barrier in the outline, summary, Structure JSON, payment rule, calculation, outcome sentence, scenario table and chart, where the payoff line breaks at the jump rather than joining the two sides.
- Add a scenario row at the barrier level, marked "at barrier", so the table shows where a fall stops repaying principal as well as the breach. It moves with the barrier and replaces a fixed row at the same level.

## 17. Drop the payoff kind

- Remove `kind: 'participation'` from the payoff, in the domain and the Structure JSON. It had one value, and participation is now optional, so it described no note correctly. New payoff mechanics are added as features inside the payoff, and coupons will sit beside it, so a payoff kind would only suggest a product-type hierarchy the model avoids.
- Rename the `ProtectedParticipationNote` type to `Note`, since protection is optional too. No payment changes.

## 18. Move the initial level into the determination

- The outline showed "Initial level 100" under the asset and "Initial level: Lookback" under the determination: one name for two different values. The initial level now belongs to the determination, in the domain, the Structure JSON and the outline alike. The asset is only what is tracked.
- A fixed initial level is a term: `"initial": { "kind": "given", "level": 100 }`, entered under Initial level.
- Lookback states only its count: `"initial": { "kind": "lookback", "observationCount": 3 }`. The level on the pricing date is observed like the later ones, since public notes start the lookback period on the pricing date, so it is a scenario input, edited first in the calculation's `min(…)` and labelled "Pricing" there and on the chart.
- Switching between Fixed and Lookback keeps the reader's number. The chart's axis stays scaled on the pricing-date level.
- Open: a basket has one fixed initial level per asset but one determination, so the levels would be matched to the components ([docs/underlier-model.md](docs/underlier-model.md)).

## 19. Add a weighted basket

- Add a basket as a second kind of underlier: several components whose returns, each measured from its own initial level, are combined by weight into a basket level that starts at 100. The payoff reads the basket level as it reads a single asset's. The proposal, sources and worked example are in [docs/basket.md](docs/basket.md).
- Put each weight on its component, `{ "asset": {…}, "weight": 0.5 }`, and the rule that combines the component returns in the determination, after both ends: `"basketReturn": { "kind": "weighted" }`. Each initial level refers to its component by asset name, not by position. This replaced a `combination` beside the determination that held both the rule and the weights. Whether the rule belongs in the determination is to be revisited with worst-of.
- Let the reader add and remove components, at least two. Adding or removing one resets the weights to equal.
- Allow averaging: averaging each component and then weighting gives the same final level as averaging the basket level, and public notes use both. Show lookback as unavailable on a basket until a public note settles how it applies.
- Keep worst-of for a later increment.
- Build the domain first: the basket types, validation and `basketBreakdown`, which measures each component and returns the basket's two levels for the payoff.
- Keep the outline in the JSON's shape: one Asset row per asset with its kind, name and weight, the total of the weights beside Add asset, one level per asset under Initial level, and a Basket return row as the last part of Determination. Weights are entered as percents to two decimal places; equal weights give the remainder to the first asset (33.34%, 33.33%, 33.33%).
- Measure the chart, scenario table, barrier and buffer on the basket level. The final-level handle moves every asset's return by the same amount; each asset's final level, or its averaged levels, is edited in the calculation.
- Switching to a basket makes the single asset its first asset and adds a second with the same return, so the payment does not jump. Switching back keeps the first asset.

## 20. Add the term

- Add the term, the product's length, as a term of every product: `"term": { "months": 36 }`, at the top beside the principal amount. The proposal is in [docs/term.md](docs/term.md).
- The term is a duration, so it belongs to the structure. The issue and maturity dates that put it on a calendar belong to issuance and stay out.
- Use whole months, from 1 to 120. Terms in days need a day-count convention and are left out.
- Show it in the outline (a Term field on the Wrapper row, beside Principal, and highlighted with the wrapper as the principal is; whether both move to a product row of their own is open), the summary ("A 3-year note that…", "An 18-month note that…") and the Structure JSON. No payment changes; the existing tests pass unchanged apart from the new key and the summary's opening words.

## 21. Add a market-linked deposit

A market-linked deposit is a deposit that repays principal in full at the end of its term, plus a return linked to an underlier. Public market-linked CDs use upside participation, sometimes with a cap, averaging, a basket, or a minimum return. The proposal, the three public examples it rests on and worked examples are in [docs/deposit.md](docs/deposit.md).

A fixed deposit is not modelled. It has no underlier and no embedded option, so it is not a structured product, and it would have made the underlier optional for that one case. The fixed coupon proposed for it ([docs/coupon.md](docs/coupon.md)) waits for a structured product that pays one, such as a reverse convertible.

- **Rename `Note` to `Product`** first, since a deposit is not a note. No payment changes.
- **Deposit wrapper.** `wrapper: 'note' | 'deposit'`. A deposit is repaid in full (the MiFID II definition of a structured deposit), so it may not have downside participation, and with it a buffer or barrier, or a principal protection term. The underlier stays required.
- **Minimum return.** `"minimumReturn": 0.0525` on the payoff: the payment is at least principal × (1 + minimum return), applied after participation and the cap, where the protection floor is applied. It is a floor, not an addition: the public basket CD pays "the greater of" the participation amount and its minimum. Greater than 0%, below the cap when there is one, and on deposits only until a note with one is verified.
- **Annualised return.** Show `(payment ÷ principal)^(12 ÷ term months) − 1` as one derived line in the calculation, as the basket CD's table states an annual yield. It applies to every product, since every product has a term.
- **Averaging stays at 2 to 12 observations**, although the basket CD averages 28.
- **Interface.** Deposit in the Wrapper dropdown, marked unavailable with a reason while the product has downside participation or principal protection; on a deposit the Add feature menu marks those features "Not on a deposit", and Minimum return is marked "Deposits only" on a note. Switching never removes the reader's terms. The minimum return draws a floor line and handle in indigo (#4338ca), checked against the colours it shares a chart with. Copy that says "note" follows the wrapper.
- **Names.** "Market-linked deposit" (a market-linked CD in the US, a structured deposit in the EU and UK), added to [docs/marketing-names.md](docs/marketing-names.md).
- **Build order.** The rename; then the domain (wrapper rules, minimum return, payment), with tests built from the public examples; then the content (summary, JSON, payment rule, calculation, annualised return, outcome, scenarios, names); then the interface.

## 22. Add absolute return

Absolute return pays a fall within the buffer as a gain; beyond the buffer the holder bears the fall as before. Public "dual directional" notes pair it with upside participation. The proposal, the two public notes it rests on and a worked example are in [docs/absolute-return.md](docs/absolute-return.md).

- **A sub-feature of downside participation**, after the buffer: `{ "direction": "downside", "buffer": 0.15, "absoluteReturn": { "rate": 1 }, "rate": 1 }`. It requires a buffer or, since a public trigger note verified it, a barrier read on the final date, above which a fall is paid as a gain and below which the whole fall counts. Upside participation is not required.
- **The cap limits upside participation only.** The capped public note applies its maximum upside payment to a rise alone, and the cap is part of upside participation. The payment changes to match; no payment that could be written before changes.
- **The payment jumps at the buffer level**, which belongs to absolute return. The chart draws two pieces, as for the barrier, with a filled mark on the end the level pays and an open mark on the other, at the barrier's jump too. The buffer handle moves to the filled end. The scenarios add a row at the buffer level.
- **Build order.** The domain (rule, validation, the cap change), with tests built from the public examples; then the content (summary, JSON, payment rule, calculation, outcome, scenarios); then the interface.

## 23. Redesign the payoff chart

With several features the chart was accurate but hard to read. A public filing's payoff diagram reads more easily: it draws the note against a 1:1 underlier line, uses % change on the horizontal axis, and labels the features instead of relying on colour. The proposal, a before-and-after mock and the decisions are in [docs/payoff-chart.md](docs/payoff-chart.md). It changes how a payoff is drawn, not what any product pays.

- **Axis.** The horizontal axis is the underlier's change, fixed from −100% to +100% of the level the return is measured from (the initial, lookback or basket starting level). This replaces the axis in index levels scaled on the initial-level term (section 14); the vertical axis is unchanged. With lookback the pricing-date level has no reference line of its own; the calculation shows it.
- **The 1:1 line.** A neutral grey dashed line is the payment moving 1:1 with the underlier. Selecting a feature tints the gap it makes against it; nothing is tinted at rest.
- **Labels instead of a legend.** Each piece of the line gets a plain-words label from `src/content/chart-labels.ts`, placed in priority order by `placeLabels` in `src/chart/geometry.ts`, clear of the lines and each other, and dropped when there is no room. The legend becomes a two-entry key.
- **Less clutter.** Droplines replace the guide lines, the bubble gives the change, the level and the payment, and handles show on hover, focus or selection.

## 24. Publish the reader-facing book

Create a separate reader-facing book from stable material, while keeping the
existing `docs/*.md` files as working research and design records. The book's
working title is **Structured Products, Built from Their Parts**. The book and
the application share vocabulary and concepts, but the book teaches them in a
reader-friendly order rather than copying the Structure JSON exactly.

### Source boundary

Progress: 19 reader-facing draft chapters now cover the supported model,
including determination methods and market-linked deposits. The book view
discovers numbered Markdown chapters and provides contents and adjacent-chapter
navigation. The chapter map and source links are in `docs/book-outline.md`.
Coupons and scheduling remain planned. Hosted direct navigation and publication
still need verification; a successful build alone does not confirm them.

- Add `docs/book-outline.md` as the book index, chapter map and writing status.
- Add `docs/book/` for edited chapters intended for readers.
- Do not move or rewrite existing concept documents in this milestone.
- Existing concept documents remain the source material for definitions,
  assumptions, examples and open questions.
- Do not present project-specific assumptions as universal financial facts.

### Initial book outline

Use this order unless a later domain decision gives a clear reason to change it:

1. What is a structured product?
2. Wrapper
3. Redemption behaviour
4. Term
5. Underliers: single underlier, basket and determination methods
6. Payoff and payment
7. Participation: upside and downside
8. Principal protection
9. Cap
10. Buffer
11. Barrier
12. Absolute return
13. Combining payoff features
14. Worked synthetic examples
15. Payoff diagrams and scenarios
16. The structure as JSON
17. Coupons and other extensions
18. Observation dates and early redemption
19. Boundaries and open questions

The outline is an index, not a duplicate documentation system. Each entry
should link to its book chapter when one exists and to the relevant working
document while the chapter is being prepared.

### Chapter standard

Each reader-facing chapter should contain only material that helps a reader
understand the concept:

- public definition in plain language;
- why the concept exists;
- one small synthetic example;
- calculation, diagram or scenario where useful;
- relationship to nearby concepts;
- clearly labelled example assumptions and scope limits;
- a short open-questions note only where uncertainty matters to the reader.

Internal implementation debates, rejected alternatives, source-reading notes
and detailed architecture decisions stay in the working documents.

### Publishing approach

- Reuse the existing Vue/Vite GitHub Pages deployment.
- Render `docs/book/` as reader-facing routes under `/spire/book/`.
- Add a book index, previous/next chapter navigation and links back to the
  interactive builder.
- Keep the book statically generated; do not add a server or CMS.
- Preserve stable links to the repository's working documents where useful.

### Build order

1. Create `docs/book-outline.md` with chapter statuses and source links.
2. Write two stable pilot chapters: the introduction and wrapper.
3. Decide the smallest Markdown-to-page rendering approach that fits the
   current Vue build; avoid introducing a second hosting or site system.
4. Add the book index and chapter routes to the application.
5. Add reader-facing styling, navigation and links to the interactive example.
6. Build locally and verify direct navigation, refreshes and GitHub Pages base
   paths under `/spire/book/`.
7. Add further chapters only as concepts become stable enough to teach.

### Done when

- `docs/book-outline.md` exists and clearly distinguishes book chapters from
  working documents.
- At least two reader-facing chapters render from `docs/book/`.
- The book is reachable from the published SPIRe site and links back to the
  interactive builder.
- The existing application, tests and GitHub Pages deployment still build.
- No internal roadmap language or unresolved implementation debate is exposed
  as reader-facing explanation.

### Not part of this milestone

- Converting every existing document into a chapter.
- A guided course, quizzes, accounts, search or a CMS.
- Treating the book as a regulatory, investment or product-documentation guide.

## 25. Add a barrier on upside participation

Add a barrier as a sub-feature of upside participation: when the final level is above a level above the initial level, upside participation is cancelled and an optional fixed rebate is paid instead. With principal protection it gives the payoff publicly called a shark fin. The proposal, sources and worked example are in [docs/upside-barrier.md](docs/upside-barrier.md).

- **Final-date observation only**, as for the barrier on downside participation (section 16). The barrier reads the final level the determination produces, so the payment stays a function of the final level and the chart draws one line.
- **A simplification.** Public shark fin descriptions observe the barrier on closing levels on every day of a period, and a rebate is paid even if the underlier later falls back. The final-date version does not reproduce that; section 26 later added daily close observation, which does. The interface shows a "Shark fin note" chip for upside participation with an upside barrier (and no downside participation), and "Shark fin PP" with 100% protection. The final-date reason says how that contract differs; with daily observation the caveat is gone.
- **Direction states the effect:** a barrier on upside participation knocks out, one on downside participation knocks in, so no `effect` term yet. Barriers are named after the participation they control (downside barrier, upside barrier); the hints and the book introduce knock-in and knock-out.
- A cap and a barrier are not combined on upside participation. Keep the rest of the proposal's decisions unless a public note shows otherwise.
- **Build order.** The domain (rule, validation, tests for each row of the worked example), then the content (summary, JSON, payment rule, calculation, outcome, scenarios), then the interface, then the book chapters the proposal lists.

## 26. Observe a barrier on every close

Add a second observation for both barriers: every closing level from pricing to the final observation date, instead of the final date only. A downside barrier is then reached by one close below it and an upside barrier by one close at or above it, even if the underlier later recovers or falls back. The proposal, sources, worked examples and the departures from it are in [docs/daily-observation.md](docs/daily-observation.md).

- **`observation: 'final' | 'daily-close'`** on each barrier, with the final date still available. No dates or calendar are added.
- **One extra scenario input**, the lowest close (downside barrier) or the highest close (upside barrier), instead of a path of levels. Left unset it means no close went beyond the initial and final levels. Contradictory closes are rejected.
- **First version:** a single underlier with a fixed initial level, either final method. Unavailable with lookback, a basket and absolute return; a daily upside barrier needs a note with no downside participation.
- **The payment breakdown** gains `lowestClose` and `highestClose`, and `belowBarrier` is renamed `barrierReached`. The calculation, outcome, scenario rows, summary, payment rule and shark fin names read it; the scenario table adds a row where the barrier was reached and the underlier moved back.
- **The chart** draws a dashed line for the path where a close reached the barrier earlier, with its own label, beside the solid line for the path where none did. The final-level marker sits on whichever line the closes put it on.
- **Interface:** the Observed choice enables Daily close, with the reason when it is unavailable, and a lowest or highest close field appears in the calculation.
- **Still open:** a public shark fin term sheet for the upside barrier test, which section 27 settled as strictly above on the strength of one filing for a different product; lookback and basket; and whether the scenario's own path should be the solid line. Narrow screens, keyboard use and the scenario table were not checked in the running app.

## 27. Reach the upside barrier strictly above its level

The upside barrier was first reached at or above its level, an assumption from a shark fin term sheet that is not cited. One cited public filing, a two-sided barrier on closing levels with absolute return, tests its upper barrier as strictly greater than and its lower barrier as strictly less than ([docs/daily-observation.md](docs/daily-observation.md)). The model now reaches the upside barrier only strictly above its level, as the downside barrier is reached only strictly below. This is a change to a payment that could be written before: a level exactly at the barrier now pays the participation instead of the rebate.

- **The payment** reads `final level > barrier level` (or, observed daily, `highest close >`). At the barrier the note pays its largest payment, and the rebate starts just above.
- **The scenario table** keeps its row at the barrier, now the largest payment, and adds an "above barrier" row 5% of the initial level higher, so the drop stays visible.
- **The chart** puts the filled mark of the drop on the lower end, at the barrier, and the open mark on the rebate level above it; the label says "Above +30%". The other path of a daily barrier is sampled just above the barrier.
- **The wording** says "above" and "at or below" in the payment rule (`≤`), calculation, outcome, names and hints.
- **Revisit** if a public shark fin term sheet states the test differently.

## Later direction: a composable form

Eventually the outline should become a composable form, where the reader builds a note by dragging concepts into place. The model already suits this: the note is composed from small named parts rather than one universal object, the outline has the same shape as the Structure JSON, and each concept has its own row, colour and highlights. The form would be another way to edit the same tree. It is worth building once there are enough concepts to arrange; it is not planned yet.

Open questions:

- **Which concepts each slot accepts.** A payoff feature belongs under the payoff, not the underlier; an initial-level method belongs only in the initial level. These rules would sit in framework-independent TypeScript beside the validation.
- **Order within a slot.** The payment applies payoff features in a fixed order (buffer and participation, then the cap, then the floor), so dragging must not change the calculation. The form should snap features into that order, or show that the order is fixed.
- **Incomplete trees.** A tree is often unfinished while it is being built. The draft state and per-field issues carry over, but a dropped concept with no terms yet needs its own clear state.
- **Keyboard access.** Every drag needs a keyboard equivalent, as the Add feature palette and the chart handles have now.

## Later direction: break Payoff into sections

Payoff may eventually stop being one list of features and become several sections, for example with barriers and their observation moved out to a section of their own that payoff features refer to. This is a direction, not a plan: nothing is scheduled, and the current model stays as it is until a concrete need settles it.

- **Why it may be needed.** A barrier is nested under one participation direction today, so it can govern only that direction's feature, and a note with a barrier on each side needs two. Several restrictions come from that nesting rather than from the contracts they describe, such as a daily upside barrier needing a note with no downside participation. Barrier.md already records the alternatives: a barrier event that several features refer to, and a list of barriers.
- **A test case.** A public note observes an upper and a lower barrier on closing levels as one event that replaces absolute return, on both a rise and a fall, with a fixed return ([docs/daily-observation.md](docs/daily-observation.md)). It can be read as two barriers joined by "either", with observation stated once. It cannot be written in the current model.
- **What would carry over.** The `observation` term, the lowest and highest close as scenario inputs, the dashed other path on the chart, and the equality rules (a barrier is reached strictly beyond its level) do not depend on where the barrier lives.
- **Open questions.** Where observation belongs (its own section, on each barrier, or in Payoff), how a feature refers to a barrier or an event, and how the outline and Structure JSON keep the same shape when features no longer nest under a direction. The composable form above would need the same answers.

## Not planned

Market pricing, implied volatility, Greeks, live data, contingent and floating coupons, calls, booking, issuance workflows, documents, identifiers, regulatory processing, AI, and server infrastructure.
