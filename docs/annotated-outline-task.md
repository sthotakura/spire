# Task: a structure outline for people who explore alone

**Status:** implemented. This is the design record. Where the revision block below disagrees with the sections after it, the revision block is what was built.

Self-contained brief. Read `AGENTS.md` first. Its rules apply, especially: keep examples synthetic, ground every explanation in public concepts, distinguish established facts from assumptions and open questions, surgical changes, and the style of `src/style.css` (minified, one rule group per line).

This brief replaced the earlier card-stack brief, which has been deleted.

## Revision after step 5 (author's decisions)

These decisions override the sections below wherever they disagree.

- **Not on the public page, and deleted:** the notes (Established, Assumptions, Open questions, Try this), the "About this part" tab, and the "Boundaries of this model" section. `conceptNotes`, `ConceptNotes`, `tryThis`, `boundaries`, `generalOpenQuestions` and their test are gone from `src/content/concepts.ts`, which now only lists the concept ids. The definitions and open questions live in the docs. The page is the builder, the JSON, the calculation and the scenarios.
- **Structure JSON is its own panel**, always visible in the third column (below the other panels at narrower widths). It is not a tab. One of the intended readers is technical, so the structure is in plain view, with the selected concept's lines highlighted.
- **The tabs under the chart are "How the payment is worked out" (the default) and "Scenarios".**
- **Intro:** two lines, with no label above them. The headline is "Structured products, built from their parts." and the line under it is "See how each feature changes what a note pays at maturity, and why."
- **Outline copy for newcomers:** each part shows a one-line meaning under its name, in neutral wording (no "you" or "your"), because the reader may be an investor or a structurer. The ⓘ hints keep the fuller definitions. Determination is a dropdown like wrapper and redemption, with averaging and lookback listed as unavailable, and a "Final level" line points to the chart. Principal and initial level show digit separators, and amounts carry no unit label anywhere on the page, since the currency is synthetic. The empty payoff names two example features: "This note only repays principal. Add a feature, such as upside participation or principal protection, to change what it pays."
- **The underlier holds its asset and determination** ([underlier-model.md](underlier-model.md)). The outline and the Structure JSON have the same shape: Underlier (Single, with Basket unavailable), then Asset (type, name, initial level) and Determination nested under it. Selecting the underlier selects both. A JSON list appears as repeated rows with no heading row.
- **One way to add a feature:** the single **Add feature** button and its searchable list. There are no per-feature add buttons, in the empty state or anywhere else, and the example feature names in the empty-state text are plain text, not links. One entry point scales as the feature list grows and keeps the outline uncluttered.
- **Attribution and disclaimers:** the name stays in the footer, and the line under the tabs reads "All amounts are illustrative." The footer carries only the name and the build time.

## Why this task exists

The author's goals, in order:

1. **First, for the author:** put their understanding of structured products into a form they can test and present. If the interface cannot express something, or a payoff contradicts what the author expects, that is a gap in understanding worth seeing.
2. **Then, for other people**, who open a page and explore it alone:
   - newcomers to structuring, and
   - technology teams that support structuring desks: they know software, not the finance, and want to see how a product breaks down into concepts, data and rules.

Nobody guides the reader through the page, and the reader can tell who built it from the footer.

The current builder is a stack of five cards that unlock in order. It works, but it is a form, not a picture of the product. It hides the shape of the structure, cannot grow to more concepts, and says nothing about what the author knows and does not know. A throwaway clickable mock of the direction below was used as a visual reference while building it, and has since been deleted.

## Proposed design

One screen, three columns on wide screens:

```
 A note that redeems at maturity and repays its principal, linked to …   ← read-only summary sentence

 ┌ Structure ────────┐ ┌ Payoff at maturity ──────────┐ ┌ How the payment is worked out ┐
 │ Wrapper   Note ▾  │ │  chart, with a final-level    │ │ 1 Underlier return   +10%     │
 │ ├ Redemption      │ │  dot the reader can drag      │ │ 2 Participation      not added│
 │ ├ Underlier       │ ├───────────────────────────────┤ │ 3 Before protection  1,000    │
 │ ├ Determination   │ │ [About│Scenarios│JSON]        │ │ 4 Protection floor   not added│
 │ └ Payoff          │ │ Established / Assumption /    │ │ 5 Payment            1,000    │
 │    (nothing added │ │ Open question / Try this for  │ │ "The underlier rose 10%. …"   │
 │     yet)          │ │ the selected node             │ └───────────────────────────────┘
 │    ＋ Add feature  │ └───────────────────────────────┘
 └───────────────────┘
 Boundaries of this model: what it does not cover
```

