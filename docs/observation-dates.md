# Observation dates

This is a proposal for review, not yet built. It answers the open question in [underlier-model.md](underlier-model.md): where do observation dates belong? It records what dates mean in public term sheets, revises the earlier placement proposal in light of that research, proposes a build order, and lists the decisions to agree before any code.

SPIRe models how a product is structured, so the only dates it models are those on which something is observed. Dates that belong to issuing and settling the note, such as the issue date, the interest payment dates and the maturity date, are left out ([term.md](term.md)).

**Status:** slice 1 (reviews and autocall without coupons) is built ([PLAN.md](../PLAN.md), section 33). The placement proposal in the first version of this document is superseded where noted. Later slices are not built.

## Established concepts

These come from public pricing supplements and SSPA material. Synthetic names, levels and dates stand in for them in everything SPIRe publishes.

- **Pricing date** (or trade date): the terms are set. A note may fix the initial level on a *strike date* a day earlier, as one contingent interest note does ([JPM 424B2](https://www.sec.gov/Archives/edgar/data/19617/000121390026108339/ea0308243-01_424b2.htm)).
- **Issue date** (settlement date): the holder pays. Issuance, not structure.
- **Observation dates** (review dates, valuation dates, determination dates): the dates on which an underlier level is read. One final date for point-to-point, several for averaging, a period for lookback, and a series of reviews for coupons and calls.
- **Maturity date and payment dates**: a few business days after the observation they follow, so the payment can be calculated and settled. Nothing is observed on them. Issuance.
- **Postponement.** Observation dates move for non-trading days and market disruption events. The rules sit in the issuer's product supplement, which the pricing supplements cited here reference without restating. In the 2002 ISDA Equity Derivatives Definitions, a disrupted averaging date is omitted, postponed (capped at eight scheduled trading days), or modified-postponed, as the confirmation chooses (third-party reproduction of the text; the official text was not read).

### What public notes do with a schedule

Findings from three US pricing supplements and the SSPA's material.

| Finding | Evidence |
|---|---|
| **One schedule is tested by several features.** A 12-month note lists 12 review dates. The contingent interest barrier is tested on all 12, the automatic call on reviews 6 to 11, and the last review is also the final valuation. | [JPM contingent interest note](https://www.sec.gov/Archives/edgar/data/19617/000121390026108339/ea0308243-01_424b2.htm) |
| **Payment dates follow review dates by a short lag**, and a call settles on the next interest payment date. They are not observation dates. | same note; [JPM index note](https://www.sec.gov/Archives/edgar/data/1000275/000095010325003784/dp226660_424b2-jpmeln570lly.htm), "three business days following each Observation Date" |
| **Call dates can be a subset of review dates**, with a non-call period at the start. | same note: the earliest call is review 6 |
| **The final level can be an average**: eight quarterly observation dates, and the final underlier value is the average of five closes ending on the last observation date. The coupon and maturity tests read that average. | [JPM index note](https://www.sec.gov/Archives/edgar/data/1000275/000095010325003784/dp226660_424b2-jpmeln570lly.htm) |
| **The call trigger can step down**, here from 100% to 75% of the initial level in 5-point steps over six dates, and **the call payment rises with elapsed time**. This note pays no coupon. | [UBS step-down note](https://www.sec.gov/Archives/edgar/data/1114446/000183988225047092/ubs_424b2-26373.htm) |
| **A call trigger need not step down.** The index note uses the initial level on every call date, and a fixed coupon barrier. | [JPM index note](https://www.sec.gov/Archives/edgar/data/1000275/000095010325003784/dp226660_424b2-jpmeln570lly.htm) |
| **Unpaid contingent interest is carried forward** and paid on a later date on which its test is met. | [JPM contingent interest note](https://www.sec.gov/Archives/edgar/data/19617/000121390026108339/ea0308243-01_424b2.htm) |
| **Two kinds of early redemption.** An autocall is an obligation when the underlyings are above the trigger. A softcall is an issuer option on predetermined dates. Both happen only on predetermined observation dates. | [SSPA Lab](https://sspa.ch/en/lab/) |
| **Barrier observation differs from coupon observation.** A European barrier is read once at maturity; a continuous barrier reads every day. This is the existing `observation` choice on barriers, and is a separate matter from review dates. | [SSPA Swiss Derivative Map](https://sspa.ch/wp-content/uploads/2026/01/en_sspaswissmap_2026.pdf) and issuer term sheets |

### Limits of the research

- The product supplements, where postponement rules live, were not read.
- The ISDA wording came from third-party commentary, not the ISDA publication.
- A Swiss term sheet was found but its PDF could not be read.
- The SSPA material describes autocall and softcall, but no formal glossary definition of "observation date" was found.
- No source was found for a note that observes its coupon or call on a schedule different from its final valuation, other than the call being a subset.

## What dates change today

Nothing in the payment. Every payoff built so far reads the determined initial and final levels. Averaging and lookback state how many levels they read; the dates would say when. A barrier observed daily is read through one scenario extreme close, with no dates ([daily-observation.md](daily-observation.md)).

Dates change payments only with features that test a level on each of several dates: **contingent coupons** and **calls**. The schedule has to exist before those can.

## Revised placement

The first version proposed that each date sit on the concept that observes it. The research above contradicts that for review dates: the coupon, the call and the final level all observe **the same dates**, so no one of them can own the schedule.

| Date | Belongs to | Why |
|---|---|---|
| Pricing date, lookback dates | Initial level (`determination.initial`) | Unchanged: only the initial level reads them |
| Review dates | **A schedule on the product** | The final level, the coupon and the call all refer to it |
| Averaging dates | Final level, ending on the last review | They are the levels the final level is read from, as before |
| Issue, payment and maturity dates | Not modelled | Nothing is observed on them; issuance |

This is the alternative the first version listed as "one schedule", for review dates only. Pricing and lookback dates stay co-located.

## Proposed model

**Reviews are periodic and numbered, not dated.** The term already states the length in months, so a frequency gives the number of reviews, as [coupon.md](coupon.md) derives its coupon count.

```json
"schedule": { "frequency": "monthly" }
```

```text
months per period = 1 (monthly), 3 (quarterly), 6 (semi-annual), 12 (annual)
reviews           = term months / months per period      (a whole number)
final review      = the last one, at the end of the term
```

- A review is named by number ("review 6 of 12"), as a coupon is ("coupon 3 of 4").
- The final review is also the final observation date. A product with no schedule has one review, the final date, as today.
- No calendar, business-day or holiday logic. Real calendar dates are a later layer that would be derived from a start date and the schedule.
- **Scenario levels stay separate.** The level on each review is a scenario input, like every other observed level. A date is a term, the level on it is not.
- **A path replaces one final level in the scenario.** Each asset has a level on each review. With one review it is today's final level.

### What the first feature adds

Autocall belongs with redemption behaviour, beside bullet ([feature-map.md](feature-map.md)). The redemption dropdown already lists it as unavailable. A first version:

```json
"redemption": {
  "kind": "autocall",
  "trigger": 1.0,
  "callAmount": 0.1
}
```

- **Trigger.** The underlier level, as a fraction of the determined initial level, at or above which the note is called on a review. The comparison reads the basket level, so worst-of works already. It can step by the same amount on each review after the first (`triggerStep`, signed): −5% reproduces the UBS note's 100% to 75% over six dates, and a positive step raises the trigger.
- **Call amount.** A fraction of principal: the note repays principal plus this amount when it is called. It is either the same on every call date (`flat`) or a rate for each year elapsed (`per-year`, the UBS form: 37.5% a year pays 18.75% after six months).
- **Called on every review before the last.** The call is tested on reviews 1 to N−1. The final review is the maturity: it pays the payoff as it does today, so there is no call at the end. This is how both JPM notes treat their last review, and it keeps the final review's payment in one place. The UBS note also tests its final valuation date for a call, so the final review can be made a call too (`callOnFinalReview`); a final level at or above the last trigger then pays principal plus the call amount at maturity.
- **No non-call period in slice 1.** The first review can call. A non-call period is its own feature ([non-call-period.md](non-call-period.md)).
- **The maturity payment is unchanged.** It is `paymentBreakdown` on the final review's level, so the tests built so far should not change.

### Result

With a call the result is no longer one payment, but a payment on a review number, and an end review. It is derived from one breakdown, as the maturity payment is ([contingent-autocall.md](contingent-autocall.md)). The annualised return reads the actual length, not the scheduled term.

## Build order

Each slice needs a public source, a book chapter, a schema example and tests, and is separate from the next.

| # | Slice | Source | What it adds |
|---|---|---|---|
| 1 | **Autocall without coupons** | UBS step-down note (the call mechanism; its amount differs, see below) | Review schedule, path scenario, call trigger, flat call amount, early-redemption result |
| 2 | **Contingent coupon, then memory** | JPM contingent interest notes | A coupon barrier tested on each review; unpaid coupons carried forward. Proposed: [contingent-coupon.md](contingent-coupon.md) |
| 3 | **Cash-flow result** | JPM contingent interest note | A payment per review, total paid, annualised return on actual length |
| 4 | **Fixed coupon on the schedule** | [coupon.md](coupon.md) | A coupon always paid; the schedule replaces coupon.md's own frequency |
| 5 | **Issuer call** | SSPA softcall; two public callable notes | An issuer option on stated reviews, which tests no level. Built without coupons: [issuer-call.md](issuer-call.md) |
| — | **Non-call period** | JPM contingent interest note | Its own feature, built as `nonCallReviews`: [non-call-period.md](non-call-period.md) |
| — | **Call amount from a rate and elapsed time; trigger step-down; final review as a call** | UBS step-down note | Added to slice 1. The three together reproduce the UBS note's call schedule |

Slice 1 is first because it needs no coupon logic and still forces the hard parts: the schedule, the path scenario, and a result that is not one payment.

## Consequences to design before slice 1

- **Outline and JSON.** A Review schedule row beside the term (a product concept), and autocall as a redemption kind. The outline and the Structure JSON keep one shape.
- **Scenario.** A table of levels per review, one column per asset, like the basket levels table. Named scenarios ("called at review 3", "never reaches the trigger", "crash") are better than a grid of inputs.
- **Chart.** The payoff chart is payment against final level. With an autocall the payment depends on when the note ends, so the chart is either "if held to the final review" or needs a second view, such as a timeline of tests. This is a visible design change.
- **Term.** The term becomes the scheduled length. The actual length depends on the scenario ([term.md](term.md), open question 1).
- **Validation.** Named issues for a term that does not hold whole periods, a schedule with fewer than two reviews (nothing to call before the last), a trigger at or below zero, and a call amount below zero.
- **Averaging.** The index note's final level is an average ending on the last review. Whether averaging is allowed with a schedule needs a stated rule (decision 5).
- **Lookback and daily barriers** remain unavailable on a basket; their interaction with reviews is not settled.
- **Schema and book.** Add the schedule and redemption to the JSON Schema and an example product per slice, and a book chapter ("Observation dates and early redemption" is the planned entry) in the same change as each slice.
- **User-facing copy.** The interface states availability through state, not roadmap language ([AGENTS.md](../AGENTS.md)).

## Assumptions

- Reviews are evenly spaced whole numbers of months. Public notes list calendar dates, which are roughly monthly or quarterly but shift with weekends; the periodic form simplifies this.
- Postponement for market disruption is described in words, not modelled.
- A lookback period of every trading day is represented by a short list of stated dates, as the count already is.
- **The call amount is flat, a simplification.** No source read pays the same extra amount on every call date with no coupon: the UBS note's rises with elapsed time, and the JPM notes pay principal plus that date's coupon. A flat amount is the smallest form that has a stated meaning. The rate form (`per-year`) reproduces the UBS table.
- The call trigger is a level of the basket or underlier, measured from the determined initial level.

## Alternatives considered

1. **Co-located dates only** (the first version of this document). Rejected for review dates, since three concepts read the same dates. Kept for pricing and lookback dates.
2. **Explicit ISO dates on a schedule.** It reads like a term sheet, but adds ordering and calendar validation with no effect on payments, and drifts toward issuance. Possible later, derived from a start date.
3. **Keep counts and add no dates** until a payment depends on them. This was the first version's smallest option. It no longer holds, because calls and contingent coupons are now the intended next work.
4. **A generic trigger type** shared by call, coupon barrier and buffer threshold. Held back: separate named types until a third copy appears ([contingent-autocall.md](contingent-autocall.md), open question 1).

## Decisions agreed

All six were settled by taking the recommended default, and slice 1 follows them.

1. **Numbered periodic reviews, or explicit dates?** Numbered and periodic.
2. **A shared review schedule on the product?** Yes, reversing the first version's co-location for review dates.
3. **Which slice first?** Autocall without coupons.
4. **The chart with an autocall.** Kept as the payoff if held to the end of the term. The review table shows what happens on each review.
5. **Averaging with a schedule.** Allowed, with the consequence stated in the book.
6. **Redemption dropdown.** "Autocallable" is selectable, and unavailable only with the features it cannot combine with.

## Resolved questions

Questions raised earlier in this proposal, and how they were settled.

| Question | Answer |
|---|---|
| **Call amount** | A flat amount on each call date first. A rate times elapsed time (the UBS form) was added afterwards, as `callAmountBasis: 'per-year'`. |
| **Non-call period** | A separate feature, planned in [non-call-period.md](non-call-period.md). Slice 1 can call from the first review. |
| **Call test at the final review** | The last review is the schedule's last date, the final valuation date and the maturity. The call is tested only on earlier reviews, and the final review pays the payoff. |
| **Strike date versus pricing date** | Not distinguished. The initial level is the initial level. Separate strike and pricing dates are issuance. |
| **Term after a call** | The term is the scheduled length. A called note ends earlier, and the result states the actual length. See below. |
| **Business-day and payment lags** | Out of scope. They are issuance concepts. |
| **Trigger step-down** | Added after slice 1 as one signed step for every review after the first (`triggerStep`): negative steps down, as in the UBS note, and positive steps up. A threshold listed date by date, with uneven steps, is not modelled. |

### Term after a call

The Term field says 36 months. With an autocall the note may end sooner, for example when it is called on review 6 of 12. The question was only what the Term field then means. The answer recorded here: it stays the term, defined in its hint as the scheduled length, the latest the note can end. The result shows the actual length (6 months) and the annualised return reads that length, not the term. Nothing is renamed.
