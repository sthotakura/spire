# Determination methods

Determination specifies how the initial and final levels are obtained. Those
levels produce the return that the payoff uses:

```text
Return = determined final level ÷ determined initial level − 1
```

## Point-to-point

The pricing date is the date on which the starting level is set. With a fixed
initial level and a level on one final observation date, the measurement is
point-to-point. Starting at 100 and ending at 110 gives +10%.
Intermediate rises and falls do not enter this measurement.

## Averaging the final level

Averaging out uses the arithmetic mean of levels observed on specified dates.
For synthetic observations of 100, 100, 100, 100, and 150:

```text
Final level = (100 + 100 + 100 + 100 + 150) ÷ 5 = 110
Return from an initial level of 100 = +10%
```

Using only the last observation would give +50%. Averaging can dilute a late
rise or soften a late fall; it does not always improve the holder's payment.
Each observation has equal weight in this example.

## Lookback on the initial level

The lookback form used here takes the lowest level on the pricing date and
several observations after it. With levels of 100, 97, 92, and 95, the
determined initial level is 92. A final level of 110 gives:

```text
110 ÷ 92 − 1 ≈ 19.57%
```

All payoff thresholds measured from the initial level use 92 too. The lowest
level observed over a stated period is the relevant concept; the count of
observations is only the simplified way this example expresses that period.

## Combining the methods

The initial and final ends are separate choices. A single underlier can use
lookback at the start and averaging at the end. A basket in SPIRe
uses fixed initial levels and can average each component's final levels before
combining their returns: weighted, or the lowest (worst-of) or highest
(best-of) of them. Basket lookback is not assigned a rule here.

## Public example

A [lookback pricing supplement](https://www.sec.gov/Archives/edgar/data/19617/000121390026052623/ea0289438-01_424b2.htm)
defines the starting level from observations over a specified lookback period.
The builder's [Lookback barrier note](https://sthotakura.github.io/spire/?example=lookback-barrier-note) is modelled on a
public note of this kind: it starts from the lowest of the levels on the pricing
date and six dates after it, pays 170% of a rise, and has a downside barrier at
70% of that lowest level, read on the final date. The public note reads every
close for about six weeks; six dates stand in for that period.
