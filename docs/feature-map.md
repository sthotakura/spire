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
- **Absolute return.** Pays as a gain a fall within the buffer, or one that ends at or above the barrier. Modelled ([absolute-return.md](absolute-return.md)).
- **Fixed upside payment.** When the final level is at or above the initial level, pays principal plus the greater of the rise and a fixed return, so the payment jumps at the initial level. Seen in a public "Jump Securities" note ([absolute-return.md](absolute-return.md), open question 5). It is conditional on the underlier not falling, unlike the deposit's unconditional minimum return. Not yet modelled.
- **Additional upside.** A working label, not yet checked against public sources. Candidates: a second participation tier above a level, or a fixed return added to participation. Needs a public definition, and a public name if one exists.

### Coupons (a new concept, beside the payoff)

The fixed coupon, always paid, is proposed in [coupon.md](coupon.md).

- **Payment condition:** always paid; paid only if the underlier is at or above a level on the coupon date (contingent); or accruing pro rata for each day a reference stays within a range (range accrual, a name used in SEC-filed notes linked to a rate or an equity index, for example [Callable Dual Range Accrual Notes, 424B2](https://www.sec.gov/Archives/edgar/data/200245/000095010320002436/dp121021_424b2-us2090080.htm)).
- **Rate:** fixed, or floating (a reference rate plus or minus a spread, possibly with a floor or cap).
- **Participation paid as a coupon:** a coupon equal to a rate times the underlier's rise over the period, and zero on a fall. With a cap it is a call spread. This is the same arithmetic as upside participation with a cap, applied per period instead of at maturity, so the two should share it.
- **Dual (or hybrid) range accrual:** a range accrual whose condition tests more than one reference, for example a rate within a range and an equity index above a level on the same day. SEC filings call it a dual range accrual (source above); some issuer notices call it a hybrid range accrual ([Société Générale, CMS Hybrid Callable Range Accrual notice](https://usprogram.socgen.com/files/CMS%20Hybrid%20Callable%20Range%20Accrual%20and%20Callable%20Daily%20Range%20Accrual%20Notice%20%28CMS%20Base%20Rate%20Observation%29.pdf)). The exact accrual rules still need reading from a filing before it is modelled.
- **Memory:** a contingent coupon that also pays missed earlier coupons once its condition holds again, as in SEC-filed "Contingent Income Barrier Notes with Memory" ([FWP](https://www.sec.gov/Archives/edgar/data/83246/000110465921088665/tm2120829d65_fwp.pdf)). A flag on the contingent condition, not a separate coupon.

### Redemption behaviour

- **Autocall:** the note redeems early, automatically, when the underlier is at or above a trigger on an observation date.
- **Issuer call:** the issuer may choose to redeem early on stated dates. It does not depend on the underlier.
- Both sit beside bullet redemption, not under the payoff.

### Feature switch (working label)

"Switch" is a working label here, not a verified public product name. Two public cases change features during a note's life, and they differ:

- **On a stated date:** fixed-to-floating rate notes pay a fixed rate for an initial period, then a floating rate ([RBC floating rate notes fact sheet](https://www.rbccm.com/assets/rbccm/docs/expertise/fixed-income/us/rbc-floating-rate-notes-fact-sheet.pdf)). Nothing is observed; the coupon's rate changes by date.
- **On a trigger:** a barrier event that cancels upside participation and changes the downside rate ([barrier.md](barrier.md)). Like a barrier, it does no arithmetic of its own.

Whether a trigger-based change of coupon type exists in public notes has not been checked. Whether a trigger is one concept that points at several features, or a barrier with several targets, is open.

### Determination

- **Strike (initial) level and final level.** Already modelled under the underlier's determination ([lookback.md](lookback.md), [averaging.md](averaging.md)).

## Left out

- **Payment at maturity** is the result of the payoff, derived rather than stored ([PLAN.md](../PLAN.md), section 2).
- **Expected dividends** are a pricing input, and pricing is out of scope. An index that deducts a fixed dividend from its level would be a property of the underlier, not of the note.

## Open questions

- **Floating rates need a rate underlier.** Today the underlier is an equity or equity index. A floating coupon, or a range accrual on a rate, needs a synthetic reference rate as a second kind of underlier.
- **Coupons need dates.** Every coupon and early redemption is observed on a schedule, which depends on the observation-dates proposal ([observation-dates.md](observation-dates.md)).
- **One trigger, several effects.** A switch, an autocall and a barrier all test the underlier against a level on some dates. Whether they share one trigger concept is open.
- **Definitions still needed:** additional upside, the accrual rules of a dual range accrual, and whether a trigger can switch a coupon's type.
