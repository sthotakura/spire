# Holder put

Proposal, not built. Revised on 27 November 2026 with a fixed-term source, which becomes the sample. It adds a holder put at current value as a third mechanism of an early redemption, beside the autocall and the issuer call. The public sources are in [early-redemption-rights.md](early-redemption-rights.md).

## What it is

A holder put is the holder's right to end the product early on stated dates. Nobody else decides, and the underlier does not have to reach any level. It is the mirror of an issuer call: the party who holds the option is different, and so is whose choice a scenario states.

An autocall and an issuer call pay principal plus a call amount, so the payment does not depend on where the underlier is. A put at current value does: the holder takes what the product is worth under its own formula on that date, which can be well below principal.

## Established concepts

- **A put at current value is what the equity-linked products read pay.** On a holder's exercise:
  - UBS's Open End Certificate pays "the value of the current Redemption Amount", the index ratio less a fee, valued one year after the exercise date ([termsheet](https://keyinvest-ch-fr.ubs.com/filedb/deliver/xuuid/g001b82e5defe78560eb1b87ce552da87a48/name/DE000UBS1SV7_Termsheet_en.pdf)).
  - BCV's Tracker Certificate pays the basket value on the effective termination date ([termsheet](https://www.bcv.ch/termsheet/54357232_en.pdf)).
  - JPMorgan's Alerian MLP Index ETNs pay the intrinsic note value less a 0.125% fee ([424B2, preliminary](https://www.sec.gov/Archives/edgar/data/19617/000121390023097004/ea167102_424b2.htm)).
  - Morgan Stanley's S&P 500 Crude Oil Linked ETNs pay the repurchase settlement amount less a 0.125% fee ([424B2](https://www.sec.gov/Archives/edgar/data/895421/000095010311005435/dp27830_424b2-ps27.htm)).
  - Citigroup Global Markets Funding Luxembourg's five-year notes on the Citi US Equity Put Ratio Series 6 EUR TR Index, Series CGMFL213839, pay their Mandatory Early Redemption Amount, the same formula as at maturity, read on the date the holder's notice names ([pricing supplement](sources/puttable/XS3463578438-pricing-supplement.pdf), 30 October 2026, item 28 and Schedule 1). The holder may put "some or all" of its notes on any Index Business Day before the final valuation date.
  - Ensemble Investment Corporation's five-year certificates on the EQ Gold Overlay Basket pay their Optional Redemption Amount, the same formula as at maturity, on the put valuation date ([pricing supplement](sources/puttable/XS3007576005-issue-terms.pdf), 23 July 2026, item 24 and Schedule 1).
