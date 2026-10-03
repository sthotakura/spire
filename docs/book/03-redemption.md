# Redemption behaviour

Redemption describes how and when a note ends and its contractual redemption
payment becomes due. It answers a different question from the payoff: the
payoff determines the amount; redemption determines the event at which it is paid.

## Bullet redemption

In this book's synthetic bullet note, there is one payment at scheduled
maturity and no early call. There are no coupons along the way. The payment
can be above, at, or below principal, depending on the payoff rules.

For example, a three-year note with principal of 1,000 and 100% upside
participation pays 1,200 at maturity if its measured underlier return is +20%.
The participation explains the extra 200. Bullet redemption explains when the
1,200 is due.

## Early redemption

Some notes can end before scheduled maturity. An autocall is triggered
automatically by a condition in the terms; an issuer call gives the issuer a
right to redeem under stated terms. These are distinct from bullet redemption.
Their payment amounts and observation conditions must be read from the contract.

SPIRe's examples calculate only scheduled maturity payments. They do not assume
that an early sale or withdrawal would receive the same amount.

## Related concepts

Term gives the scheduled length. Determination selects the observations used
in the calculation. A final observation may precede the payment date: observing
a level and paying an amount are separate events.
