# Barrier

A barrier is a threshold that controls whether another rule applies. This book
names each barrier after the participation it controls. The downside barrier
switches downside participation on when the underlier is observed strictly
below the threshold. An upside barrier switches upside participation off when
the underlier is observed strictly above it. A barrier can be observed on the
final observation date only, or on every close from pricing to that date. The
first sections use the final level; the last section observes every close.

Practitioners call a barrier that switches a feature on a knock-in barrier and
one that switches it off a knock-out barrier. The downside barrier here is a
knock-in barrier, and the upside barrier is a knock-out barrier.

## A final-observation barrier

Assume principal of 1,000, initial level of 100, 100% downside participation,
and a barrier at 70% of the initial level. There is no protection floor or
absolute-return feature.

- Final level 80 is above the barrier: payment is 1,000.
- Final level 70 is exactly at the barrier: payment is 1,000.
- Final level 69 is below it: the whole 31% fall counts and payment is 690.
- Final level 50 gives payment of 500.

Equality matters. This example treats the barrier as breached only below 70.
A small move from 70 to just below 70 produces a large drop in payment.
A [public barrier note](https://www.sec.gov/Archives/edgar/data/19617/000121390026049358/ea0288297-01_424b2.htm)
illustrates the inclusive repayment threshold and whole-fall loss below it.

## Contrast with a buffer

A 30% buffer would pay 990 at final level 69, because only the 1% fall beyond
the buffer counts. The 70% barrier pays 690 because none of the fall is
deducted once breached.

## An upside barrier

A barrier can also end a feature. An upside barrier sits above the initial
level. Upside participation applies while the determined final level is at or
below it. Above it, participation ends and the holder receives a fixed amount
instead: a rebate, stated as a return on principal. A note may have no rebate,
in which case principal is repaid. The rebate is paid once, at maturity. It is
not a coupon, which would be a series of payments over the term.

Assume principal of 1,000, initial level of 100, 80% upside participation, an
upside barrier at 130% of the initial level, a 2% rebate, and 100% principal
protection. There is no downside participation.

```text
Final level 150 (+50%): barrier reached; payment = 1,000 × (1 + 2%) = 1,020
Final level 131 (+31%): barrier reached; payment = 1,020
Final level 130 (+30%): at the barrier, not reached; 1,000 × (1 + 80% × 30%) = 1,240
Final level 129 (+29%): not reached; 1,000 × (1 + 80% × 29%) = 1,232
Final level 120 (+20%): not reached; 1,000 × (1 + 80% × 20%) = 1,160
Final level 100 (0%): not reached; payment = 1,000
Final level 80 (−20%): not reached; no downside participation, so 1,000
```

The largest payment is at the barrier: a final level of 130 pays 1,240. Just
above it the payment drops to 1,020, so a higher final level can pay less.
Without a rebate, the first two rows would pay 1,000.

This example treats a final level exactly at 130 as not reaching the barrier,
as the downside barrier above treats a level exactly at its threshold. One
public note tests its upper barrier the same way, as strictly greater than.
Each product states its own rule, so check the equality in the contract.

Public educational material describes notes with this shape, often called
shark fin notes ([Hubbis](https://www.hubbis.com/article/swimming-with-sharks-capital-protected-structured-solutions-for-uncertain-times);
[my-structured-products.com](https://www.my-structured-products.com/index.php/know-how/capital-guarantee/36-shark-notes)).
Those descriptions observe the barrier on every trading day. This example reads
only the final level, so it describes a different contract; the next section
observes every close.

## Observing a barrier on every close

Many public notes observe a barrier on every trading day, using closing levels,
from the pricing date to the final observation date. The barrier is then
reached if any close crosses it, and it stays reached even if the underlier
later recovers. One daily-monitored note has a knock-in event "if the closing
level of either Index on any eligible trading day during the observation period
is less than its threshold level"
([SEC 424B2](https://www.sec.gov/Archives/edgar/data/72971/000138713119008969/wfcr1924-424b2_112119.htm)).
Another note watches both sides: its event occurs if, on any day in the period,
the closing level "is greater than the Upper Barrier or less than the Lower
Barrier", and the holder then receives a fixed return on principal whatever the
final level
([SEC 424B2](https://www.sec.gov/Archives/edgar/data/19617/000161577418007603/s111907_424b2.htm)).
That note pays the absolute value of the underlier's return on a rise as well
as a fall until the event, which the Absolute return chapter covers.

SPIRe states this as the barrier's observation, `daily-close`. A scenario then
needs one more number than the final level: the lowest close for a downside
barrier, or the highest close for an upside barrier. Whether any close crossed
the threshold is the same as whether that extreme close did, so no list of
daily levels is needed. This reference assumes the initial level is the close
on the pricing date, which is never past either kind of barrier, so the start
of the period changes nothing.

Take the downside barrier above: principal of 1,000, initial level of 100, a
barrier at 70%, 100% downside participation, and no protection. The barrier is
reached only by a close strictly below 70.

```text
Final  Lowest  Barrier   Payment         Payment observed
level  close   reached?  observed daily  on the final date
100    65      yes       1,000           1,000
80     80      no        1,000           1,000
80     65      yes         800           1,000
65     65      yes         650             650
```

The third row is what daily observation adds. The underlier recovered to 80,
but it closed at 65 earlier, so the whole 20% fall counts. Observed on the
final date, the same note pays 1,000. In the first row the barrier was reached
but there is no fall left to count, so nothing is deducted.

Now take the upside barrier above: 80% upside participation, a barrier at 130%,
a 2% rebate, and 100% principal protection. The barrier is reached by any close
above 130.

```text
Final  Highest  Barrier   Payment         Payment observed
level  close    reached?  observed daily  on the final date
120    125      no        1,160           1,160
120    135      yes       1,020           1,160
150    150      yes       1,020           1,020
90     135      yes       1,020           1,000
```

In the second row a single close at 135 ended participation, so the rebate
replaces the 16% gain although the final level is below the barrier. In the
last row the rebate is paid although the underlier fell back below the initial
level. This is the behaviour public descriptions give for a shark fin note: the
rebate is paid once the barrier is reached, whatever the final level.

Both barriers can be observed on every close on one note. Take the downside
barrier at 70% with 100% downside participation, and the upside barrier at 130%
with 80% upside participation, with no rebate and no protection:

```text
Final level 100, no close beyond a barrier: payment = 1,000
Final level 120, highest close 120: 1,000 × (1 + 80% × 20%) = 1,160
Final level 120, highest close 135: the upside ended; payment = 1,000
Final level 90, lowest close 90, highest close 135: upside ended, downside barrier held; payment = 1,000
Final level 90, lowest close 65, highest close 135: upside ended, the whole 10% fall counts; payment = 900
Final level 65, lowest close 65, highest close 135: payment = 650
```

With a 2% rebate, the third and fourth examples pay 1,020, the fifth pays 920 (the
rebate of 2% less the 10% fall), and the sixth pays 670. The two sides do not
cancel or override each other: each is read on its own and the terms are added.

Assumptions and limits of this version:

- Only closing levels count. Intraday levels, and monitoring on other schedules
  such as weekly, are not modelled.
- The lowest and highest close are hypothetical scenario inputs, not terms of
  the product. A close cannot be below the lowest of the initial level and the
  levels the final level is read from, or above the highest of them.
- A daily barrier is available on a single underlier with a fixed initial level.
  It is not combined with lookback or a basket, whose public notes were not
  verified, or with absolute return, which the public trigger note reads on the
  final date.
- A daily upside barrier may be combined with downside participation, and each
  side keeps its own rule. An upside barrier reached on any close ends the upside,
  and pays the rebate if there is one, whatever the final level. The downside
  participation still reads the final return. With a rebate, the note can pay the
  rebate and a downside loss together. No public note with this combination was
  found; it is allowed because each part is defined on its own.
- The test is the same as above: a downside barrier is reached strictly below
  the threshold and an upside barrier strictly above it, as the two-sided note
  above tests its upper barrier. A close exactly at either barrier does not
  reach it. Each contract states its own equality rule.
