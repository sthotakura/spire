# Non-call period

This is a plan, not built. It is a separate feature from the first autocall ([observation-dates.md](observation-dates.md), slice 1), which can call from the first review. It adds a stated number of reviews at the start on which the note cannot be called.

## Established concepts

- A **non-call period** is the start of a note's life during which an automatic call cannot happen, even if the call condition holds. One public auto-callable note tests its contingent interest on every review date but allows an automatic call only from review 6: "The earliest date on which an automatic call may be initiated is April 6, 2027" ([JPM 424B2](https://www.sec.gov/Archives/edgar/data/19617/000121390026108339/ea0308243-01_424b2.htm)). The first five reviews pay contingent interest, and none can call.
- A call is tested on a subset of the review dates: all but the non-call period and the final review.
- The SSPA describes both automatic and issuer early redemption as happening only on predetermined observation dates ([SSPA Lab](https://sspa.ch/en/lab/)).

## What it changes

Only which reviews can call. Coupons, the trigger and the maturity payment are unchanged. A product with no non-call period can call from review 1, as in slice 1.

## Proposed model

```json
"redemption": { "kind": "autocall", "trigger": 1.0, "callAmount": 0.1, "firstCall": 6 }
```

- **`firstCall`** is the number of the first review on which a call can occur, from 1 to the number of reviews before the last. Omitted means 1.
- **A number of reviews, not months.** Reviews are numbered, not dated, in this model. A period stated in months would only be a convenience for a schedule that is already periodic; it can be derived in the interface.
- **The final review is not a call review**, so `firstCall` is below the number of reviews. A `firstCall` equal to or past the last call review leaves a note that cannot be called, which is a bullet note and is rejected with a named issue.

## Consequences

- **Outline.** A field under Autocall beside the trigger: "First call: review 6".
- **Summary.** "…that is called early if … on any review from the 6th."
- **Scenario.** The path table marks reviews that cannot call, so a level above the trigger there shows no call.
- **Schema.** A numeric field with its limits, and an example product.
- **Book.** A paragraph in the early-redemption chapter.

## Decisions

1. **Its own feature**, not part of slice 1: agreed.
2. **Stated in review numbers.** Recommended; months are a display choice.

## Open questions

1. **Names.** Public notes say "non-call period" or give the first call date. Which label the interface uses is open.
2. **Interaction with coupons.** Contingent coupons in the period are still tested on every review in the JPM note. Whether any product restricts coupons during it was not found.
3. **Issuer call.** A softcall has its own call dates and may have a different non-call period. Not covered until issuer call is built.
