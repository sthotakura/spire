# The underlier model

The underlier is what the payoff reads. Its job is to produce one return, which the payoff turns into a payment. To do that it needs:

1. which asset or assets it tracks,
2. where each asset starts (its initial level, a term of this note),
3. how each asset's change is measured (the determination method), and
4. for a basket only, how those changes are combined into one return.

The Structure JSON and the outline show the same shape. Keeping them identical is a rule for this project: the JSON is how we test whether a product can be expressed correctly.

## Shape

A single underlier, as built:

```json
"underlier": {
  "kind": "single",
  "components": [
    { "asset": { "kind": "equity-index", "name": "Synthetic Index" }, "initialLevel": 100 }
  ],
  "determination": { "kind": "point-to-point" }
}
```

A basket, expected later and not built:

```json
"underlier": {
  "kind": "basket",
  "components": [
    { "asset": { "kind": "equity-index", "name": "Synthetic Index A" }, "initialLevel": 100 },
    { "asset": { "kind": "equity", "name": "Synthetic Co" }, "initialLevel": 40 }
  ],
  "determination": { "kind": "point-to-point" },
  "combination": { "kind": "worst-of" }
}
```

The outline nests the same parts. A JSON list is shown as repeated rows without a heading row of its own, as the payoff features already are:

```
├ Underlier  Single ▾
│  ├ Asset  Equity index ▾ · Name · Initial level
│  └ Determination  Point-to-point ▾
```

## Decisions

- **Determination sits inside the underlier.** It is the method that turns observed levels into a return, and the underlier is where that return is produced.
- **A single underlier also uses `components`, with exactly one entry.** Code reads assets and initial levels in one way for both kinds, and a basket only adds entries. The type `[UnderlierComponent]` allows exactly one component for a single underlier.
- **`kind` is stated, not inferred from the number of components.** Single or basket is a contractual fact, and the outline offers it as a choice.
- **`combination` exists only on a basket.** Worst-of on a single asset cannot be written.
- **The initial level sits beside the asset, not inside it.** The asset is what is tracked; the initial level is a term of this note. Two notes on the same index can start from different levels, and each basket component has its own.
- **One determination for the whole underlier.** Averaging normally uses the same dates for every component. Per-component methods wait for a product that needs them.
- **Asset kind and underlier kind are separate choices.** "Equity index" answers what is tracked; "single" answers how many.

## Assumptions

- Initial levels are given as terms. In practice they are usually observed on a start date, sometimes averaged over several dates.
- Only a single underlier, the equity and equity-index asset kinds, and point-to-point determination are supported.

## Open questions

- Where do observation dates belong? They look like part of the determination, which would replace the earlier expectation that schedules belong to the payoff.
- Basket weights only mean something for a weighted combination. They probably belong inside `combination` rather than on each component.
- A basket has one final level per asset, so the chart's horizontal axis would need to show something else, such as the worst performance.
