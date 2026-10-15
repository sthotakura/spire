# Reviews and early redemption

Some products are tested on a series of dates through their life, not only at the end. A **review** is one of those dates: the underlier is read, a condition is checked, and something may happen. The simplest thing that can happen is that the product ends early. This chapter explains the reviews of a product and the automatic early redemption, the autocall, that the reference models.

## Reviews

A review schedule says how often a product is reviewed. In public pricing supplements the reviews are listed as dates, roughly monthly or quarterly. The reference models them as a frequency and a count: the reviews are evenly spaced through the term and numbered from 1, and the last review is the end of the term.

A 12-month term reviewed monthly has 12 reviews. A 36-month term reviewed quarterly has 12. The term must hold a whole number of periods: an 18-month term cannot be reviewed annually.

Nothing is stated about calendar dates. The issue date, the dates payments are made and the maturity date belong to issuing the product, and the reference leaves them out.

## Autocall

An **autocall** is automatic early redemption. On each review before the last, if the underlier is at or above the **trigger**, the product ends at once. It repays principal plus the **call amount**, and nothing more is paid. If no review before the last reaches the trigger, the product runs to the end of its term and pays its payoff as a bullet product does.

![A product that can redeem early: if the stated condition is met on a review the product ends and pays then, otherwise it continues to scheduled maturity](diagrams/early-redemption.svg)

Three terms describe it:

- the **trigger**, a level as a share of the initial level, such as 100%;
- the **call amount**, paid above principal when the product is called, as a share of principal, such as 8%;
- the **review frequency**, which sets how many reviews there are.

The trigger is read at or above: a level exactly at it calls the product. The last review is not a call. It is the end of the term, so the payoff reads the final level there, as it does for any product.

## Worked example

A synthetic note with principal of 1,000, a term of 12 months, monthly reviews, a trigger of 100%, a call amount of 8%, an initial level of 100 and 100% downside participation. A rise is not paid, so beyond a call the note pays principal when the underlier ends at or above its initial level.

| Scenario | What happens | Months | Payment |
| :--- | :--- | ---: | ---: |
| The level is 100 on review 1 | Called on review 1: principal plus 8% | 1 | 1,080 |
| Below 100 on reviews 1 to 6, then 102 on review 7 | Called on review 7: principal plus 8% | 7 | 1,080 |
| Below 100 on every review, then ends at 110 | Not called. The payoff pays principal on a rise | 12 | 1,000 |
| Below 100 on every review, then ends at 70 | Not called. Downside participation: 1,000 × (1 − 30%) | 12 | 700 |

The call amount is the same whenever the product is called, so being called on review 7 pays no more than being called on review 1. A flat amount is a simplification. Some public notes pay more the longer they last, and the reference does not model that.

The payoff chart for a product with an autocall shows what it would pay if held to the end of its term, since that is what is read from the final level. The review table shows when it ends early.

## Underliers and other features

- **A basket** is read as its basket level. For a worst-of basket that is the worst performing asset's level, so one asset below the trigger holds the call back. The reference reads one level for each review.
- **Averaging** is allowed. The averaging dates that set the final level are not tied to the review dates, so the final level is an average of the levels a reader states, not of the reviews.
- **Lookback** is not available with an autocall, because the lookback dates are not tied to the review schedule.
- **A barrier observed on every close** is not available with an autocall: a called product ends before the observation period does, and the single lowest or highest close a scenario states cannot say how far the product got. A barrier read on the final date is available.
- **Barrier absolute return** is not available with an autocall, because its barriers are observed on every close.

## Assumptions and sources

- The calls and reviews follow public auto-callable notes, such as an auto-callable contingent interest note whose automatic call can occur from a later review ([JPMorgan Chase Financial Company LLC, 424B2](https://www.sec.gov/Archives/edgar/data/19617/000121390026108339/ea0308243-01_424b2.htm)), and a step-down trigger autocallable note that pays a larger amount the longer it lasts ([UBS AG, 424B2](https://www.sec.gov/Archives/edgar/data/1114446/000183988225047092/ubs_424b2-26373.htm)).
- The Swiss Structured Products Association describes an autocall as an obligation to repay early when the underlyings are above the trigger on a predetermined observation date, and a softcall as an issuer option on such dates ([SSPA](https://sspa.ch/en/lab/)).
- The reviews are evenly spaced whole numbers of months. Public notes list dates that shift with weekends and holidays.
- The call amount is one flat amount. It is not a rate over the time the product has lasted.
- Postponement for market disruptions is not modelled.

## What is not modelled

Contingent coupons, memory, a period at the start in which the product cannot be called, a trigger that steps down, an issuer call and a schedule of payments. Each would be added on top of the reviews described here.

## Related concepts

Redemption behaviour introduces bullet and early redemption. Term gives the scheduled length that the reviews divide. Determination selects the observations the payoff reads at the end. Barrier explains observation on the final date and on every close.
