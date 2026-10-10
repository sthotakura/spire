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

Each feature belongs to one participation, so some need another to exist.

- A cap or an upside barrier needs upside participation.
- A rebate needs an upside barrier.
- A buffer or a downside barrier needs downside participation.
- Absolute return on a fall needs a buffer or a downside barrier to define the
  range in which a fall is paid as a gain.

Some pairs are not combined, because no public note settled how they would
interact.

- A buffer and a downside barrier on the same downside participation.
- A cap and an upside barrier on the same upside participation.
- Lookback or a basket with a barrier observed on every close.
- A downside barrier observed on every close with absolute return on a fall,
  which the public trigger note reads on the final date.

Some combinations are allowed because each part is defined on its own.

- A barrier on each direction can appear on one product, because each switches
  a different rule.
- A daily upside barrier may be combined with downside participation, each side
  keeping its own rule.

Absolute return in both directions, with a lower and an upper barrier, is a
payoff of its own. It replaces participation, so it cannot be combined with a
buffer, a cap or absolute return on a fall, nor with a minimum return, lookback,
a basket or averaging. A protection floor may be added and changes nothing,
because that payoff never pays less than principal.

A deposit has its own repayment rule.

- It cannot have downside participation or a separate principal-protection
  term.
- It alone can have a minimum return, which must be greater than zero and
  below the cap if there is one.

These are the supported model's boundaries, not statements that all contracts
use these restrictions.

Composing calculable rules does not establish that a particular combination
is offered commercially. The examples above explain the synthetic model.
