# Holder put

Proposal, not built. It adds a holder put at current value as a third mechanism of an early redemption, beside the autocall and the issuer call. The public sources are in [early-redemption-rights.md](early-redemption-rights.md).

## What it is

A holder put is the holder's right to end the product early on stated dates. Nobody else decides, and the underlier does not have to reach any level. It is the mirror of an issuer call: the party who holds the option is different, and so is whose choice a scenario states.

An autocall and an issuer call pay principal plus a call amount, so the payment does not depend on where the underlier is. A put at current value does: the holder takes what the product is worth under its own formula on that date, which can be well below principal.

## Established concepts

- **A put at current value is what the equity-linked products read pay.** On a holder's exercise:
  - UBS's Open End Certificate pays "the value of the current Redemption Amount", the index ratio less a fee, valued one year after the exercise date ([termsheet](https://keyinvest-ch-fr.ubs.com/filedb/deliver/xuuid/g001b82e5defe78560eb1b87ce552da87a48/name/DE000UBS1SV7_Termsheet_en.pdf)).
  - BCV's Tracker Certificate pays the basket value on the effective termination date ([termsheet](https://www.bcv.ch/termsheet/54357232_en.pdf)).
  - JPMorgan's Alerian MLP Index ETNs pay the intrinsic note value less a 0.125% fee ([424B2, preliminary](https://www.sec.gov/Archives/edgar/data/19617/000121390023097004/ea167102_424b2.htm)).
  - Morgan Stanley's S&P 500 Crude Oil Linked ETNs pay the repurchase settlement amount less a 0.125% fee ([424B2](https://www.sec.gov/Archives/edgar/data/895421/000095010311005435/dp27830_424b2-ps27.htm)).
- **All four are trackers.** Each pays a formula that is a straight line in the underlier, one for one, up and down. No equity-linked product read has a put on a payoff with a barrier, buffer, cap or floor.
- **All four give the issuer a right too.** The issuer can end them at the same value.
- **Which comes first.** The BCV investor may terminate "provided that the Issuer has not already exercised its right of termination". In the Morgan Stanley ETN, an issuer's notice sent on or before the day of a holder's notice sets the valuation date. No source orders a holder's notice against an automatic call.
- **A stated put price exists on rate notes**, for example 97% to 100% of principal on [BofA Finance's floating rate notes](https://www.sec.gov/Archives/edgar/data/1682472/000191870425003048/form424b2.htm). It is left out here.

## What "current value" means in this reference

The maturity payment's own formula, read at the level on the put date. It is not a market valuation, which this reference does not do.

For a straight-line payoff the two are the same thing in substance: a one-for-one note on an underlier at 120 pays 1,200 under its formula, and that is what the sources pay. For a payoff that bends they are not. A note with a 70% barrier and an underlier at 75 pays 1,000 under its maturity formula, but before maturity the barrier can still be breached, so a holder able to leave at 1,000 is receiving more than the formula's name suggests. What such a note is worth on that date needs a pricing model.

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
- **The last review is the end of the term** and is not a put.
- **The payment** is `maturityPayment` with the put date's level as the final level. The adjustment factor applies, since it is part of that formula.
- **A level is read on each put review**, so put reviews join `reviewDates`. A coupon review on the put date pays with the put, as it does with a call.

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
- **The review table** gains put reviews, labelled Put 1, Put 2, and shows "Put" on the review exercised, and "Ended" after it.
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

## Changes it needs

- **Domain.** `HolderPut`, `holderPutOf`, and `put` on `ReviewDate`. `redemptionOutcome` takes the holder's choice and returns `endedBy: 'holder-put'`. Its issuer's choice and the holder's become one options argument, since two positional choices are easy to swap.
- **Validator and schema.** The combinations above, listed in the validator-only rules, with a synthetic example.
- **Content.** Summary clause, formula line, calculation steps, outcome sentence, concept highlights for the put's own terms.
- **Book.** A section in chapter 19, the JSON in chapter 18, and the feature map.

## Alternatives

1. **Any payoff, using the maturity formula.** Simple, and it composes. But the result would be labelled current value when it is not, and it would give a barrier note a free exit at par above the barrier. No source pays this. Not recommended.
2. **A stated put price instead.** Close to the issuer call and allowed on any payoff, but no equity-linked source has one. It can follow as a second basis.
3. **A rate other than 100%.** A 150% tracker is still straight until the payment reaches zero. No source read has one, so it is left out to begin with.
4. **One level for the chosen put, not one per put review.** Fewer rows on a monthly put, but a second kind of level input beside the review table, which an autocall on the same date would have to agree with. Not recommended.

## Assumptions

- The put review is the valuation date. Notice periods, settlement lags and UBS's one-year delay are not modelled, as dates are not.
- No redemption charge and no running fee, though all four sources deduct a running fee and two add a 0.125% charge on a put.
- A fixed term of up to 120 months. The sources are open-ended or longer, so no filing can be a sample yet.

## Decisions to agree

1. **Tracker only.** Recommended, for the reason above.
2. **Same-date order:** issuer, holder, autocall. Recommended. The holder ahead of the autocall has no source.
3. **A level for every put review**, in the existing table. Recommended.
4. **No charge in the first version.** Recommended. A flat redemption charge would be one small field if wanted.

## Open questions

1. **A name.** "Puttable" is the interface's label. No SSPA category or descriptive market name for this combination was read, so no marketing name is proposed.
2. **Value on the other mechanisms.** An issuer's call on these products pays current value too, but the reference's issuer call pays principal plus a call amount. Sources read this way are not reproduced until that is added.
3. **An open-ended term**, which would let the UBS and BCV certificates become samples.
