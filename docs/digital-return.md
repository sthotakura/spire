# Digital return

A proposal, not yet built. It is the one feature missing to reproduce a public worst-of note; everything else in that note is modelled. The work is planned in section 37 of [PLAN.md](../PLAN.md).

## Domain meaning

A digital return is a fixed return on principal, paid only if the underlier ends at or above a level, its digital barrier. It is called digital because the condition is on or off: one cent below the barrier and nothing of it is paid. Public notes pay principal plus *the greater of* the digital return and whatever else the payoff would pay, so it acts as a floor that applies only while its barrier holds. Below the barrier the payoff applies as if there were no digital return.

That makes it a conditional cousin of the deposit's minimum return ([deposit.md](deposit.md)), which is also a "greater of" floor but applies whatever the underlier does.

## Sources

1. **Citigroup, Enhanced Barrier Digital Plus Securities on the worst performing of three indices**, preliminary pricing supplement dated 4 November 2022 ([SEC 424B2](https://www.sec.gov/Archives/edgar/data/200245/000095010322019230/dp183917_424b2us2209155.htm)). Pricing 28 November 2022, valuation 28 November 2025 (36 months). Payment at maturity, verbatim:
   - "If the final underlying value of the worst performing underlying is greater than or equal to its final barrier value: $1,000 + the greater of (i) the digital return amount and (ii) $1,000 × the underlying return of the worst performing underlying"
   - "If the final underlying value of the worst performing underlying is less than its final barrier value: $1,000 + ($1,000 × the underlying return of the worst performing underlying)"
   - Digital return amount $260.00 (26.00%); final barrier value 70.00% of each underlying's initial value; worst performing underlying is "the underlying with the lowest underlying return". No coupon, no call, no cap.
   - The filing's examples: worst +5% pays $1,260, +50% pays $1,500, −10% pays $1,260, −70% pays $300.
2. **JPMorgan digital barrier note with a buffer** ([SEC 424B2](https://www.sec.gov/Archives/edgar/data/19617/000121390025119557/ea0268903-01_424b2.htm)), recorded in [barrier.md](barrier.md). Digital barrier 85%, 20% buffer on the downside, worst of two indices: a 10% fall pays $1,087.00, 84.99 pays $1,000.00 and 70.00 pays $900.00. The digital barrier and the buffer are at different levels, so the digital return owns its barrier. What a rise pays is to re-read.
3. **Morgan Stanley Jump Securities**, recorded in [absolute-return.md](absolute-return.md) (open question 5) and [feature-map.md](feature-map.md) as a "fixed upside payment": the greater of the rise and a fixed return when the final level is at or above the initial level. Read as a digital return with its barrier at 100%. To re-read before it is used as a sample.

## Proposed model

A payoff feature beside the participations, which owns its barrier:

```json
"payoff": {
  "participations": [
    { "direction": "downside", "rate": 1 },
    { "direction": "upside", "rate": 1 }
  ],
  "digitalReturn": { "amount": 0.26, "barrier": { "level": 0.7, "observation": "final" } }
}
```

- **`amount`**: the return on principal it pays, greater than zero, named as the call amount is.
- **`barrier`**: a new type, `DigitalBarrier`. Its level is a share of the determined initial level, greater than 0% and **at most 100%**, so a Jump-style barrier at the initial level can be written. It is **met at or above** its level ("greater than or equal to"), the same edge as the downside barrier, which is reached only strictly below.
- **Payment**: applied where the floors are, after participation and any cap. While the barrier is met, the payment is at least principal × (1 + amount). Otherwise the digital return does nothing. The protection floor still applies as well.

**The Citi note needs no downside barrier.** Plain 1:1 downside and upside participation give principal × (1 + worst return). The digital floor raises everything at or above 70% to at least $1,260, which is the filing's formula word for word. Putting a 70% downside barrier on the downside as well pays the same, but states one level twice. The sample should use the shape that reads like the filing.

## Worked example

Synthetic: principal 1,000; a worst-of basket of Index A, Index B and Index C; 1:1 upside and downside participation; a 26% digital return with its barrier at 70%.

| Worst asset's return | Digital barrier | Without the digital return | Payment |
| --- | --- | --- | --- |
| +50% | met | 1,500 | 1,500 |
| +26% | met | 1,260 | 1,260 |
| +5% | met | 1,050 | 1,260 |
| 0% | met | 1,000 | 1,260 |
| −10% | met | 900 | 1,260 |
| −30% (at barrier) | met | 700 | 1,260 |
| −30.01% | not met | 699.90 | 699.90 |
| −70% | not met | 300 | 300 |

The +5%, +50%, −10% and −70% rows agree with the filing's examples.

## Decisions to confirm before building

1. **A feature of its own, not a minimum return with a condition.** `minimumReturn` is a number on deposits only, and giving it a barrier would change its shape and its rules. The two stay separate. Whether they merge later is open.
2. **The digital return owns its barrier.** The JPMorgan note puts its digital barrier at 85% and its buffer at 20%, so the barrier belongs to the digital return. Nothing ties it to a downside barrier. This is the "one barrier, several features" question in [barrier.md](barrier.md) (open question 3), left as it stands.
3. **Final-date observation only** at first, as the sources state. Daily close is unavailable, with a reason.
4. **Combinations.** Allowed: any participation, a buffer, a downside barrier, principal protection, a worst-of, best-of or weighted basket, averaging (the barrier reads the averaged final level, stated as an assumption), and lookback. With an autocall or a coupon it applies to the maturity payoff as every payoff feature does, stated in the interface since no source combines them. Not allowed: barrier absolute return (which replaces participation), a minimum return, a deposit wrapper (no source), and an upside barrier (no source; stated if allowed later).
5. **With a cap**, the amount must be below the cap, as for the minimum return, since otherwise upside participation could never pay more.
6. **Worst-of.** On the final date the basket level at or above 70% is the same test as every asset at or above 70% of its own initial level, which the summary states as it does for a worst-of downside barrier.

## Interface and content

- **Outline**: a Digital return row under Payoff with the amount, then its barrier (level and observation). The Add feature menu's Digital entry becomes available.
- **Summary, payment rule, calculation, outcome**: for example "pays at least 26% if the worst asset ends at or above 70% of its initial level". The calculation gets a step `Digital barrier 70 · final 90 is at or above it, so the payment is at least 1,260`, muted when the barrier is not met.
- **Chart**: the payoff jumps at the digital barrier: a filled mark at the barrier on the digital side and an open one below, drawn as two pieces as the barrier jump is. A flat stretch from the barrier up to the level where participation passes the digital return, labelled. The feature needs its own colour, checked against the palette.
- **Scenarios**: rows at the barrier and just below it, using the existing past-barrier mark.
- **Schema and examples**: JSDoc on the new types, `npm run schema`, a schema example, and the boundary-case table extended for the amount and the barrier level. Add the rules only the validator checks to the list in `scripts/product-schema.ts`.
- **Sample**: "Worst-of barrier digital note", modelled on the Citi note with synthetic indices. Then remove that note from the products not used in [sample-products.md](sample-products.md).
- **Book**: a chapter or a section, probably in chapter 12 (Barrier) or a new chapter beside it, with a chart from `scripts/book-charts.ts`, plus updates to the combining-features, JSON and boundaries chapters and the outline.
- **Names**: Citi's "Barrier Digital Plus" is a product name, not a generic one. A generic name ("digital note", "digital barrier note") needs a public generic source before a chip is shown.

## Open questions

1. What does the JPMorgan note pay on a rise: the digital return only, or the greater of it and a participation?
2. Does the Jump note have a downside buffer or absolute return, so that it can be a second sample?
3. Is there a public note with a digital return observed on every close, or with a cap?
4. Should the minimum return become a digital return with no barrier (or a barrier at 0%), so the reference has one floor concept instead of two?
