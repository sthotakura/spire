# Barrier absolute return

Built, as proposed below except for the departures listed under *As built*. It adds a product shape that public notes use for barriers on both sides observed on closing levels: the note pays principal plus the absolute value of the underlier's return, for as long as no observed level has gone beyond either barrier. Once one has, the absolute return is replaced by a fixed return, whatever the final level. It does not add downside loss, a rebate beside a downside loss, coupons, a basket, lookback, averaging, or pricing. It builds on [daily-observation.md](daily-observation.md), [barrier.md](barrier.md) and [absolute-return.md](absolute-return.md).

## Why this proposal exists

SPIRe already supports a barrier on each side with final-date observation, and a daily barrier on either side alone. A daily upside barrier together with downside participation is blocked, because the payment logic assumed only one side could be live. Looking for public notes with daily barriers on both sides, every one found was of this one family, "Barrier Absolute Return … with daily barrier observation". None pays a downside loss, so the simple composition (a daily upside barrier plus downside participation) matches no source found. This proposal models the family that the sources do show.

## Established concepts

Five public notes, all on the S&P 500, all "Barrier Absolute Return" notes with daily observation:

| Issuer, filing | Lower barrier | Upper barrier | After a barrier event | With no event |
|---|---|---|---|---|
| JPMorgan Financial, 2018 ([SEC 424B2](https://www.sec.gov/Archives/edgar/data/19617/000161577418007603/s111907_424b2.htm)) | 23.75% below the initial value | 23.75% above | `$1,000 + ($1,000 × Conditional Return)`, 2.00% | `$1,000 + ($1,000 × absolute value of the Underlying Return)`, at most $1,237.50 |
| GS Finance, 2023 ([SEC 424B2](https://www.sec.gov/Archives/edgar/data/886982/000095017023028955/spxab130_final.htm)) | 20.00% below | 25.70% above | `$1,000 + $1,000 × the minimum return`, 5.00% | `$1,000 + $1,000 ×` the greater of the minimum return and the absolute value of the return |
| GS Finance, 2023 ([SEC 424B2](https://www.sec.gov/Archives/edgar/data/886982/000156459023001901/gs-424b2.htm)) | 20.00% below | 27.55% above | $1,050, "regardless of the final index level" | the greater of $1,050 and `$1,000 +` the absolute return, capped at $1,275.50 |
| Barclays Bank PLC, 2025 ([SEC 424B2](https://www.sec.gov/Archives/edgar/data/312070/000095010325010558/dp233273_424b2-7706ubs.htm)) | 84.00% of the initial level | 116.00% | principal only, with no positive return | `$1,000 + ($1,000 × absolute value of the Underlying Return)`, at most $1,160 |
| HSBC USA, 2024 ([FWP](https://www.sec.gov/Archives/edgar/data/83246/000110465924077685/tm2418635d56_fwp.pdf)) | at least 19.00% below, set on the trade date | at least 19.00% above | `$1,000 + ($1,000 × Conditional Return)`, 2.00% | `$1,000 + ($1,000 × Absolute Reference Return)` |

How these were read: the HSBC text was extracted from the PDF directly. The JPMorgan and both GS notes were read through a fetch tool that summarises, and the Barclays note likewise, so the quotes there should be checked in the filings before they are relied on. The issuer for the Barclays filing is as the fetch tool reported it. On 10 October 2026 the JPMorgan, GS (the 5% minimum return note) and Barclays filings were fetched again and the issuer names, barrier levels, payment formulas and barrier event wording matched the rows above. This was still a summarising fetch tool, so the second GS note was not re-read and a reading of the filings themselves would be stronger.

What they agree on:

- **The event.** The HSBC filing reads: "A Barrier Event will occur if, on any Scheduled Trading Day during the Observation Period, the Closing Level of the Index is above the Upper Barrier or below the Lower Barrier." The others word it the same way: "greater than" or "above" the upper barrier, "less than" or "below" the lower barrier. Each barrier is tested strictly.
- **The period.** From but excluding the trade date or strike date to and including the final valuation date, on closing levels. The initial level is a closing level on or just before that date. SPIRe starts the period at pricing, which changes nothing, because the initial level is never past either barrier.
- **Two barriers, each with its own level.** They are symmetric in three notes and asymmetric in the GS notes. They are separate terms; only what follows from reaching either is shared.
- **No downside loss.** After an event the payment is a fixed amount. All five repay at least principal, and none has downside participation.
- **The fixed amount.** It is 0% (Barclays), 2% (JPMorgan, HSBC, where the term is the "Conditional Return"), or a 5% minimum return (GS). In the GS notes the same minimum return is also the least the note pays with no event.
- **No cap term.** The most the note can pay with no event follows from the barriers: it is the larger of the two barrier distances.

## Proposal

**A payoff feature that owns its barriers.** The smallest model is one feature on the payoff, with a lower barrier and an upper barrier, each with its own level and observation, and a fixed return that replaces the absolute return once either is reached:

```json
"absoluteReturn": {
  "rate": 1,
  "lowerBarrier": { "level": 0.8, "observation": "daily-close" },
  "upperBarrier": { "level": 1.25, "observation": "daily-close" },
  "conditionalReturn": 0.02
}
```

```text
return        = final level / initial level - 1
reached       = lowest close < lower level, or highest close > upper level
                (a barrier observed on the final date reads the final level instead)
payment       = principal × (1 + conditional return)     when reached
                principal × (1 + rate × |return|)        otherwise
```

- **Rate.** The share of the absolute return paid. All five notes pay 100%. It is kept because the existing absolute return term has a rate, and one public trigger note paid 50%. Greater than 0%.
- **Levels.** The lower level is greater than 0% and less than 100% of the level the return is measured from. The upper level is greater than 100% and at most 200%, the edge of the chart's horizontal axis. As for the other barriers, a barrier is reached strictly beyond its level.
- **Observation.** Each barrier states its own, final date or daily close, so a note can have different events on its two sides. All five public notes observe both daily; a mix has no public example, and the payment follows from each barrier's own definition.
- **Conditional return.** Optional. A return on principal, at least 0%, paid in place of the absolute return once either barrier is reached. Absent means principal only, as in the Barclays note. "Conditional return" is the public term in two of the notes.
- **Whole-payoff effect.** Reaching either barrier ends the absolute return on both sides, not only on the side the barrier is on. This is the difference from the existing barriers, whose effect is local to one direction.
- **Closes.** A scenario states a lowest close and a highest close, the inputs already built for daily observation. Left unset, no close went beyond the initial and final levels.
- **The payment never falls below principal**, whatever the barriers do, so principal protection changes nothing here and is optional. The public notes repay at least principal; the model reaches that by the shape of the payment.

### Why the current features cannot say this

Composing today's parts, a downside participation with a daily barrier and absolute return, and an upside participation with a daily barrier and rebate, differs from the public notes in three ways. Below the lower barrier today's note loses the whole fall, where the public notes pay the fixed amount. A close above the upper barrier early, followed by a fall back inside the range, ends only the upside in today's parts and leaves the absolute return on the fall, where the public notes pay the fixed amount. A close below the lower barrier early, followed by a rise, leaves the upside participation in today's parts, where the public notes also pay the fixed amount. The effect of each barrier has to reach the whole payoff.

### Alternatives considered

1. **A barrier list that features refer to.** The direction recorded in [PLAN.md](../PLAN.md), breaking Payoff into sections, would let two barriers and an "either" rule be stated once and referred to by an absolute return feature. It is the more general model and the better fit for different barriers on each side. It waits for that larger change, and this proposal's terms (levels, observation, conditional return) would carry over into it.
2. **Generalising the existing absolute return** to cover a rise and barriers of its own. It would keep one concept, but the existing feature is a sub-feature of downside participation and pays only a fall, so the two meanings would sit awkwardly together. Kept separate here, and named differently in the interface, until the model is broken out.

## Consequences

- **Outline.** The Add feature menu offers "Absolute return (both directions)". It nests a lower barrier and an upper barrier, each with its level and its Observed choice, and an optional conditional return. It is unavailable with downside participation, upside participation, a buffer, a cap, absolute return under a buffer, lookback, a basket, or a minimum return, and those features are marked unavailable while it is added.
- **Summary, payment rule and outcome.** "…that pays 100% of the absolute return of Synthetic Index, until a close is below 80% or above 125% of the initial level, and then a fixed 2%." The payment rule adds the reached test and the two payments. The outcome sentence says which barrier was reached, by which close, and what is paid.
- **Calculation.** A step per barrier (`80% × 100 · lowest close 79 is below it`), a step for the absolute return, and a step for the conditional return, each muted when it does not apply, in the order the payment applies them.
- **Chart.** With no event the line is a V: the absolute return falls with the underlier down to the initial level and rises again, between the two barriers. Beyond a barrier the final level has itself reached it, so the line is flat at the fixed return. The dashed other path is a flat line at the fixed return: the payment had a barrier been reached earlier. Each barrier has a handle, as the other barriers do, and a drop where it ends the absolute return. The filled mark of each drop is on the end the barrier level itself pays, which is the absolute return, as for the upside barrier.
- **Scenarios.** A row at each barrier level, "at barrier", and one just above or below it, "beyond barrier", plus a row where a close went beyond a barrier and the underlier then returned inside the range.
- **Marketing names.** "Barrier absolute return note", the phrase in all five filings. It is market usage, not a regulator's or the SSPA's name, and the reason says so.
- **Book.** A new chapter, or a section in the Absolute return chapter that separates this note from the buffer and trigger forms there, and the Barrier chapter gains the two-sided case.

## Synthetic worked example

Principal 1,000, initial level 100, absolute return at 100%, a lower barrier at 80% and an upper barrier at 125%, both observed on every close, and a 2% conditional return.

| Final level | Lowest close | Highest close | Barrier reached? | Payment |
| ---: | ---: | ---: | :--- | ---: |
| 100 | 100 | 100 | No | 1,000 |
| 90 | 90 | 100 | No | 1,100 |
| 110 | 100 | 110 | No | 1,100 |
| 80 | 80 | 100 | No, it is at the lower barrier | 1,200 |
| 125 | 100 | 125 | No, it is at the upper barrier | 1,250 |
| 79 | 79 | 100 | Yes, below the lower barrier | 1,020 |
| 126 | 100 | 126 | Yes, above the upper barrier | 1,020 |
| 100 | 79 | 100 | Yes, an earlier close was below | 1,020 |
| 110 | 100 | 130 | Yes, an earlier close was above | 1,020 |

The largest payment with no event is 1,250, at the upper barrier, the larger of the two distances. A note that never moves pays 1,000 with no event and 1,020 after one, so reaching a barrier can pay more than ending flat inside the range; the public notes with a 2% conditional return have this property. Observed on the final date instead, the last two rows pay 1,000 and 1,100, since only the final level is read.

## Decisions to make

1. **A payoff feature that owns its barriers, or a barrier list.** Recommended: the feature, now, and the list when Payoff is broken into sections.
2. **The name of the after-event return.** Recommended: conditional return, the public term in two notes. The GS notes call the same amount a minimum return.
3. **Each barrier has its own observation, with any mix.** Recommended yes, which is what different events on the two sides means. No public note mixes them.
4. **Keep a rate term**, although every note pays 100%. Recommended yes, for consistency with the existing absolute return.
5. **Combinations in the first version.** Unavailable with participations, a buffer, a cap, lookback, a basket, averaging and the existing absolute return. Averaging is left out because the average is not a close; a daily barrier beside it has no public example.
6. **The GS minimum return.** The GS notes also use the fixed 5% as the least the note pays with no event, which is the minimum return floor the model has for deposits only, "until a note with one is verified". These notes verify one. Lifting that restriction, and letting the conditional return equal the minimum return, is a separate small change, left out here.
7. **Equality.** Each barrier is reached strictly beyond its level, as in all five notes and as the other barriers are.

## As built

Every step is done: the domain, the content, the chart and the interface, with a book section in the Absolute return chapter. The model, the worked example (each row is a domain test), the scope and the decisions above stand, with these details:

- **The JSON key is `barrierAbsoluteReturn`**, on the payoff beside `participations`, not `absoluteReturn`. The existing absolute return is a sub-feature of downside participation and keeps that key, so the two stay distinct in the code and the JSON. The interface and the book call the feature "Absolute return (both directions)".
- **Decisions followed as recommended:** a feature that owns its barriers (1), "conditional return" (2), each barrier with its own observation in any mix (3), a rate term (4), the combinations left out (5), and strict equality (7). Decision 6, the GS minimum return, is not done: the minimum return stays for deposits only, and this payoff cannot be combined with it.
- **Adding it** puts both barriers on the payoff at 80% and 125%, both observed on every close. The conditional return is added separately from the Add feature menu and is off at first. Participation, a minimum return, lookback, a basket and averaging are blocked in both directions, with the reason in the menu or option label.
- **The payment breakdown** gains `barrierAbsolute` (each barrier's level and whether it is reached, whether either is, and the conditional return). `lowestClose` and `highestClose` are reported for whichever barrier is observed daily, so both can be reported at once.
- **The chart** adds two regimes, the fixed return below the lower barrier and above the upper one, and a handle for each barrier. The dashed other path is the fixed return at every final level, drawn when either barrier is observed on every close.
- **Scenario rows** mark a row just past a barrier on either side (`pastBarrier`, replacing the upside-only `aboveBarrier`), and add one recovered row per daily barrier, with the underlier back at the initial level. The label beside it names the lowest close for the lower barrier and the highest for the upper.
- **Checked in the running app:** adding the feature, the conditional return, each observation, the mixed case, the validation message, the scenario table and a phone width. **Not checked:** keyboard use of the new handles, and deposits.

## Open questions

1. **Re-read the sources.** The JPMorgan, GS (minimum return note) and Barclays quotes matched on a second fetch (see above). The second GS note and a reading of the filings without a summarising tool remain.
2. **The period start.** The filings start after the trade date and set the initial level on or before it. SPIRe starts at pricing. Nothing in the payment depends on it.
3. **A note with a loss after the event.** None found. If one is, the conditional return becomes a payoff that can depend on the final level, which this model does not allow.
4. **A fixed return below the no-event payment.** A note where the conditional return is under what the absolute return pays is not excluded, though it would pay less after an event than before, and none was found.
5. **Other issuers and observation.** All five are on the S&P 500 with daily closes. A note on another underlier, a basket, or weekly observation would test the model.
