# Contingent coupon

Built. Two of the decisions below were revised after the first build, at the reader's request:

- **Its own schedule.** The coupon carries `schedule` beside its rate, and the call carries its own inside the redemption; the product has no shared schedule. A coupon can be reviewed monthly beside a quarterly call. The interface offers "Same as the calls", which copies the call's frequency once. The scenario reads a level on each date of either schedule, a date on both once; a coupon review on the date of a call pays with it, and a call on a date that is not a coupon review pays no coupon.
- **Any redemption** (reversing decision 3). A bullet note reads a level on each coupon review only. An issuer call with a coupon reads the coupon reviews; a call on one of them pays that review's coupon, which closes open question 4 of [issuer-call.md](issuer-call.md).

The rest of this document is the proposal as agreed; read "the reviews" in it as the coupon's own reviews.

## What it means

A **contingent coupon** is interest whose payment depends on a condition. On each review the underlier's level is compared with the **coupon barrier**, a share of the initial level. At or above it, the coupon for that review is paid. Below it, the coupon is missed. The condition is what makes the coupon contingent: a fixed coupon is paid on every date whatever the underlier does.

**Memory** changes what happens to a missed coupon. Without memory it is lost. With memory it is remembered and paid on the next review at which the level is back at or above the barrier, together with that review's own coupon. If no later review meets the barrier, the remembered coupons are never paid. Memory does not change the condition; it only lets a missed coupon be paid late.

Coupons stop when the product ends. A called product pays principal plus the coupon for the review it is called on, and no later coupons. A product that is not called pays the last review's coupon, if its level meets the barrier, with the maturity payment.

## Established concepts

