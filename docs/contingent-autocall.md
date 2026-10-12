# Auto-callable contingent interest notes

This is a proposal, not scheduled as a whole. It maps one public note onto SPIRe's concepts, lists what the reference lacks to express it, and orders the increments. Only the first increment, [worst-of.md](worst-of.md), is agreed.

The source is a public pricing supplement: an Auto Callable Contingent Interest Note linked to the lesser performing of two funds ([JPMorgan Chase Financial Company LLC, 424B2](https://www.sec.gov/Archives/edgar/data/19617/000121390026108339/ea0308243-01_424b2.htm)). It is used as a public source for the structure. Synthetic names, levels and dates stand in for its funds, prices and calendar in everything SPIRe publishes.

## What the note is

| Part | In the note |
| :--- | :--- |
| Wrapper, principal, term | A note, $1,000 per note, 12 months |
| Underlier | Two separate funds. The payoff reads the lesser performing one; it is not a weighted basket. |
| Initial level | Each fund's closing price on the strike date, which is the day before the pricing date |
| Review dates | 12 monthly closing-price observations. The last is also the final valuation. |
| Contingent coupon | A fixed amount per review date (14.15% a year paid monthly), paid only if every fund closes at or above 80% of its strike on that date |
| Memory | An unpaid coupon is paid with a later one if every fund is back at or above the interest barrier |
| Automatic call | On review dates 6 to 11, if every fund closes at or above 100% of strike, the note repays principal plus that date's coupon plus unpaid coupons, and ends |
| Maturity payment | Not called, worst fund at or above 80%: principal plus the coupon and unpaid coupons. Below 80%: principal plus (worst return + 20%) × 1.25. The loss can be total. |
| Upside | None beyond the coupons: no participation |
| Not structure | Settlement lag, interest payment dates after review dates, issuer and guarantor, estimated value, fees, tax, adjustment factor, acceleration events, market disruption |

Three levels are tested and stay distinct even though two are both 80% here: the interest barrier, the buffer threshold, and the call trigger at 100%.

## What SPIRe already has

- The maturity payment, if the note ran to maturity, is a downside participation with a 20% buffer and a rate of 1.25, no upside participation and no protection floor. The rate 1.25 is 1 ÷ (1 − 0.20): it makes the loss reach 100% when the fund goes to zero. Because the buffer threshold equals the buffer there is no cliff, so this is a buffer and not the downside barrier of [barrier.md](barrier.md).
- Wrapper, principal, term, and a final level on the final date.

## What it lacks

| Gap | Why it matters | Status |
| :--- | :--- | :--- |
| Worst-of basket return | The payoff reads the lesser performing fund | [worst-of.md](worst-of.md) |
| Observation schedule | Coupon and call conditions are tested on stated dates | Proposed in [observation-dates.md](observation-dates.md) |
| Contingent coupon with its own barrier | A per-date condition, a rate and a barrier | [coupon.md](coupon.md) covers a fixed coupon only |
| Memory | Carries unpaid coupons forward | Named in [feature-map.md](feature-map.md) |
| Autocall | A trigger on some dates ends the note early; the term becomes the scheduled length | Named in [feature-map.md](feature-map.md); open question 1 of [term.md](term.md) |
| A path of levels per scenario | Each asset's close on each review date, not one final level | Not proposed |
| Result as a cash-flow schedule | Dated payments and an end date, not one payment | Sketched for fixed coupons in [coupon.md](coupon.md) |

## Increments

Each is its own proposal, book chapter and schema example.

1. **Worst-of and best-of basket return.** No dates are needed. It lets the maturity payment above be written for a basket and reviews the worst-of design alone. Agreed.
2. **Observation dates.** Review dates on the concept that observes. Maturity, settlement and interest payment dates stay out, as [observation-dates.md](observation-dates.md) proposes.
3. **Contingent coupon**, with its own barrier, then the **memory** flag.
4. **Autocall.** A trigger level, the dates on which it can fire, and the early-redemption payment.
5. **A cash-flow result and path scenarios.** The schedule is derived from one breakdown, as the maturity payment is. A scenario is a named path ("called at review 6", "never below the barrier", "crash"), not a grid of inputs.

## Open questions

1. **One trigger concept or several.** The interest barrier, the call trigger and the buffer threshold each test a level at some date. Whether they share a type is open ([feature-map.md](feature-map.md)). The recommendation is separate named types until a third copy appears.
2. **Fund underliers.** A fund is modelled as an equity or equity index until a note needs something that differs.
3. **Strike date and pricing date.** The note sets its initial levels on the day before pricing. Which is the initial level's observation date is a term of the determination ([observation-dates.md](observation-dates.md)).
4. **Early redemption and the term.** With a call the actual length depends on the scenario.
