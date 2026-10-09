# Daily close observation

Built, as proposed below except for the departures listed under *As built*. It adds a second way to observe a barrier: on every closing level from pricing to the final observation date, instead of on the final observation date only. It applies to the barrier on downside participation ([barrier.md](barrier.md)) and the barrier on upside participation ([upside-barrier.md](upside-barrier.md)). It does not add dates, a calendar, coupons, calls, or daily observation for a buffer.

## Established concepts

- A barrier observed **daily** is reached if the closing level on any trading day in the period crosses it. One daily-monitored note has a knock-in event "if the closing level of either Index on any eligible trading day during the observation period is less than its threshold level", over every trading day from the pricing date to the calculation day ([SEC 424B2](https://www.sec.gov/Archives/edgar/data/72971/000138713119008969/wfcr1924-424b2_112119.htm), as recorded in [observation-dates.md](observation-dates.md)).
- A second public note observes **both** an upper and a lower barrier on closing levels: "A Barrier Event occurs if, on any day during the Observation Period, the closing level of the Underlying is greater than the Upper Barrier or less than the Lower Barrier", with the Observation Period running "from but excluding the Trade Date to and including the Final Valuation Date" ([SEC 424B2, Barrier Absolute Return Market Linked Notes](https://www.sec.gov/Archives/edgar/data/19617/000161577418007603/s111907_424b2.htm)). Once a Barrier Event occurs the payment is "$1,000 + ($1,000 × Conditional Return)", with a Conditional Return of 2.00%, which does not depend on the Underlying Return, so the fixed amount is paid after a fall back, as for a rebate. This confirms closing-level observation on any day, both directions, and a fixed amount that does not depend on the final level. It does not confirm a downside barrier that switches downside participation on: here a lower-barrier event replaces the payment with the fixed amount, and principal is protected. Without a Barrier Event the note pays principal plus the absolute value of the underlier's return, on a rise as well as a fall. SPIRe models absolute return only on a fall and a barrier only on one direction, so this note cannot yet be expressed (see [barrier.md](barrier.md), one barrier switching several features). Its Initial Value is the close on the day before the Trade Date, so the observation period starts after the initial level is set; the closes in between are not observed.
- Once reached, the event stays reached. A knock-in on downside participation applies downside participation to the whole fall even if the underlier later recovers. A knock-out on upside participation ends the participation even if the underlier later falls back.
- Public descriptions of shark fin notes observe the upside barrier this way, and pay the rebate "whatever the final level is" once it is reached ([upside-barrier.md](upside-barrier.md)). Daily observation is what the final-date version of that note simplified.
- **Equality.** The note above tests the upper barrier as strictly greater than and the lower barrier as strictly less than. SPIRe first reached an upside barrier at or above its level, an assumption taken from a shark fin term sheet that was read but is not cited. It now reaches it strictly above its level, following the cited filing, although that filing is a different product (absolute return, not a shark fin). Open question 1 records the basis.
- **Not yet verified:** the comparison for an upside barrier in a public shark fin term sheet. The period in the filing above starts after the trade date, not at pricing; SPIRe starts it at pricing, which changes nothing because the initial level is never past either barrier. The assumptions below stand until a source settles them.

## Proposal

**Observation becomes `'final' | 'daily-close'`.** The final-date option is unchanged and stays available. Daily close is the option now shown as unavailable.

```json
{ "direction": "downside", "barrier": { "level": 0.7, "observation": "daily-close" }, "rate": 1 }
{ "direction": "upside", "barrier": { "level": 1.3, "observation": "daily-close", "rebate": 0.02 }, "rate": 0.8 }
```

**The period is part of the definition, not a term.** It is every closing level from pricing to the final observation date. No dates are added, so [observation-dates.md](observation-dates.md) stays deferred.

**A scenario states one extra number, the extreme close.** Whether any close crossed a barrier is the same as whether the extreme close did:

- a downside barrier is reached if the **lowest** close is below the barrier level;
- an upside barrier is reached if the **highest** close is above the barrier level.

```text
downside barrier reached = lowest close < barrier level × initial level
upside barrier reached   = highest close > barrier level × initial level
```

Everything after that is unchanged. A reached downside barrier applies downside participation to the whole fall; a reached upside barrier ends upside participation and pays the rebate, if any. The payment is then a function of the final level and the extreme close.

**Defaults and consistency.** The extreme defaults to "not reached": the lowest close is the smaller of the initial and final levels, the highest the larger. Moving the final level keeps the extreme consistent with it (the lowest close is never above the final level, nor the highest below it), so a final level below a downside barrier has necessarily reached it, and a final level above an upside barrier has too. The extreme is edited in the calculation, as averaging levels are.

**Rejected alternatives:**

1. **A list of daily closes.** It needs a calendar and many inputs, and a barrier does not need them.
2. **A yes/no toggle for "reached".** Simpler, but it hides the level that teaches the concept and can contradict the final level.

**Limit.** The extreme close is enough for barriers only. Coupons and calls depend on levels on stated dates and would need dated observations.

## Scope of the first version

The simplest version first; the rest waits for a verified public note.

- **Allowed with:** a single underlier, a given initial level, and either final method. With averaging, the payment checks the closes against the final level (the average); keeping the lowest close at or below every averaged level, and the highest at or above, is the interface's job when it edits the scenario.
- **Unavailable with:** lookback, a basket, and absolute return. Lookback and basket have no verified public daily note. The public trigger note that supports absolute return reads its barrier on the final date.
- **Upside barrier needs no downside participation.** If the highest close reached the barrier and the final level then fell, the rebate and a downside fall could both apply, which no public note was found to do. Daily observation on an upside barrier is unavailable while the note has downside participation. This can be relaxed later.
- **Both observations coexist.** Final date remains available for either barrier, so existing notes and tests are unchanged.

## Consequences

- **Payment breakdown.** Gains `barrierReached` and the extreme close, so the calculation, scenario table and outcome sentence read one source.
- **Calculation.** One step states the extreme and the result, for example `Lowest close 65 is below the barrier 70, so downside participation applies`.
- **Scenarios.** A row where the barrier was reached and the underlier then recovered, since that is the case the final-date version cannot show.
- **Chart.** The existing line stays. A dashed branch shows the other path: for a downside barrier, between the barrier level and the initial level, where reaching the barrier earlier would have applied the fall; for an upside barrier, below the barrier level, where reaching it earlier would pay the rebate. The branch the scenario is on is drawn solid.
- **Outline and Add feature menu.** The Observed choice enables Daily close, with the reasons above when it is unavailable. The extreme-close field appears only when daily is chosen, never on selection or focus.
- **Marketing names.** "Shark fin note" and "Shark fin PP" show for either observation, since the name follows the payoff diagram. The reason says how a final-date barrier differs from the daily contract. The caveat remains on the final-date version only.
- **Book.** The Barrier chapter gains daily observation and its recovered-then-breached example; "Combining payoff features" and the worked examples are checked.

## Synthetic worked examples

Principal 1,000, initial level 100.

**Downside barrier at 70%, 100% downside rate:**

| Final level | Lowest close | Barrier reached? | Daily payment | Final-date payment |
| ---: | ---: | :--- | ---: | ---: |
| 100 | 65 | Yes | 1,000 | 1,000 |
| 80 | 80 | No | 1,000 | 1,000 |
| 80 | 65 | Yes | 800 | 1,000 |
| 65 | 65 | Yes | 650 | 650 |

The third row is the new case. The underlier recovered to 80, but it closed at 65 earlier, so the whole fall of 20% counts.

**Upside barrier at 130%, 80% upside rate, 2% rebate, 100% principal protection:**

| Final level | Highest close | Barrier reached? | Daily payment | Final-date payment |
| ---: | ---: | :--- | ---: | ---: |
| 120 | 125 | No | 1,160 | 1,160 |
| 120 | 135 | Yes | 1,020 | 1,160 |
| 150 | 150 | Yes | 1,020 | 1,020 |
| 90 | 135 | Yes | 1,020 | 1,000 |

The last row pays the rebate although the final level fell: the barrier was reached earlier.

## Decisions agreed

1. Daily close is added beside Final date, not instead of it.
2. First version: single underlier, given initial level, either final method. Unavailable with lookback, a basket and absolute return.
3. An upside barrier observed daily needs a note with no downside participation. Revisit if a public note shows otherwise.
4. The downside barrier is reached strictly below its level and the upside barrier strictly above it. The upside rule was first at or above and changed to strictly above after a public filing was cited (open question 1).
5. "Shark fin" names show for either observation, because the name follows the payoff diagram.
6. The period starts at pricing. Whether it starts on the pricing date or the issue date is a minor detail for this project and is not modelled.

## Build order

1. Domain: the observation type, the extreme-close scenario input, `barrierReached`, validation, and a test for each row of both tables. The existing tests pass unchanged.
2. Content: summary, JSON, payment rule, calculation, outcome, scenarios, names.
3. Chart: the dashed branch and its labels.
4. Interface: the Observed choice and the extreme-close field.
5. Documentation: the book chapters, book outline, marketing names, [upside-barrier.md](upside-barrier.md), [observation-dates.md](observation-dates.md) and [PLAN.md](../PLAN.md).

## As built

All five steps are done. The model, the worked examples (each row is a domain test), the scope and the decisions above stand, with these departures and details:

- **The solid line is always the path where no close reached the barrier.** The proposal drew the scenario's own path solid. Doing that means splitting the coloured line into pieces, so the dashed line is always the other path, and the final-level marker sits on whichever line the scenario's closes put it on, which may be the dashed one. Drawing the scenario's path solid is a possible refinement.
- **The averaging check is the interface's job.** The payment checks the closes against the final level only. The interface moves the reader's lowest close down, or highest close up, so it stays within the initial level and every observed level, and with no input uses the lowest or highest of those levels.
- **The domain rejects contradictory closes.** A lowest close above the initial or final level, below zero, or not a number, and a highest close below either level, throw.
- **The rename.** `belowBarrier` in the payment breakdown became `barrierReached`, since it no longer means only the final level. The breakdown also reports `lowestClose` or `highestClose` for a barrier observed daily.
- **The extra scenario row** (`afterBreach`) puts the final level halfway between the barrier and the initial level, with a close 5% of the initial level past the barrier. It stays beside the row at that final level that never reached the barrier.
- **Unavailable combinations** are blocked in both directions in the interface, with the reason in the option label, and rejected by validation.
- **Strictly above.** With the upside barrier reached only strictly above its level, the level itself pays the participation, so the barrier row of the scenario table pays the largest payment, a second row just above it ("above barrier") shows the rebate, the chart's filled mark is the lower end of the drop, and a highest close exactly at the barrier does not reach it.
- **Not yet checked in the running app:** narrow screens, keyboard use, the scenario table, averaging, deposits, and dragging the final-level handle with a close set.

## Open questions

1. **The upside barrier test.** Decided: strictly above. The only public source cited ([SEC 424B2](https://www.sec.gov/Archives/edgar/data/19617/000161577418007603/s111907_424b2.htm)) says strictly greater than for its upper barrier. A public shark fin term sheet may differ; revisit if one is found.
2. **Closing levels.** Both cited notes compare closing levels on any day in the period, not intraday levels. Other notes may monitor differently (one product supplement allows intraday or weekly monitoring, per [barrier.md](barrier.md)).
3. **Rebate with a fall and a downside feature.** Not modelled; the first version excludes the combination.
4. **Lookback and basket.** Whether the period and the extreme apply to a lookback level or a basket level, and how.
5. **Dates.** A coupon or call observed on stated dates still needs [observation-dates.md](observation-dates.md); the extreme close does not replace it.