### Start empty, then choose

The page opens on a valid note whose payoff has no features. It repays principal and nothing else, so the chart is a flat line at principal. The reader builds the payoff by adding features and sees each change on the chart, in the calculation, in the sentence and in the JSON.

- **The trunk is pre-set.** Wrapper (note), redemption (bullet) and determination (point-to-point) each have exactly one supported option, so there is nothing to choose. The starting values are principal 1,000, an equity-index underlier named "Synthetic Index", initial level 100 and a hypothetical final level of 110. The note pays 1,000 at every final level.
- **The empty state is an invitation.** Under Payoff, where the features will appear, show a short line saying the note only repays principal and that adding a feature changes what it pays (current wording in the revision block). Features are added only through the single searchable **Add feature** list, never through per-feature buttons.
- **Features come and go freely.** Any feature can be removed with its × button, including the last one, which returns the note to principal-only. A removed feature keeps its last value, so adding it back restores it.
- **Suggested first values when a feature is first added** (the author confirms): upside participation 100%, downside participation 100%, principal protection 90%. Adding downside participation alone visibly loses value as the final level falls. Adding protection then shows the floor stopping the fall.
- **The defaults live in one named constant.** A test checks that the starting note is valid (`noteIssues` returns nothing) and pays 1,000 at final levels of 0, 60, 100, 110 and 130.
- The worked examples in the docs keep their own numbers (90% protection, 150% upside, 100% downside). They are documentation, not defaults.

### Domain rule change (the author's decision)

The current rule "at least one participation direction must be selected" reflects the first example, "a participation note". Starting empty replaces it. The payoff becomes a set of features, and each is optional.

- **Participation is optional.** `participations` may be empty. With no participation in a direction, that direction leaves principal unchanged, as the docs already say for an unselected direction.
- **Principal protection is optional.** `principalProtection` becomes `number | undefined`. Absent means the feature has not been added. The Structure JSON then omits the key, so the JSON mirrors the outline one to one. Present values keep the existing range of 0% through 100%.
- **Without protection the floor is zero.** The payment cannot fall below zero: a holder cannot lose more than the principal amount. The author has confirmed this. It is not new behavior for a 0% protection value, which the model already allows. What is new is that absence and 0% pay the same but describe different structures.
- **Validation.** Remove the issue "Select at least one participation direction." Keep the duplicate-direction check, the rate check for participations that are present, and the protection range check when protection is present.
- **The payoff `kind` stays `'participation'` for now**, even though a payoff can have none. Renaming it is an open question, not part of this task.
- **Everything else follows.** `maturityPayment` treats absent protection as a floor of zero. Tests change with the rule. The docs change with the rule: `docs/participation-and-protection.md` ("At least one participation direction must be selected"), `README.md` ("At least one of upside or downside participation must be selected"), and the payoff and protection notes in `src/content/concepts.ts`.

### Summary sentence

A read-only sentence at the top describes the current note in plain words. The author has decided it stays. With the starting note: "A note that redeems at maturity and repays its principal, linked to Synthetic Index, measured point-to-point from 100." With everything added: "A note that redeems at maturity and pays 150% of the upside and 100% of the downside of Synthetic Index, measured point-to-point from 100, with 90% principal protection."

- It is derived from the note, never typed. Build it as a small pure function that returns segments, each with its text and the concept it describes, so it can be tested without Vue (`src/content/summary.ts`, already present and updated for optional features).
- Participation phrases appear only for directions that are present. "repays its principal" appears when there is no participation. The protection clause appears only when protection is present.
- Each concept phrase is a button that selects that concept, with the same effect as selecting it in the outline.
- It wraps onto as many lines as it needs. Do not truncate it. As features are added it will grow, and that is the moment to revisit it.

### Structure outline

