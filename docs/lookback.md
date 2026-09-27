# Lookback (planned)

This is a plan, not a built feature. It records what lookback means in public material, the smallest model proposed for it, the decisions taken, and the question still open. The work plan is section 13 of [PLAN.md](../PLAN.md).

## Established concepts

- In current public US notes, **lookback** usually sets the **initial** level. The level the return is measured from is the lowest closing level of the underlier over a short period after pricing, such as two to four weeks or up to two months ([iCapital glossary](https://icapital.com/insights/structured-investments/structured-investments-glossary/); for example, an [SEC 424B2 pricing supplement](https://www.sec.gov/Archives/edgar/data/19617/000121390026052623/ea0289438-01_424b2.htm) defines it as the lowest closing value on any scheduled trading day during a two-month lookback observation period beginning on the initial valuation date).
- Some notes add that the lookback level is never above the level on the pricing date ([SEC filing example](https://www.sec.gov/Archives/edgar/data/19617/000089109220011863/0000891092-20-011863.txt)).
- The holder gains from a lower starting point: any later rise is measured from it, so it counts for more.
- A different form, where the **final** level is the highest level observed before maturity, is a classic lookback option. It was not found in current retail notes during research for this plan.

## Proposed model

Split the determination into its two ends:

```json
"determination": {
  "initial": { "kind": "lookback", "observationCount": 3 },
  "final": { "kind": "averaging", "observationCount": 5 }
}
```

```text
lookback level   = min(pricing level, observed level 1, …, observed level N)
final level      = level on the final date, or the average of the observed final levels
underlier return = final level / lookback level - 1
```

- **Initial end:** `given` (the initial-level term, as today) or `lookback`.
- **Final end:** `final-date` (today's point-to-point) or `averaging`.
- **Point-to-point** is no longer a stored option. It is `given` at the start and `final-date` at the end, and the summary sentence can still call it point-to-point.
- **The initial-level term stays** beside the asset. With lookback it is the pricing-date level, and the level the return is measured from is derived from it and the observations. Including it in the `min` means the lookback level can never be above it, without a separate rule.
- **The payoff rule is unchanged.** It still reads one return. The payment calculation takes the determined initial level as an input instead of reading the initial-level term from the note, because with lookback that level depends on the observed levels.
- **Observed levels after pricing are scenario inputs**, like the averaging levels, and do not appear in the Structure JSON. Only the count does.

## Synthetic worked example

Assume a principal of 1,000, a pricing level of 100, three lookback observations and 100% upside participation, with the final level on the final date.

| Observed after pricing | Lookback level | Final level | Return with lookback | Payment | Point-to-point payment |
| :--- | ---: | ---: | ---: | ---: | ---: |
| 97, 92, 95 | 92 | 110 | +19.6% | 1,195.65 | 1,100 |
| 101, 104, 103 | 100 | 110 | +10% | 1,100 | 1,100 |
| 97, 92, 95 | 92 | 90 | −2.2% | 1,000 | 1,000 |

The second row shows that a rise after pricing leaves the pricing level in place. The third shows a fall from the pricing level that is still a smaller fall from the lookback level; without downside participation both repay principal.

## Consequences

- **Breaking change to the JSON shape.** Averaging moves from `determination` to `determination.final`.
- **Chart.** The payoff bends at the lookback level, below the pricing level, so the chart shows both as separate reference lines. The horizontal axis stays the final level. The payoff line now depends on the observed levels after pricing as well as on the note.
- **Outline.** The Determination row gets one choice for each end.
- **Calculation.** A lookback step comes before the return, e.g. `min(100, 97, 92, 95) = 92`, with its own labelled row of observed levels.

## Decisions

1. **Lookback sets the initial level, as the lowest observed level.** This is the form found in current public notes. The final-level form (highest) would be cheaper, since it reuses the averaging input, but teaches a form not found in current retail notes.
2. **The determination splits into initial and final ends.** The alternative, lookback as a third single option, cannot combine lookback with averaging and leaves "point-to-point" describing both ends at once.
3. **Observations are counted, without dates,** as for averaging, from 2 to 12. Real lookback periods often observe every trading day for weeks, so the limit is for hand entry only.
4. **Naming.** "Initial level" stays the name of the term beside the asset, and the derived value is called "Lookback level" wherever it appears.

## Open questions

- Should the buffer be measured from the lookback level or the pricing level? The model above measures every payoff feature from the lookback level, because the payoff reads one return. This needs checking against public term sheets.
