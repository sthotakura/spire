# Cash-flow result

Agreed and built on 5 November 2026, as proposed below, with the recommended answer to each decision. This is slice 3 of [observation-dates.md](observation-dates.md): a list of what a product pays and when, and a return a year for a product that pays on several dates. It changes what the app reports about a scenario, not what any product pays. It adds no term to the product.

## What it means

A product with a coupon pays on several dates, and the same total can arrive early or late. A holder who receives 10 a month for a year has had the money sooner than one who receives all 120 at the end, so the two have not earned the same return, although the total is the same.

The **cash-flow result** states each payment with its month. The **annualised return** is then the rate a year at which those payments, each discounted from its own month, add up to the principal paid at the start. For one payment that is the figure the reference already shows. For several, it is the same idea applied to each.

## Established concepts

| Finding | Source |
| :--- | :--- |
| **A bond's yield is this rate.** Yield to maturity is "the discount rate at which the sum of all future cash flows (from coupons and principal repayment) equals the price of the bond". | [FINRA, Bond yield and return](https://www.finra.org/investors/insights/bond-yield-and-return) |
| **A call shortens the same calculation.** Yield to call "is figured the same way as YTM, except instead of plugging in the number of months until a bond matures, you use a call date and the bond's call price". | FINRA, as above |
| **The figure rests on a reinvestment assumption.** Yield to maturity "does not require dividends to be reinvested, but computations of YTM generally make that assumption", and reinvesting at one rate is "virtually impossible", so the figures are "estimates only". | FINRA, as above |
| **A coupon's headline rate is a nominal rate.** 11.72% a year is stated as about 29.30 a quarter on 1,000: the annual rate times the period, with no compounding. | [coupon.md](coupon.md) |
| **Issuers state an annual yield beside a single payment**, compounded once a year: 1,052.50 after 7 years is 0.73% a year. The reference's formula follows this. | [deposit.md](deposit.md) |

The FINRA page was read on 5 November 2026 through a summarising fetch tool, and a direct download did not confirm its wording, so the book describes it in its own words and does not quote it. Investor.gov refused the fetch, so FINRA is the only regulator source here.

One search on 5 November 2026 found no structured note filing that states a return a year for a note with coupons. The filings it returned state only the coupon's headline rate. So applying a bond's yield to a contingent product's scenario is this reference's own reading: a coherent one, stated as such, and not something an issuer publishes.

## Smallest model

Nothing on the product changes, so the structure JSON and the schema do not change.

**The payments.** `RedemptionOutcome` gains a list derived from what it already works out:

```ts
interface Payment {
  month: number      // from the start of the term
  coupon: number     // the coupons paid on this date, with any remembered ones
  redemption: number // the call or the payoff; zero until the product ends
  amount: number     // coupon + redemption
}
```

Only dates that pay appear, so a missed coupon has no row; the review table already says what each review missed. The date the product ended always appears, even if it pays nothing. The amounts add up to `totalPaid`, which a test holds.

**The return.** A function solves for `r`:

```
sum of amount ÷ (1 + r)^(month ÷ 12) = principal
```

- **One payment** gives `(payment ÷ principal)^(12 ÷ months) − 1`, today's `annualisedReturn`, so every product without a coupon keeps its figure. A test holds the two equal.
- **There is always one answer.** Principal is paid once at the start and every later amount is zero or more, since the payment does not fall below zero. The cash changes sign once, so one rate above −100% solves it, and bisection finds it.
- **Nothing paid at all** is −100%, as today.

## Synthetic worked examples

Notes of 1,000, with a coupon of 12% a year paid monthly, 10.00 a review.

| Scenario | Total paid | Total return | A year |
| :--- | ---: | ---: | ---: |
| Every coupon paid, 1,000 at month 12 | 1,120.00 | +12% | 12.68% |
| With memory: months 1 to 6 missed, seven coupons in month 7, then monthly, 1,000 at month 12 | 1,120.00 | +12% | 12.45% |
| One payment of 1,120 at month 12, for comparison | 1,120.00 | +12% | 12.00% |
| Called in month 3, with three coupons | 1,030.00 | +3% | 12.68% |
| Every coupon paid, 600 at month 12 | 720.00 | −28% | −29.74% |
| Every coupon paid, nothing at month 12 | 120.00 | −88% | −95.90% |

