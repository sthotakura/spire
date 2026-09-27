# Averaging

This increment adds a second determination method, averaging, beside point-to-point. It does not add observation dates, averaging of the initial level, lookback, or pricing.

## Established concepts

- **Point-to-point** measures the underlier's change from one initial level to one final level, the level on the final date. Moves in between do not count.
- **Averaging** takes the final level as the arithmetic average of the underlier's levels on several stated dates, usually in the months before maturity. Public term sheets commonly define the final level as the arithmetic average of the closing levels on each averaging date. Averaging over the last dates is often called averaging out, or an Asian tail.
- Averaging makes a sharp move near maturity count for less. A fall on the last date hurts less, and a rise on the last date helps less.

## The model

```text
final level        = (observed level 1 + … + observed level N) / N
underlier return   = final level / initial level - 1
```

Everything after the return is the payoff, and it does not change: the buffer, participation, cap and floor read the return as before. This is why determination sits in the underlier and not in the payoff ([underlier-model.md](underlier-model.md)).

```json
"determination": { "kind": "averaging", "observationCount": 5 }
```

## Decisions

- **Averaging out only.** The initial level stays a single term of the note. Averaging in, where the initial level is itself an average, is not modelled.
- **A count, not dates.** The note states how many levels are averaged. The dates themselves are not modelled, so observation dates stay an open question.
- **From 2 to 12 observations.** Real notes can average over many more dates, such as monthly over several years. The limit keeps each observed level small enough to set by hand; it is a limit of this reference, not a contractual rule.
- **Observed levels are scenario inputs.** Like the hypothetical final level before them, they are not note terms and do not appear in the Structure JSON. They are listed earliest first, so the last one is the final date.
- **The chart keeps one handle.** The horizontal axis is the final level, which for averaging is the average. Dragging the handle moves every observed level by the same whole number of units, so the path keeps its shape. Each level is edited in the calculation.
- **Changing the count keeps the latest dates.** Fewer observations drop the earliest levels. More observations repeat the earliest level on new, earlier dates. Switching back to point-to-point keeps the level on the last date.

## Synthetic worked example

Assume a principal of 1,000, an initial level of 100, 100% upside participation, 100% downside participation, and five observations.

| Observed levels | Final level (average) | Point-to-point on the last level | Payment, averaging | Payment, point-to-point |
| :--- | ---: | ---: | ---: | ---: |
| 120, 130, 140, 150, 60 | 120 | 60 | 1,200 | 600 |
| 100, 100, 100, 100, 150 | 110 | 150 | 1,100 | 1,500 |
| 110, 110, 110, 110, 110 | 110 | 110 | 1,100 | 1,100 |

The first row shows a late fall softened. The second shows a late rise diluted. The third shows that a flat path gives the same result either way.

## Assumptions and limits

- Every observed level counts equally.
- Levels and amounts are synthetic. The payment is a contractual amount under stated assumptions, not a valuation, and depends on the issuer's ability to pay.

## Open questions

- Where do observation dates belong once they are modelled? They look like part of the determination.
- Should the initial level also be averageable (averaging in)?
- Would lookback, which reads the highest or lowest observed level, reuse the same observed-level scenario input?
