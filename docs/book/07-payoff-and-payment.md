# Payoff and payment

A payoff is a set of rules. A payment is the amount those rules produce for
particular observations. Changing a hypothetical final level changes the
payment, while leaving the product's terms in place.

## From observations to an amount

In this book's maturity examples, the calculation follows this sequence:

- Determine the initial and final levels, and then the underlier return.
- On a rise, apply upside participation and any upside cap.
- On a fall, apply the downside rule, including any buffer, barrier, or
  absolute-return feature.
- Add the resulting contribution to principal.
- Apply the contractual payment floor.

The applicable direction is chosen from the measured return. Upside and
downside participation do not both apply to the same nonzero return.

## Example

A synthetic note has principal of 1,000, 150% upside participation, a 20%
upside cap, and 90% principal protection. Its underlier rises 30%.

```text
Upside contribution = 150% × 30% = 45%, limited to 20%
Payment before the floor = 1,000 × (1 + 20%) = 1,200
Floor = 1,000 × 90% = 900
Payment = the greater of 1,200 and 900 = 1,200
```

## Empty payoff

In SPIRe's synthetic starting example, no participation and no other payment
feature means repayment of principal. That is an explicit example rule, not
a claim that every financial product with unspecified terms repays principal.

The calculated amount is due under the assumed terms. Market value before
maturity and issuer payment capacity are separate questions.
