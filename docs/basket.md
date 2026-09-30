# Basket

This increment adds a weighted basket as a second kind of underlier, beside a single asset. It does not add worst-of or best-of baskets, lookback on a basket, currency conversion, or pricing. The shape follows [underlier-model.md](underlier-model.md), which gave a single underlier a `components` list so that a basket only adds entries and a combination rule.

## Established concepts

- A **basket** tracks several assets and combines their performances into one return. The payoff reads that return exactly as it reads a single asset's.
- In a **weighted basket**, each component's return is measured from its own initial level, and the basket return is the weighted sum of the component returns. Public notes state the basket as a level that starts at 100. One note defines the ending level as "the product of (i) 100 and (ii) an amount equal to 1 plus the sum of: (A) 50.00% of the component return of the EURO STOXX 50® Index; and (B) 50.00% of the component return of the S&P 500® Index", with each component return measured from "the closing level of that Basket Component on the pricing date" ([Jefferies, 424B2](https://www.sec.gov/Archives/edgar/data/96223/000114036126007335/ef20066780_424b2.htm)). Another writes the same rule with an "initial weighted value" per underlier, its weight times the initial basket level of 100 ([GS Finance, Leveraged Buffered Basket-Linked Notes, 424B2](https://www.sec.gov/Archives/edgar/data/886982/000095017024067977/baskel03_final.htm)).
- Each component has its own initial level, the level it is measured from. The weights are fixed on the pricing date and add up to 100%.
- A buffer, cap and participation on a basket note are measured on the basket level, as they are on a single asset's level (the GS Finance note above has a buffer on the basket).
- A **worst-of** basket measures the return of the component that performs worst. It is a different rule for the basket return and is not part of this increment.

## Averaging and weights

Public notes average a weighted basket in two ways:

