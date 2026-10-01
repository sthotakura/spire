# Coupon

This is a proposal, not scheduled. It describes a fixed coupon: interest at a fixed annual rate, paid at a stated frequency over the term. It was first proposed for a fixed deposit, which is no longer modelled because it is not a structured product ([deposit.md](deposit.md)). It will be built with the first structured product that pays a fixed coupon, such as a reverse convertible. It does not cover contingent, range-accrual, memory or floating coupons, or compounding. It needs the term ([term.md](term.md)).

The established concepts below come from fixed deposits, where the choice of frequency is plainest. The same arithmetic applies to a fixed coupon on a note.

## Established concepts

- A **coupon** is interest paid to the holder during the product's life, on stated dates, as a separate payment from the repayment of principal.
- A fixed deposit pays its interest **either at stated intervals or once at the end** of the term. Bank material in India describes the choice as monthly, quarterly, half-yearly or yearly payout ("non-cumulative"), or payment on maturity ([Moneylife](https://www.moneylife.in/article/how-to-choose-between-monthly-quarterly-and-cumulative-fd-payouts/78721.html); [HDFC Bank](https://www.hdfc.bank.in/blogs/fixed-deposit/what-is-fixed-deposit-interest)). FINRA describes CDs that "pay you interest until maturity", after which "you can cash in your CD for the principal plus the interest you've earned" ([FINRA, Bank Products](https://www.finra.org/investors/investing/investment-products/bank-products)).
- **Paid interest does not compound.** A coupon that is paid out leaves the principal unchanged, so each coupon is the same amount.
- **Interest added to the balance does compound.** In a "cumulative" deposit, interest is "compounded quarterly, and payment is made on maturity" ([Moneylife](https://www.moneylife.in/article/how-to-choose-between-monthly-quarterly-and-cumulative-fd-payouts/78721.html)). Nothing is paid until the end, so this is not a coupon. It is a fixed return paid with principal, like a zero-coupon bond, and is left out of this proposal (open question 1).
- The [feature map](feature-map.md) describes a coupon as a payment condition combined with a rate. This proposal builds one cell of that table: always paid, at a fixed rate.

## Proposal

The coupon sits beside the payoff, not inside it. The payoff is the payment at the end of the term, given the underlier. A coupon is a series of payments over the term, and a later product could have both.

```json
"coupon": { "rate": 0.045, "frequency": "quarterly" }
```

```text
months per period  = 1 (monthly), 3 (quarterly), 6 (semi-annual), 12 (annual), or the term (once at the end)
number of coupons  = term months / months per period
each coupon        = principal × rate × months per period / 12
```

- **Rate.** A fixed annual rate, as deposits quote it. Greater than zero. A zero rate is no coupon.
- **Frequency.** Monthly, quarterly, semi-annual, annual, or `term`: one coupon, paid with principal at the end of the term.
- **Whole periods.** The term must hold a whole number of periods: a 12-month term pays quarterly, but an 18-month term cannot pay annually. A shortened first or last period is left out (open question 2).
- **Nominal periods.** A quarter is a quarter of a year, whatever its number of days. Day counts belong to issuance ([term.md](term.md)).
- **No kind yet.** `condition: "always"` and `rate.kind: "fixed"` would each have one value, and section 17 of the plan dropped `payoff.kind` for that reason. A `kind` is added with the second coupon type.

## Cash flows

With a coupon a product makes several payments, so the result becomes a schedule instead of a single payment. It is derived, never stored:

- one row for each coupon period, numbered from 1, with the coupon;
- the payment at the end of the term: the payoff payment (principal, when the payoff has no features) plus the last coupon;
- the total paid over the term.

Periods are numbered, not dated, so the schedule says "Coupon 3 of 4" rather than a date. `paymentBreakdown` remains the single source of the payoff payment, and the schedule adds the coupons to it.

## Synthetic worked example

A deposit of 10,000, a 12-month term, 4.5% a year.

| Frequency | Coupons | Each coupon | Paid at the end of the term | Total interest |
| :--- | ---: | ---: | ---: | ---: |
| Monthly | 12 | 37.50 | 10,037.50 | 450.00 |
| Quarterly | 4 | 112.50 | 10,112.50 | 450.00 |
| Semi-annual | 2 | 225.00 | 10,225.00 | 450.00 |
| Annual | 1 | 450.00 | 10,450.00 | 450.00 |
| Once at the end of the term | 1 | 450.00 | 10,450.00 | 450.00 |

Over an 18-month term at the same rate: quarterly pays 6 coupons of 112.50, once at the end pays one coupon of 675.00 (4.5% × 1.5 × 10,000), and annual is invalid because 18 months is not a whole number of years.

For comparison, a cumulative deposit compounded quarterly would pay 10,000 × (1 + 0.045 / 4)⁴ = 10,457.65 at the end of 12 months. Not modelled.

## Consequences

- **Outline.** A Coupon row beside the payoff, with Rate (a percent a year) and Frequency (a dropdown). It is added from the Add feature menu.
- **Summary.** "…and pays 4.5% a year in quarterly coupons", or "…and pays 4.5% a year, once at the end of the term".
- **Structure JSON.** The `coupon` key after `payoff`, with its own colour and highlights.
- **Payment rule and calculation.** A coupon line, `Coupon = Principal × 4.5% × 3 / 12 = 112.50, paid 4 times`, and a cash-flow table listing each coupon and the payment at the end of the term.
- **Validation.** Named issues for a rate of zero or less, a term that does not hold whole periods, and a coupon on a note.

## Decisions

1. **The coupon sits beside the payoff**, as the feature map proposed.
2. **A coupon is paid.** Interest added to the balance is a different concept and is not a coupon setting.
3. **Once at the end of the term is a frequency**, not a separate concept: one period as long as the term.
4. **The domain shape does not depend on the wrapper.** A fixed coupon on a note is a public product.

## Open questions

1. **Cumulative interest.** Interest compounded and paid at the end is a fixed return in the payoff, with a compounding frequency. It is added to the payment, unlike the minimum return of a market-linked deposit, which is a floor ([deposit.md](deposit.md)).
2. **Broken periods.** Real products can have a short or long first or last coupon period. Not modelled.
3. **Floating and contingent coupons.** A floating rate observes a reference rate, so the coupon would have its own underlier ([underlier-model.md](underlier-model.md)). A contingent coupon observes the underlier on each coupon date, which needs observation dates ([observation-dates.md](observation-dates.md)).
4. **Negative rates.** Some deposits have had negative rates. Rates must be greater than zero here.
