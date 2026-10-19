# Autocall observation schedule

**Status:** Deferred. Nothing is built. Revisit when more real products show the need, so the design follows a reusable concept and not one product's exception.

## The note that exposed it

A public note with a three-year term but a single autocall observation ([JPM 424B2, CUSIP 46661PNN3](https://www.sec.gov/Archives/edgar/data/19617/000121390026108070/ea0308125-01_424b2.htm)): Auto Callable Dual Directional Accelerated Barrier Notes linked to Broadcom, Netflix and ServiceNow.

- Autocall observation: October 2027, about one year after issue.
- Final valuation and maturity: October 2029.
- Autocall trigger: 90% of each underlying's initial level.
- Autocall payment: $1,685 per $1,000 principal.
- If the condition fails at the one observation, the note runs to maturity with no further autocall opportunity.

The maturity payoff is already expressible: worst-of determination, upside and downside participation, absolute return and a downside barrier. The gap is only the autocall schedule.

## Current behaviour

The autocall takes a review frequency (monthly, quarterly, semi-annual, annual), a non-call period counted in reviews, a trigger and trigger step, and a call amount. A three-year product with annual reviews therefore gets call opportunities at years one and two, then final redemption at year three.

That cannot reproduce the note above: it adds a year-two opportunity.

## Why it matters

The extra observation changes the contract. If the worst-of underlier is below 90% at year one and above 90% at year two:

- the actual note continues to maturity;
- the current model redeems at year two.

## Approaches to investigate (not decisions)

1. **Bounded recurring schedule.** A frequency plus a last observation or a maximum number of observations.
2. **Explicit schedule.** Each contractual date stated individually.
3. **Hybrid.** Generate dates from a cadence, with the ability to adjust or override them.

## Questions for future term-sheet reviews

- Are autocall observations dated explicitly or defined by a recurring cadence?
- Can the autocall period end well before maturity?
- Are there irregular, skipped or business-day-adjusted observation dates?
- Does a trigger step apply to every scheduled review or only to eligible autocall observations?
- Is the final valuation date also an autocall observation date?

## Decision

Do not extend the schema or the interface yet. Keep modelling real products and record any that challenge the review schedule. Design once the evidence identifies a reusable concept.

Related: [observation-dates.md](observation-dates.md), [non-call-period.md](non-call-period.md), [contingent-autocall.md](contingent-autocall.md).
