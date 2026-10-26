# Calculation path

Built, replacing a first build that moved a dot through the calculation. The stages come from `lineStages` in `src/content/path.ts`, and what the line does not draw from `scenarioAside` beside it. Section 41 of [PLAN.md](../PLAN.md) summarises it. An animation on the payoff chart that builds the payoff line one rule at a time, in the order the calculation applies them, so the reader sees what each rule does to every outcome. It changes how the app explains a payment, not what any product pays.

## What it teaches

The payoff line shows the result of every rule at once. A reader sees its kinks but not which rule made which kink, or how much each rule moved the payment. The path starts from a payment that moves 1:1 with the underlier and applies the rules in turn: the buffer lifts the first part of a fall, participation tilts a slope, the cap flattens the top, a barrier drops a section. Each step reshapes the whole line, and the last step is the payoff line itself.

## Why not the dot

The first build moved one dot through the calculation for the reader's levels. It explained one number, and with reviews the chart had to stand for things it does not show: a review's level on an axis that means the final level, coupons paid before the end, a call that ends off the line. The rules for those were correct, and each needed reading in the bar to be understood. Reviews happen over time and the payoff chart has no time axis. The line-building path keeps to what the chart shows, the payment at the end against the final level, and leaves reviews over time to a timeline, if one is built.

## Decisions

1. **What moves.** The payoff line, from one rule's shape to the next. The reader's scenario point rides on it, so it is always on the line.
2. **The first stage is the 1:1 line.** It is already drawn, dashed, as the reference. The path starts by drawing it as the line, "a payment that moves 1:1 with the underlier", and each rule reshapes it from there.
3. **One stage per payoff rule, in the calculation's order.** The rules are those the calculation lists at maturity: barriers, buffer, absolute return, participation, upside barrier and rebate, cap, digital return, minimum return, protection floor. A product has the same stages whatever the final level, so every stage is a line across the whole axis.
4. **What changed is shown.** During a stage the previous line stays as the faint ghost line, as the line before an edit does, and the gap between the two is shaded in the rule's concept colour, as a selected feature is shaded now. A dashed line would be mistaken for the 1:1 reference, which stays drawn.
5. **A rule that changes nothing is still a stage.** 100% downside participation leaves the line as it is. The stage says so and holds briefly. The list and the bar then number the same steps.
6. **Reviews close the path, on the line.** The line already shows the last review: a coupon product adds the last review's coupon above its barrier, and an autocall's final review replaces the payoff above its trigger with the call. Each is one closing stage. The call's stage is named "Call on the last review", not after the list's Redemption step, which says how the scenario ended and can be a call on an earlier review; the list has no step for it, so choosing a step never shows the other rule. Calls on earlier reviews, coupons paid before the end and remembered coupons are not on the line; the last stage's sentence says what the reader's scenario actually pays when it differs ("In this scenario it is called on review 2 and pays 1,187.50").
7. **A barrier observed on every close.** The line is the payment when no earlier close reached the barrier, as the chart draws it, and the scenario's point stays on it. When the scenario's closes reach the barrier, the last stage says what it pays instead, as for an early call. Drawing the reached payment at every stage would need a second line built rule by rule, for one feature.
8. **The chart does not rescale.** The vertical axis stays fitted to the payoff. An intermediate line that leaves the plot, such as the 1:1 line above a cap, is clipped at its edge, as the dashed reference is now.
9. **The bar says two things.** What the rule does to every outcome ("Absorbs the first 10% of a fall"), and what it does to the reader's point ("At −40%: 600 → 750").

## Controls and motion

Kept from the first build: back, play or pause, next and close in the bar under the key; arrow keys step and Escape closes; the current step is marked in the worked calculation, a step can be clicked to jump to it, and the jump brings the chart into view when it is off screen. A step forward morphs the line over 450 ms, eased; back, a jump and reduced motion change it at once. Changing a term or the scenario, or selecting a concept, ends the path. Play holds 1.8 s on a stage, and 0.5 s on one that changes nothing.

## Build

1. **Line stages** in `src/content/path.ts`, independent of Vue. For each payoff rule, the amount after it at a final level, from that level's payment breakdown: the return still moving 1:1 plus the terms the rules have settled so far, as the first build computed for one level. The app calls it at each level it samples for the line. Tests over every sample product and many final levels: the stages are the same at every level, the first is the 1:1 line, the last equals what the chart plots, every stage names a step the calculation lists, and every amount is finite.
2. **The chart**: the stage's line in place of the payoff line, the previous line faint and dashed, the gap shaded, the scenario point on the line, and the morph between them. The payoff's labels, droplines and handles are hidden while the path shows.
3. **Remove** the dot, its trail, the coupon tally, the review stages and the axis fit to the path.
4. **DESIGN.md**: the calculation path section rewritten for the line; the motion exception stays.

## Open questions

- Should a stage show the current rule's label (cap, floor, barrier)? Built: no labels while the path shows. The payoff's labels are placed on the finished line, and the bar names the rule and its terms.
- Should the path remember where it was when the reader closes it and plays again? Built: no, it starts from the 1:1 line each time.
- Should reviews over time get their own view, a timeline with the triggers and coupon barrier, coupons paid and the stop at a call? Not planned yet.
