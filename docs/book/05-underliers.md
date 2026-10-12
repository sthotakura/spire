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

## Worst-of and best-of

Some notes read one asset's return and ignore the rest. A worst-of note uses
the return of the asset that performs worst, so a fall in any one asset counts
in full, even when the others rise. Nothing is weighted. A best-of rule is the
mirror: it uses the return of the asset that performs best.

Take Synthetic Index A, starting at 100 and ending at 130, and Synthetic
Index B, starting at 50 and ending at 40.

```text
A return = 130 ÷ 100 − 1 = +30%
B return = 40 ÷ 50 − 1 = −20%
Worst-of return = lowest of +30% and −20% = −20%
Worst-of basket level = 100 × (1 − 20%) = 80
Best-of return = highest of +30% and −20% = +30%
Best-of basket level = 100 × (1 + 30%) = 130
```

The payoff then reads the basket level as it reads a single asset's level, so
a barrier or buffer on it works unchanged. A downside barrier at 70% of the
basket level is reached by a worst-of basket exactly when some asset ends below
70% of its own initial level, which is how term sheets state it.

Averaging each asset first and then comparing returns is not the same as
comparing on each date and averaging. With both assets starting at 100, if A
is 80 then 140 and B is 120 then 100, each averages 110, so the worst-of return
is +10%. The worst asset on each date is 80 then 100, which averages −10%. This
reference averages each asset first.

The worst-of rule is public: pricing supplements call the result the "lesser
performing" or "worst performing" asset's return. No public note linked to the
single best performing asset was verified, so best-of is shown as the mirror
rule, not as a description of a public product.

## Assumptions

These examples keep weights fixed and use assets in the same currency.
Currency conversion and rebalancing are not included. A barrier observed on
every close needs each asset's own closes, which this reference does not
calculate for a basket.

## Public example

A [basket-linked note filing](https://www.sec.gov/Archives/edgar/data/96223/000114036126007335/ef20066780_424b2.htm)
illustrates the initial basket level of 100 and weighted component returns.
A [pricing supplement for a note linked to two funds](https://www.sec.gov/Archives/edgar/data/19617/000121390026108339/ea0308243-01_424b2.htm)
defines the "Lesser Performing Fund Return" as the lower of the two fund returns.
