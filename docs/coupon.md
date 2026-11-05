# Fixed coupon

Agreed and built on 25 October 2026, as proposed below. A fixed coupon is interest at a fixed rate a year, paid on every coupon review whatever the underlier does, until the product ends. It is built as a coupon with no barrier, beside the contingent coupon of [contingent-coupon.md](contingent-coupon.md). It does not cover floating, range-accrual or step-up coupons, or interest added to the balance.

This document replaces an earlier proposal written for a fixed deposit, which is no longer modelled because it is not a structured product ([deposit.md](deposit.md)). Its arithmetic carries over; its sources were deposit material and are replaced by the three notes below.

## What it means

A **fixed coupon** is a payment of interest on stated dates during the product's life, separate from the repayment of principal. Unlike a contingent coupon, it has no condition: no level of the underlier is read to decide whether it is paid. It stops when the product ends, so a called product pays the coupon of the review it is called on and no later ones.

A fixed coupon does not protect principal. In the notes read, the holder receives every coupon and can still lose most of the principal at the end of the term. The coupon is high because the holder bears that loss: both issuers' tax sections describe each coupon as partly interest on a deposit and partly a premium for a put option the holder has sold. That is how the issuers characterise the payment for tax, not a pricing model, and the reference does not price it.

## Established concepts

Three public notes were read on 25 October 2026. All are fixed coupon autocalls on the worst of several stocks, paid in cash, with no upside participation.