The first three rows are the point of the feature: the same total, three different returns.

The memory example in [contingent-coupon.md](contingent-coupon.md), called in month 5, gives:

| | Payments | Total paid | Total return | A year |
| :--- | :--- | ---: | ---: | ---: |
| With memory | 10.00 in month 1, 20.00 in month 3, 1,020.00 in month 5 | 1,050.00 | +5% | 12.63% |
| Without memory | 10.00 in month 1, 10.00 in month 3, 1,010.00 in month 5 | 1,030.00 | +3% | 7.44% |

These figures are held by `src/domain/cash-flow.test.ts`.

## Decisions

1. **How the rate compounds.** Recommended: once a year, as above.

   | Choice | Every coupon paid | Paid late, by memory | Called in month 3 | Comment |
   | :--- | ---: | ---: | ---: | :--- |
   | **Compounded once a year** | 12.68% | 12.45% | 12.68% | Agrees with the figure shown today for one payment, and reads timing |
   | Nominal, at the coupon's frequency | 12.00% | 11.79% | 12.00% | Matches the headline coupon, but quarterly and monthly notes are then not comparable, and it disagrees with the one-payment figure |
   | Total return ÷ years | 12.00% | 12.00% | 12.00% | Easy to explain, but ignores when each payment was made, which is why the figure was left out ([contingent-coupon.md](contingent-coupon.md), decision 4) |

   The cost of the recommendation is that a 12% coupon repaid at par reads 12.68%, which looks like an error until explained. The calculation step and the book would say why.

2. **The name.** Recommended: keep "Annualised return" for one payment and for several, since it is one calculation, and say in the book that it is the same calculation as a bond's yield. "Yield" alone could be read as the coupon rate.

3. **Where the payments appear.** Recommended: a read-only Payments table of its own, under the calculation, shown when the product has a coupon. Without one there is one payment, which the calculation already states. Adding a column to the review table does not work: it is an input table, it has no row for the last date, and a bullet note with a fixed coupon has no table at all. A product with many payments scrolls inside the table, so the page does not grow; 120 monthly payments is the case to check.

4. **A short life stays annualised.** Called in month 1 with 1% paid reads 12.68%, and 8% paid reads about 152%. Today's figure already does this for a called product, and the calculation says how many months it read. Recommended: keep it. The alternative, no figure below a year, would remove today's 14.1% example in chapter 19.

## What changed

- **Domain.** `payments` on `RedemptionOutcome`, and the function for the return, in `src/domain/autocall.ts`, independent of Vue.
- **Calculation.** With a coupon, an "Annualised return" step after Total return, saying how many payments it reads over how many months. The outcome sentence adds the figure after the total return.
- **Interface.** The Payments table, and the comments in `src/App.vue` and `src/content/autocall.ts` that say the figure is left out.
- **Unchanged.** The payoff chart, which draws the payment at the end of the term, the calculation path, the samples, and the schema.
- **Book.** Chapter 4 (one payment as the simple case), chapter 19 (a coupon note's return on a call) and chapter 20 (a new section, replacing the paragraph and the boundary that said this is not given), chapter 21 (the same boundary), with their outline entries. The working documents [coupon.md](coupon.md) and [contingent-coupon.md](contingent-coupon.md) note that it is built.
- **Tests.** The tables above; payments that add up to `totalPaid` over every sample and path; one payment equal to the closed form; nothing paid at −100%; and a payment on the same month as a call counted once.

## Assumptions

- The holder pays the principal at the start of the term, month 0. Issue price, fees and any later purchase are not modelled.
- Months are twelfths of a year, as the coupon's arithmetic is, and payments fall on the review's month. The days between a determination and its payment are issuance, so they are left out.
- A delivered payment counts at its value on the final date, as the payment shown today does ([settlement.md](settlement.md)).
- The figure describes one hypothetical path. It is not an expected return, a valuation or a guarantee of issuer payment, and it assumes every payment is made.

## Open questions

1. **A filing that states this figure.** If a structured note states a yield over its coupons, its convention should be read and compared with decision 1.
2. **A timeline of the reviews**, with triggers, coupons and the stop at a call, is a separate question ([calculation-path.md](calculation-path.md)). The Payments table does not settle it.
