# Non-call period

Built, as `firstReviewMonth` on the autocall and the issuer call. It replaced `nonCallReviews`, a count of reviews at the start that could not call (see Decisions). The months before the first review are the non-call period, and the call has no review in them.

## Established concepts

- A **non-call period** is the start of a note's life during which an automatic call cannot happen, even if the call condition holds. One public auto-callable note tests its contingent interest on every review date but allows an automatic call only from the sixth month: "The earliest date on which an automatic call may be initiated is April 6, 2027" ([JPM 424B2](https://www.sec.gov/Archives/edgar/data/19617/000121390026108339/ea0308243-01_424b2.htm)). The first five months pay contingent interest, and none can call.
- A ten-year autocallable note has no coupon, and its first valuation date is a year after pricing, with one every quarter after that: 37 in all, the last of them the final valuation date ([Citigroup 424B2](https://www.sec.gov/Archives/edgar/data/200245/000191870426031411/form424b2.htm), read through a summarising fetch tool on 1 November 2026). Nothing is observed in the first year. A count of reviews that cannot call would invent three quarterly dates the filing does not have.
- The SSPA describes both automatic and issuer early redemption as happening only on predetermined observation dates ([SSPA Lab](https://sspa.ch/en/lab/)).

## What was built

```json
"redemption": { "kind": "autocall", "schedule": { "frequency": "quarterly" }, "firstReviewMonth": 12, "trigger": 1, "callAmount": 0.17, "callAmountBasis": "per-year" }
```

- **`firstReviewMonth`**, the month of the call's first review, counted from the start of the term. The call's reviews run from it at the schedule's frequency to the end of the term, numbered from 1. It must be a whole number of periods, and leave a review that can call: the last but one, or the last when the final review is a call too. Omitted means one period in. The structure written by the app states it, including at its default.
- **The trigger steps from the first review.** A trigger of 95% stepping down 5% is 95% on the first review and 90% on the next, as public notes state the threshold of each call date.
- **A call amount per year counts from the start of the term**, not from the first review: at 17% a year, a call in month 12 pays 17%.
- **The coupon keeps its own schedule.** A coupon reviewed before the call's first review is a coupon review only: the review table shows it with no call column, and the calculation has no call step for it.
- **Row and concept.** A "First review" row under Redemption, in months, with its own colour, JSON line and phrase in the sentence ("from month 6"). An issuer call's calculation starts with a "First review" step when the first review is later than one period in, since it has no review steps of its own.
- **Example.** The schema's autocall on a worst-of basket is reviewed monthly from month 6, as in the public note, without its coupons.

## What it changes

Which reviews the call has. Coupons and the maturity payment are unchanged. A product with no stated first review is reviewed from one period in, as before.

## Decisions

1. **Its own feature**, not part of slice 1: agreed.
2. **Stated as a month, not a count of reviews.** Agreed on 1 November 2026, reversing the earlier `nonCallReviews`. That field dates from when the call and the coupon shared one schedule: the JPMorgan note's first five reviews had to exist because the coupon is tested on them. Once the coupon had its own schedule, a call review that could not call read nothing and paid nothing, but the review table still showed a row for it and the scenario still asked for its level. The Citigroup note, with no coupon and no dates in its first year, made that visible.
3. **Named `firstReviewMonth`.** Chosen over a non-call period in months, which leaves open whether the month that ends the period can call. A first review month says which date is tested, as filings name a first call or valuation date.
4. **The trigger is counted from the first review.** The earlier decision counted it from review 1 whatever the non-call period was. With no review in the period, the first review is review 1. The Morgan Stanley sample, stated before as 100% stepping −5% with one non-call review, is now 95% from month 6, which is how its filing states it.

## Open questions

1. **Interaction with coupons.** Contingent coupons before the first call date are still tested every month in the JPM note. Whether any product restricts coupons during it was not found.
2. **A first coupon review later than one period in.** No note read has one, so the coupon schedule has no first review month.