- A tree of the concepts: wrapper at the root, then redemption, underlier, determination and payoff. Payoff holds its features: downside participation, principal protection, upside participation, only when added.
- Fields sit in their rows (principal with the wrapper, name and type with the underlier, initial level with the determination, each rate with its feature). There is no separate editor panel and no ordering or locking: the starting note is already valid.
- Wrapper and redemption are dropdowns that list every option. Unsupported options stay visible, marked "Unavailable". Reuse the existing option catalogs and their descriptions.
- **Add feature** opens a searchable list of payoff features, sorted alphabetically (`docs/participation-and-protection.md` records this decision): Barrier, Buffer, Cap, Coupon, Digital, Downside participation, Principal protection, Upside participation. A feature that is already added is shown as "Added". Unsupported features are listed and marked "Unavailable".
- Description text moves into ⓘ hints, which the app already uses.

### Plain-English result

Under the last row of the worked calculation, one short sentence explains the result at the current final level, in words. For example: "The underlier rose 10%. Upside participation of 150% adds 15% to principal, so the payment before protection is 1,150. The 900 floor does not apply, so the contractual payment is 1,150 units, 150 more than principal."

- It is derived, never typed. `explainOutcome` in `src/content/outcome.ts` is a pure function of the payment breakdown (below) and the note, tested without Vue.
- It says which way the underlier moved and by how much; which participation applied, or that none was selected in that direction so principal is unchanged; whether the floor applied, or that there is no protection; and the contractual payment compared with principal (more, less, or equal, in units).
- It says "contractual payment" and never implies a guarantee. The existing statement that payment depends on the issuer's ability to pay stays nearby.
- It sits in a polite live region and replaces the static `payoffExplanation` text.
- Test cases: a rise with upside selected; a rise with upside not selected; a fall with downside selected and above the floor; a fall where the floor applies; a fall with downside selected and no protection, including a fall that would take the payment below zero; a fall with downside not selected; a flat return; and the starting note with no features.

**Payment breakdown.** The calculation, the scenario table and this sentence need the same intermediate numbers, and `App.vue` currently recomputes them inline. Add `paymentBreakdown(note, finalLevel)` to `src/domain/note.ts`, returning the underlier return, the direction that applies, the participation rate (absent when the direction is not present), the participated return, the payment before protection, the floor (zero when protection is absent), whether the floor applies, and the payment. `maturityPayment` returns `paymentBreakdown(...).payment`, so its results for existing notes do not change.

### Worked calculation

Five steps: underlier return, participation, payment before protection, protection floor, payment at maturity. Steps for a feature that is not added stay visible, greyed, labelled "Not added", so the reader can see the slot each feature would fill.

### Selection ties the views together

Selecting a node (click, focus, or a click on the summary sentence) highlights:

- the JSON lines that node owns, and
- the chart element for it (floor line, slope, initial-level line), and
- the matching step in the worked calculation.

Selecting the payoff selects all of its features together.

### Payoff chart with drag handles

The chart is the place where a change becomes visible, so the reader can change the payoff by dragging it. Three handles:

| Handle | Where it sits | Dragging changes | Snaps to |
|---|---|---|---|
| **Floor** | On the protection line, near the left edge. Shown only while protection is present | Principal protection (%) | 1% |
| **Slope** | On the payoff line at 1.5 × the initial level. Shown only while upside participation is present | Upside participation rate (%) | 5% |
| **Final level** | On the payoff line at the hypothetical final level | The final level (a scenario input, not a note term) | 1 unit |

