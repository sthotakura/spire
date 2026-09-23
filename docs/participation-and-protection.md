# Participation and protection

This increment separates three economic terms in the synthetic bullet note. It does not introduce coupons, buffers, barriers, early redemption, or pricing.

## Established concepts

- **Principal protection** is the minimum contractual maturity payment, expressed as a percentage of principal. It remains subject to the issuer's ability to pay.
- **Upside participation**, when selected, determines how much of a positive point-to-point underlier return is added to principal.
- **Downside participation**, when selected, determines how much of a negative point-to-point underlier return is deducted from principal before the protection floor applies.
- At least one participation direction must be selected. Both may be selected.
- A return in an unselected direction does not change principal before the protection floor is applied.
- A flat underlier return produces repayment of principal under this payoff formula.

The maturity payment is:

```text
underlier return = final level / initial level - 1

participated return =
  selected upside participation × positive return, when upside is selected
  selected downside participation × negative return, when downside is selected
  0, when the applicable direction is not selected

unfloored payment = principal × (1 + participated return)

maturity payment = max(
  principal × protection percentage,
  unfloored payment
)
```

## Synthetic worked example

Assume a principal amount of 1,000 units, an initial underlier level of 100, 90% principal protection, 150% upside participation, and 100% downside participation.

| Final level | Underlier change | Upside participation | Downside participation | Payment before protection | Final payment |
| ---: | ---: | :--- | :--- | ---: | ---: |
| 60 | -40% | — | 100% × -40% = -40% | 600 | 900 (floor applied) |
| 90 | -10% | — | 100% × -10% = -10% | 900 | 900 |
| 95 | -5% | — | 100% × -5% = -5% | 950 | 950 |
| 100 | 0% | — | — | 1,000 | 1,000 |
| 110 | 10% | 150% × 10% = 15% | — | 1,150 | 1,150 |

## Assumptions and limits

- Protection may range from 0% through 100% of principal.
- Each selected participation rate must be greater than zero.
- At 100% protection, downside participation remains a defined term but has no effect on the maturity payment.
- The payoff describes contractual maturity amounts, not present value, investment advice, or guaranteed issuer payment.
- Levels and amounts are synthetic.

## Interface decision

Payoff features are listed alphabetically. An unavailable feature may appear in that list for learning context, but its presence does not assign it domain behavior.