| Finding | Source |
| :--- | :--- |
| **The coupon is paid whatever the underlier does.** The 2019 note pays a quarterly coupon "at an annual rate of 11.72%" on each coupon date unless previously redeemed. The Barclays note's example 3 pays a final level of 50% as 500 plus the 36.05 coupon, 536.05. | [MS 2019](https://www.sec.gov/Archives/edgar/data/1666268/000095010319017010/dp117426_424b2-ps2983.htm); [Barclays 2026](https://www.sec.gov/Archives/edgar/data/312070/000095010326010923/dp250300_424b2-9273ms.htm) |
| **The coupon per review is the annual rate times the period.** 11.72% a year is about 29.30 a quarter on 1,000; 12.90% a year is about 10.75 a month; Barclays states 3.605% a quarter, 14.42% a year in its tax section. | All three |
| **A whole period is a twelfth of a year per month.** Both Morgan Stanley notes state 30/360, which over whole months is months ÷ 12. Barclays states no day count. | MS 2019; [MS 2024](https://www.sec.gov/Archives/edgar/data/1666268/000183988224003876/ms997_424b2-02307.htm) |
| **A call pays principal plus that period's coupon**, and nothing for being called. No further payments follow. | All three |
| **The coupon is paid in the non-call period.** The 2019 note pays a coupon in March 2020 and cannot be called until June 2020; the 2024 note pays five monthly coupons before its first call test. | MS 2019; MS 2024 |
| **The last coupon is paid with the payment at the end of the term**, whether or not the downside threshold is breached. | All three |
| **Coupon and call share a schedule** in all three: each call test falls on a coupon period. The determination dates fall a few days before the payment dates; that gap is issuance. | All three |
| **The downside is a barrier read on the final date**: below 60% (50% in the 2024 note) of the initial level, the holder bears the whole fall of the worst stock, 1:1. At or above it, principal. | All three |

A fourth note, the BofA fixed income auto-callable yield note ([424B2](https://www.sec.gov/Archives/edgar/data/70858/000148105723007689/form424b2.htm)), was re-read after the build, on 25 October 2026. It lists 36 monthly coupon payment dates and, separately, 30 call observation dates, which looked like a coupon and a call on different schedules. They are not: each call is paid on a coupon payment date, from month 6 to month 35, so the call is monthly with a non-call period of five reviews, and the valuation date in month 36 is not a call. It pays 14.50% a year, stated as $12.084 a month (14.50% ÷ 12 rounded up), the last coupon "regardless of the performance" of the worst stock, and bears the whole fall of the worst stock below 50%. Its formula below the threshold is printed as an image; its table (49.99 pays 511.984) shows the 1:1 loss.

A fifth note, the Credit Suisse autocallable reverse convertible on the worst of two stocks, due 2024 ([424B2](https://www.sec.gov/Archives/edgar/data/1053092/000095010322016505/dp181209_424b2-f2006.htm)), was read on 4 November 2026 through a summarising fetch tool, since a direct download was refused. It pays $11.667 a month, "approximately 14.00% per annum", on every coupon date until it ends. A call needs each stock at or above its initial level on a call observation date, and pays principal plus the next coupon. A knock-in is tested only on the valuation date: a final level below 45% of the initial level, on either stock. It is the first note read that delivers shares after a knock-in: whole shares of the worst stock, cash for any fraction, and cash if that is less than one share. The issuer can pay cash instead, $1,000 ÷ initial level × final level. In its example, a final level of 40% gives 10 shares worth $400 on the valuation date.

Its Key Dates table, checked as printed, has 24 rows: five coupon dates with no call observation, 18 rows pairing a call observation date with a coupon date, from 23 March 2023 to 23 August 2024, and the coupon at maturity. So the call is monthly from month 6, and the 24 coupons agree with the filing's total of $280.008 (24 × $11.667).

### Fit with the model

| Note | Maps to | Sample |
| :--- | :--- | :--- |
| MS 2019 | 18 months; a worst-of basket of three; quarterly autocall from month 6, trigger 95% stepping −5% so month 15 is 80%, no call amount, final review not a call; a fixed coupon of 11.72% a year, quarterly; downside participation 100% with a 60% barrier on the final date | Yes. A final pricing supplement whose examples reconcile with its terms. |
| MS 2024 | 24 months; worst of four; monthly autocall from month 6, trigger 100%; 12.90% a year, monthly; 50% barrier | Not now. A preliminary supplement with the rate stated as "at least 12.90%" and the levels blank. A final supplement would make it one. |
| BofA 2023 | 36 months; worst of three; monthly autocall from month 6, trigger 100%, final review not a call; 14.50% a year, monthly; 50% barrier | Yes. A final pricing supplement whose table agrees with its terms; the payment below the threshold is read from the table. |
| Credit Suisse 2022 | 24 months; worst of two; monthly autocall from month 6, trigger 100%, no call amount, final review not a call; 14% a year, monthly; 45% barrier on the final date | Yes. It first stayed a source, as it repeats the BofA sample's structure and delivers shares; delivery is now modelled ([settlement.md](settlement.md)), so it is the sample that shows it. The terms pass `validateProduct`, and `redemptionOutcome` reproduces its cash amounts: 45 pays 1,000 and 40 pays 400 on the valuation date. Coupons total 280.00 at 14% ÷ 12, against the filing's 280.008. |
| Barclays 2026 | 12 months; worst of three; quarterly autocall from review 1, trigger 100%; 14.42% a year, quarterly; 60% barrier | No; a source only. Its call test reads "greater than or equal to" on the cover and "above" in its risk factors and an example, and its tax section refers to a physical settlement option that its payment terms do not have. |

Settlement, cash or delivery of the underlier, is a term of its own ([settlement.md](settlement.md)). The reverse convertible names do not depend on it, since the Swiss type allows either form (see [call-and-coupon-names.md](call-and-coupon-names.md)). The Credit Suisse note uses the name and does deliver shares. The payment shown for it is its value on the valuation date, the same as the issuer's cash alternative; a holder who receives shares also bears any price move until maturity, which the reference does not show.

## Smallest model

```json
"coupon": { "schedule": { "frequency": "quarterly" }, "rate": 0.1172 }
```

- **A coupon with no barrier.** `barrier` becomes optional on `Coupon`. With one, the coupon is contingent, as now; without one, it is fixed. This was decision 2 of [contingent-coupon.md](contingent-coupon.md).
- **No `kind`.** The presence of the barrier is the difference; a kind would state it twice.
- **No memory without a barrier.** No fixed coupon can be missed, so `memory: true` without a barrier is an issue, not ignored. The app writes no `memory` key on a fixed coupon.
- **Fixed or contingent, not both.** A product has one coupon. No public note read pays a fixed coupon and a contingent one together, so that combination is not modelled.
- **The schedule, rate and arithmetic are the contingent coupon's.** The coupon keeps its own schedule and works with any redemption: bullet, autocall or issuer call.

## The rules

On each coupon review `r`, up to the date the product ends:

```text
coupon   = principal × rate × months per review / 12
paid(r)  = coupon
```

- **A call** on a date that is a coupon review pays principal, the call amount and that review's coupon. A call on any other date pays no coupon, as now.
- **The last review**, if the product is not called, pays the payment at the end of the term plus the last coupon.
- **No level is read for the coupon.** A fixed coupon adds no dates to the scenario's levels: a bullet note with a fixed coupon has no review table, and an autocall reads levels on its call reviews only. The coupon's reviews still decide when coupons are paid and what they add to the total.

## Synthetic worked example

A note of 1,000 on a synthetic stock with an initial level of 100, shaped like the 2019 note. An 18-month term; a fixed coupon of 12% a year, quarterly, so 30.00 a review over six reviews; a quarterly autocall from month 6, a trigger of 95% stepping −5% (95% in month 6, 80% in month 15), no call amount and no call on the final review; 100% downside participation with a 60% barrier read on the final date.

Called early:

| Month | Level | Trigger | Call | Paid |
| ---: | ---: | ---: | :--- | ---: |
| 3 | 80 | — | No; not a call review | 30.00 |
| 6 | 92 | 95% | No | 30.00 |
| 9 | 91 | 90% | Yes | 1,000 + 30.00 |

The holder receives 1,090.00 over nine months, 90.00 of it in coupons.

Never called, with five coupons, 150.00, paid before the last review:

| Final level | Payoff | Last coupon | Paid at the end of the term | Total paid |
| ---: | ---: | ---: | ---: | ---: |
| 75 | 1,000.00 | 30.00 | 1,030.00 | 1,180.00 |
| 60 | 1,000.00 | 30.00 | 1,030.00 | 1,180.00 |
| 50 | 500.00 | 30.00 | 530.00 | 680.00 |

At 60 the barrier is not breached, since it is reached only strictly below. At 50 the holder bears the whole fall and still receives every coupon.

A 12-month bullet note with a fixed coupon of 6% a year, monthly, pays 5.00 a month, the last with the payment at the end of the term: 60.00 in coupons whatever the final level. No public bullet note with a fixed coupon was read; it is a coherent combination of defined parts.

## Consequences

- **Domain.** `barrier` optional on `Coupon`; an issue for memory without a barrier; `reviewDates` adds coupon dates only for a coupon with a barrier; `couponTests` pays every review of a fixed coupon; the payment at the end of the term adds the last coupon at every final level, so the chart's line moves up by one coupon with no step.
- **Daily observation.** A barrier observed on every close is not combined with a coupon today, because the levels read on coupon reviews would have to agree with the lowest and highest close. A fixed coupon reads no levels, so the rule is lifted for a fixed coupon on a bullet note. A daily barrier stays unavailable with an autocall or an issuer call, for the call's own reason: a called product ends before the observation period does.
- **Lookback.** The assumption that the lookback period ends before the first review applies to a fixed coupon only through the call reviews that read levels.
- **Schema.** `barrier` optional, with JSDoc that says a coupon without one is fixed; an example from the sample; a boundary case; "memory needs a barrier" added to the rules only the validator checks.
- **Content.** Summary: "…and pays 12% a year in quarterly coupons". Payment rule and calculation: `Coupon = 1,000 × 12% × 3 / 12 = 30.00`, paid on each review until the product ends. Outcome, scenarios and chart labels say the coupon is paid whatever the level.
- **Interface.** The Coupon row offers None, Fixed and Contingent. With Fixed, the coupon barrier and memory rows are not shown; switching keeps the reader's rate and schedule, and switching back to Contingent restores the barrier. For a fixed coupon the review table's coupon column shows what each review pays, with no barrier test.
- **Names.** The Contingent coupon note chip needs a barrier. No chip for a fixed coupon alone; the reverse convertible names read it with the downside ([call-and-coupon-names.md](call-and-coupon-names.md)). The category follows the contingent coupon: an unprotected note with a coupon and no upside is Yield Enhancement.
- **Annualised return.** Left out with a coupon at this point. Since built: [cash-flow-result.md](cash-flow-result.md).
- **Samples.** "Worst-of fixed coupon autocallable note" from the 2019 note, and "Monthly worst-of fixed coupon autocallable note" from the BofA note, with synthetic underliers.
- **Book.** A fixed coupon section in chapter 20, with a chart of the payment at the end of the term; chapters 19 and 21 and the outline updated.

## Decisions agreed

1. **A fixed coupon is a coupon with no barrier**, with no `kind`.
2. **Fixed or contingent, not both.** No note read pays both.
3. **No name chip for a fixed coupon alone.** "RevCons" is a brand. This first also held back "reverse convertible" as depending on settlement; on 4 November 2026, SSPA's and FINRA's wording showed it does not, so the two reverse convertible names were added.
4. **Barclays is a source, not a sample**, since its filing contradicts itself.
5. **The fixed coupon comes before the cash-flow result.** The total paid stays the result.
6. **The Credit Suisse note was first a source, not a sample**, as it repeated the BofA sample's structure and its delivery of shares was not modelled. Now that delivery is, it is the sample that shows delivery with an autocall.

## Open questions

1. **A coupon and a call on different schedules** in a fixed coupon note. None of the five notes read has one: the BofA note, which looked like one, calls monthly on its coupon dates from month 6. The model allows it, as the BofA issuer callable contingent coupon note (monthly coupon, quarterly call) needs.
2. **A fixed coupon for an initial period, then a contingent one.** Not seen in a public note.
3. **Interest added to the balance and paid at the end** is a fixed return in the payoff, not a coupon, and is not modelled.
4. **Broken periods**, a short or long first or last coupon period. Not modelled.
5. **Floating coupons** would read a reference rate, an underlier of their own. Not planned.