- **No downside handle.** Where the floor binds, the downside rate does not move the line, so a handle for it would be ill-defined. The rate stays editable in its row.
- **No floor line without protection.** The chart draws the protection line only while protection is present. The starting chart is a flat line at principal with the final-level dot on it.
- **The vertical axis is fixed** at 0 to 2 × principal while the reader drags. The current chart rescales its axis to the data. That would move the line under the pointer and make a drag jitter. Values beyond the axis are clipped, and the handle pins at the edge. Dragging clamps to what the axis can show. Typing in a field is not clamped this way. The field's own valid range (rate greater than zero, protection 0% to 100%) still applies.
- **Everything is one state.** A drag writes to the same values the outline fields use, so the fields, the JSON, the summary sentence and the calculation update as the reader drags.
- **Selection.** Pressing a handle selects the concept it edits (floor selects protection, slope selects upside), so the outline row, JSON lines and calculation step highlight.
- **A ghost line.** The payoff line from before the current gesture stays as a faint dashed line, so the reader can see what the change did. A gesture starts when a drag starts, an outline field takes focus, or a feature is added or removed. The ghost is hidden while it equals the current line.
- **Accessible.** Each handle is focusable with `role="slider"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow` and a text alternative such as "90% protection". Arrow keys change the value (floor ±1, slope ±5, final level ±1; Shift multiplies the step by 5). A visible focus ring is required. Hit areas are at least 44px across even though the drawn handle is smaller. Use pointer events with pointer capture so mouse, touch and pen behave the same.

### Scenarios

The current scenario table stays, as a "Scenarios" tab beside "About this part" and "Structure JSON" in the group under the chart. That saves space at 1280×720, and the table remains one click away. "About this part" is the default tab.

- It keeps its rows (final levels for -40%, 0%, +10% and +30%) and takes its numbers from `paymentBreakdown`.
- Columns follow the features that are present: a participation column per present direction, and "Payment before protection" only while protection is present. With no features it shows the final level, the underlier change and the payment.

### About this part

A panel in the same tab group shows the selected concept's notes in three labelled kinds, using the wording already in the docs, plus a fourth kind, "Try this" (below):

- **Established:** definitions from public concepts.
- **Assumption:** what this example takes as given.
- **Open question:** what the author has not resolved.

Where the docs say nothing, show "Not yet written" instead of inventing content. The point of the page is that its gaps are visible.

A fourth kind, **Try this**, gives a reader who is alone something to do: one action using the controls on the page, and what to notice.

- The wording is the author's. Where none is written, show "Not yet written".
- Suggestions for the author to revise (not final copy):
  - Downside participation: "Add downside participation, then drag the final-level dot down to 60. The payment falls with it."
  - Protection: "With downside participation added, add principal protection and drag the floor up and down. Watch where the fall stops."
  - Upside participation: "Add upside participation, then drag the slope handle up and down. The line above the initial level tilts; the line below it does not move."
  - Determination: "Change the initial level to 80 and see how the same final level gives a different return."

### Boundaries of this model

A section listing what the model does not express: the "no coupons, caps, buffers, barriers…" assumptions and the "outside this milestone" list. It is built from the same data as the notes, so the two cannot disagree.

### Attribution

- The name stays in the existing footer ("Built by Suresh Thotakura", with its link and the build time). Leave it as it is. There is no byline or project tagline at the top of the page.
- One short statement, near the boundaries section, that examples are synthetic, use public concepts, and are not valuations, investment advice, or guarantees of issuer payment. Reuse the wording in `README.md`.

## Content model

Notes live in a plain TypeScript module, separate from `src/domain/` and from Vue:

```ts
// src/content/concepts.ts
export type ConceptId = 'wrapper' | 'redemption' | 'underlier' | 'determination' | 'payoff' | 'protection' | 'upside' | 'downside'
export interface ConceptNotes { title: string; established: string[]; assumptions: string[]; open: string[]; tryThis: string[] }
export const conceptNotes: Record<ConceptId, ConceptNotes>
export const generalOpenQuestions: string[] // open questions in the docs that belong to no single concept
export const boundaries: string[]
```

Initial content is drawn only from `docs/milestone-1.md` and `docs/participation-and-protection.md`, sentence for sentence where possible. For example, wrapper: established "the wrapper is a note: a contractual promise by its issuer"; underlier: open "a basket is expected to become another kind of underlier"; determination: open "aggregation methods over a basket, such as worst-of and best-of, are expected to become determination options"; payoff: open "observation and valuation schedules are expected to belong to the payoff". An empty list is allowed and shows "Not yet written". `tryThis` starts empty for every concept and is written by the author. The payoff and protection notes are updated with the domain rule change above.

## Assumptions