| Finding | Source |
| :--- | :--- |
| **The coupon is paid when the level is greater than or equal to the barrier**, a share of the initial level, on each review: 70% with 11.50% a year paid quarterly; 50% with 17.35% a year paid monthly; 80% with 14.15% a year paid monthly. | [JPM Apple note, 2012](https://www.sec.gov/Archives/edgar/data/19617/000089109212004122/e49253_424b2.pdf); [JPM Intel note, 2026](https://www.sec.gov/Archives/edgar/data/19617/000121390026045661/ea0286921-01_424b2.htm); [JPM two-fund note](https://www.sec.gov/Archives/edgar/data/19617/000121390026108339/ea0308243-01_424b2.htm) |
| **The coupon per review is the annual rate times the period**: 17.35% a year is "payable at a rate of 1.44583% per month", and 11.50% a year is 2.875% a quarter. | Intel and Apple notes |
| **Memory is a term of the note, not of the coupon type.** The Intel note pays "any previously unpaid Contingent Interest Payments for prior Review Dates"; the Apple note, from the same issuer, says a missed coupon "will not be accrued and subsequently paid". | Intel and Apple notes |
| **The coupon is tested in the non-call period.** The Intel note cannot be called on reviews 1 to 5, and its coupon is tested on all 36 reviews. | Intel note |
| **A call pays principal plus that review's coupon**, plus remembered coupons with memory, and nothing for being called. No coupon note read pays a call premium. | Apple, Intel and two-fund notes; both callable notes in [issuer-call.md](issuer-call.md) |
| **The coupon barrier is a separate level from the downside feature, whichever that is.** The Apple and Intel notes have a downside barrier: below it the holder bears the whole fall from the initial level, 1:1. It equals the coupon barrier in the Apple note (70% and 70%) and is below it in the Intel note (40% against 50%). The two-fund note has a buffer instead: its 80% buffer threshold equals the coupon barrier, and below it the payment is principal plus (worst return + 20%) × 1.25, with no cliff ([contingent-autocall.md](contingent-autocall.md)). | Apple, Intel and two-fund notes |
| **On a basket the coupon reads the worst asset.** The two-fund note pays if every fund is at or above its barrier, which is the lesser performing fund at or above it. | Two-fund note |
| **There is no upside participation.** The return is the coupons. | All three JPM notes; the BofA note says its return "is limited to the Fixed Coupon Payments" |

The [BofA fixed coupon note](https://www.sec.gov/Archives/edgar/data/70858/000148105723007689/form424b2.htm) is a source for slice 4, not this one. It also lists its dates in a different way: 36 monthly coupon payment dates, a separate list of 30 call observation dates starting about six months in, and a valuation date. Its fixed coupon has no observation at all.

## Smallest model

```json
"coupon": { "rate": 0.12, "barrier": 0.7, "memory": true }
```

- **Beside the payoff and the redemption**, on the product. The payoff is the payment at the end of the term; the redemption decides when the product ends; the coupon is a series of payments while it lasts. All three read the same schedule.
- **`rate`**: the annual rate, as the notes headline it, greater than zero. Each review's coupon is `principal × rate × months per review / 12`. The reference does not round the coupon; the notes do (BofA's 14.50% a year is stated as 1.2084% a month), and the display rounds as it does elsewhere.
- **`barrier`**: the coupon barrier as a fraction of the initial level, met at or above. A plain number, not the payoff's `Barrier`, since it is always read on the reviews and is met at or above rather than reached strictly below. Above zero, at most 2, as the trigger is.
- **`memory`**: whether a missed coupon is paid on a later review that meets the barrier. False by default, written in the structure as the redemption's defaults are.
- **No `kind`.** The plan dropped `payoff.kind` when it had one value. The fixed coupon of slice 4 can then be a coupon with no barrier, which is the plain meaning of a coupon that is always paid (decision 2).

## The rules

On each review `r` from 1 to the last, while the product has not ended:

```text
level(r)        = the review's level: the asset's, or the basket level by its rule. The last review reads the determined final level.
coupon          = principal × rate × months per review / 12
met(r)          = level(r) ≥ barrier × initial level
paid(r)         = met(r) ? coupon × (1 + missed) : 0       missed counts only with memory
missed          = met(r) ? 0 : missed + 1                    without memory, missed stays 0
```

- **Every review is tested**, including those in the non-call period and the last.
- **The call is tested after the coupon.** A call on review `r` pays principal, plus the call amount, plus `paid(r)`. No later review is tested.
- **The last review**, if the product was not called, pays the maturity payment plus `paid(last)`. With the final review as a call, a final level at or above the trigger pays principal, the call amount and `paid(last)`.
- **Averaging.** The last review reads the averaged final level, as the JPM index note's coupon and maturity tests read its average ([observation-dates.md](observation-dates.md)).

## Synthetic worked example

A note of 1,000 on a synthetic stock with an initial level of 100. Twelve monthly reviews, a coupon of 12% a year (10.00 a review) with a 70% barrier, an autocall at 100% with no call amount and no call on reviews 1 to 3, and a 60% downside barrier on 100% downside participation.

| Review | Level | Barrier met | Paid with memory | Paid without memory |
| ---: | ---: | :--- | ---: | ---: |
| 1 | 95 | Yes | 10.00 | 10.00 |
| 2 | 65 | No | 0 | 0 |
| 3 | 102 | Yes; no call in the non-call period | 20.00 | 10.00 |
| 4 | 68 | No | 0 | 0 |
| 5 | 104 | Yes; called | 1,000 + 20.00 | 1,000 + 10.00 |

With memory the holder receives 1,050.00 over five months, 50.00 of it in coupons. Without memory, 1,030.00.

Two endings for the same note if it is never called, with the 11 earlier coupons as the path set them:

- Final level 75: the payoff pays 1,000, and the last coupon is paid, 1,010.00, plus any remembered coupons.
- Final level 55: the downside barrier is reached, so the payoff pays 550.00. The last coupon is missed, and with memory every remembered coupon is lost.

## Consequences

- **Outline.** A Coupon row under Redemption, beside the reviews it is tested on: None or Contingent, then Coupon rate (a percent a year), Coupon barrier (a percent of the initial level) and Memory. It is shown with an autocall only, and the other redemptions are unavailable while a coupon is chosen. It is not in the payoff feature menu, since it is not part of the payoff.
- **Summary.** "…pays 12% a year, 1% a month, on each review at or above 70% of the initial level, with memory".
- **Scenario.** The review table gains a coupon column for each review (paid, missed, or paid with remembered coupons). New named paths: coupons missed and then paid by memory; below the barrier to the end.
- **Calculation.** The coupon steps for each review before the call steps, then the payoff steps. A called product lists principal, the call amount and the review's coupon.
- **Result.** `redemptionOutcome` returns each review's coupon and the total paid. The annualised return is left out when there is a coupon until the cash-flow result (slice 3), which reads when each payment was made (decision 4).
- **Chart.** The payment at the end of the term, against the final level, includes the last review's own coupon: a step of one coupon at the barrier, and a larger one when the coupon barrier equals the downside barrier, as in the Apple note's table (699.90 below 70%, 1,028.75 at 70%). Remembered coupons depend on the path, so the chart leaves them out and the review table shows them.
- **Validation.** Named issues for a rate of zero or less, a barrier at or below zero or above 2, a coupon with no review schedule, and a coupon with a redemption it does not yet combine with (decision 3).
- **Schema, examples and book.** The `coupon` key with its JSDoc and the schema regenerated; an example product reproducing the Intel note's structure with synthetic levels; the Coupons chapter moves from Planned to Draft, covering the contingent coupon only, and chapter 19 says what a call pays with a coupon.

## Assumptions

- **A review the product is called on pays its coupon only if the barrier is met.** The notes pay "the Contingent Interest Payment applicable to that Review Date"; with a trigger at or above the barrier the coupon is always met when the call is. A trigger that steps below the barrier could call a product on a review that misses its coupon. The reference then pays no coupon on that review, and with memory the remembered coupons are lost. No source states this case.
- **One schedule.** The coupon is tested on every review, and the call on those after the non-call period. All three contingent notes read use one list of review dates. A note whose coupon and call fall on different frequencies is not modelled (open question 1).
- **A call amount is allowed with a coupon.** It is coherent, and no coupon note read pays one; the book says so. Adding a coupon does not change the call amount the reader has set.
- **Upside participation is allowed with a coupon.** It is coherent; none of the notes read has one.

## Alternatives

1. **The coupon inside the redemption**, as a term of the autocall. It would tie the coupon to the call, but the coupon is tested on reviews that cannot call, and a non-callable contingent coupon note is coherent. Not recommended.
2. **Memory as a separate slice**, as the plan's order says. The arithmetic is one counter, and the Intel note cannot be written without it. Recommended in the same change, as decision 1.
3. **A per-review rate** instead of an annual one. It is the amount paid, but the notes headline the annual rate and the period comes from the schedule. Not recommended.
4. **A `kind: 'contingent'`** now, ready for `'fixed'`. It has one value until slice 4. Not recommended.

## Decisions agreed

1. **Memory in the same change** as the contingent coupon. Recommended.
2. **No `kind`; the fixed coupon later is a coupon with no barrier**, so `barrier` is required now and becomes optional in slice 4. Recommended.
3. **Which redemptions in this slice.** The autocall only, which all three contingent notes use. A coupon on a bullet note is coherent but needs a schedule on a product without a call, and a coupon on an issuer call needs the issuer call to read review levels, which it does not today. Recommended: the autocall now; the issuer call next, which also completes its call price ([issuer-call.md](issuer-call.md), open question 4); the bullet note after.
4. **No annualised return with a coupon until slice 3.** Today's figure reads one payment at one date. With coupons the payments arrive over time, and a figure that ignores when would mislead. Recommended; the total paid and its months are shown.
5. **The chart includes the last review's own coupon.** Recommended.

## Open questions

1. **Coupon and call on different frequencies**, such as monthly coupons and quarterly calls. No source read; the BofA note lists two schedules, but on the same monthly rhythm.
2. **A coupon barrier that steps** with the reviews, as the trigger can. No source read.
3. **A coupon barrier above the call trigger.** Coherent: the coupon is then paid only on reviews that would also call, outside the non-call period. No source read.
4. **A coupon on a call missed because the trigger stepped below the barrier** (the first assumption). No source read.
5. **A per-asset coupon barrier** at different shares of each asset's initial level. All notes read use one share for every asset.
