# Absolute return

In the dual-directional payoff used here, absolute return pays a limited fall
as a positive contribution. Its name does not mean a positive return is
assured. Once the fall leaves the permitted range, the gain disappears and
the downside loss rule applies.

## Within a buffer

Assume principal of 1,000, initial level of 100, a 15% buffer, a 100%
absolute-return rate, and 100% downside participation.

```text
At final level 95: pay the 5% fall as a 5% gain; payment = 1,050
At final level 85: pay the 15% fall as a 15% gain; payment = 1,150
At final level 84.99: gain disappears; buffered loss is 0.01%; payment = 999.90
At final level 50: counted loss is 50% − 15% = 35%; payment = 650
```

The threshold belongs to the gain-paying range. The discontinuity just below
it is essential to the payoff; smoothing the chart would show payments the
terms do not produce.

## Above a barrier

The other form uses a barrier. At or above a 70% barrier, a 50%
absolute-return rate pays half the size of a fall as a gain. At a final level
of 70, payment is 1,150. Below the barrier, the whole fall counts at the
downside rate: at 69.99, payment is 699.90 with 100% downside participation.

## Relationships

The absolute-return rate and downside rate are separate. Upside participation
governs rises. The upside cap limits that contribution only. A protection
floor, if added, still limits the payment after the loss calculation.

These are synthetic applications of stated payoff rules. [A public buffered
dual-directional example](https://www.morganstanley.com/structuredinvestments/docs/prospectus/prelim/ProspectusRed61781LXR6.pdf)
and [a final-observation trigger example](https://www.morganstanley.com/structuredinvestments/docs/prospectus/prelim/ProspectusRed61781LUU2.pdf)
provide the contractual forms behind the two cases.
