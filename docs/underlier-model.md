# The underlier model

The underlier is what the payoff reads. Its job is to produce one return, which the payoff turns into a payment. To do that it needs:

1. which asset or assets it tracks,
2. how each asset's change is measured, from its initial level to its final level (the determination), and
3. for a basket only, how those changes are combined into one return.

The Structure JSON and the outline show the same shape. Keeping them identical is a rule for this project: the JSON is how we test whether a product can be expressed correctly.

## Shape

A single underlier, as built:

```json
"underlier": {
  "kind": "single",
  "components": [
    { "asset": { "kind": "equity-index", "name": "Synthetic Index" } }
  ],
  "determination": {
    "initial": { "kind": "given", "level": 100 },
    "final": { "kind": "final-date" }
  }
}
```

The determination has two ends. The initial end is `given` (a level stated as a term) or `lookback` ([lookback.md](lookback.md)). The final end is `final-date` or `averaging` ([averaging.md](averaging.md)). Given at the start and final-date at the end is point-to-point. Lookback and averaging each state how many levels they read, and no level of their own. Lookback reads the level on the pricing date and one on each of its dates after pricing, all of them scenario inputs:

```json
"determination": {
  "initial": { "kind": "lookback", "observationCount": 3 },
  "final": { "kind": "averaging", "observationCount": 5 }
}
```

A basket adds components and a rule that combines them. The weighted basket is proposed in [basket.md](basket.md), where each initial level and each weight refers to its component.

The outline nests the same parts. A JSON list is shown as repeated rows without a heading row of its own, as the payoff features already are:

```
├ Underlier  Single ▾
│  ├ Asset  Equity index ▾ · Name
│  └ Determination
│     ├ Initial level  Fixed ▾ · Level
│     └ Final level  Final date ▾
```

## Decisions

- **Determination sits inside the underlier.** It is the method that turns observed levels into a return, and the underlier is where that return is produced.
- **A single underlier also uses `components`, with exactly one entry.** Code reads assets in one way for both kinds, and a basket only adds entries. The type `[UnderlierComponent]` allows exactly one component for a single underlier.
- **`kind` is stated, not inferred from the number of components.** Single or basket is a contractual fact, and the outline offers it as a choice.
- **The basket return exists only on a basket.** Worst-of on a single asset cannot be written.
- **The initial level belongs to the determination.** The asset is only what is tracked. A fixed initial level is a term of this note, stated as `level` on the initial end: two notes on the same index can start from different levels. Lookback states no level, because the level on the pricing date is observed like the later ones. This replaces an earlier decision that kept the initial level beside the asset. With lookback that showed "Initial level 100" under the asset and a lookback initial level under the determination: one name for two different values.
- **One determination for the whole underlier.** Averaging normally uses the same dates for every component. Per-component methods wait for a product that needs them.
- **Each end of the determination is set on its own.** The payment reads the two levels the ends produce, so a lookback initial level can combine with an averaged final level, and the payoff does not depend on how either was measured.
- **Each level is its own concept.** The outline nests Initial level and Final level under Determination, as the JSON nests `initial` and `final`. Each has its own colour (#8b4f2b and #6b6412, in the determination's family and checked against the downside and upside colours they sit beside on the chart) and highlights its own summary phrase, JSON lines, payment-rule line, calculation step and chart line. Selecting the determination or the underlier highlights both.
- **Asset kind and underlier kind are separate choices.** "Equity index" answers what is tracked; "single" answers how many.

## Assumptions

- A fixed initial level is given as a term. In practice it is usually observed on the pricing date, sometimes averaged over several dates. With lookback no level is stated: the pricing-date level is one of the observed levels, and the level the return is measured from can be lower.
- Only a single underlier and the equity and equity-index asset kinds are supported. The initial level is fixed or by lookback; the final level is on the final date or averaged.

## Open questions

- Where do observation dates belong? They look like part of the determination, which would replace the earlier expectation that schedules belong to the payoff. Averaging and lookback state a count of observations but not their dates. A proposal is in [observation-dates.md](observation-dates.md).
- A basket has one fixed initial level per asset, but one determination. [basket.md](basket.md) settles that each level refers to its component, and that each weight sits on its component.
