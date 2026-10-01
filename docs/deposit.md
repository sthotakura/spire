# Deposit

This is a proposal, not yet built. It adds a deposit as a second wrapper, and lets a product have no underlier, so that a fixed deposit can be built: a deposit with a term and a fixed coupon ([term.md](term.md), [coupon.md](coupon.md)). A market-linked deposit, which adds an underlier and upside participation, follows in a later increment. The work is section 21 of [PLAN.md](../PLAN.md).

## Established concepts

- A **deposit** is money held by a bank, which owes it back to the depositor. FINRA describes certificates of deposit as holding a deposit "for a fixed term", after which the holder can "cash in your CD for the principal plus the interest you've earned" ([FINRA, Bank Products](https://www.finra.org/investors/investing/investment-products/bank-products)).
- **A deposit is not a security.** A note is a debt security of its issuer. Bank deposits are usually covered by a deposit insurance scheme up to a limit. The scheme and its limit depend on the country.
- **A deposit is repaid in full at the end of its term.** EU law defines a structured deposit as a deposit "which is fully repayable at maturity on terms under which interest or a premium will be paid or is at risk, according to a formula" involving an index, a financial instrument, a commodity or an exchange rate (MiFID II, Article 4(1)(43), [ESMA single rulebook](https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/mifid-ii/article-4-definitions); the UK keeps the same wording, [FCA Handbook](https://handbook.fca.org.uk/glossary/G1139)). Only the interest depends on the formula; the principal does not.
- **Early withdrawal** is usually allowed with a penalty, "typically forfeiting some of the interest you've earned" ([FINRA, Bank Products](https://www.finra.org/investors/investing/investment-products/bank-products)).
- **Market-linked deposits.** Banks also sell market-linked CDs, whose interest depends on an underlier while principal is repaid at the end of the term. A public source for their terms is still to be read before they are modelled (open question 1).

## Proposal

### The deposit wrapper

`wrapper` becomes `'deposit' | 'note'`. Because a deposit is repaid in full, the payment at the end of the term can never be less than principal. In the model:

- **A deposit may not have downside participation**, and so no buffer or barrier, which belong to it. Downside participation is the only feature that pays less than principal.
- **A deposit has no principal protection term.** Full repayment is part of the wrapper, not a payoff choice, so the Principal protection feature is unavailable on a deposit. A protection floor on a deposit would either repeat the wrapper (100%) or contradict it (below 100%).

### An optional underlier

A fixed deposit observes nothing. `underlier` becomes optional. A product without one may not have upside or downside participation, a buffer, a barrier or a cap, since each reads the underlier's return. With no payoff features, the payoff repays principal, as the empty payoff does today.

A fixed deposit:

```json
{
  "wrapper": "deposit",
  "redemption": "bullet",
  "term": { "months": 12 },
  "payoff": { "participations": [] },
  "coupon": { "rate": 0.045, "frequency": "quarterly" },
  "principalAmount": 10000
}
```

The payoff stays in the JSON although it has no features, because it still says what the end of the term pays: principal.

### Why there is no cash underlier

A fixed deposit could be written with a "cash" asset whose level never moves, so that every product has an underlier. That would suggest the deposit depends on a level when it does not, plot payments against a level that cannot change, and still need the same rules against participation. Leaving the underlier out is the more accurate model.

Cash can still be an underlier: when an equity underlier is taken private for cash during a product's term, the product may go on to reference the cash. That case is recorded in [underlier-model.md](underlier-model.md). It does not apply to a fixed deposit, which never observed anything.

### Renaming `Note` to `Product`

The domain type `Note` describes a deposit as well, so it is renamed `Product`, as section 17 of the plan renamed `ProtectedParticipationNote`. No payment changes.

## Interface

- **Wrapper.** Deposit becomes available in the Wrapper dropdown. Its description: "Money held by a bank and repaid in full at the end of the term, usually covered by deposit insurance up to a limit." While the product has downside participation or principal protection, Deposit is marked unavailable with a short reason ("Not with downside participation" or "Not with principal protection"), as Barrier is marked "Not with a buffer". Switching does not remove terms the reader set.
- **Underlier.** The Underlier dropdown offers None beside Single and Basket. While the product has participation, None is marked unavailable ("Not with participation").
- **Without an underlier**, the page hides the payoff chart, the scenario table and the final-level handle, which all plot against the underlier level. It shows the summary, the payment rule, the worked calculation with the cash-flow table ([coupon.md](coupon.md)), and the Structure JSON.
- **Summary.** "A 12-month deposit that repays principal in full and pays 4.5% a year in quarterly coupons."
- **Outcome sentence.** "The deposit pays 4 coupons of 112.50 and repays 10,000 at the end of the term, 10,450 in all."
- **Marketing names.** "Fixed deposit", also called a term deposit or, in the US, a certificate of deposit, for a deposit with a coupon and no underlier. The rule is added to [marketing-names.md](marketing-names.md) with its source.

## Synthetic worked example

A deposit of 10,000 for 12 months at 4.5% a year, paid quarterly, with no underlier.

| Coupon | Paid |
| :--- | ---: |
| 1 of 4 | 112.50 |
| 2 of 4 | 112.50 |
| 3 of 4 | 112.50 |
| 4 of 4, with principal | 10,112.50 |
| **Total** | **10,450.00** |

The payments are known in advance, so there is no scenario: every final level would pay the same.

## Decisions

1. **Deposit is a wrapper**, beside note.
2. **Full repayment comes from the wrapper**, not from a principal protection term.
3. **The underlier is optional.** A fixed deposit has none, rather than a cash placeholder.
4. **Unavailable choices are marked, not forced.** Choosing Deposit or no underlier does not silently remove features; the choice is unavailable until they are removed.

## Assumptions

- Payments depend on the bank's ability to pay. Deposit insurance and its limits are described in the hint only, since they depend on the country.
- Early withdrawal is not modelled. It would be a redemption behaviour (the holder may redeem early, with a penalty) beside bullet.

## Open questions

1. **Market-linked deposits.** A deposit with an underlier and upside participation, often with a cap and averaging. Most of it exists. Open: whether a minimum return is a protection floor above 100% or a fixed return added to participation, and which public examples to follow.
2. **Deposits that can lose principal.** Some products sold as deposits, such as dual-currency deposits, can repay less than principal. They fall outside the definition above and are not modelled.
3. **Interest under the formula.** The MiFID II definition puts interest "at risk" under the formula, not principal. For a market-linked deposit this is the same as upside participation with a floor at principal, but whether the model should name it interest is open.
