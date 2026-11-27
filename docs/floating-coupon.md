# Floating coupon

Proposed on 26 November 2026, revised on 27 November 2026 after a review, agreed on 27 November 2026, and built on 27 November 2026 as below. A floating coupon is a coupon whose rate is reset each period from a reference rate, plus or minus a spread, often within a floor and a cap. It is the Floating rate type in the builder (PLAN.md, sections 51 and 52). This document covers a floating rate on a non-contingent coupon. It does not cover a fixed rate for an initial period, a floating rate on a contingent coupon, range accrual, or a coupon on the spread between two rates.

## What it means

A coupon has two independent terms: when it is paid, and its rate ([book chapter 20](book/20-coupons.md)). A **floating rate** is not known when the product is issued. For each period it is the level of a **reference rate** over that period, plus a **spread**, a fixed number of percentage points a year that can be negative. A **floor**, or minimum interest rate, stops the coupon rate falling below a level; a **cap**, or maximum interest rate, stops it rising above one. Both apply to the whole coupon rate, the reference rate plus the spread, not to the reference rate alone.

The reference rate in all three notes read is **SOFR**, the Secured Overnight Financing Rate, an overnight rate published each business day. A coupon period is longer than a day, so the notes compound the daily rates over the period into one rate a year, and set it at the end of the period: the coupon is known only shortly before it is paid. Older notes used LIBOR, a rate for a term such as three months that was known at the start of the period; it has been discontinued.

A floating coupon on a non-contingent coupon is paid on every review. Its amount changes with the reference rate, and a floor at 0% can make it zero, but no condition decides whether it is paid. As with a fixed coupon, a high spread does not protect principal: in the structured note read, the holder receives every coupon and can still lose most of the principal at the end of the term.

## Established concepts

Three public notes were read on 26 November 2026, through a summarising fetch tool. All three are paid in cash and pay a floating coupon quarterly in arrears on SOFR compounded daily.

| Finding | Source |
| :--- | :--- |
| **The coupon rate is the reference rate plus the spread, within the floor and the cap.** Citi: "the reference rate with respect to the related observation period plus the spread, subject to the minimum interest rate", with a spread of 2.75% and a minimum of 0.00%. MS 6,751: "Base rate plus 0.25%; subject to the minimum interest rate and the maximum interest rate", 0.00% and 7.00%. MS 1,703: "base rate plus 0.17%", a minimum of 0.10% and a maximum "Not applicable". | All three |
| **The floor and the cap bound the whole coupon rate.** In the Citi table a reference rate of −2.00% gives 0.75% and −3.00% gives 0.00%, not 2.75%: the floor is applied after the spread. | Citi |
| **A cap is optional; every note read has a floor.** Citi has a floor of 0% and no cap; MS 1,703 a floor of 0.10% and no cap; MS 6,751 0% and 7%. None shows what a coupon without a floor would pay. | All three |
| **The coupon is paid whatever the underlier does.** Citi pays it "regardless of the performance of either underlying"; the equity indices affect only the payment at maturity. The two Morgan Stanley notes have no equity underlier. | All three |
| **The coupon per period is principal × coupon rate × the period's fraction of a year.** Citi's examples take "$10.00 multiplied by the applicable coupon rate divided by 4". Citi and MS 6,751 state 30/360, which over whole months is months ÷ 12. MS 1,703 states Actual/360. | All three |
| **The rate is set at the end of the period.** SOFR is compounded daily over an observation period and determined at its end; Citi's observation period runs from two business days before one coupon date to two business days before the next, and both Morgan Stanley notes freeze SOFR two business days before maturity. The compounding formula is in each prospectus, not the pricing supplement. | All three |
| **A call pays principal plus that period's coupon.** Citi: "the stated principal amount per note plus any coupon otherwise due on such coupon payment date", on any quarterly coupon date. The Morgan Stanley notes cannot be called. | Citi |
| **A floating rate can follow a fixed one.** MS 6,751 pays 6.00% a year for its first year, then floats. | MS 6,751 |
| **Issuers describe the coupon as partly an option premium.** Citi intends "to treat a portion of each coupon payment as attributable to interest and the remainder to option premium", as the fixed coupon notes do. That is a tax characterisation, not a price. | Citi |