- The starting note is valid, so no gating is needed. The existing `noteIssues` and `validateNote` stay as safety nets. Inputs clamp or snap back to valid values, so errors should be rare. If an issue does occur, list it under the row that owns the field, using `noteIssues`' `field`.
- Only a note, bullet redemption, point-to-point determination, and upside participation, downside participation and principal protection are supported.
- Without principal protection, the payment cannot fall below zero (confirmed by the author).
- Domain changes: `noteIssues` (already added), `paymentBreakdown`, and the optional participation and protection described above. Results for notes that were valid before this task do not change.

## Open questions for the author

- Review and complete the drafted notes in `src/content/concepts.ts`, and write the "Try this" wording per concept. Anything the docs do not say is blank on purpose.
- Decided: without protection the payment cannot fall below zero.
- Confirm the suggested first values for added features (100%, 100%, 90%).
- With protection but no participation, the sentence still says "with 90% principal protection", although protection has no effect on a note that only repays principal. Keep it (it reflects the structure) or hide it?
- Should the payoff's `kind` be renamed now that participation is optional?
- Decided: the summary sentence stays; the floor and slope handles are in scope; the scenario table stays as a tab; the payoff starts empty.

## Implementation steps

1. **Content and summary modules (done).** `src/content/concepts.ts`, `src/content/summary.ts` and their tests exist. They are updated in step 1c, and `tryThis` is added to `ConceptNotes` in step 5.
1b. **Payment breakdown and outcome sentence (done).** `paymentBreakdown` is in `src/domain/note.ts` and `maturityPayment` uses it. `explainOutcome` is in `src/content/outcome.ts`. Tests cover the breakdown fields and each outcome case.
1c. **Optional participation and protection (done).** `principalProtection` is optional, empty `participations` is valid, the "at least one direction" issue is gone, and absent protection is a floor of zero. `summary.ts`, `concepts.ts`, their tests, `docs/participation-and-protection.md` and `README.md` are updated. `App.vue` reads the optional protection as `?? 0` at five sites, a stopgap that step 2 removes.
2. **Outline and starting note (done).** The card stack is gone. `src/App.vue` renders the outline, `src/components/HintToggle.vue` holds the shared ⓘ hint, and `src/domain/starting-note.ts` holds the starting note, its final level and the first values for added features, with a test. The empty state, the searchable Add feature list, remove and restore all work. Issues show under the row that owns the field. Departures from this brief, to be revisited in later steps:
   - Wrapper and redemption are native `<select>` elements with unavailable options disabled and marked "(unavailable)". Native selects are accessible for free, but they cannot show each option's description.
   - Until step 4, the final-level field, slider, result box and outcome sentence sit at the top of the preview panel, and the existing chart, scenario table and JSON panel are unchanged apart from handling absent features.
   - The intro headline and paragraph were left for later and have since been rewritten.
   - The summary sentence is shown as plain text. Its phrases become selectable in step 3.
3. **Selection (done).** `selected` holds a concept id and starts on the payoff. Clicking or focusing an outline row, or clicking a phrase in the sentence, selects that concept. Adding a feature selects it, and removing the selected feature falls back to the payoff. `src/content/selection.ts` decides what is highlighted (the payoff includes its features) and `src/content/structure-json.ts` formats the note exactly as `JSON.stringify(note, null, 2)` does while tagging every line with its concept, both with tests. The outline row, sentence phrase, JSON lines and chart respond. On the chart, the payoff glows along the whole line, upside and downside glow along their own half, protection emphasises the floor line and label, and the determination emphasises the initial-level line. The calculation step and the slope handle do not exist yet, so their highlighting lands with step 4.
4. **Chart and calculation (done).** The chart has a fixed axis (0 to 2 × principal), a principal line, and three handles (floor, slope, final level) with pointer, keyboard and screen-reader support, plus the ghost line. The drag math is in `src/chart/geometry.ts` with tests. The worked calculation is built from `paymentBreakdown`: five steps, greyed "Not added" for absent features, highlighted for the selected concept, with the plain-English sentence beneath and the final-level field above. The slider and result box are gone, and the scenario table was already built from `paymentBreakdown`. Departures and leftovers:
   - The calculation sits inside the preview panel, under the chart, not in its own right-hand column. Step 7 decides the layout.
   - The chart is short (about 195 units of a 620-wide viewBox) and its text is small at desktop widths. The fixed axis also leaves the line in the middle of the plot for modest payoffs. Both are layout questions for step 7.
   - A handle is 44px across for hit purposes at every width, checked at 1280px and 375px.
   - Handle values are limited on drag and by arrow keys (protection 0 to 100, upside rate 5 to 200, final level 0 to 1.6 × the initial level). Typing in a field is not limited.
