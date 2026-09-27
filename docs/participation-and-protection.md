# Participation and protection

This increment separates three economic terms in the synthetic bullet note, and a fourth optional term, the cap, limits the upside. It does not introduce coupons, buffers, barriers, early redemption, or pricing.

## Established concepts

- **Principal protection** is the minimum contractual maturity payment, expressed as a percentage of principal. It remains subject to the issuer's ability to pay.
- **Upside participation**, when selected, determines how much of a positive point-to-point underlier return is added to principal.
- **Downside participation**, when selected, determines how much of a negative point-to-point underlier return is deducted from principal before the protection floor applies.
- Participation is optional. Upside, downside, both, or neither may be selected. A note with neither, and no protection, repays principal.
- Principal protection is also optional. Without it, the contractual floor is zero: a holder cannot lose more than the principal amount.
- A return in an unselected direction does not change principal before the protection floor is applied.
- A flat underlier return produces repayment of principal under this payoff formula.
- A **cap** is the most the note can pay above principal, expressed as a maximum return on principal (for example, 20%). It is optional. It limits the payment, not the underlier level, so a 20% cap on a 1,000 principal note limits the payment to 1,200 however far the underlier rises.
- Participation sets how steeply the payment rises with the underlier. A cap sets where it stops rising. A low participation rate does not cap the upside: it only reduces it. A cap starts to matter once participation is high enough to reach it, which is why it is usually paired with participation above 100%.

The maturity payment is:

```text
underlier return = final level / initial level - 1

participated return =
  selected upside participation × positive return, when upside is selected
  selected downside participation × negative return, when downside is selected
  0, when the applicable direction is not selected

uncapped payment = principal × (1 + participated return)

unfloored payment = min(
  principal × (1 + cap),
  uncapped payment
)

maturity payment = max(
  principal × protection percentage,
  unfloored payment
)
```

When principal protection is not selected, the protection amount in the formula is zero. When no cap is selected, the unfloored payment is the uncapped payment.

The cap is above principal and protection is at most principal, so the order of the two steps cannot change the result.

## Synthetic worked example

Assume a principal amount of 1,000, an initial underlier level of 100, 90% principal protection, 150% upside participation, and 100% downside participation.

| Final level | Underlier change | Upside participation | Downside participation | Payment before protection | Final payment |
| ---: | ---: | :--- | :--- | ---: | ---: |
| 60 | -40% | — | 100% × -40% = -40% | 600 | 900 (floor applied) |
| 90 | -10% | — | 100% × -10% = -10% | 900 | 900 |
| 95 | -5% | — | 100% × -5% = -5% | 950 | 950 |
| 100 | 0% | — | — | 1,000 | 1,000 |
| 110 | 10% | 150% × 10% = 15% | — | 1,150 | 1,150 |

## Synthetic worked example with a cap

The same note with a 20% cap. The cap payment is 1,000 × (1 + 20%) = 1,200.

| Final level | Underlier change | Upside participation | Payment before cap | Cap | Final payment |
| ---: | ---: | :--- | ---: | ---: | ---: |
| 110 | 10% | 150% × 10% = 15% | 1,150 | 1,200 | 1,150 |
| 113.33 | 13.33% | 150% × 13.33% = 20% | 1,200 | 1,200 | 1,200 |
| 130 | 30% | 150% × 30% = 45% | 1,450 | 1,200 | 1,200 (cap applied) |

## Assumptions and limits

- Protection may range from 0% through 100% of principal.
- Absent protection and 0% protection pay the same but describe different structures. Absent means the feature has not been added.
- Each selected participation rate must be greater than zero.
- At 100% protection, downside participation remains a defined term but has no effect on the maturity payment.
- The cap must be greater than zero. It is a return on principal, not an underlier level. The two are equivalent given a participation rate, but the payment is what the note contractually promises.
- Participation above 100% is allowed. There is no upper limit on a typed rate.
- Without upside participation the cap has no effect, in the same way that 100% protection leaves downside participation with no effect. A fall never reaches the cap.
- The cap applies to the payment at maturity only. It does not affect the protection floor.
- The payoff describes contractual maturity amounts, not present value, investment advice, or guaranteed issuer payment.
- Levels and amounts are synthetic.

## Interface decision

Payoff features are added one at a time to a payoff that starts with none. The Add feature list is alphabetical. Once added, features appear in the order the payment applies them: participation, then the cap, then the protection floor. An unavailable feature may appear in that list for learning context, but its presence does not assign it domain behavior.
