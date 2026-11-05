# Participation

Participation states how much of the measured underlier return contributes to
the product's return. Upside and downside rates are separate terms.

## Upside participation

With principal of 1,000 and an underlier rise of 10%, 150% upside
participation produces a 15% contribution:

```text
150% × 10% = 15%
Payment = 1,000 × (1 + 15%) = 1,150
```

At 50% participation, the same rise produces a payment of 1,050. The rate
changes the slope of the payoff. It does not set a maximum gain; a cap does
that.

![Payoff with 150% upside and 100% downside participation, at a final level of 110](charts/participation.svg)

## Downside participation

At a 100% downside rate, a 20% fall reduces principal by 20%, giving 800
before any floor. At a 150% downside rate, it reduces principal by 30%, giving
700. A buffer or barrier can change which fall that rate applies to.

## Where a rise is measured from

A rise is measured from the initial level. Beside a digital return it can instead
be measured from the digital return, so the rate applies only to the rise beyond
that level. The [Barrier chapter](12-barrier.md) compares the two.

## Taking the whole move both ways

A note with 100% upside and 100% downside participation, and no cap, buffer,
barrier or floor, pays in step with its underlier: a rise of 20% pays 1,200 on
principal of 1,000, and a fall of 20% pays 800. Such a note is sold under names
such as delta one, after delta, the change in an instrument's value for each unit
change in its underlier. The holder can lose all of the principal. Public notes of
this kind often state an [adjustment factor](03-redemption.md#adjustment-factor) as well.

[Open a delta one note in the builder](https://sthotakura.github.io/spire/?example=delta-one-note).

## Separate choices

In the synthetic model, upside only means a fall leaves principal unchanged.
Downside only means a rise leaves principal unchanged. Selecting both uses each
rate in its own direction. A flat return pays principal unless another feature,
such as the minimum return a deposit can have (see the [Market-linked deposits
chapter](14-market-linked-deposits.md)), raises the payment.

## Assumptions

These examples have no cap, buffer, barrier, or protection floor. SPIRe floors
an unprotected note's payment at zero, even when a high downside rate would
otherwise calculate a negative amount. This is a rule of the learning model;
the holder does not owe an additional payment in these examples.
