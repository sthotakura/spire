# Worked synthetic examples

These examples use a bullet note with principal of 1,000 and a fixed initial
level of 100. Each adds one rule to the previous setup, or is introduced as a
change of setup, and keeps the observation explicit. Amounts are illustrative
and rounded for display.

## Principal only

With no payoff features, final levels of 60, 100, and 130 each pay 1,000
under the synthetic starting rule.

## Add upside participation

At a 100% upside rate, final level 130 pays 1,300. Final level 60 still pays
1,000 because no downside participation has been added.

## Add downside participation

At a 100% downside rate, final level 60 now pays 600. Final level 130 still
pays 1,300.

## Compare three downside rules

At final level 60, the underlier return is −40%. Start each comparison with
the same 100% downside rate, and add only the feature named:

- With 90% principal protection, payment is 900.
- With a 10% buffer, payment is 700.
- With a 70% final-observation barrier, payment is 600.

Now use final level 95, a 5% fall. The floor example pays 950; the buffer
and barrier examples each repay 1,000. Protection of small falls and a minimum
payment under large falls are different properties.

## Add an upside cap

With 150% upside participation and a 20% upside cap, final level 130 pays
1,200. The cap limits the 45% contribution to 20%.

## Add an upside barrier

With 80% upside participation, an upside barrier at 130% of the initial level,
a 2% rebate, and 100% principal protection, final level 120 pays 1,160 and
final level 129 pays 1,232. Final level 130, exactly at the barrier, pays 1,240.
Just above 130 the barrier is reached, so participation ends and the payment
drops to 1,020. The [Barrier chapter](12-barrier.md) has the full set of levels.

## Observe a barrier on every close

Return to the 70% downside barrier with 100% downside participation, and
final level 80. If no close was below 70, the payment is 1,000. If the
underlier closed at 65 earlier and then recovered to 80, the barrier was
reached and the whole 20% fall counts: the payment is 800. The same 80 final
level pays 1,000 when the barrier is observed only on the final date. The
[Barrier chapter](12-barrier.md) has the upside case, where one close above the barrier earns
the rebate whatever the final level.

## Pay the absolute return in both directions

With a 100% absolute return, a lower barrier at 80% and an upper barrier at 125%
of the initial level, both observed on every close, and a 2% conditional return,
final level 90 and final level 110 each pay 1,100: a fall pays like a rise. If a
close was ever at 79, or above 125, the absolute return has ended, and any final
level pays 1,020. The [Absolute return chapter](13-absolute-return.md) has the full set of levels.

## Add absolute return

With a 15% buffer, 100% absolute return, and 100% downside participation,
final level 85 pays 1,150. Final level 84.99 pays 999.90. Include both sides
of this threshold when reading the payoff.

## Change how the return is measured

Keep 100% upside participation and no other feature. A single final
observation of 110 gives a return of +10% and a payment of 1,100.

- Averaging five observations of 100, 100, 100, 100, and 150 gives a final
  level of 110, also +10%, and a payment of 1,100. The last observation alone
  would pay 1,500.
- A lookback on the initial level, with levels of 100, 97, 92, and 95 on and
  after pricing, determines an initial level of 92. A final level of 110 gives
  a return of about 19.57% and a payment of about 1,195.65.
- A two-component weighted basket, 50% each, with returns of +30% and −10%, has
  a return of +10% and a payment of 1,100. Many different component
  performances can give the same basket return.

The [Determination methods](06-determination.md) and [Underliers](05-underliers.md)
chapters have the calculations.

## Change the wrapper

A deposit repays principal in full, so these examples use no downside
participation or protection term. With 100% upside participation and a 30% cap,
a 60% rise pays 1,300 and a 50% fall pays 1,000. Adding a 5.25% minimum return
makes a 2% rise pay 1,052.50 instead of 1,020. The
[Market-linked deposits chapter](14-market-linked-deposits.md) has the full set
of levels.
