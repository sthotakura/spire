# Amortization

Built on 19 November 2026 as option 3 below, a plain amortizing note, after option 1 had first been agreed. An **amortizing** note repays its principal in instalments during the term, not in one amount at the end. Each instalment is part interest, on the principal still outstanding, and part repayment of principal. In the two notes read, the instalments are level: the same total every period, with the interest share falling and the principal share rising. That level payment is what is often called an amortizing coupon. It is not a coupon in this reference's sense, because it repays principal.

## What it means

The principal still owed after an instalment is the **outstanding principal**. Each instalment pays interest for the period on the outstanding principal at the start of that period, and the rest of the instalment reduces it. With a level payment, the outstanding principal reaches zero on the last instalment, so nothing is left to repay at maturity. A mortgage repays the same way.

Bullet redemption is the opposite. The whole principal is outstanding until the end of the term, and every coupon is measured on all of it. Every product in this reference today is bullet, or ends early in one payment of the whole principal.

### Other meanings of "amortizing coupon"

| Meaning | What it is | Here |
| :--- | :--- | :--- |
| **Level-pay amortization** | Equal instalments of interest plus principal, which reduce the principal to zero | What both notes read do |
| **Step-down coupon** | The coupon rate falls on later reviews while the principal stays whole | Not amortization. It would be a rate schedule on `Coupon` ([coupon.md](coupon.md), open questions) |
| **Amortizable bond premium** | A tax and accounting treatment of a bond bought above par | Not a product term. Out of scope |

## Established concepts

Two final offering documents were read on 19 November 2026.

