# Feature map

A list of features commonly found in structured notes, sorted into the concepts SPIRe keeps apart. It shows where each feature would sit in the note's tree, so that a new feature is added as a composition of existing parts rather than as a new product type. It is a thinking aid, not a plan: nothing here is scheduled, and each feature still needs a verified public definition before it is built ([AGENTS.md](../AGENTS.md)).

## The main finding

Many names that look like distinct payoffs are combinations of a few independent choices. A coupon, for example, is a **payment condition** combined with a **rate**:

| | Fixed rate | Floating rate |
| :--- | :--- | :--- |
| **Always paid** | fixed coupon | floating coupon |
| **Paid if a condition holds** | contingent fixed coupon | contingent floating coupon |
| **Accrues per day in a range** | fixed range accrual | floating range accrual |

Six coupon types become two small choices. Modelling each cell as its own type would repeat the universal-object problem the project avoids.

## Where each feature belongs

### Payoff at maturity

- **Upside participation, downside participation, protection floor, cap, buffer, barrier.** Already modelled.
- **Additional upside.** No single public meaning was found. Candidates: a second participation tier above a level, or a fixed return added to participation. Needs a definition.

### Coupons (a new concept, beside the payoff)

- **Payment condition:** always paid; paid only if the underlier is at or above a level on the coupon date (contingent); or accruing pro rata for each day a reference stays within a range (range accrual).
- **Rate:** fixed, or floating (a reference rate plus or minus a spread, possibly with a floor or cap).
- **Participation paid as a coupon:** a coupon equal to a rate times the underlier's rise over the period, and zero on a fall. With a cap it is a call spread. This is the same arithmetic as upside participation with a cap, applied per period instead of at maturity, so the two should share it.
- **Hybrid range accrual:** a range accrual whose condition tests more than one reference, for example a rate and an equity index. Needs a verified definition.
- **Memory:** a contingent coupon that also pays missed earlier coupons once its condition holds again. A flag on the contingent condition, not a separate coupon.

### Redemption behaviour

- **Autocall:** the note redeems early, automatically, when the underlier is at or above a trigger on an observation date.
- **Issuer call:** the issuer may choose to redeem early on stated dates. It does not depend on the underlier.
- Both sit beside bullet redemption, not under the payoff.

### Feature switch

- **Switch:** a trigger that changes other features, for example a coupon that converts from fixed to floating, or a barrier event that cancels upside participation and changes the downside rate ([barrier.md](barrier.md)). Like a barrier, it does no arithmetic of its own. Whether it is one concept that points at several features, or a barrier with several targets, is open.

### Determination

- **Strike (initial) level and final level.** Already modelled under the underlier's determination ([lookback.md](lookback.md), [averaging.md](averaging.md)).

## Left out

- **Payment at maturity** is the result of the payoff, derived rather than stored ([PLAN.md](../PLAN.md), section 2).
- **Expected dividends** are a pricing input, and pricing is out of scope. An index that deducts a fixed dividend from its level would be a property of the underlier, not of the note.

## Open questions

- **Floating rates need a rate underlier.** Today the underlier is an equity or equity index. A floating coupon, or a range accrual on a rate, needs a synthetic reference rate as a second kind of underlier.
- **Coupons need dates.** Every coupon and early redemption is observed on a schedule, which depends on the observation-dates proposal ([observation-dates.md](observation-dates.md)).
- **One trigger, several effects.** A switch, an autocall and a barrier all test the underlier against a level on some dates. Whether they share one trigger concept is open.
- **Definitions still needed:** additional upside, hybrid range accrual, and switch.