The sources:

- **Citi:** Citigroup Global Markets Holdings Inc., guaranteed by Citigroup Inc., Floating Rate Trigger Callable Yield Notes linked to the least performing of the Russell 2000 and the S&P 500, due 2025. Preliminary pricing supplement 2023-USNCH16969, dated 24 April 2023 ([424B2](https://www.sec.gov/Archives/edgar/data/831001/000095010323006091/dp192618_424b2-us2327427.htm)). $10 a note, about two years, an issuer call on any quarterly coupon date, and at maturity principal if the worst index is at or above 60% of its initial level, or "$10.00 × (1 + underlying return of the least performing underlying)" below it.
- **MS 6,751:** Morgan Stanley Fixed to Floating Rate Notes due 2030, based on SOFR. Final pricing supplement No. 6,751, dated 12 March 2025 ([424B2](https://www.sec.gov/Archives/edgar/data/895421/000183988225015645/ms6751_424b2-08126.htm)). Five years, principal at maturity, no call.
- **MS 1,703:** Morgan Stanley Floating Rate Notes due 2025, based on SOFR. Final pricing supplement No. 1,703, dated 3 April 2024 ([424B2](https://www.sec.gov/Archives/edgar/data/895421/000095010324004958/dp209499_424b2-ps1703.htm)). Thirteen months, principal at maturity, no call.

The Citi table of a single coupon, on $10, at a spread of 2.75% and a minimum of 0.00%, as printed:

| Reference rate | Spread | Coupon rate | Coupon |
| ---: | ---: | ---: | ---: |
| 5.00% | 2.75% | 7.75% | $0.1938 |
| 4.00% | 2.75% | 6.75% | $0.1688 |
| 3.00% | 2.75% | 5.75% | $0.1438 |
| 2.00% | 2.75% | 4.75% | $0.1188 |
| 1.00% | 2.75% | 3.75% | $0.0938 |
| 0.00% | 2.75% | 2.75% | $0.0688 |
| −1.00% | 2.75% | 1.75% | $0.0438 |
| −2.00% | 2.75% | 0.75% | $0.0188 |
| −3.00% | 2.75% | 0.00% | $0.0000 |
| −4.00% | 2.75% | 0.00% | $0.0000 |
| −5.00% | 2.75% | 0.00% | $0.0000 |

Each row is 10 × max(0%, reference rate + 2.75%) ÷ 4, rounded half up to four decimals: 10 × 7.75% ÷ 4 = 0.19375, shown as 0.1938, and 0.14375 as 0.1438. A test of the table compares the unrounded coupon with the printed one to within half a unit of the fourth decimal.

### Fit with the model

| Note | Maps to | Sample |
| :--- | :--- | :--- |
| Citi | 24 months; a worst-of basket of two; an issuer call quarterly from month 3, no call amount; a non-contingent coupon, quarterly, floating at the reference rate + 2.75% with a 0% floor and no cap; downside participation 100% with a 60% barrier on the final date | Yes, as Worst-of callable floating coupon note. Preliminary, as the GS contingent coupon sample is; its table is the test of the coupon rate. Everything but the floating rate is in the model today. |
| MS 6,751 | 60 months; principal protection 100% and no participation, so principal at maturity; quarterly; 6.00% for 12 months, then the reference rate + 0.25% within 0% and 7% | Not now. It needs a fixed rate for an initial period (open question 1), and its underlier would be required but read by nothing, as the amortizing note's is. |
| MS 1,703 | 13 months; principal at maturity; the reference rate + 0.17% with a 0.10% floor | No. Its first period is one month and the others quarters (a broken period, not modelled), and it counts Actual/360. A source for a floor with no cap. |

## Smallest model

The coupon's `rate` becomes a fixed number or a floating rate. Nothing else on the coupon changes.

```ts
coupon: {
  schedule: { frequency: 'quarterly' },
  rate: { reference: 'Synthetic overnight rate', spread: 0.0275, floor: 0 },   // cap absent
}
```

- **`reference`**: the name of the reference rate, as the underlier has a name. It is a label: the reference reads no market data, and a scenario gives its levels. Samples use a clearly synthetic name; the hints and the book name SOFR as the public example.
- **`spread`**: a rate a year added to the reference rate, which may be negative.
- **`floor`**: a rate a year, zero or above, below which the coupon rate does not fall. Required, since every note read has one; a coupon without a floor is left open (open question 3).
- **`cap`**: an optional rate a year, at or above the floor, above which the coupon rate does not rise.

The coupon rate for a period is max(floor, reference rate + spread), and with a cap min(cap, max(floor, reference rate + spread)). Since the floor is zero or above, the coupon is never negative. The coupon is principal × coupon rate × months between reviews ÷ 12, unrounded, as a fixed coupon's is.

The reference rate for each coupon review is a **scenario input**, a rate a year, like the final level: the reader states what the compounded reference rate turned out to be for each period. Daily compounding, the observation period, any lookback or observation shift, and the cut-off before maturity are calculation conventions: they change the rate the period ends up with, so they matter to what the holder is paid. The reference does not model them; it delegates them to the scenario, which states the rate they produce. The payment a few days after the period ends is a calendar detail of issuance. This follows the daily close barrier, where the scenario states the lowest close rather than every close.

This reference currently supports floating rates only on non-contingent coupons. Floating describes how the rate is set and contingent describes when the coupon is paid, so the two can combine; the restriction is the scope of this change, since no note read has both, and Contingent is unavailable beside Floating. Amortization keeps needing a fixed coupon.

## The rules

1. This reference allows a floating rate only on a non-contingent coupon.
2. Amortization needs a fixed rate.
3. A floating rate has a floor, zero or above, and any cap is at or above the floor.
4. The scenario gives a reference rate for every coupon review, including those before an issuer call's first review and the last one, as it gives a level for every review of a contingent coupon today. Payments stop when the product is redeemed: a rate on a review after a call is part of the hypothetical path but is not read, and changing it does not change the result. Keeping the whole path lets the reader move the call without losing the rates.
5. Limits of this reference, not of the product type: a spread between −10% and +10% a year, a floor and a cap between 0% and 20%, and a reference rate between −5% and 20% a year.

## Synthetic worked example

A two-year note on the worst of two synthetic indices, principal 1,000, a quarterly coupon at the reference rate + 2.75% with a 0% floor, an issuer call on any quarterly review, and a 60% downside barrier read on the final date. The reader states a reference rate for each quarter:

| Review | Month | Reference rate | Coupon rate | Coupon |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 3 | 4.00% | 6.75% | 16.875 |
| 2 | 6 | 3.00% | 5.75% | 14.375 |
| 3 | 9 | 1.50% | 4.25% | 10.625 |
| 4 | 12 | −1.00% | 1.75% | 4.375 |
| 5 | 15 | −3.25% | 0.00% (floor) | 0 |
| 6 | 18 | 0.00% | 2.75% | 6.875 |
| 7 | 21 | 2.00% | 4.75% | 11.875 |
| 8 | 24 | 3.00% | 5.75% | 14.375 |

Each coupon is 1,000 × coupon rate × 3 ÷ 12. Not called, with the worst index at 75%, the note pays 1,000 + 14.375 at the end, and 79.375 in coupons in all. With the worst index at 50% it pays 500 + 14.375 at the end. Called in month 6, it pays 1,000 + 14.375 then, after 16.875 in month 3.

A cap of 6% on the same note would pay 15.00 in month 3 (6.00% in place of 6.75%), and the other reviews as before.

## Interface

- **Rate row.** Floating becomes available on a non-contingent coupon, the scope of this change. Beside it, the rate a year is replaced by rows under Rate: Reference rate (a name), Spread (% a year), Floor (a rate, 0% to start) and Cap (None or a rate). Choosing Contingent with Floating says "not with a floating rate", and Floating with Contingent says "not with a contingent coupon".
- **Reference rates.** Each coupon review needs a rate. Proposed: a Reference rate column in the review table, which lists every coupon review when the rate is floating, beside a coupon rate column and the coupon; the table appears for a floating coupon even where no equity level is read. Every review starts at one rate, and a "Same rate for every review" action sets them all, so the reader can change one quarter at a time. After a call, the later reviews keep their rates, shown as not read.
- **Calculation and payments.** The calculation works out each coupon rate, showing the floor or the cap where it applies; the payments table and the annualised return need no change.
- **Chart.** The payoff chart adds the last review's coupon at every final level, at that review's rate. A small chart of the coupon rate against the reference rate, flat at the floor, rising one for one, flat at the cap, would show the shape the Citi table prints. Proposed as a second step, not in the first build; built later as PLAN.md section 53, with dots for the scenario's reviews.
- **Summary.** "On each coupon review it also pays a floating coupon at the reference rate plus 2.75% a year, at least 0%."

## Consequences

- The schema gains the floating rate as a named variant of the coupon's rate, with its limits, and the Citi sample as an example.
- `redemptionOutcome` reads the scenario's reference rates; a fixed coupon is unchanged.
- Names: no name of its own. "Floating Rate Trigger Callable Yield Notes" is an issuer's title. A floating coupon in place of upside, with no protection, is Yield Enhancement, as a fixed coupon is.
- Book: a floating rate section in chapter 20, with the worked example; chapter 21 and the not-modelled list follow.

## Assumptions

- Each period is a whole number of months, and the coupon is months ÷ 12 of a year, as 30/360 gives. Citi's first period runs from settlement on 28 April to 30 July 2023, two days more than a quarter; its own examples take a quarter, so the reviews stay evenly spaced.
- The scenario's reference rate is the compounded rate for the whole period, after the note's calculation conventions. The reference takes it as given and does not check it against a convention.
- The three notes were read through a summarising fetch tool, and a later review could not fetch the Citi filing again. Its coupon table is checked against the filing itself before it becomes a test.
- The Citi note is preliminary: its initial levels are blank and its trade date expected. The terms used here do not depend on them. Its example 2 says the note was not called on "any of the first four coupon payment dates", and its table says "First through Seventh"; the table agrees with its eight coupons and is followed.

## Decisions agreed

All five were agreed on 27 November 2026, as recommended.


1. **Floating on a non-contingent coupon only, as the scope of this change.** Recommended; no note read has a contingent floating coupon, though the two terms can combine.
2. **The reference rate as a name and a scenario input**, not market data. Recommended; it keeps the reference free of live data, as AGENTS.md requires.
3. **One reference rate for each coupon review**, entered in the review table, rather than one rate for all periods. Recommended: rates change, and a single rate would hide the floor. The "same rate for every review" action keeps the simple case quick.
4. **The fixed rate for an initial period left for later.** Recommended; the Citi sample does not need it, and only MS 6,751 has one.
5. **The Citi note as a sample**, though preliminary. Recommended, as the GS sample was accepted.

## Open questions

1. **A fixed rate for an initial period, then a floating one** (MS 6,751). It could be an initial fixed rate for a whole number of coupon reviews on the floating rate.
2. **A floating rate on a contingent coupon**, such as a rate coupon paid only when an equity index is at or above a barrier, and what memory would pay for a missed floating coupon. No source read.
3. **A coupon without a floor.** All three notes have a floor at or above zero, so what a coupon without one pays, and whether a holder could ever owe interest, is not shown. The floor is required until a source shows otherwise.
4. **Actual/360 and broken periods** (MS 1,703). Actual/360 is how interest is calculated, and changes the coupon; both it and a broken period need calendar dates, which the reference does not model.
5. **Other rate coupons:** a multiple of the reference rate, the spread between two rates (CMS), and range accrual, where the coupon accrues only on days a rate or an index is within a range. Not proposed; each needs its own sources.
