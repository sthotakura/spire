# Lookback

This increment adds lookback on the initial level. It records what lookback means in public material, the model built for it, and the decisions taken. It does not add observation dates, a lookback on the final level, or pricing. The work is section 13 of [PLAN.md](../PLAN.md).

## Established concepts

- In current public US notes, **lookback** usually sets the **initial** level. The level the return is measured from is the lowest closing level of the underlier over a short period after pricing, such as two to four weeks or up to two months ([iCapital glossary](https://icapital.com/insights/structured-investments/structured-investments-glossary/); for example, an [SEC 424B2 pricing supplement](https://www.sec.gov/Archives/edgar/data/19617/000121390026052623/ea0289438-01_424b2.htm) defines it as the lowest closing value on any scheduled trading day during a two-month lookback observation period beginning on the initial valuation date).
- Some notes add that the lookback level is never above the level on the pricing date ([SEC filing example](https://www.sec.gov/Archives/edgar/data/19617/000089109220011863/0000891092-20-011863.txt)).
- Downside terms are measured from the lookback level too. In one pricing supplement the return is `(Final Value – Lookback Value) / Lookback Value`, the 10% buffer applies to that return, and a 60% fall from the lookback level loses 50% of principal ([SEC 424B2](https://www.sec.gov/Archives/edgar/data/19617/000121390026050822/ea0288734-01_424b2.htm)). A barrier note from the same issuer sets its barrier at 70% of the lookback value ([SEC 424B2](https://www.sec.gov/Archives/edgar/data/19617/000121390026049358/ea0288297-01_424b2.htm)).
- The holder gains from a lower starting point: any later rise is measured from it, so it counts for more.
- A different form, where the **final** level is the highest level observed before maturity, is a classic lookback option. It was not found in current retail notes during research for this plan.

## The model

The determination is split into its two ends:

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
- **Observed levels after pricing are scenario inputs**, like the averaging levels, and do not appear in the Structure JSON. Only the count does. Each must be greater than zero, since the return is measured from the lowest of them.

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
- **Chart.** The payoff and the buffer bend at the lookback level, below the pricing level, so the chart shows both as separate reference lines, labelled under the axis. The horizontal axis stays the final level. The payoff line now depends on the observed levels after pricing as well as on the note.
- **Outline.** The Determination row has one choice for each end: **Initial level** (Fixed or Lookback) and **Final level** (Final date or Averaging).
- **Calculation.** A lookback step comes before the return, e.g. `min(100, 97, 92, 95) = 92`, with its own labelled row of observed levels after pricing.
- **Summary, payment rule and outcome.** The summary says the change is measured "from the lowest of 100 and 3 levels observed after pricing". The payment rule defines the lookback level and measures the return from it. The outcome sentence names the lookback level.

## Decisions

1. **Lookback sets the initial level, as the lowest observed level.** This is the form found in current public notes. The final-level form (highest) would be cheaper, since it reuses the averaging input, but teaches a form not found in current retail notes.
2. **The determination splits into initial and final ends.** The alternative, lookback as a third single option, cannot combine lookback with averaging and leaves "point-to-point" describing both ends at once.
3. **Observations are counted, without dates,** as for averaging, from 2 to 12. Real lookback periods often observe every trading day for weeks, so the limit is for hand entry only.
4. **Naming.** "Initial level" stays the name of the term beside the asset, and the derived value is called "Lookback level" wherever it appears.
5. **Every calculation reads the determined initial level**, as it reads the determined final level: the initial-level term when the initial end is given, the lookback level when it is lookback. This covers the return, the payment, the scenario table (its returns are measured from the determined initial level) and the chart's bend points. Only the chart's axis scale stays on the initial-level term, so editing an observation does not rescale the axis.
6. **No chart handle for the lookback observations** at first. They are edited in the calculation, and the chart shows the lookback level as a reference line.
7. **Starting and fitted observations.** The first time lookback is chosen, the levels after pricing start from the worked example's shape relative to the initial level as it is then (−3%, −8%, −5%), rounded to whole units. When the count changes, the earliest levels are kept, since they are the ones closest to pricing, and new levels repeat the latest one.
8. **Outline labels.** The two choices are labelled "Initial level" and "Final level", after what each decides. The initial level is not labelled "strike level": a strike often equals the initial level, but some notes set it at a percentage of it. The initial level hint says it is often called the strike level when the strike is set at 100% of it.
9. **The buffer is measured from the lookback level**, like every other payoff feature, because the payoff reads one return. This follows the public filings above.
