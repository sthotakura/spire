# Underliers

The underlier is the reference whose performance the payoff reads. An asset
kind answers what is tracked, such as an equity, an equity index or a strategy
index. A single underlier or basket answers how the reference is composed.

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

## Strategy indices

Not every index tracks a set of shares. A **strategy index** follows published
rules to hold and rebalance exposure to other instruments, and its level is the
result of those rules. The note reads the level and nothing else, so a buffer,
barrier or trigger works on a strategy index exactly as on any index. What the
rules change is how the level moves.

Three rules are common:

- **Excess return.** The index holds futures, not the shares. A futures
  position earns the market's move less the cost of financing it, and no
  dividends, so it tends to rise less than the share index it follows.
- **Volatility target.** The index scales its exposure to aim at a target
  volatility. It sets the exposure from a measure of expected volatility, such
  as the implied volatility of the share index, so when the market is expected
  to be calm it holds more than 100% of the futures, and when it is expected to
  be volatile, less. The target is an aim, not a result: the index's actual
  volatility can be above or below it. The exposure is also reset on a
  schedule, so it lags the market: exposure set in a calm week is still held if
  the market falls sharply the week after.
- **Decrement.** A fixed percentage rate a year, such as 6%, is deducted from
  the index's level, whatever the market does.

A decrement compounds against the holder. Take Synthetic Strategy Index,
starting at 100, on a market that ends a year exactly where it started, with
a decrement of 6% a year:

```text
Level after one year = 100 × (1 − 6%) = 94
Return = 94 ÷ 100 − 1 = −6%
```

Over ten flat years the deduction alone takes the level to 100 × 0.94^10, about
54, if it is taken once a year. Public indices deduct it daily at the yearly
rate, which gives a slightly different figure. A note whose trigger is the starting level then
needs the market to rise just to be called. The reference does not model the
rules: a scenario states the strategy index's level, as it does any other.

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
The builder opens a note modelled on it, on two synthetic indices: the
[Worst-of autocallable contingent coupon note with memory and a buffer](https://sthotakura.github.io/spire/?example=worst-of-autocallable-contingent-coupon-note).

A [pricing supplement for a ten-year autocallable note](https://www.sec.gov/Archives/edgar/data/200245/000191870426031411/form424b2.htm)
is linked to an index of S&P 500 futures that targets a volatility of 35%,
with exposure of up to 500%, reset weekly, and deducts 6% a year. The
supplement says the futures index it is built on "is expected to underperform
the total return performance of the S&P 500® Index", because of the cost of
the financed position, and that "the decrement will be a significant drag on
the performance of the Index". The builder
opens a note modelled on it, on a synthetic strategy index: the
[Long-dated snowball autocallable buffered note](https://sthotakura.github.io/spire/?example=long-dated-snowball-autocallable-buffered-note).
