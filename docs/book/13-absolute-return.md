# Absolute return

In the dual-directional payoff used here, absolute return pays a limited fall
as a positive contribution. Its name does not mean a positive return is
assured. Once the fall leaves the permitted range, the gain disappears and
the downside loss rule applies. A last section covers a different note, which
pays the absolute value of a rise as well as a fall.

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

These are synthetic applications of stated payoff rules. The two forms come
from two Morgan Stanley preliminary pricing supplements dated October 1, 2026:

- The buffer case follows [Dual Directional Buffered Participation Securities, No. 19,026](https://www.morganstanley.com/structuredinvestments/docs/prospectus/prelim/ProspectusRed61781LXR6.pdf),
  on a single index, with a 15% buffer and a 100% absolute-return rate.
- The barrier case follows [Dual Directional Trigger PLUS, No. 18,961](https://www.morganstanley.com/structuredinvestments/docs/prospectus/prelim/ProspectusRed61781LUU2.pdf),
  on the worst performing of two indices, with a threshold at 70% of the
  initial level, read on the final date, and a 50% absolute-return rate.

## In both directions, until a barrier

Some public notes pay the absolute value of the underlier's return on a rise
as well as a fall, so a 10% fall pays like a 10% rise. They put a barrier on
each side and observe both on every close. As long as no close has gone beyond
either barrier, the note pays principal plus the absolute return. Once one has,
the absolute return ends on both sides and the note pays a fixed return
instead, whatever the final level. These notes are titled "Barrier Absolute
Return" in their pricing supplements. Five were read for this reference, all on
the S&P 500:

- JPMorgan Financial, 2018, [SEC 424B2 pricing supplement](https://www.sec.gov/Archives/edgar/data/19617/000161577418007603/s111907_424b2.htm):
  barriers 23.75% below and above the initial level; a 2% conditional return.
- GS Finance (Goldman Sachs), 2023, [SEC 424B2 pricing supplement](https://www.sec.gov/Archives/edgar/data/886982/000095017023028955/spxab130_final.htm):
  barriers 20% below and 25.7% above; a 5% minimum return.
- GS Finance (Goldman Sachs), 2023, [SEC 424B2 pricing supplement](https://www.sec.gov/Archives/edgar/data/886982/000156459023001901/gs-424b2.htm):
  barriers 20% below and 27.55% above; a fixed $1,050 on a $1,000 note.
- Barclays Bank PLC, 2025, [SEC 424B2 pricing supplement](https://www.sec.gov/Archives/edgar/data/312070/000095010325010558/dp233273_424b2-7706ubs.htm):
  barriers at 84% and 116% of the initial level; principal only after a barrier.
- HSBC USA, 2024, [SEC free writing prospectus](https://www.sec.gov/Archives/edgar/data/83246/000110465924077685/tm2418635d56_fwp.pdf):
  barriers at least 19% below and above, set on the trade date; a 2% conditional return.

They agree on the event: a close above the upper barrier or below the lower
barrier on any trading day, each tested strictly. They differ in the fixed
amount and in the barrier levels, which are asymmetric in the Goldman Sachs
notes. Each barrier is a term of its own, with its own level and its own
observation.

Assume principal of 1,000, initial level of 100, a 100% absolute-return rate, a
lower barrier at 80% and an upper barrier at 125%, both observed on every close,
and a 2% conditional return.

```text
Final level 100, no close beyond a barrier: |0%| = 0%; payment = 1,000
Final level 90: |−10%| = 10%; payment = 1,100
Final level 110: |+10%| = 10%; payment = 1,100
Final level 80, lowest close 80: at the barrier, not below it; 20%; payment = 1,200
Final level 125, highest close 125: at the barrier, not above it; 25%; payment = 1,250
Final level 79: below the lower barrier; payment = 1,000 × (1 + 2%) = 1,020
Final level 126: above the upper barrier; payment = 1,020
Final level 100 after a close at 79: reached earlier; payment = 1,020
Final level 110 after a close at 130: reached earlier; payment = 1,020
```

The largest payment with no barrier reached is 1,250, at the upper barrier: it
is the larger of the two distances from the initial level. A note that ends
flat inside the barriers pays 1,000, and one that ends flat after a close beyond
a barrier pays 1,020, so reaching a barrier can pay more than ending flat. The
public notes with a 2% conditional return work this way. Observed on the final
date instead, the last two examples pay 1,000 and 1,100, since only the final
level is read. With no conditional return, a barrier leaves only principal.

Assumptions and limits: only closing levels count; the lowest and highest close
are hypothetical scenario inputs, not terms of the product; this payoff cannot
be combined with participation, a buffer, a cap, a minimum return, lookback, a
basket or averaging. It never pays less than principal, so a protection floor
changes nothing. The fixed amount is not a coupon and not a downside rule, and
no note was found that loses principal after a barrier. The quotes behind the
JPMorgan, Goldman Sachs and Barclays rows were read through a summarising tool
and are worth checking in the filings.
