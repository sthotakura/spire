# Non-call period

Built, as `nonCallReviews` on the autocall. It is a separate feature from the first autocall ([observation-dates.md](observation-dates.md), slice 1), which can call from the first review. It adds a stated number of reviews at the start on which the note cannot be called.

## Established concepts

- A **non-call period** is the start of a note's life during which an automatic call cannot happen, even if the call condition holds. One public auto-callable note tests its contingent interest on every review date but allows an automatic call only from review 6: "The earliest date on which an automatic call may be initiated is April 6, 2027" ([JPM 424B2](https://www.sec.gov/Archives/edgar/data/19617/000121390026108339/ea0308243-01_424b2.htm)). The first five reviews pay contingent interest, and none can call.
- A call is tested on a subset of the review dates: all but the non-call period and, by default, the final review.
- The SSPA describes both automatic and issuer early redemption as happening only on predetermined observation dates ([SSPA Lab](https://sspa.ch/en/lab/)).

## What was built

```json
"redemption": { "kind": "autocall", "trigger": 1, "nonCallReviews": 5, "callAmount": 0.08 }
```

- **`nonCallReviews`**, the number of reviews at the start that cannot call. A whole number from 0 that leaves at least one review that can call. The reviews that can call run to the last but one, or to the last when the final review is a call too. Omitted means 0. The structure written by the app states it, including at its default.
- **A number of reviews, not months.** Reviews are numbered, not dated, so the period is a count. The first review that can call is the number after it, so 5 reviews with no calls means the first call is review 6.
- **Named for the period, not the first call.** Public notes say "non-call period" or "call protection" more often than they name a first call date, and a period is a length, like the term. The summary still says "from the 6th", since that is what a reader wants to see.
- **The trigger is counted from review 1.** A trigger of 100% that steps down 5% is 85% on review 4 whatever the non-call period is, because public notes state each date's threshold. It is checked from the first review that can call to the last.
- **A review in the period** is shown as unable to call, whatever its level. The review table shows "No call" and no trigger for it, the calculation says it cannot call, and the named paths put those reviews at the trigger, so a reader sees a level that would have called and did not.
- **Row and concept.** A "Non-call period" row under Redemption, in reviews, with its own colour, JSON lines and phrase in the sentence.
- **Example.** The schema's autocall on a worst-of basket is 12 monthly reviews with a non-call period of 5, as in the public note, without its coupons.
- **Value for a learner.** Small. It changes no payoff and teaches one idea: early reviews are sometimes skipped. It is there so the reference can reproduce the public note's call schedule, and because contingent coupons will need it.

## What it changes

Only which reviews can call. Coupons, the trigger and the maturity payment are unchanged. A product with no non-call period can call from review 1, as in slice 1.

## Decisions

1. **Its own feature**, not part of slice 1: agreed.
2. **Stated in review numbers.** Agreed; months are a display choice.
3. **Named "non-call period", counted in reviews.** Agreed. An earlier version was a `firstCall` review number; it was renamed so the label and the field mean the same thing.

## Open questions

1. **Interaction with coupons.** Contingent coupons in the period are still tested on every review in the JPM note. Whether any product restricts coupons during it was not found.
2. **Issuer call.** A softcall has its own call dates and may have a different non-call period. Not covered until issuer call is built.
