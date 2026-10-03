# Underliers

The underlier is the reference whose performance the payoff reads. An asset
kind answers what is tracked, such as an equity or equity index. A single
underlier or basket answers how the reference is composed.

## A single underlier

A note linked to Synthetic Index tracks one reference. With an initial level
of 100 and final level of 110, its measured return is:

```text
110 ÷ 100 − 1 = 10%
```

Owning the note does not mean owning the index or its constituents. The note's
payment follows its own contractual rules.

## A weighted basket

A weighted basket combines component returns, each measured from its own
initial level. Suppose Synthetic Index A starts at 100 and ends at 130,
while Synthetic Equity B starts at 40 and ends at 36. Each has a 50% weight.

```text
A return = 130 ÷ 100 − 1 = +30%
B return = 36 ÷ 40 − 1 = −10%
Basket return = 50% × 30% + 50% × (−10%) = +10%
Basket final level = 100 × (1 + 10%) = 110
```

Raw levels of 130 and 36 are not directly averaged. Their units and starting
points differ; their returns make them comparable. The basket's starting
level of 100 is a normalisation, not a price paid to buy its assets.

## Assumptions

These examples keep weights fixed and use assets in the same currency.
Currency conversion and rebalancing are not included. A worst-of rule would
choose the poorest component return instead of weighting all returns; it is
a different determination rule and is not calculated in this reference.

## Public example

A [basket-linked note filing](https://www.sec.gov/Archives/edgar/data/96223/000114036126007335/ef20066780_424b2.htm)
illustrates the initial basket level of 100 and weighted component returns.
