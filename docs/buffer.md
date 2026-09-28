# Buffer

This increment adds an optional buffer to the payoff of the synthetic bullet note. It does not introduce barriers, coupons, a separate buffer rate, early redemption, or pricing.

## Established concepts

- A **buffer** absorbs the first part of a fall in the underlier. FINRA describes it as "hard protection": if the buffer level is breached, "an investor's potential principal loss is restricted to the extent of losses in excess of the buffer". Its example: with a 10% buffer, a 5% fall repays full principal and a 50% fall loses 40% ([FINRA, Understanding Structured Notes With Principal Protection](https://www.finra.org/investors/insights/structured-notes-principal-protection)).
- A **barrier** is different. FINRA calls it "soft protection": once the barrier is breached, principal becomes fully at risk, so the same 50% fall loses 50%. Barriers are modelled separately ([barrier.md](barrier.md)).
- A **protection floor** limits how much can be lost. A buffer limits which losses count. They protect opposite ends of the loss range:

| | Small falls | Large falls |
| :--- | :--- | :--- |
| 90% protection floor | The holder bears them, down to 10% | Protected: the payment never goes below 90% |
| 10% buffer | Absorbed: principal is repaid | The holder bears everything beyond the first 10% |

A way to remember it: the floor works like insurance with a deductible, where you pay the first losses and are covered beyond them. The buffer is the reverse: the first losses are covered and the rest is yours.

## The model

The buffer is a fraction of the initial level, greater than 0% and at most 100%. It shifts where downside participation starts:

```text
underlier return = final level / initial level - 1

participated return =
  upside rate × return,                        when the return is positive and upside is selected
  downside rate × min(return + buffer, 0),     when the return is negative and downside is selected
  0,                                           when the applicable direction is not selected

uncapped payment  = principal × (1 + participated return)
unfloored payment = min(principal × (1 + cap), uncapped payment)
maturity payment  = max(principal × protection, unfloored payment)
```

Without a buffer, `buffer` is zero and the formula is the one in [participation-and-protection.md](participation-and-protection.md).

## Decisions

- **Loss rate beyond the buffer.** The loss beyond the buffer uses the existing downside participation rate. Some public term sheets instead apply a separate "buffer rate" of 1 / (1 − buffer), so that a fall to zero still loses all of the principal. With the downside rate at 100%, the holder keeps the buffer amount even if the underlier falls to zero (100 on a 1,000 note with a 10% buffer). A separate buffer rate is not modelled.
- **A buffer without downside participation.** Without downside participation a fall never reduces principal, so the buffer has nothing to absorb. *(Superseded by section 15 of [PLAN.md](../PLAN.md): the buffer is now part of downside participation, so a buffer without it cannot be written.)*
- **A buffer with a protection floor.** Both are allowed together. The model composes them without a special rule: the holder bears only the losses between the buffer and the floor. With a 10% buffer and a 90% floor, a 15% fall pays 950 and any fall past 20% pays 900. This combination is uncommon in public investor material, and no generic name for it was found, so it shows both names that apply. At 100% protection the buffer has no effect, just as downside participation has none.
- **Order of application.** The buffer acts on the return, before participation, so it comes first in the outline, the summary sentence and the worked calculation.

## Synthetic worked example

Assume a principal amount of 1,000, an initial level of 100, a 10% buffer, 100% downside participation and 100% upside participation.

| Final level | Underlier change | Buffer absorbs | Downside participation | Payment | With a 90% floor |
| ---: | ---: | ---: | :--- | ---: | ---: |
| 0 | -100% | 10% | 100% × (-100% + 10%) = -90% | 100 | 900 |
| 50 | -50% | 10% | 100% × (-50% + 10%) = -40% | 600 | 900 |
| 80 | -20% | 10% | 100% × (-20% + 10%) = -10% | 900 | 900 |
| 85 | -15% | 10% | 100% × (-15% + 10%) = -5% | 950 | 950 |
| 95 | -5% | 5% | 0% | 1,000 | 1,000 |
| 110 | 10% | — | — | 1,100 | 1,100 |

The 50 row is FINRA's example: a 50% fall with a 10% buffer loses 40%.

## Assumptions and limits

- The buffer is measured on the underlier's return from the initial level, point to point at maturity. Moves in between do not count.
- Buffer and downside participation are separate terms. Neither changes the other's value.
- The payoff describes contractual maturity amounts, not present value, investment advice, or guaranteed issuer payment. The protection a buffer gives depends on the issuer's ability to pay.
- Levels and amounts are synthetic.

## Open questions

- Should a separate buffer rate (downside leverage beyond the buffer) become a term of its own?
- Barriers look like a buffer on the chart until they are breached. Should they come next, so the two can be compared on the same note?
