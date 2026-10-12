# Worst-of and best-of

This increment adds two more rules for a basket's return, beside the weighted sum of [basket.md](basket.md): the return of the asset that performs worst, and the return of the asset that performs best. It does not add a barrier tested on each asset separately, a daily barrier on a basket, lookback on a basket, per-asset barriers or levels, rank-weighted baskets, or pricing. It is the first step towards the note in [contingent-autocall.md](contingent-autocall.md), whose maturity payment reads the lesser performing of two funds.

## Established concepts

- A **worst-of** note is linked to several assets and reads the return of the one that performs worst. FINRA describes such notes as ones "whose payoffs depend on the worst performing reference asset in a pre-specified group" ([FINRA, review of higher-risk structured products](https://www.finra.org/media-center/newsreleases/2026/finra-announces-review-higher-risk-structured-products)).
- Public pricing supplements define it the same way, under different names:
  - "Lesser Performing Fund Return": the lower of the two fund returns, each measured as "(Final Value − Strike Value) / Strike Value" ([JPMorgan Chase Financial Company LLC, 424B2](https://www.sec.gov/Archives/edgar/data/19617/000121390026108339/ea0308243-01_424b2.htm)).
  - The note linked to the lesser performing of two indices in [barrier.md](barrier.md) ([SEC 424B2](https://www.sec.gov/Archives/edgar/data/19617/000121390025119557/ea0268903-01_424b2.htm)).
  - The note linked to the worst performing of two indices in [absolute-return.md](absolute-return.md) and chapter 13 of the book ([Morgan Stanley, Dual Directional Trigger PLUS, No. 18,961](https://www.morganstanley.com/structuredinvestments/docs/prospectus/prelim/ProspectusRed61781LUU2.pdf)).
- **Each asset is measured from its own initial level.** The assets have different units, so their returns, not their levels, are compared. Nothing is weighted: the asset that sets the return is the only one the payment reads.
- **The holder bears the worst case.** A fall in any one asset reduces the return even when the others rise. A worst-of note does not give the diversification a weighted basket does.
- A **best-of** basket is the mirror: it reads the return of the asset that performs best. **No public note linked to the single best performing asset was verified.** The rule is unambiguous, so it is modelled, and every statement about it in this repository is a consequence of the rule, not a description of a public product. A different public product is not this one: a note that ranks assets by performance and weights the best 60%, the second 30% and the worst 10% is a weighted basket with weights decided by rank, and is not modelled.

## What changes

Only the rule that turns component returns into the basket return. Everything after it is unchanged: the basket level starts at 100 and is `100 × (1 + basket return)`, and the payoff reads it as it reads a single asset's level.

```text
component return  = component final level / component initial level − 1
weighted          = Σ weight × component return           (unchanged)
worst-of          = min of the component returns
best-of           = max of the component returns
basket final level = 100 × (1 + basket return)
```

```json
"underlier": {
  "kind": "basket",
  "components": [
    { "asset": { "kind": "equity-index", "name": "Synthetic Index A" } },
    { "asset": { "kind": "equity-index", "name": "Synthetic Index B" } }
  ],
  "determination": {
    "initial": { "kind": "given", "levels": [
      { "asset": "Synthetic Index A", "level": 100 },
      { "asset": "Synthetic Index B", "level": 50 }
    ] },
    "final": { "kind": "final-date" },
    "basketReturn": { "kind": "worst-of" }
  }
}
```

A worst-of or best-of component has no `weight`. A weighted basket still requires one on each.

## Synthetic worked example

Principal 1,000, 100% upside participation and 100% downside participation, no barrier, no protection. Synthetic Index A starts at 100 and Synthetic Index B at 50.

| A final | B final | A return | B return | Worst-of basket level | Payment | Best-of basket level | Payment |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 120 | 55 | +20% | +10% | 110 | 1,100 | 120 | 1,200 |
| 130 | 40 | +30% | −20% | 80 | 800 | 130 | 1,300 |
| 60 | 60 | −40% | +20% | 60 | 600 | 120 | 1,200 |

The second and third rows show the difference: a fall in one asset sets the worst-of return while the other asset rises. A best-of note with 100% downside participation only loses principal when every asset falls.

### A barrier on the basket level

A downside barrier at 70% of the initial level, read on the final date, tests the basket level below 70. For worst-of that is exactly "any asset ended below 70% of its own initial level", because the lowest return is below −30% if and only if some asset's is. A public worst-of note states the test per asset, "each Fund is greater than or equal to its Barrier"; the two are the same test on the final date. For best-of the basket level below 70 means that **every** asset ended below 70%, which is a different test and a consequence of the rule, not a public feature.

### Averaging

Averaging is allowed. Each asset's final level is its average first, then the returns are compared. Two dates, both assets starting at 100:

| | Date 1 | Date 2 | Average | Return |
| :--- | ---: | ---: | ---: | ---: |
| A | 80 | 140 | 110 | +10% |
| B | 120 | 100 | 110 | +10% |

Worst-of reads the worse of the averaged returns, +10%. Averaging the worst asset on each date instead would give the average of −20% and 0%, which is −10%. These differ, so the order matters, and SPIRe's order is each asset averaged, then compared. That is the order the determination already has (the final end produces each asset's final level, then the basket return combines them), and it is the one a term sheet that lists an average for each asset describes. No public note was verified that averages a worst-of basket, so this is a stated assumption.

## Decisions

1. **The rule stays in the determination as `basketReturn`.** This settles the open question in [basket.md](basket.md): worst-of needs both ends of every component, as weighted does, so it is neither end, and the payoff still reads one return. Moving it elsewhere would separate it from the determination that produces the inputs.
2. **`weight` becomes optional on a component, and the rule says whether it is allowed.** A weighted basket needs a weight on every component, adding up to 100%. A worst-of or best-of basket must not have any, because a weight that the rule ignores would be a term that looks like it matters. The alternative, a union of two basket types, was rejected: the two differ only in one key on the component and one choice in the determination, and a discriminated union would need its discriminator nested in the determination. The schema describes `weight` as optional and the validator states the rule, listed with the rules the schema does not say.
3. **One rule per basket.** Worst-of and best-of are two values of the existing choice, not two features. A basket cannot be both.
4. **A basket still needs at least two components.** With one, the three rules agree, so nothing would show which was chosen.
5. **Ties.** Two assets with the same worst return give the same basket return, so no asset needs to be named as the one that sets it. The calculation shows `min(…)` of the returns, as lookback shows `min(…)` of levels.
6. **Same limits as the weighted basket.** No lookback on a basket and no daily barrier on a basket: a daily worst-of barrier reads each asset's own lowest close, which is not the lowest close of the basket level. Barrier absolute return stays a single underlier note.
7. **No marketing name.** Names are shown only when a public generic name is verified ([marketing-names.md](marketing-names.md)). "Worst-of" is shown as the basket return, not as a chip.

## Consequences

- **Outline.** The row is labelled Return combination, because worst-of is a rule for combining the asset returns, not a return itself. It offers Weighted, Worst of and Best of. The calculation keeps "Basket return" for the result, and the JSON key stays `basketReturn`. Weight fields and the weights total appear only for Weighted. Changing the rule changes the rows the reader sees, and keeps the weights the reader entered for the next time Weighted is chosen.
- **Summary.** "…linked to the worst performing of Synthetic Index A and Synthetic Index B, …" and "…the best performing of…".
- **Structure JSON.** `basketReturn` takes the new `kind`, and components lose `weight`.
- **Payment rule and calculation.** The return line reads `Return = Lowest Asset return`; the calculation shows `min(+20%, −10%)` for the basket return. Every asset's return stays visible, so the reader sees which one set it.
- **Scenario table and chart.** Unchanged: the rows apply one return to every asset, so the worst and the best return are the same return, and the chart's handle moves every asset's return by the same amount.
- **Schema.** Two new variants of `basketReturn` and an example of each. The generator names them like the other inline variants.
- **Book.** Chapter 5 gains a section on worst-of and best-of; chapter 13's remark that a worst-of rule is not calculated is corrected.

## Assumptions and limits

- Components are equities or equity indices in the same currency. Currency conversion is not modelled.
- The basket level starts at 100 and is a normalisation, not a price.
- The payment is a contractual amount under stated assumptions, not a valuation, and depends on the issuer's ability to pay.
- Fund and ETF underliers are not a separate asset kind. A fund is entered as an equity or an equity index; whether to add a kind is left to the first note whose payoff reads something a fund has and an equity does not, such as an adjustment factor.

## Open questions

1. **Per-asset barriers and thresholds.** A worst-of note states a barrier as a level for each asset. On the final date the basket-level test is equivalent, but with different barrier percentages per asset it is not. Not modelled.
2. **A barrier observed daily on a basket.** It reads each asset's lowest close. Needs a path of levels per asset (see [observation-dates.md](observation-dates.md) and [daily-observation.md](daily-observation.md)).
3. **Best-of in public notes.** A verified public note that pays on the best performing asset would settle whether the rule matters as a product or only as the mirror of worst-of.
4. **Averaging order for a worst-of basket.** A public note that averages a worst-of basket would confirm or change the order above.
5. **Rank-weighted baskets.** Weights decided by rank are neither of these rules.
