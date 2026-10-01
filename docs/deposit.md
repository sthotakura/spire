# Market-linked deposit

This increment adds a deposit as a second wrapper and a minimum return as a payoff feature, so that a market-linked deposit can be built: a deposit that repays principal in full at the end of its term, plus a return linked to an underlier. The work is section 21 of [PLAN.md](../PLAN.md).

A fixed deposit, which pays a fixed rate and observes nothing, is not modelled. It has no underlier and no embedded option, so it is not a structured product, and modelling it would have made the underlier optional for that one case. The fixed coupon proposed for it waits for a structured product that pays one ([coupon.md](coupon.md)).

## Established concepts

- **A deposit is money held by a bank**, which owes it back to the depositor. FINRA describes certificates of deposit as holding a deposit "for a fixed term", after which the holder can "cash in your CD for the principal plus the interest you've earned" ([FINRA, Bank Products](https://www.finra.org/investors/investing/investment-products/bank-products)). A note is a debt security of its issuer; a deposit is not a security, and is usually covered by a deposit insurance scheme up to a limit that depends on the country.
- **A structured deposit is repaid in full.** EU law defines one as a deposit "which is fully repayable at maturity on terms under which interest or a premium will be paid or is at risk, according to a formula" involving an index, a financial instrument, a commodity or an exchange rate (MiFID II, Article 4(1)(43), [ESMA single rulebook](https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/mifid-ii/article-4-definitions); the UK keeps the same wording, [FCA Handbook](https://handbook.fca.org.uk/glossary/G1139)). Only the return depends on the formula; the principal does not.
- **US market-linked CDs** are "time deposit obligations of Morgan Stanley Bank, N.A. that pay no interest and pay at maturity a cash payment of $1,000 for each CD, insured by the Federal Deposit Insurance Corporation (the "FDIC") up to the applicable limits, plus a supplemental amount" ([basket CD summary](https://www.morganstanley.com/structuredinvestments/docs/summarysheets/61765QBM0_Summary_Sheet_Only.pdf)). The three public examples below are all of this form.

| | Basket CD ([summary](https://www.morganstanley.com/structuredinvestments/docs/summarysheets/61765QBM0_Summary_Sheet_Only.pdf)) | Trend index CD ([disclosure supplement](https://www.morganstanley.com/structuredinvestments/docs/prospectus/prelim/ProspectusRed61773TAM5.pdf)) | Capped CD ([summary](https://www.morganstanley.com/structuredinvestments/docs/summarysheets/61773TBB8_Summary_Sheet_Only.pdf)) |
| :--- | :--- | :--- | :--- |
| Term | 7 years | 5 years | 5 years |
| Underlier | Three equity indices, each weighted 33.3333%; the initial basket value is 100 | One index | One index |
| Final level | "The arithmetic average of the basket closing values on each of the 28 averaging dates", quarterly | The final index value on the final observation date | The final index value on the final observation date |
| Participation | 100% | 265% to 280%, set on the pricing date | 100% |
| Maximum | "Maximum supplemental amount: None" | "Maximum supplemental amount: None" | "Maximum payment amount: 130% to 135% of the deposit amount" |
| Minimum | A "minimum supplemental amount" of $47.50 to $57.50 per $1,000 | None: on a fall "the supplemental amount will be zero" | None: a fall returns 0.00% |
| Early withdrawal | "At par, only upon death or adjudication of incompetence" | The same | The same |

- **The minimum is a floor, not an addition.** In the basket CD, "the supplemental amount will equal the greater of (i) the product of (a) $1,000, (b) the average basket percent change and (c) the participation rate and (ii) the minimum supplemental amount". Its table, with a $52.50 minimum, pays $1,052.50 for every average change from −70% to +5.25%, and $1,070.00 at +7%. The minimum applies to the supplemental amount, on top of the $1,000 deposit amount; none of the three documents states principal protection as a term.
- **A minimum is the exception.** The basket CD is the only public document with a minimum that was verified. A secondary source says "Some products include a small fixed interest amount, though many only protect the return of principal with no minimum return" ([Raisin](https://www.raisin.com/en-us/investing/market-linked-cds/)). A search excerpt described a CD paying "the larger of" its indexed interest and a minimum of 2% over the term, but its source could not be retrieved, so it is not relied on.
- **The issuer states an annual yield.** The same table gives an "annual percentage yield" for each payment: $1,052.50 after 7 years is 0.73% a year, and $1,700.00 is 7.88%.
- **The deposit is designed to be held for its whole term.** The capped CD's risks include "No right to withdraw your funds prior to the stated maturity date of the CDs except upon your death or adjudication of incompetence".

## Proposal

### The deposit wrapper

`wrapper` becomes `'note' | 'deposit'`. A deposit is repaid in full, so the payment at the end of the term can never be less than principal:

- **No downside participation**, and so no buffer or barrier, which belong to it. Downside participation is the only feature that pays less than principal.
- **No principal protection term.** Full repayment is part of the wrapper, not a payoff choice. A protection floor would either repeat the wrapper (100%) or contradict it (below 100%).
- **The underlier is required**, as for a note. Every product modelled has one.

### The minimum return

A new payoff feature: the lowest return the product pays on principal, whatever the underlier does.

```json
{
  "wrapper": "deposit",
  "redemption": "bullet",
  "term": { "months": 84 },
  "underlier": { "kind": "basket", … },
  "payoff": {
    "participations": [{ "direction": "upside", "rate": 1 }],
    "minimumReturn": 0.0525
  },
  "principalAmount": 1000
}
```

```text
uncapped payment  = principal × (1 + upside rate × return), or principal on a fall
capped payment    = the lesser of that and principal × (1 + cap), when there is a cap
payment           = the greater of that and principal × (1 + minimum return)
```

- **A floor on the whole payment**, applied where the protection floor is applied now: after participation and the cap. With no participation at all, the deposit pays principal plus the minimum.
- **Stated as a return on principal**, as the cap is, not as a payment amount. The basket CD's $52.50 per $1,000 is a minimum return of 5.25%.
- **Allowed values.** Greater than 0%. With a cap, less than the cap, since a minimum at or above the cap would fix the payment.
- **Deposits only, for now.** No note with a minimum return has been verified.

### Annualised return

The term turns a return over the whole term into a return a year: `(payment ÷ principal)^(12 ÷ term months) − 1`, compounded once a year. The calculation shows it as one derived line, such as "5.25% over 7 years is 0.73% a year", matching the basket CD's table. It is derived, not a term of the product. It applies to notes as well, since every product has a term.

### Renaming `Note` to `Product`

The domain type `Note` describes a deposit as well, so it is renamed `Product`, as section 17 of the plan renamed `ProtectedParticipationNote`. No payment changes.

## Interface

- **Wrapper.** Deposit becomes available in the Wrapper dropdown. Its hint: money held by a bank and repaid in full at the end of the term, usually covered by deposit insurance up to a limit; any payment above that limit depends on the bank's ability to pay. While the product has downside participation or principal protection, Deposit is marked unavailable with a short reason ("Not with downside participation", "Not with principal protection"), as Barrier is marked "Not with a buffer". Switching never removes terms the reader set.
- **Add feature.** On a deposit, Downside participation, Buffer, Barrier and Principal protection are marked "Not on a deposit". Minimum return is marked "Deposits only" on a note.
- **Chart.** The minimum return draws a floor line with a vertical handle, as protection does, in indigo (#4338ca). It passes the dataviz palette checks against the upside and cap colours it shares a chart with. It is close to protection's blue, which it never appears beside, since protection is not allowed on a deposit; both are floors. Its label sits above its line and the principal's below, since the two lines are close, and the handle sits past the label.
- **Wording.** Copy that says "note" follows the wrapper ("This deposit only repays principal", "the deposit's terms"), and copy that applies to every wrapper says "product". In the calculation, a deposit's downside step says "Not on a deposit, which repays principal in full".
- **Summary.** "A 7-year deposit that redeems at maturity and pays 100% of the upside of an equally weighted basket of …, measured from each asset's initial level to the average of 12 observed levels, with a minimum return of 5.25%."
- **Marketing names.** "Market-linked deposit" for a deposit with participation; it is called a market-linked CD in the US and a structured deposit in the EU and UK. The rule is added to [marketing-names.md](marketing-names.md). "Capped participation" already applies with a cap. "Principal-protected note" does not, since a deposit has no protection term and is not a note.

## Synthetic worked examples

**A capped deposit.** Principal 1,000, a 5-year term, one synthetic index, 100% upside participation, a 30% cap.

| Final level | Return | Payment |
| ---: | ---: | ---: |
| 160 | +60% | 1,300 (the cap) |
| 130 | +30% | 1,300 |
| 110 | +10% | 1,100 |
| 100 | 0% | 1,000 |
| 50 | −50% | 1,000 |

**A deposit with a minimum return.** Principal 1,000, a 7-year term, an equally weighted basket of three synthetic indices, the final level averaged, 100% upside participation, a 5.25% minimum return, no cap.

| Average basket change | Payment | A year |
| ---: | ---: | ---: |
| +70% | 1,700.00 | 7.88% |
| +7% | 1,070.00 | 0.97% |
| +5.25% | 1,052.50 | 0.73% |
| 0% | 1,052.50 | 0.73% |
| −50% | 1,052.50 | 0.73% |

## Decisions

1. **Deposit is a wrapper**, beside note, and full repayment comes from the wrapper rather than a principal protection term.
2. **The underlier stays required.** A fixed deposit is not modelled.
3. **The minimum return is its own feature**, not principal protection above 100%. The two calculate the same payment, but public documents state a minimum return on the deposit, not protection of more than its principal.
4. **Averaging stays at 2 to 12 observations.** The basket CD averages 28 quarterly levels; twelve keep each level settable by hand, so the example above averages 12.
5. **The annualised return is shown, derived from the term.** It is the first payment figure the term changes.
6. **Unavailable choices are marked, not forced.** Choosing Deposit does not silently remove features.

## Assumptions

- Payments above the deposit insurance limit depend on the bank's ability to pay. Insurance and its limits are described in the hint only, since they depend on the country.
- Early withdrawal, allowed only on death or incapacity in the examples, is not modelled. It would be a redemption behaviour beside bullet.
- The annualised return compounds once a year over a term of whole or part years. The issuer's own yield convention may differ.

## Open questions

1. **A comparison with a fixed deposit.** Showing what a fixed rate would have paid beside the market-linked payment would make the trade visible: a certain return given up for a share of the rise. It is a comparison, not a product, and is not planned.
2. **A minimum return on a note.** Not verified. If one is found, the "Deposits only" restriction can be lifted.
3. **Deposits that can lose principal.** Some products sold as deposits, such as dual-currency deposits, can repay less than principal. They fall outside the definition above and are not modelled.
4. **A minimum added rather than a floor.** Raisin's "small fixed interest amount" could be paid in addition to the market-linked return rather than as its floor. No public document showing that was found. If one is, it is a different feature, a fixed return added to the payment ([coupon.md](coupon.md), open question 1), and modelling it as a floor would pay the wrong amount.
5. **Interest or supplemental amount.** The MiFID II definition calls the formula's result interest; US market-linked CDs "pay no interest" and call it a supplemental amount. The model calls it what the payoff features are: participation, a cap and a minimum return.