| Finding | Source |
| :--- | :--- |
| **The payment is level and fixed.** The "Total Payment Amount" is "an amount per Note of US$100 payable on each Payment Date", made up of "(a) the applicable Interest Component Amount plus (b) the applicable Principal Component Amount". | [Barclays 2010](https://www.sec.gov/Archives/edgar/data/0000312070/000119312510201959/d424b2.htm) |
| **Interest is on the outstanding principal for the period.** The "Interest Component Amount" is "the Effective Interest Rate times the Outstanding Principal Amount times the applicable Day Count Fraction", 30/360. The outstanding principal is the initial principal less "the sum of the Principal Component Amounts paid on all Payment Dates to and including the Payment Date that is the first day of that Calculation Period". So the interest is measured before that date's repayment. | Barclays 2010 |
| **The principal share is the rest of the payment.** It is "$100 minus the Interest Component Amount payable on such Payment Date". | Barclays 2010 |
| **The schedule reaches zero.** 180 monthly payments of $100.00 on $13,900, from 1 October 2010 to 1 September 2025, at an effective rate of 3.59231% a year. The first is $41.61 interest and $58.39 principal. The last is $0.30 interest and $99.70 principal, which leaves $0.00. No other amount is paid at maturity. | Barclays 2010 |
| **The same shape in an equity unit.** Each Novanta 6.50% Tangible Equity Unit is a prepaid stock purchase contract and a senior amortizing note due 2028, with an initial principal of $8.74 and interest at 6.30% a year, 30/360. The note pays "quarterly cash installments of $0.8125", except a first installment of $0.7132 for the short period from issue. "Each installment will constitute a payment of interest (at a rate of 6.30% per annum) and a partial repayment of principal", as set out in a 12-row schedule ending on 1 November 2028. The 12 principal amounts total $8.74. | [Novanta pricing term sheet](https://www.sec.gov/Archives/edgar/data/1076930/000119312525270993/d23003dfwp.htm); [prospectus supplement](https://www.sec.gov/Archives/edgar/data/0001076930/000119312525272544/d94591d424b5.htm) |
| **The Novanta schedule follows the Barclays rule.** The prospectus states no such rule, but the arithmetic matches: on 1 May 2026, ($8.74 − $0.5924) × 6.30% × 90/360 = $0.1283, the interest shown. On 1 November 2028, $0.7999 × 6.30% / 4 = $0.0126. | Arithmetic on the Novanta schedule |
| **The level amount is the stated term, and the rate follows from it.** Barclays states the $100 payment and an "effective" rate. Novanta's $0.8125 is 6.50% a year on the unit's $50, so 6.50% is the unit's yield on its stated amount. The note's own rate is 6.30% on $8.74. | Both |
| **Neither note reads an underlier.** The Barclays note is a fixed-rate note. The Novanta note is fixed too: the share price enters only through the purchase contract, which settles in shares on 1 November 2028. | Both |

Other terms, kept as context:

- **Barclays** refers to "the Redemption at the Option of the Company provisions above" and says "you will receive on the Early Redemption Date the Early Redemption Price", but the pricing supplement has no such provision: it states no price, dates, notice period or non-call period, and no holder option. Read again in full on 20 November 2026, with the two documents it points to. The [prospectus supplement](http://www.sec.gov/Archives/edgar/data/312070/000119312510201604/d424b3.htm) (S-35) is a template: "The applicable pricing supplement will indicate the terms of our option, if any, to redeem the notes, in whole or in part", paying "the price per note, together with any accrued but unpaid interest thereon to (but excluding) the optional redemption date". It has no section on amortizing notes, and "The notes will not be subject to any sinking fund." The [base prospectus](http://www.sec.gov/Archives/edgar/data/312070/000119312510201448/df3asr.htm) (p. 11) allows redemption for tax reasons on 30 to 60 days' notice at "100% of the principal amount of debt securities being redeemed", plus accrued interest, for all of the issuer's debt securities. Whether that is the original or the outstanding principal of an amortizing note is not stated. The first period is a regular month, from 1 September to 1 October 2010. The note is not listed.
- **Novanta** has no optional redemption except for changes in tax law, which was read only in summary. If the issuer settles the purchase contracts early, holders may require it to repurchase their amortizing notes at the outstanding principal plus accrued interest. If a holder settles early, the note stays outstanding. A holder can separate the note from the contract and trade each on its own.
- **The Novanta purchase contract** settles at a rate between 0.4662 and 0.3729 shares per $50 contract. The maximum applies at or below a reference price of about $107.26, the minimum at or above a threshold of $134.0842, and between them it delivers shares worth $50. The two rates are $50 divided by each price (arithmetic). That is a payoff on the share price, and is the structured part of the unit. It is outside this proposal.

## Fit with the reference

A level-pay amortizing note on its own is a fixed-rate debt security. It has no underlier and no embedded option. The fixed deposit was left out for the same reason ([deposit.md](deposit.md)): modelling it would make the underlier optional for one case. And because the principal reaches zero, nothing is left at maturity for a payoff to apply to. So amortization and an equity payoff cannot share one principal in the way the earlier draft assumed. No public note read repays principal in instalments and also applies an equity payoff to what is left. That combination was an assumption, and has been dropped.

Where amortization does meet a structured product, in the two documents read, is as a **component of a unit**: a Tangible Equity Unit is a fixed amortizing note beside a share purchase contract, and the holder receives both. The reference has no unit concept. A product is one wrapper with one payoff.

## Options

1. **Record it, model nothing.** Agreed first, then replaced by option 3. Keep amortization as an established concept in this document and the feature map. A chapter of the book could explain it as the opposite of bullet redemption. No domain change.
2. **Model the Tangible Equity Unit.** The unit would be two products: an amortizing note, with the amortization below, and a prepaid purchase contract, settled by delivery. That needs a unit concept, a level-pay schedule, and the purchase contract's settlement rate as a new payoff. It is the only form read that ties amortization to an underlier, and it is a large increment. The purchase contract needs its own proposal first.
3. **Model a plain amortizing note.** This reproduces the Barclays schedule, though it is not a structured product, and the fixed deposit decision argued against it. Built, so that the reference shows the opposite of bullet repayment and how a coupon depends on what is outstanding.

## The model

Agreed on 19 November 2026, and built as described.

### Where it sits

Amortization is an early redemption mechanism, beside the autocall, the issuer call and the put. Each instalment redeems part of the principal before maturity, which is what the Leonteq prospectus calls being "partially redeemed on partial redemption dates". So early redemption covers principal repaid before the end of the term in part as well as in whole. Agreed on 19 November 2026. In the interface it is a checkbox in the list of early redemption mechanisms:

```text
Redemption       [ Early redemption ▾ ]
                   ☐ Autocallable
                   ☐ Issuer callable
                   ☐ Puttable (unavailable)
                   ☐ Amortizing
```

The mechanisms combine, and the sources show amortization alongside a mechanism that ends the product. The Barclays note amortizes and can be redeemed at the company's option. Novanta's holders can require a repurchase at the outstanding principal plus accrued interest. A note that amortizes and cannot be called is an early redemption with amortization as its only mechanism.

Bullet keeps its label and meaning: the whole principal is repaid at the end of the term, so Bullet and amortization never combine. A checkbox beside the Bullet and Early redemption choice was considered first. It was set aside because Bullet with amortization contradicts what bullet means.

### Domain type

The amortization is a principal schedule. It has no rate of its own: the interest is the product's fixed coupon, measured on the outstanding principal. That matches Barclays' level payment, an "Interest Component Amount" plus a "Principal Component Amount".

```ts
/**
 * Principal repaid in instalments on the amortization's schedule, so that later coupons, and a call, are measured on the
 * principal still outstanding. With a level payment, each instalment and that review's coupon add up to the same amount on every
 * review, and the outstanding principal reaches zero on the last.
 */
export interface Amortization {
  kind: 'amortization'
  /** The reviews on which an instalment is paid. With a level payment they must be the coupon's. */
  schedule: Schedule
  /** How the instalments are set. A level payment is the only method in this reference. */
  method: 'level-payment'
}

export type EarlyMechanism = Autocall | IssuerCall | Amortization
```

### Schema

The generated schema gains an `Amortization` definition with `kind` (`"const": "amortization"`), `schedule` and `method` (`"const": "level-payment"`), all required. It becomes a third named variant in the `oneOf` of `EarlyMechanism`. `Bullet` is unchanged.

These descriptions would change:

| Where | Today | With amortization |
| :--- | :--- | :--- |
| `EarlyRedemption` | "Redemption that can come before the end of the term" | principal can be repaid before the end of the term, in whole by a call or a put, or in part by amortization |
| `Coupon.rate` | a fraction of principal: principal × rate × months ÷ 12 | a fraction of the principal outstanding at the start of the period. Without amortization that is the whole principal, so nothing changes |
| `Autocall`, `IssuerCall` | repays principal plus the call amount | repays the outstanding principal plus the call amount |

The rules only the validator checks, listed in `scripts/product-schema.ts`, would gain three:

1. **A level payment needs a fixed coupon**, with no barrier, because the instalment is the level amount less that review's interest.
2. **The amortization's schedule is the coupon's.**
3. **No payoff features.** A level payment leaves nothing outstanding at maturity, so participation, protection or a digital return would have no principal to apply to.

The example product for `scripts/product-examples.ts` is the synthetic note below:

```json
"redemption": {
  "kind": "early-redemption",
  "mechanisms": [
    { "kind": "amortization", "schedule": { "frequency": "quarterly" }, "method": "level-payment" }
  ]
},
"coupon": { "schedule": { "frequency": "quarterly" }, "rate": 0.06 },
"payoff": { "participations": [] }
```

### What the shape shows

- **Rule 3 is why option 1 was first agreed.** Even inside the product type, a level-pay note is fixed-rate debt. The underlier would still be required, and only an autocall could read it. The schema would accept a structure that the sources read show only beside a structured product, never within one.
- **Barclays is a sample in part.** It states the $100 payment, and its rate is derived from it. This type derives the payment from the rate, which gives Barclays' $100.00 to the cent, and a test reproduces its first and last rows. Its 180-month term is beyond the reference's 120, so the sample is its last 120 payments. Novanta's short first period cannot be expressed, because the reference has no broken periods.

## The rule

Write `P` for the initial principal, `A` for the level payment, `i` for the rate a year × months per period ÷ 12, and `n` for the number of periods. Before payment `r`:

```text
interest(r)     = outstanding(r) × i
principal(r)    = A − interest(r)
outstanding(r+1) = outstanding(r) − principal(r)
A               = P × i / (1 − (1 + i)^−n)
```

With Barclays' terms, $13,900 × 0.299359% / (1 − 1.00299359^−180) is $100.00 to the cent. A short first period, as in the Novanta note, gives a different first payment. Its schedule can't be derived from this formula alone.

Amounts are not rounded; only what is shown is. The Barclays table agrees to the cent with an unrounded schedule: its last four rows are $397.02, $298.21, $199.11 and $99.70 outstanding, as an unrounded schedule gives. A schedule rounded to the cent on each row drifts to $396.95 by then. The last review repays what is outstanding, which differs from the level payment only by floating point.

### Synthetic worked example

A note of 1,000 at 6% a year, quarterly over 12 months, so `i` is 1.5% and the level payment is 259.44 (259.4448).

| Quarter | Outstanding before | Interest | Principal | Paid | Outstanding after |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 1,000.00 | 15.00 | 244.44 | 259.44 | 755.56 |
| 2 | 755.56 | 11.33 | 248.11 | 259.44 | 507.44 |
| 3 | 507.44 | 7.61 | 251.83 | 259.44 | 255.61 |
| 4 | 255.61 | 3.83 | 255.61 | 259.44 | 0.00 |

The holder receives 1,037.78: 1,000.00 of principal and 37.78 of interest, 6.14% a year, the coupon rate compounded quarterly. A bullet note with a 6% fixed coupon pays 60.00 of interest over the same year, because the whole principal stays outstanding.

## Decisions agreed

1. **Option 1, then option 3.** Amortization was first recorded and not modelled, since a plain amortizing note is not a structured product. On 19 November 2026 option 3 was agreed instead: the plain amortizing note is built, under early redemption, as the only mechanism of its redemption.
2. **No call beside it in the first pass.** Whether a call amount after some instalments is a fraction of the original or the outstanding principal is unsourced.
3. **A fixed coupon is required, on the same schedule**, with no payoff feature, on a note, paid in cash. Ticking Amortizing adds a fixed coupon when the product has none.
4. **No payoff chart.** The chart would be a flat line, so the panel says why there is none, and the calculation and the payments table show the instalments, with what was outstanding before each.
5. **A sample of the last 120 payments.** The Barclays note's 180-month term is beyond the reference's limit of 120 months, so the Level-pay amortizing note sample starts from the $10,068.58 it has outstanding after 60 payments. At the same rate that pays $100.00 a month for 120 months, and its last rows are the filing's. Its whole schedule is also reproduced in a test. A synthetic example is published with the schema.
6. **An Amortizing note chip, and no category.** The name is market usage, from the titles of both notes read. It reads no underlier, so the Swiss taxonomy does not place it.

## Decisions left open

1. **A unit of two products (option 2).** The rules ask for composition over a universal object, which suits a unit, but nothing in the reference holds two products today.

## Open questions

1. **A call beside amortization.** No document read states what a call pays after some instalments. Barclays' own redemption terms are not in its pricing supplement or the documents it points to, which give only a template and a tax redemption at "100% of the principal amount". The outstanding principal plus accrued interest is the natural reading, and matches Novanta's repurchase at the outstanding principal plus accrued interest, but it is not stated for a call.
2. **Rounding of the last payment.** Barclays' last payment is exactly $100.00. Whether issuers adjust the last payment, or choose the rate so that no adjustment is needed, is not stated.
3. **Equal principal instalments**, a fixed share of principal each period with interest on top, so the total falls. This is common in loans, but no note read uses it.

## Questions closed

1. **A short first period**, as in Novanta's first instalment of $0.7132. Closed on 20 November 2026 and not modelled here. It is a property of the schedule, not of amortization: a fixed coupon has the same short first payment. It belongs with broken periods ([coupon.md](coupon.md), open questions), and would apply to every feature on the schedule at once. Barclays' first period is regular. An interest-only start followed by level instalments, the counterpart of a non-call period, is a different structure, and no note read has one.
2. **Amortization before an equity payoff at maturity.** Closed on 20 November 2026 and not modelled. A level payment reduces the principal to zero, so nothing is left for a payoff to apply to. The only form read that ties amortization to a share, the Tangible Equity Unit, holds the share exposure in a separate purchase contract beside the note. Combining them would need a principal left outstanding at maturity, and no public note read has one.
