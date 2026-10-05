# Barrier

A barrier is a threshold that controls whether another rule applies. The
downside barrier in this book switches downside participation on when the
determined final level is strictly below the threshold. An upper barrier
switches upside participation off when the determined final level reaches the
threshold.

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

## An upper barrier

A barrier can also end a feature. An upper barrier sits above the initial
level. Upside participation applies while the determined final level is below
it. At or above it, participation ends and the holder receives a fixed amount
instead: a rebate, stated as a return on principal. A note may have no rebate,
in which case principal is repaid. The rebate is paid once, at maturity. It is
not a coupon, which would be a series of payments over the term.

Assume principal of 1,000, initial level of 100, 80% upside participation, an
upper barrier at 130% of the initial level, a 2% rebate, and 100% principal
protection. There is no downside participation.

```text
Final level 150 (+50%): barrier reached; payment = 1,000 × (1 + 2%) = 1,020
Final level 130 (+30%): at the barrier, reached; payment = 1,020
Final level 129 (+29%): not reached; 1,000 × (1 + 80% × 29%) = 1,232
Final level 120 (+20%): not reached; 1,000 × (1 + 80% × 20%) = 1,160
Final level 100 (0%): not reached; payment = 1,000
Final level 80 (−20%): not reached; no downside participation, so 1,000
```

The largest payment is just below the barrier: a final level of 129.99 pays
1,239.92. At the barrier the payment drops to 1,020, so a higher final level
can pay less. Without a rebate, the first two rows would pay 1,000.

This example treats a final level exactly at 130 as reaching the barrier,
which differs from the downside barrier above, where a level exactly at the
threshold does not breach it. Each product states its own rule, so check the
equality in the contract.

Public educational material describes notes with this shape, often called
shark fin notes ([Hubbis](https://www.hubbis.com/article/swimming-with-sharks-capital-protected-structured-solutions-for-uncertain-times);
[my-structured-products.com](https://www.my-structured-products.com/index.php/know-how/capital-guarantee/36-shark-notes)).
Those descriptions observe the barrier on every trading day, which is not what
this example does.

## Observation matters

These examples test only the determined final level. A daily monitored barrier
can depend on a breach earlier in the product's life even if the final level
recovers. That requires a different observation rule and cannot be inferred
from a final-level chart alone.

For an upper barrier the difference is larger. With daily observation, a
single close at or above the barrier would end participation and earn the
rebate, even if the underlier then fell back below the initial level. The
final-observation version above pays the rebate only when the final level
itself is at or above the barrier, so it describes a different contract.
