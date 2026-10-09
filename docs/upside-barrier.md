# Barrier on upside participation

This is a proposal, not scheduled. It adds a barrier as a sub-feature of upside participation: when the underlier ends at or above a level above the initial level, upside participation is cancelled and the holder receives an optional fixed rebate instead. Combined with principal protection it gives the payoff publicly called a shark fin. It does not add daily observation, a cap together with this barrier, a barrier that switches several features, digital amounts, coupons, or pricing. It builds on [barrier.md](barrier.md), which added the barrier on downside participation.

## Established concepts

- A **knock-out** barrier ends a feature when the underlier crosses a level. It does no arithmetic of its own, as for the barrier in [barrier.md](barrier.md): it decides whether another feature applies.
- A **shark fin note** is described in public educational material as a capital-protected note that participates in a rise up to an upside barrier. Once the barrier is reached the participation ends, and many such notes pay a **rebate**, "a predetermined lump sum paid at maturity" ([my-structured-products.com](https://www.my-structured-products.com/index.php/know-how/capital-guarantee/36-shark-notes); [Hubbis](https://www.hubbis.com/article/swimming-with-sharks-capital-protected-structured-solutions-for-uncertain-times)). The same sources describe it as a zero-coupon bond plus an up-and-out call option.
- Those sources describe the barrier as observed on any trading day, using the closing level. A shark fin term sheet read during this research states the same: a barrier event occurs if any closing level in the period is at or above the barrier, and the rebate is then paid whatever the final level is. That differs from the final-date observation modelled here, which is a deliberate simplification (open question 1). The term sheet is not cited because a public source has not been confirmed.
- A knock-out on upside participation is verified in one product supplement: it defines an "Upper Barrier", a percentage of the initial level, and once a "Barrier Event" occurs a rise pays zero, or a fixed rebate, instead of participating ([Deutsche Bank product supplement, 424B2](https://www.sec.gov/Archives/edgar/data/1159508/000119312509018934/d424b21.pdf)). That is what [barrier.md](barrier.md) records. A later attempt to re-read the filing returned unreadable text, so nothing beyond the record in [barrier.md](barrier.md) is relied on here.
- **Not yet verified:** an actual shark fin term sheet, with its exact barrier test (at or above, or strictly above), its rebate timing, and whether it allows a cap or a buffer. The sources above are educational, not contractual.

## Proposal

The barrier belongs to upside participation, as the buffer and barrier belong to downside participation. It switches upside participation off (knock-out) when the final level reaches the barrier, and may pay a rebate in its place:

```json
{ "direction": "upside", "barrier": { "level": 1.3, "observation": "final", "rebate": 0.02 }, "rate": 0.8 }
```

```text
underlier return = final level / initial level - 1

upside participated return =
  rebate,           when final level ≥ barrier level × initial level
  rate × return,    when the final level is above the initial level but below the barrier
  0,                otherwise
```

Everything after that is unchanged: the downside feature, the minimum return of a deposit and the protection floor apply as before.

- **Level.** A fraction of the level the return is measured from, as for the downside barrier, but above it: greater than 100% and at most 200%. Two hundred percent is the edge of the chart's horizontal axis (a rise of 100%).
- **Rebate.** Optional. A return on principal, greater than 0%, paid in place of the participation when the barrier is reached, as `rebate × principal`. It is a fixed amount paid because a barrier was reached. It is not a coupon, which is a series of payments over the term ([coupon.md](coupon.md)).
- **Observation.** `"final"`, as for the downside barrier: the barrier reads the level the determination produces. `"daily-close"` was added later and reads the highest close from pricing to the final date ([daily-observation.md](daily-observation.md)); it needs a note with no downside participation.
- **Effect.** Not a term. A barrier on downside participation is a knock-in and a barrier on upside participation is a knock-out, so the direction states it. An `effect` term waits for a case where the direction does not (decision 1).
- **Initial level.** Measured from the determined initial level: the initial level, or the lookback level when the note has lookback ([lookback.md](lookback.md)), as the downside barrier is.
- **Order.** The barrier is checked before the rate applies, so its key comes before `rate`.

## Consequences

- **Outline.** "Upside barrier" nests under Upside participation, with its Level and the Observed choice, with Final date and Daily close (Daily close is unavailable with lookback, a basket or downside participation). The optional rebate is its own row nested under the upside barrier, added from the Add feature menu like absolute return under a buffer. The menu marks the upside barrier "Needs upside participation" until that exists and the rebate "Needs an upside barrier", and marks the upside barrier "Not with a cap" and the cap "Not with an upside barrier". Removing upside participation removes the upside barrier and its rebate. Both barriers keep the barrier concept, so selecting either highlights both.
- **Summary, payment rule and outcome.** The summary adds a clause after protection: "an upside barrier at 130% of the initial level that ends the upside and pays a 2% rebate" (or the lookback or basket level). The payment rule adds a line, "upside only when Final level < Barrier × Initial level, otherwise Principal × (1 + Rebate)", and the words say that at or above that level a rise adds only the fixed rebate. The outcome sentence says whether the final level is at or above the barrier and, if so, that the rebate replaces the participation.
- **Calculation.** An "Upside barrier" step, then a "Rebate" step when there is one, both before the participation steps, e.g. `130% × 100 · final level 140 is at or above it, so upside participation ends`. Upside participation then shows 0%, muted, and the rebate step carries the +2%. Both are muted when the final level is below the barrier.
- **Chart.** A sideways handle at the barrier, on the end the barrier level pays (the rebate, or principal), and the droplines the chart already draws where a rule changes. It reuses the barrier colour (violet #9775fa): the colour identifies the concept, and both barriers are the same concept. The payoff line rises to the barrier and drops. It is drawn as two pieces with no connecting segment, with a filled mark on the end the barrier pays and an open mark on the other, as the existing barrier does. Labels say "Each 1% rise up to +30% adds 0.8%" and "From +30% it pays a fixed 1,020", and a note with both barriers keeps their labels apart. The slope handle stays below half the rise to the barrier, as a cap keeps it, so the barrier does not pin it. The handle is limited to 101% to 200%.
- **Scenarios.** A row at the barrier level, marked "at barrier": the lowest final level at which participation ends. It moves with the barrier and replaces a fixed row at the same level. The upside cell of a row at or above the barrier reads "rebate 2%", or "barrier reached" with no rebate.
- **Floating point.** The barrier level is rounded to nine decimals where it is computed (`barrierLevelAt`), because 1.1 × 100 is 110.00000000000001, which would stop a final level of 110 from reaching a barrier at 110%.
- **Deposit wrapper.** Allowed. A deposit has no downside participation, so a knock-out on its upside is the only barrier it can carry. The minimum return applies after the barrier, as it does after the cap, so a rebate below the minimum return pays the minimum.
- **Marketing names.** Upside participation with an upside barrier and no downside participation shows "Shark fin note". Full principal protection (100%) shows "Shark fin PP" in its place, beside "Principal-protected note"; partial protection keeps the plain name. A rebate is optional. It is seller usage, not a regulator's or the SSPA's name, and the reason says sellers observe the barrier daily. The name follows the payoff diagram, so it shows for either observation, and the final-date version's reason says how that contract differs ([marketing-names.md](marketing-names.md)).
- **Book.** When built: the Barrier chapter gains the knock-out case and the rebate, the Cap chapter and "Combining payoff features" note that a cap and a barrier are not combined, and the worked examples gain the example below.

## Synthetic worked example

Principal 1,000, initial level 100, 80% upside participation, an upside barrier at 130% of the initial level observed on the final date, a 2% rebate, 100% principal protection.

| Final level | Return | Barrier reached? | Payment |
| ---: | ---: | :--- | ---: |
| 150 | +50% | Yes | 1,020 |
| 130 | +30% | Yes, it is at the barrier | 1,020 |
| 129 | +29% | No | 1,232 |
| 120 | +20% | No | 1,160 |
| 100 | 0% | No | 1,000 |
| 80 | −20% | No | 1,000 |

The largest payment is just below the barrier: a final level of 129.99 pays 1,239.92. At and above the barrier the holder is paid less than at 129, which is the shark fin's drop. Without a rebate the first two rows pay 1,000.

With 100% protection the fall to 80 repays principal. Without it, the note has no downside participation, so a fall still leaves principal unchanged: the protection term would then change nothing here.

## Decisions to make

0. **Barriers are named after the participation they control.** "Downside barrier" and "Upside barrier", in step with "Downside participation" and "Upside participation", the nesting in the outline and the `direction` key in the JSON. Neither "Lower and upper" (position, which restates what the chart shows) nor "knock-in and knock-out" (effect, which the direction already fixes) is the label. The hints and the book introduce the practitioners' terms: the downside barrier is a knock-in barrier and the upside barrier a knock-out barrier. If a barrier with the other effect is modelled, the `effect` term in decision 1 says so and the names stay.
1. **The direction states the effect.** A barrier on upside participation knocks out and one on downside participation knocks in, so no `effect` term is added. Alternative: add `"effect": "knockOut"` now, which changes the downside barrier's JSON for no payment difference. The planned direction in [barrier.md](barrier.md) (a list of barriers that features refer to) would replace both, and waits for a feature that shares a barrier.
2. **The rebate belongs to the barrier**, not to upside participation or the payoff. It exists only when the barrier is reached, and it is paid in place of the participation that barrier cancels.
3. **A barrier and a cap are not allowed together on upside participation.** Both limit the gain on a rise, and the public note found uses a barrier alone. The Add feature menu marks whichever is second as unavailable. Alternative: allow both, so the cap bounds the participation below the barrier. No public note combining them was verified.
4. **A barrier on upside participation needs no protection.** The model composes features, so a barrier note without a floor is valid. "PP" in the product's nickname is a property of the note, not of the barrier.
5. **Barrier and buffer are unrelated here.** A buffer sits on downside participation, a barrier on upside, so a note can carry both without a rule.
6. **At or above the barrier counts as reaching it.** An assumption, to be replaced when a term sheet is verified (question 2).
7. **Build order.** The domain (rule, validation, a test for each row of the example), then the content (summary, JSON, payment rule, calculation, outcome, scenarios), then the interface, then the book.

## Open questions

1. **Daily observation.** The public descriptions check the barrier on every trading day. That makes the payment depend on the path, not the final level alone, so the payoff chart could not draw it as a function of the final level, and the rebate would be paid even after a fall back. Final-date observation is a simpler, different product. It was decided to build final-date observation first, as for the downside barrier. Daily close observation was added afterwards ([daily-observation.md](daily-observation.md), [PLAN.md](../PLAN.md) section 26), which reads the highest close, so the payoff chart draws the other path as a dashed line and the rebate is paid after a fall back. The shark fin names now show for either observation.
2. **The barrier test.** Whether a final level exactly at the barrier knocks out. The downside barrier is strictly below. The shark fin term sheet read for this proposal says "equal to or greater than" for its daily closes, so the proposal keeps at or above. Confirm against a public source. One public filing, a different product (a two-sided barrier on closes, with absolute return), tests its upper barrier as strictly greater than ([daily-observation.md](daily-observation.md)), so the question is open.
3. **Rebate timing and size.** Sources say the rebate is paid at maturity, which matches the model. Whether a rebate may exceed the largest payment below the barrier (here 24%) is not restricted. It would make the payment rise at the barrier instead of falling.
4. **Whether "shark fin" needs full protection.** Sources describe up to 100% protection. If the name rule needs a floor at 100%, a barrier without one would show no name.
5. **One barrier switching several features.** The Deutsche Bank supplement also replaces the downside rate beyond the buffer when the event occurs ([barrier.md](barrier.md)). That needs a barrier shared by features, which this proposal does not add.
6. **Averaging and basket.** With an averaged final level, the barrier would read the average; with a basket, the basket level. Neither has a verified public note.
