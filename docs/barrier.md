# Barrier

This increment adds a barrier as a sub-feature of downside participation, observed on the final observation date. It does not add daily observation, knock-out barriers, barriers on upside participation, coupons, digital amounts, or pricing. The work follows section 15 of [PLAN.md](../PLAN.md), which nested the buffer and cap under their directions.

## Established concepts

- A **barrier** is a level of the underlier, usually stated as a percentage of the initial level. It does no arithmetic of its own. It decides whether another feature applies.
- On the downside, a barrier works as a switch. One public note states the barrier amount as "70.00% of the Lookback Value" and pays ([SEC 424B2](https://www.sec.gov/Archives/edgar/data/19617/000121390026049358/ea0288297-01_424b2.htm)):
  - principal, if the final value "is equal to the Lookback Value or is less than the Lookback Value but greater than or equal to the Barrier Amount";
  - `$1,000 + ($1,000 × Index Return)`, if the final value "is less than the Barrier Amount". Its risk factor says the holder then loses "1% of the principal amount of your notes for every 1% that the Final Value is less than the Lookback Value".
- The switch is sharp. The same filing's table shows a final value of 70.00 paying $1,000.00 and 69.99 paying $699.90.
- FINRA calls a barrier "soft protection" and a buffer "hard protection": once a barrier is breached, the whole fall counts, not only the part beyond the barrier ([FINRA](https://www.finra.org/investors/insights/structured-notes-principal-protection); see [buffer.md](buffer.md)).
- A barrier may be observed only on the final observation date, or on every trading day in a period ([observation-dates.md](observation-dates.md)). The note above observes the final value only.
- A barrier belongs to the feature it switches, and one note can carry both a barrier and a buffer on different features. One public note has a "Digital Barrier" at 85% of the initial value and a 20% buffer amount ([SEC 424B2](https://www.sec.gov/Archives/edgar/data/19617/000121390025119557/ea0268903-01_424b2.htm)). The barrier gates a fixed digital return, paid when the final value is "greater than or equal to its Digital Barrier", so a 10% fall still pays $1,087.00. The buffer sits on the downside as usual: a final value of 84.99 repays $1,000.00 and 70.00 pays $900.00. Crossing the barrier takes away the digital return; it does not make the fall count. The note is also linked to the lesser performing of two indices, a worst-of basket, and its digital return is a payoff feature not yet modelled.

## Barrier and buffer compared

Principal 1,000, initial level 100, 100% downside participation.

| Final level | 70% barrier | 30% buffer |
| ---: | ---: | ---: |
| 80 | 1,000 | 1,000 |
| 70 | 1,000 | 1,000 |
| 69.99 | 699.90 | 999.90 |
| 50 | 500 | 800 |
| 0 | 0 | 300 |

Above the threshold both repay principal. Below it, the buffer still absorbs the first 30% of the fall; the barrier absorbs nothing.

## Proposal

The barrier belongs to downside participation, as the buffer does. It switches downside participation on (knock-in) only when the final level is below the barrier:

```json
{ "direction": "downside", "barrier": { "level": 0.7, "observation": "final" }, "rate": 1 }
```

```text
underlier return = final level / initial level - 1

downside participated return =
  downside rate × return,   when final level < barrier level × initial level
  0,                        otherwise
```

Everything after that is unchanged: the upside, the cap and the protection floor apply as before.

- **Level.** A fraction of the initial level, as term sheets state it (70% of the initial level), not a fall like the buffer (a 30% buffer). Greater than 0% and less than 100%. A barrier at 100% would switch downside participation on for any fall, which is downside participation without a barrier.
- **Observation.** `"final"` only: the barrier reads the final level the determination produces. It is stated in the JSON because it is a contractual term and because daily observation, the other public form, reads a path of levels instead. Daily observation waits for observation dates.
- **Effect.** A barrier on downside participation is a knock-in. The effect is not stated separately yet. It becomes a term when a second effect (a knock-out, or a barrier on upside participation) is modelled.
- **Initial level.** The barrier is a fraction of the level the return is measured from: the initial level, or the lookback level when the note has lookback ([lookback.md](lookback.md)). The note above has lookback, so its barrier is "70.00% of the Lookback Value". The buffer is measured the same way.
- **Order.** The barrier is checked before the rate applies, so its key comes before `rate`, as the buffer's does.

## Consequences

- **Outline.** Barrier nests under Downside participation, beside where a buffer would sit, with an "Observed" choice of Final date (Daily is shown as unavailable). The Add feature menu marks it "Needs downside participation" until that exists, as for the buffer, and marks a barrier and a buffer "Not with a buffer" and "Not with a barrier".
- **Summary, payment rule and outcome.** The summary adds "with a barrier at 70% of the initial level" (or "of the lookback level"). The payment rule adds a line, "downside only when Final level < Barrier × Initial level", and the words say each fall counts "only if" the underlier ends below the barrier. The outcome sentence says whether the final level is below the barrier and, if it is, that the whole fall counts.
- **Calculation.** A barrier step before downside participation, e.g. `Barrier 70 (70% of 100) · final level 65 is below it, so downside participation applies`, muted when the final level is at or above it.
- **Chart.** A vertical guide at the barrier level, in its own colour, with a sideways handle as the buffer has. The payoff line jumps at the barrier: principal at and just above it, the full loss just below. It is drawn as two pieces with no connecting segment, since a steep line would show payments the note never makes. The colour, violet #9775fa, passes the dataviz palette checks against every colour it can touch: downside, protection, upside, principal, cap and buffer.
- **Scenarios.** The existing rows (−40%, 0%, +10%, +30%) show a breach at a 70% barrier but not the protected range above it. See open question 4.
- **Marketing names.** None at first. "Barrier note" appears in issuer product names (for example, "Accelerated Barrier Notes"), but a generic public definition has not been checked against [marketing-names.md](marketing-names.md).

## Synthetic worked example

Principal 1,000, initial level 100, 150% upside participation, 100% downside participation, a 70% barrier observed on the final observation date, no protection.

| Final level | Return | Below the barrier? | Payment |
| ---: | ---: | :--- | ---: |
| 120 | +20% | No | 1,300 |
| 100 | 0% | No | 1,000 |
| 80 | −20% | No | 1,000 |
| 70 | −30% | No, it is at the barrier | 1,000 |
| 69 | −31% | Yes | 690 |
| 50 | −50% | Yes | 500 |

With a 90% protection floor added, the last two rows pay 900: the floor still bounds the payment.

## Decisions

0. **A barrier and a buffer are separate features.** Both limit losses on downside participation, but they are not two ways of expressing one protection: a buffer always removes the first part of a fall, and a barrier decides whether the fall counts at all. Each is its own sub-feature of downside participation.
1. **A barrier and a buffer on the same downside participation are not allowed together** at first. No public note combining them was verified; the "Contingent Buffer" notes found are a buffer with a steeper loss rate, not a barrier ([SEC 424B2](https://www.sec.gov/Archives/edgar/data/9631/000183988226020010/bns_424b2-12863.htm)). The Add feature menu would mark whichever is second as unavailable, with a short reason. A note with a barrier on a digital return and a buffer on the downside (above) is a different case: each belongs to a different feature, which the model allows by its shape.
2. **Below the barrier, the downside rate applies to the whole fall.** Public barrier notes found use 1% per 1%, which is a 100% rate. Other rates are allowed, as they are for downside participation without a barrier.
3. **A barrier with a protection floor is allowed.** The floor bounds the payment as it does today. A floor at or above the breached payment makes the barrier irrelevant, as 100% protection does for downside participation.
4. **Observation on the final date only** until observation dates are modelled.

## Open questions

1. **Averaging.** With an averaged final level, is the barrier checked against the average or the level on the last date? The notes found check the "Final Value", which would be the average, but no averaging note with a barrier was verified.
2. **Knock-in and knock-out as a stated effect.** When should `effect` become a term? Probably with the first barrier on upside participation.
3. **One barrier switching several features.** Carried over from section 15 of the plan.
4. **Scenario rows.** Should a note with a barrier add a scenario row just above it, so the table shows the protected range as well as the breach?
