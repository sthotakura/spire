# Term

This increment adds the term, the length of a product, as a term of every product. It changes no payment built so far. Coupons are the first concept that reads it ([coupon.md](coupon.md)). The work is section 20 of [PLAN.md](../PLAN.md).

## Established concepts

- A deposit and a note are both made for a stated length. FINRA describes certificates of deposit as holding a deposit "for a fixed term—usually a preset period from six months to five years" ([FINRA, Bank Products](https://www.finra.org/investors/investing/investment-products/bank-products)). Notes are described by their length in the same way, such as a five-year note.
- The term is stated in the product's terms, and the calendar dates follow from it. The issue date and the maturity date put the term on a calendar, adjusted for business days ([observation-dates.md](observation-dates.md)).

## Structuring and issuance

SPIRe models how a product is structured, not how it is issued. The term is a duration, so it is part of the structure. The dates that put it on a calendar are issuance.

| | Structuring | Issuance |
| :--- | :--- | :--- |
| Length | Term: 12 months, or 3 years | Dates: issue date, maturity date, coupon payment dates |
| The interest for a period | Nominal: a quarter is a quarter of a year | Actual: the days between two dates, under a day-count convention, after business-day adjustment |
| Direction | Set when the product is designed | Derived: the maturity date is the issue date plus the term |

The term can be worked out from an issue date and a maturity date, but a term sheet states the term first and derives the dates from it. This matches the observation-dates proposal, in which an averaging count is a term of the structure and the averaging dates put it on a calendar.

## Proposal

The term sits at the top of the product, beside the principal amount. Two concepts read it: redemption (principal is repaid at the end of the term) and the coupon (how many coupons the term holds).

```json
{
  "wrapper": "note",
  "redemption": "bullet",
  "term": { "months": 36 },
  "underlier": { … },
  "payoff": { … },
  "principalAmount": 1000
}
```

- **Months.** Terms of 6 or 18 months are common, so whole years are not enough. Terms in days, such as 400 days, need a day-count convention and are left out.
- **An object.** `{ "months": 36 }` keeps the unit in the JSON, so another unit can be added without changing what `36` means.
- **Every product has one.** A note's payoff does not read the term, but a note still has a length, and term sheets state it.
- **Allowed values.** A whole number of months, from 1 to 120. The upper limit keeps a monthly coupon schedule short enough to read; real terms can be longer.

## Consequences

- **Outline.** A Term field on the Wrapper row, beside Principal. It is entered in months, and a whole number of years is shown beside it ("36 months (3 years)").
- **Summary.** The sentence states the length: "A 3-year note that…", or "An 18-month note that…". A whole number of years is stated in years.
- **Structure JSON.** The `term` key after `redemption`. Like `principalAmount`, it is highlighted with the wrapper.
- **Payment.** No change. The worked calculation, scenario table and chart are unchanged for a note.

## Decisions

1. **The term is a product concept.** It is a duration, not a date.
2. **It sits at the top of the product**, not under redemption, because the coupon reads it as well. Under redemption, the coupon would read a term of another concept.
3. **It is shown with the wrapper, beside the principal**, and is not a concept of its own. The Wrapper row already holds the principal, a term of the whole product rather than of the legal form, so the term joins it there.

## Open questions

1. **Early redemption.** An autocall or an issuer call can end a product before its term. The term would then be the scheduled length, and the actual length would depend on the scenario. This is not settled until early redemption is modelled.
2. **A product row.** The Wrapper row stands in for the whole product: it holds the principal and the term, and the other parts nest under it. Whether they move to a product row of their own, with the wrapper beside redemption, or stay with the wrapper is open until a deposit shows how much the wrapper itself decides.
3. **The final observation and the term.** The final observation date usually falls a few business days before the end of the term. Both are left as words until observation dates are modelled.