- **Average the basket level.** The basket level is calculated on each averaging date, and the final basket level is "the arithmetic average of the basket closing levels on each of the averaging dates" ([Goldman Sachs, Basket-Linked Notes, 424B2](https://www.sec.gov/Archives/edgar/data/886982/000110465915053260/a15-15042_28424b2.htm)).
- **Average each component, then weight.** Each component's average level is "the arithmetic average of the closing levels of such basket component on the calculation days", and the average ending level weights the resulting component returns ([GS Finance, Market Linked Notes with Quarterly Averaging, 424B2](https://www.sec.gov/Archives/edgar/data/886982/000119312526230894/gs-20260519.htm)).

For a weighted basket the two give the same final level. Each component's return is its level divided by a fixed initial level, so the basket level is a weighted sum of the component levels, and the average of a weighted sum is the weighted sum of the averages:

```text
average over dates of 100 × Σ weight × level(date) / initial
  = 100 × Σ weight × (average over dates of level) / initial
```

So averaging and a weighted basket combine without a new rule. SPIRe averages each component and then weights, because the calculation can then show each component's average beside its return. The order will matter for a worst-of basket, where the worst of the averages differs from the average of the worst.

## The model

```text
component return    = component final level / component initial level - 1
basket return       = Σ weight × component return
basket final level  = 100 × (1 + basket return)
```

The payoff reads the basket's two levels, 100 and the basket final level, as it reads a single asset's initial and final levels. Everything after the return is unchanged: the buffer, barrier, participation, cap and floor.

```json
"underlier": {
  "kind": "basket",
  "components": [
    { "asset": { "kind": "equity-index", "name": "Synthetic Index A" }, "weight": 0.5 },
    { "asset": { "kind": "equity", "name": "Synthetic Co" }, "weight": 0.5 }
  ],
  "determination": {
    "initial": {
      "kind": "given",
      "levels": [
        { "asset": "Synthetic Index A", "level": 100 },
        { "asset": "Synthetic Co", "level": 40 }
      ]
    },
    "final": { "kind": "final-date" },
    "basketReturn": { "kind": "weighted" }
  }
}
```

A single underlier keeps its present shape, with one `level`, no weight and no `basketReturn`.

## Decisions

1. **Weighted first.** It pairs with the participation notes already modelled, and its basket level gives the chart a meaningful horizontal axis. Worst-of comes later, probably with the barrier, as worst-of barrier notes are common.
2. **The basket return is the last part of the determination.** The determination measures how the underlier changes. For a basket that includes combining the component returns into one, so the rule sits in the determination as `basketReturn`, after the initial and final ends: it needs both ends of every component, so it is neither end. Its output, the basket level, is what the payoff reads. This replaces an earlier proposal that put the rule, with the weights, in a `combination` beside the determination. Whether the rule belongs in the determination is to be revisited with worst-of.
3. **Each initial level refers to its component.** Levels are not matched to components by position, so removing a component cannot shift a level onto the wrong asset. Components are referred to by asset name, so names must be unique within a basket. The initial level stays in the determination, as for a single asset, because with lookback it is measured rather than stated.
4. **Each weight sits on its component.** A weight describes what the basket holds, not how its change is measured, and term sheets list it beside each component. Weights are greater than 0% and add up to 100%. A worst-of basket has no weights, so its components will be written without one.
5. **The reader adds and removes components.** A basket has at least two. Adding or removing a component resets the weights to equal, which the reader can then change. Switching a single underlier to a basket keeps its asset and initial level as the first component and adds a second. Switching back keeps the first component.
6. **One determination for all components.** Each component's final level is on the final date or averaged over the same number of dates.
7. **No lookback on a basket.** No public basket note with a lookback initial level was verified. For a single asset, lookback takes the lowest level. On a basket this could mean the lowest basket level or each component's lowest level, and the two differ because the lowest is not a weighted sum. The Lookback choice is shown as unavailable while the underlier is a basket.
8. **Component levels are scenario inputs.** Each component's final level, or its averaged levels, is edited in the calculation. They are not note terms and do not appear in the Structure JSON.
9. **The chart's horizontal axis is the basket level.** Its handle moves every component's return by the same amount, so the basket return moves by that amount too. Components with different initial levels therefore move by different numbers of units.

## Consequences

- **Outline.** Under Underlier, the kind becomes a choice between Single and Basket. The outline keeps the JSON's shape: a basket shows one Asset row per component, with its kind, name and weight, and an Add asset action beside the total of the weights. Initial level shows one level per component. Basket return is the last row under Determination; Worst-of is listed as unavailable.

```
├ Underlier  Basket ▾
│  ├ Asset  Equity index ▾ · Name · Weight
│  ├ Asset  Equity ▾ · Name · Weight
│  ├ ＋ Add asset   Weights: total 100%
│  └ Determination
│     ├ Initial level  Fixed ▾ · one level per asset
│     ├ Final level  Final date ▾
│     └ Basket return  Weighted ▾
```
- **Summary.** "…linked to an equally weighted basket of Synthetic Index A and Synthetic Co". Unequal weights name each weight.
- **Payment rule and calculation.** A step per component (its final level, initial level and return), then the weighted sum and the basket final level. The rest of the calculation reads the basket level.
- **Scenario table.** Rows stay at basket returns (−40%, 0%, +10%, +30%). Each row applies the same return to every component.
- **Structure JSON.** As above.
- **Names.** Unchanged. "Basket-linked" appears in public note titles but has not yet been checked as a generic name.

## Synthetic worked example

Principal 1,000, 100% upside participation, 100% downside participation. Synthetic Index A starts at 100 and Synthetic Co at 40, each weighted 50%.

| Index A final | Co final | Index A return | Co return | Basket final level | Payment |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 120 | 48 | +20% | +20% | 120 | 1,200 |
| 130 | 36 | +30% | −10% | 110 | 1,100 |
| 80 | 44 | −20% | +10% | 95 | 950 |

The second and third rows show one component offsetting the other.

With averaging over two dates: Index A 110 then 130, and Co 44 then 36. Averaging each component gives 120 (+20%) and 40 (0%), so the basket final level is 100 × (1 + 10% + 0%) = 110. Averaging the basket level gives 110 on the first date and 110 on the second, also 110.

## Assumptions and limits

- Components are equities or equity indices in the same currency. Currency conversion, which some baskets apply, is not modelled.
- Weights are fixed for the life of the note. Rebalancing is not modelled.
- Levels and amounts are synthetic. The payment is a contractual amount under stated assumptions, not a valuation, and depends on the issuer's ability to pay.

## Open questions

- Does the rule for the basket return belong in the determination, or elsewhere? It sits there for now and is to be revisited when worst-of is modelled.

- How does lookback apply to a basket's initial level: the lowest basket level, or each component's lowest level?
- For worst-of, does averaging apply before the worst component is chosen, or on each date?
- Is "basket-linked" a generic public name to show as a chip?
- Should a basket carry an upper limit on components? None is set; the calculation grows with each one.
