# Combining payoff features

Several features can act on the same product without becoming a new wrapper
or underlier. Understanding their sequence makes a combined payoff readable.

## Buffer and protection floor

Assume principal of 1,000, a 10% buffer, 100% downside participation, and
a 90% protection floor.

At a 15% fall, the buffer removes the first 10%. The remaining 5% reduces
principal to 950, which is above the 900 floor. Payment is 950.

At a 40% fall, the remaining 30% reduces principal to 700. The floor raises
payment to 900. The buffer determines which losses count; the floor limits
the resulting loss.

## Upside participation and cap

For the same synthetic note, add 150% upside participation and a 20% cap.
A 30% rise contributes 45% before the cap and 20% after it, giving 1,200.
The downside buffer does not affect this positive-return case.

## Meaningful combinations

A cap or an upside barrier needs upside participation. A buffer or downside
barrier needs downside participation. A rebate needs an upside barrier.
Absolute return needs a buffer or barrier to define its range. SPIRe does not
combine a buffer and barrier on the same downside participation, or a cap and
an upside barrier on the same upside participation. A barrier on each direction
can appear on one product, because each switches a different rule.
This is the supported model's boundary, not a statement that all contracts
use these restrictions.

Market-linked deposits have their own repayment rule. In this reference they
cannot include downside participation or a separate principal-protection term.

Composing calculable rules does not establish that a particular combination
is offered commercially. The examples above explain the synthetic model.
