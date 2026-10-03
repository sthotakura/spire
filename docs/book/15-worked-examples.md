# Worked synthetic examples

These examples use a bullet note with principal of 1,000 and a fixed initial
level of 100. Each changes one rule while keeping the observation explicit.
Amounts are illustrative and rounded for display.

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

## Add absolute return

With a 15% buffer, 100% absolute return, and 100% downside participation,
final level 85 pays 1,150. Final level 84.99 pays 999.90. Include both sides
of this threshold when reading the payoff.