5. **About, scenarios and boundaries (done, then revised).** Built, then revised by the author: the About tab and the boundaries section were removed, the notes were deleted, the JSON returned to its own panel, and the tabs became "How the payment is worked out" and "Scenarios". What remains: `src/components/TabGroup.vue` (an accessible tab group with roving tabindex and Left, Right, Home and End keys) and `src/content/scenarios.ts` (scenario rows from `paymentBreakdown`, tested against `maturityPayment` for four different notes).
6. **Synthetic-examples statement (done, differently).** The boundaries section this step referred to was removed. The line under the tabs now reads "All amounts are illustrative.", and the footer stays as it was.
7. **Layout (done).** Three columns (outline, preview, JSON) from 1400px. From 900px to 1399px, two columns: the outline with the JSON stacked beneath it, beside the preview, which gets the wider column. Below 900px, one column: outline, preview, JSON. The sticky preview is gone. Chart text scales up (to 1.6 times) as the chart shrinks, so labels stay readable on a phone, and the tab labels wrap instead of scrolling. Checked at 1440×900, 1280×720, 1000, 820 and 375 wide: no horizontal page scroll, and no hint or palette popup outside the viewport at any of them.
8. **Docs (done).** `README.md` (Interface direction), `PLAN.md` (sections 3 and 6, status, deferred questions, sentence builder) and `docs/milestone-1.md` (architecture) describe the outline, the optional payoff features and the module layout. The card-stack brief is deleted, and nothing describes steps or cards as the interface.

## Out of scope

- Learn mode, lessons, predict-then-reveal, and any guided tour. These come after the model is solid.
- A downside-rate handle.
- Any change to payoff arithmetic for notes that were already valid, or to existing validation messages. The domain changes are those listed in the assumptions.
- Renaming the payoff `kind`.
- Editing through the summary sentence, and features beyond downside participation, principal protection and upside participation.
- Pricing, market data, and everything else `README.md` lists as a boundary.

## Rejected alternatives

- **The five-card stack:** it presents the product as a form and cannot grow to more concepts.
- **A horizontal strip of concept blocks:** breaks at seven or eight concepts and has no room for repeated instances.
- **A guided lesson path first:** it would put beginner explanations on top of a model whose gaps have not been made visible yet.
- **A prefilled starting note:** it needs no domain change, but the reader lands on a finished product and never sees what each feature adds.
- **One forced first choice ("rises, falls or both"):** it keeps the old rule but hides the empty state and forces an order.
- **Inventing definitions for the notes:** the notes are the author's understanding, so they come from the author's own docs.

## Done when

- `npm test` and `npm run build` pass.
- At about 1440×900 and 1280×720, the outline, chart and calculation are visible together without scrolling.
- The page opens on the starting note with no payoff features, and it pays 1,000 at every final level. Adding each feature changes the chart, the calculation, the scenario table, the sentence and the JSON, and removing it puts them back. No error appears at any point.
- Every concept shows its notes and its "Try this", or "Not yet written". Selecting a node highlights the matching JSON lines, chart element and calculation step.
- Unsupported wrappers, redemptions and payoff features are visible and marked "Unavailable", and none of them changes the payoff.
- At 375px width there is no horizontal page scroll.
- Keyboard-only use works for the outline, menus, the Add feature list, and all three chart handles.
- The plain-English sentence follows the final level and covers a rise, a fall, a flat return, floor applied or not, no protection, and no features.
- Dragging the floor or slope handle changes the protection or upside field, the JSON, the summary sentence and the calculation, with a ghost of the previous line, and the line does not jitter.
- The diff touches `src/App.vue` (and any extracted components), `src/style.css`, `src/domain/note.ts` and its tests, the files under `src/content/` and their tests, the drag-math module and its tests, `docs/participation-and-protection.md`, `README.md`, `PLAN.md`, and removes the old brief.