- **Five of the six are trackers.** Each pays a formula that is a straight line in the underlier, one for one, up and down. The Citi notes floor it at zero, `Max[0, …]`, which a one-for-one formula reaches only where the index does. The Ensemble certificates are not trackers: they pay max(10%, a SOFR cash account + the basket's return) of principal, so their formula bends at the floor, and they pay that floored formula on a put too. No equity-linked product read has a put on a payoff with a barrier, buffer or cap.
- **All six give the issuer a right too.** The issuer can end them at the same value. The Citi notes add a level-tested right: if the index closes at or below 50% of the strike level, the issuer "may (but is not obliged to) elect to redeem". The Ensemble certificates end automatically below 60% of the basket's start level.
- **Which comes first.** The BCV investor may terminate "provided that the Issuer has not already exercised its right of termination". In the Morgan Stanley ETN, an issuer's notice sent on or before the day of a holder's notice sets the valuation date. A Citi exchangeable bond states that "the first of such notices to be given shall prevail". The Citi notes' pricing supplement states no order. No source orders a holder's notice against an automatic call.
- **A stated put price exists on rate notes**, stepping from 97% to 100% of principal on [BofA Finance's floating rate notes](https://www.sec.gov/Archives/edgar/data/1682472/000191870425003048/form424b2.htm) and from 970 to 1,000 per 1,000 on [Citi's floating rate notes due 2066](https://www.sec.gov/Archives/edgar/data/200245/000095010326008002/dp247495_424b2-26nir051422d.htm), and at principal on a Citi exchangeable bond after a corporate event. It is left out here; see [early-redemption-rights.md](early-redemption-rights.md).

## What "current value" means in this reference

The maturity payment's own formula, read at the level on the put date. It is not a market valuation, which this reference does not do.

For a straight-line payoff the two are the same thing in substance: a one-for-one note on an underlier at 120 pays 1,200 under its formula, and that is what the sources pay. For a payoff that bends they are not. A note with a 70% barrier and an underlier at 75 pays 1,000 under its maturity formula, but before maturity the barrier can still be breached, so a holder able to leave at 1,000 is receiving more than the formula's name suggests. What such a note is worth on that date needs a pricing model.

## The sample

The Citi notes become a sample, a **Tracker with a holder put**, on the rule in [sample-products.md](sample-products.md): the structure of the public product, a synthetic index starting at 100, and a principal of 1,000.

| Term | Filing | Sample |
| :--- | :--- | :--- |
| Term | Strike date 20 October 2026 to final valuation 20 October 2031 | 60 months |
| Payment at maturity | `CA × Max[0, 1 + 100% × (Index(t) × (1 − 0.80%) ÷ Strike Level − 1)]` | Principal × final level ÷ initial level: 100% upside and downside participation |
| Strike level | Index(0) × (1 + 0.80%), 1565.7466 | Initial level 100 |
| Execution cost | 0.80% on the way in and on the way out, so the payment reads Index(t) × 0.992 ÷ (Index(0) × 1.008), an adjustment factor of 0.992 ÷ 1.008, about 98.41% | An adjustment factor of 100%, as the delta one sample starts; the ⓘ states the filing's |
| Holder put | Any Index Business Day, for some or all of the notes, at the same formula | Monthly put reviews from month 1, at the same formula |
| Issuer call | At any time, at the same formula | Left out: the reference's issuer call pays principal plus a call amount, not current value |
| Trigger at 50% of the strike level | The issuer may elect to redeem, at the same formula | Left out: it is an issuer's choice at current value, like the call |
| Denomination, currency, dates, notice | EUR 100,000; notice one Index Business Day before the date the holder names | Not modelled: issuance details |

**Monthly, not daily.** Monthly is the finest schedule the reference has. A put on any business day lets the holder leave at a level between two monthly reviews; the sample's holder can leave only on one of them. The payment rule is the same.

## Smallest model

```json
"redemption": {
  "kind": "early-redemption",
  "mechanisms": [
    { "kind": "holder-put", "schedule": { "frequency": "semi-annual" }, "firstReviewMonth": 12 }
  ]
}
```

- **A third mechanism**, `holder-put`, with a `schedule` and an optional `firstReviewMonth`, as the issuer call has.
- **No payment term.** The payment is the rule, so there is nothing to state. A stated price would add a field then, and is not added for a case not built.
- **The holder's choice is a scenario input**, as the issuer's is: the put review the holder exercises on, or none. It is not in the structure.
- **The put date's level is a scenario input too**, stated once, for the date the holder puts on. The product has no level term: it states the right and the payment rule, and the level is what the underlier turned out to be, like the final level. It is the level on the valuation date, which this reference takes to be the put date; in the sources the notice comes first and the valuation date follows it. If an autocall or coupon review falls in the same month, it reads that same level. Agreed on 27 November 2026.
- **The last review is the end of the term** and is not a put.
- **The payment** is `maturityPayment` with the put date's level as the final level. The adjustment factor applies, since it is part of that formula.
- **The level is read for the payment only, never as a condition.** Agreed on 27 November 2026. The holder may put on any date of the schedule, whatever the underlier does; no source tests a level for a holder's put. A put at current value reads the level on the put date to work out what it pays, and a put at a stated price, such as Citi's floating rate notes due 2066, would read none. A level-tested right in the sources, such as the Citi notes' 50% trigger, is the issuer's. A coupon review on the put date pays with the put, as it does with a call.

### What it combines with

The product ends on the earliest event, compared by month, as it does for an autocall and an issuer call. An issuer's call or an autocall can each stop a later put.

| Combination | Rule |
| :--- | :--- |
| Payoff | Tracker only: upside and downside participation at 100% each way, and no other payoff feature. Other payoffs are unavailable, for the reason above |
| Adjustment factor | Allowed: the formula reads it |
| Autocall, issuer call | Allowed, each on its own schedule |
| Coupon | Allowed. Coupons are paid up to the date the product ends |
| Single underlier, weighted basket | Allowed. A weighted basket's level is linear in its assets |
| Worst-of or best-of basket | Unavailable: a worst-of return bends |
| Averaged final level | Unavailable: the final level is an average over dates a put date comes before |
| Lookback initial level | Allowed, on the assumption already made for an autocall: the lookback period ends before the first review |
| Delivery | Unavailable: delivery is defined at the final date |
| Barrier observed on every close | Already excluded by the payoff rule |

### When two fall on one date

Issuer's call, then holder's put, then autocall.

A party's notice is given before the date in every source, so an exercised choice comes before an automatic test of that date's level. The issuer ahead of the holder is stated in two sources. The holder ahead of the autocall is an assumption, with no source.

### The interface

- **Puttable** becomes available under Early redemption. Ticking it opens Reviews and First review.
- **The holder's choice in this scenario**, a select beside the issuer's.
- **The put date's level**, one input beside the holder's choice, shown once a put date is chosen. Where the review table already lists that month, for an autocall or a coupon, the level is that row's, so the two cannot disagree. The table shows "Put" on that month and "Ended" after it.
- **On an unavailable payoff**, the box is disabled with a short reason, as for a daily barrier.
- **The line on the chart** is also the put's payment line, read at the put date's level. The scenario sentence says so.

## Worked examples

A synthetic Tracker: principal 1,000, 24 months, initial level 100, 100% participation each way, put reviews every six months from month 12.

| Scenario | Payment | Months | Paid |
| :--- | :--- | ---: | ---: |
| The holder puts in month 12 with the level at 120 | 1,000 × (1 + 20%) | 12 | 1,200 |
| The holder puts in month 18 with the level at 80 | 1,000 × (1 − 20%) | 18 | 800 |
| The holder does not put, and the level ends at 110 | Maturity payment | 24 | 1,100 |
| With an adjustment factor of 99%, the holder puts in month 12 at 120 | 1,000 × (120 × 0.99 ÷ 100) | 12 | 1,188 |
| With an issuer call at no premium, it calls in month 12 and the holder would have put in month 18 | Principal | 12 | 1,000 |
| With the same issuer call, both act in month 12 at 120 | The issuer's call comes first | 12 | 1,000 |
| With a quarterly autocall at a 100% trigger paying 8%, the level is 105 in month 3 and the holder would have put in month 12 | The autocall comes first | 3 | 1,080 |
| With the same autocall set to first review in month 12, the holder puts in month 12 at 120 | The put comes first | 12 | 1,200 |

The sample: principal 1,000, 60 months, initial level 100, monthly put reviews from month 1.

| Scenario | Payment | Months | Paid |
| :--- | :--- | ---: | ---: |
| The holder puts in month 24 with the level at 130 | 1,000 × (1 + 30%) | 24 | 1,300 |
| The holder puts in month 7 with the level at 80 | 1,000 × (1 − 20%) | 7 | 800 |
| The holder does not put, and the level ends at 110 | Maturity payment | 60 | 1,100 |
| With the filing's adjustment factor of 0.992 ÷ 1.008, the holder puts in month 24 at 130 | 1,000 × (130 × 0.992 ÷ 1.008 ÷ 100) | 24 | 1,279.37 |

## Changes it needs

- **Domain.** `HolderPut` and `holderPutOf`. `redemptionOutcome` takes the holder's choice, a put review and that date's level, and returns `endedBy: 'holder-put'`; put reviews do not join `reviewDates` unless another mechanism reads that month. Its issuer's choice and the holder's become one options argument, since two positional choices are easy to swap.
- **Validator and schema.** The combinations above, listed in the validator-only rules, with a synthetic example.
- **Content.** Summary clause, formula line, calculation steps, outcome sentence, concept highlights for the put's own terms.
- **Sample.** The Tracker with a holder put in `src/content/examples.ts`, under a new group or Participation notes, and its row in [sample-products.md](sample-products.md), with the differences above in its ⓘ. The ⓘ and the book link to the filing's public [LuxSE viewer page](https://www.luxse.com/pdf-viewer/105692613), not to the copy in `docs/sources/puttable/`.
- **Book.** A section in chapter 19, the JSON in chapter 18, and the feature map. The section also explains what is not modelled: that a put pays either a stated price or current value; the conditions of exercise in the sources (a minimum amount, all or part of a holding, notice, irrevocability); and that a level-tested early redemption such as a trigger is the issuer's right, not the holder's.

## Alternatives

1. **Any payoff, using the maturity formula.** Simple, and it composes. But the result would be labelled current value when it is not, and it would give a barrier note a free exit at par above the barrier. No source pays this on a barrier, buffer or cap; the Ensemble certificates pay a floored formula on a put. Not recommended.
2. **A stated put price instead.** Close to the issuer call and allowed on any payoff, but no equity-linked source has one on stated dates. It can follow as a second basis.
3. **A rate other than 100%.** A 150% tracker is still straight until the payment reaches zero. No source read has one, so it is left out to begin with. See open question 5.
4. **A level for every put review.** One row and level per put date in the review table, as an autocall has. Consistent with the autocall, but the payment reads only the put date's level, and the sample's monthly puts would add 59 rows. Not chosen; see decision 3.

## Assumptions

- The put review is the valuation date. Notice periods, settlement lags and UBS's one-year delay are not modelled, as dates are not.
- No redemption charge and no running fee, though four sources deduct a running fee and two add a 0.125% charge on a put. The Citi notes have neither in their own formula: their 0.80% execution cost at each end is a fixed ratio, which the adjustment factor states.
- A fixed term of up to 120 months. The Citi notes run 60; the other sources are open-ended or longer.
- Puts on stated reviews, monthly at the finest, where the Citi notes allow any business day.

## Decisions to agree

1. **Tracker only.** Agreed on 27 November 2026, for the reason above. Leverage is open question 5.
2. **Same-date order:** issuer, holder, autocall. Agreed on 27 November 2026. The holder ahead of the autocall has no source.
3. **One level, for the put date, in the scenario.** Agreed on 27 November 2026. The level is read only for the payment, so only the date the holder puts on needs one, and it is a scenario input, not a term of the product. A level for every put review is alternative 4.
4. **No charge in the first version.** Agreed on 27 November 2026. A flat redemption charge would be one small field if wanted.
5. **The Citi notes as the sample**, with monthly puts and without their issuer call and 50% trigger. Agreed on 27 November 2026: they are the only fixed-term source with a put on a tracker.
6. **The sample's adjustment factor starts at 100%**, as the delta one sample does, with the filing's 0.992 ÷ 1.008 in the ⓘ. Agreed on 27 November 2026, for the same reason as there: the reader sees the plain one-for-one rule first. Starting at about 98.41% would reproduce the filing's payments.

## Open questions

1. **A name.** "Puttable" is the interface's label. No SSPA category or descriptive market name for this combination was read, so no marketing name is proposed.
2. **Value on the other mechanisms.** An issuer's call on these products pays current value too, but the reference's issuer call pays principal plus a call amount. Sources read this way are not reproduced until that is added. The Citi notes' issuer call and their 50% trigger would both need it.
3. **An open-ended term**, which would let the UBS and BCV certificates become samples.
4. **A put on a floored formula.** The Ensemble certificates pay their floored formula on a put, which is the one source for alternative 1 above. Their floor sits beside a cash account the reference does not model, so they do not settle whether a floor, a buffer or a barrier on an equity payoff should be allowed.
5. **Leverage.** A leveraged certificate pays a rate other than 100% of the move both ways, such as 200%. The Citi sample's formula already has the shape, `CA × Max[0, 1 + Leverage × Index Amount]`, with Leverage at 100%. It needs two things the reference does not have, for the product and not only for the put: a downside rate above 100%, which is limited to 100% today, and a floor at zero, where a fall of 1 ÷ rate takes the payment to nothing. The floor bends the line, but unlike a barrier it does not give the holder an exit worth more than the formula: reading the formula before maturity pays at most the note's worth, and differs from it only near zero. To be proposed as its own concept, from public sources: the Citi formula is one, and a public leveraged certificate with its rate above 100% is still to be found.
