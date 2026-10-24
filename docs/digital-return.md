# Digital return

Built, as proposed below except for the departures listed under *As built*. It was the one feature missing to reproduce two public worst-of notes (Citigroup and BMO), which are now samples ([sample-products.md](sample-products.md)). The work is recorded in section 37 of [PLAN.md](../PLAN.md); the reader-facing explanation is a section of the [Barrier chapter](book/12-barrier.md).

## Domain meaning

A digital return is a fixed return on principal, paid only if the underlier ends at or above a level, its digital barrier. It is called digital because the condition is on or off: one cent below the barrier and nothing of it is paid. Public notes pay principal plus *the greater of* the digital return and whatever else the payoff would pay, so it acts as a floor that applies only while its barrier holds. Below the barrier the payoff applies as if there were no digital return.

That makes it a conditional cousin of the deposit's minimum return ([deposit.md](deposit.md)), which is also a "greater of" floor but applies whatever the underlier does.

### How it differs from absolute return

Both pay something at final levels between a barrier and the initial level, so they can look alike, but they are different shapes ([absolute-return.md](absolute-return.md)).

| | Absolute return | Digital return |
| --- | --- | --- |
| Amount | Proportional: rate × the size of the fall | Fixed: the same at every level |
| Range | Falls only, from the initial level down to the buffer or barrier | Everything at or above its barrier, rises included |
| Belongs to | Downside participation, which must have a buffer or barrier | Nothing else: it has its own barrier, at any level |

A 5% fall pays a 5% gain under 100% absolute return and the whole digital return under a digital return of 8.08%; a 29% fall pays 29% against the same 8.08%. No absolute return rate reproduces the digital shape, since the rate makes the gain grow with the fall, and absolute return never pays on a rise. A digital return is also not downside participation with a barrier: that barrier only decides whether the fall is borne, and pays nothing above it.

The Jump note is the nearest relative: it pays a fixed amount, but only at or above the initial level. That is a digital return with its barrier at 100%.

## Sources

1. **Citigroup, Enhanced Barrier Digital Plus Securities on the worst performing of three indices**, preliminary pricing supplement dated 4 November 2022 ([SEC 424B2](https://www.sec.gov/Archives/edgar/data/200245/000095010322019230/dp183917_424b2us2209155.htm)). Pricing 28 November 2022, valuation 28 November 2025 (36 months). Payment at maturity, verbatim:
   - "If the final underlying value of the worst performing underlying is greater than or equal to its final barrier value: $1,000 + the greater of (i) the digital return amount and (ii) $1,000 × the underlying return of the worst performing underlying"
   - "If the final underlying value of the worst performing underlying is less than its final barrier value: $1,000 + ($1,000 × the underlying return of the worst performing underlying)"
   - Digital return amount $260.00 (26.00%); final barrier value 70.00% of each underlying's initial value; worst performing underlying is "the underlying with the lowest underlying return". No coupon, no call, no cap.
   - The filing's examples: worst +5% pays $1,260, +50% pays $1,500, −10% pays $1,260, −70% pays $300.
2. **JPMorgan digital barrier note with a buffer** ([SEC 424B2](https://www.sec.gov/Archives/edgar/data/19617/000121390025119557/ea0268903-01_424b2.htm)), recorded in [barrier.md](barrier.md). Digital barrier 85%, 20% buffer on the downside, worst of two indices: a 10% fall pays $1,087.00, 84.99 pays $1,000.00 and 70.00 pays $900.00. The digital barrier and the buffer are at different levels, so the digital return owns its barrier. What a rise pays is to re-read.
3. **Morgan Stanley Jump Securities**, recorded in [absolute-return.md](absolute-return.md) (open question 5) and [feature-map.md](feature-map.md) as a "fixed upside payment": the greater of the rise and a fixed return when the final level is at or above the initial level. Read as a digital return with its barrier at 100%. To re-read before it is used as a sample.
4. **Bank of Montreal, Digital Return Barrier Notes due 6 April 2027** (CUSIP 06376K3V8), on the S&P 500 and the Dow Jones Industrial Average ([SEC 424B2](https://www.sec.gov/Archives/edgar/data/927971/000183988226013810/bmo5560_424b2-08699.htm)). Pricing 3 March 2026, valuation 1 April 2027 (about 13 months), maturity 6 April 2027. Read through a summarising fetch tool on 24 October 2026, not as extracted text, so the wording below is the summary's and the figures need a second look in the filing before the sample is built. It pays on the "Least Performing Reference Asset" (the lower percentage change), observed on the valuation date only, with no coupon, call or periodic observation:
   - at or above the digital barrier level: "$1,000 + ($1,000 x Digital Return)", a digital return of 8.08%, so $1,080.80;
   - below the barrier level: "$1,000 + ($1,000 x Percentage Change of the Least Performing Reference Asset)", losing 1% for each 1% of fall, with no buffer.
   - The digital barrier level and the barrier level are both 71% of each initial level (S&P 500 initial 6,816.63, Dow Jones initial 48,501.27). No participation rate, cap or buffer is stated; the digital return is the most the note pays.
   - The filing's examples, on an initial level of 100: 90 pays $1,080.80, 140 pays $1,080.80, 71 pays $1,080.80, 70.99 pays $709.90, 40 pays $400 and 0 pays $0.
   - **This pays the digital return and nothing more on a rise**, where the Citigroup note pays the greater of it and the worst return. Both fit the floor model: leave upside participation off for this note, and a rise leaves the payoff at principal, which the digital floor lifts.
5. **BofA Finance, Digital Return Plus Notes on the S&P 500 Futures Excess Return Index, due 2031** ([SEC 424B2](https://www.sec.gov/Archives/edgar/data/70858/000191870426007286/form424b2.htm)). Priced 12 March 2026, about five years. If the ending value is at or above 60% of the starting value, the payment is "the greater of" $1,000 + ($1,000 × 150% × the underlying return) and a $1,300 digital payment; below 60% it is 1:1 downside, with up to 100% at risk. Read from the filing's text and the images of its formulas on 24 October 2026. This is the Citigroup shape with leverage. **Its illustrative table disagrees with its formula:** it shows $1,750 at a return of +60%, $1,600 at +50% and $1,450 at +40%, which is $1,300 plus 150% of the rise beyond +30%, where the formula gives $1,900, $1,750 and $1,600. The cover and the terms state the formula, so the sample follows it and says so. Which one the issuer means is not established here.
6. **BofA Finance, Digital Return Plus Notes on the least performing of the SPDR Gold Shares and the iShares Silver Trust, due 2031** ([SEC 424B2](https://www.sec.gov/Archives/edgar/data/1682472/000191870426018506/form424b2.htm)). Priced 26 June 2026, about five years. A digital payment of $1,965 (96.5%) if the least performing is at or above its starting value; plus, if it is at or above 196.5% of its starting value, 150% of its rise beyond that; $1,000 from 80% to 100%; 1:1 downside below 80%. The digital payment with its barrier at 100%, and the downside barrier at 80%, are modelled. **Participation that starts at a level above the initial level is not**, so it is not a sample. It would be a new feature, an upside participation with its own starting level, and is recorded as an open question.
7. **The Bank of Nova Scotia, Autocallable Digital Buffer Notes on an equally weighted basket of four stocks, due 2028** ([SEC 424B3](https://www.sec.gov/Archives/edgar/data/9631/000183988226019286/bns_424b3-12372.htm)), an amended preliminary pricing supplement dated 6 April 2026. One review date, about a year after the strike date, calls the notes at 100% of the initial basket value and pays principal plus a 23.72% call premium. Otherwise the final basket value is the average of five dates. At or above the initial value the payment is "the greater of" a 47.44% digital return and 150% of the basket return; from 85% to 100% it is principal; below 85% it is a 15% buffer at a rate of 1 ÷ 0.85. **It settles the averaging assumption:** its digital barrier reads the averaged final basket value against the initial one, as the model does. It also shows the digital return beside a buffer, a basket, an autocall and 150% participation.

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

A second synthetic example follows the BMO note: principal 1,000; a worst-of basket of Index A and Index B; downside participation 1:1 and **no upside participation**; an 8.08% digital return with its barrier at 71%.

| Worst asset's return | Digital barrier | Without the digital return | Payment |
| --- | --- | --- | --- |
| +40% | met | 1,000 | 1,080.80 |
| −10% | met | 900 | 1,080.80 |
| −29% (at barrier) | met | 710 | 1,080.80 |
| −29.01% | not met | 709.90 | 709.90 |
| −60% | not met | 400 | 400 |
| −100% | not met | 0 | 0 |

These agree with the filing's examples, as summarised. The edge sits at the level, not the return: the payment compares the final level with 71% of the initial level, as the buffer and barrier do, so that a rounding error in 1 − 0.29 cannot put a final level of exactly 71 on the wrong side.

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
- **Samples**: "Worst-of barrier digital note", modelled on the Citi note with synthetic indices, and a second modelled on the BMO note (no upside participation, 8.08% at 71%, 13 months), whose menu name is still to settle and must be generic. Then remove both from the products not used in [sample-products.md](sample-products.md).
- **Book**: a chapter or a section, probably in chapter 12 (Barrier) or a new chapter beside it, with a chart from `scripts/book-charts.ts`, plus updates to the combining-features, JSON and boundaries chapters and the outline.
- **Names**: Citi's "Barrier Digital Plus" is a product name, not a generic one. A generic name ("digital note", "digital barrier note") needs a public generic source before a chip is shown.

## As built

Every step is done: the domain, the schema, the content, the interface, two samples and the book. The model, the worked examples (each row is a domain test) and the decisions above stand, with these details:

- **Decisions 1 to 5 followed as proposed.** The sixth was settled by the tests: a worst-of basket reads the basket level, which is the worst asset.
- **Absolute return on a fall is allowed beside it**, which the decisions did not list. The floor is a greater-of, so where the digital barrier is met the payment is the greater of the digital floor and what absolute return pays; the combination is stated in the book.
- **Two concepts, not one.** The digital return and its barrier are `digital-return` and `digital-barrier`, the barrier nested under the return as the coupon barrier is under the coupon, so each highlights its own rows, JSON lines and chart handle. The summary clause is one phrase for both.
- **The key is `digitalReturn`**, on the payoff beside `participations`, with `amount` and `barrier: { level, observation }`. The observation is the literal `"final"`; the schema rejects a daily one, and `validateProduct` does not check it because the type forbids it.
- **The payment breakdown** gains `digitalReturn`: the barrier as an underlier level (rounded as every barrier is, so a level exactly at it is met), whether it is met, and the floor. The payment floor is the larger of it, while met, and the protection floor.
- **The calculation** has one *Digital return* step between the participation and the protection floor, which now states only the protection's own floor. It is muted below the barrier and where participation already pays more.
- **The scenarios** add a row at the barrier (marked at barrier) and one a percent of the initial level below it (marked below barrier). They reuse the markers of the other barriers.
- **The chart** draws the line in its own colour where the digital floor sets the payment, with a jump at the barrier, and two handles: the amount, on the flat stretch of the floor, and the barrier, at the top of the jump. The two colours are chosen against the chart palette. The amount handle moves in whole percents, so a term such as 8.08% is typed.
- **Names.** A note with a digital return gets no Tracker, Outperformance or Participation note chip, and the other maturity names say they do not cover it. No generic public name for a digital return was found, so it has no chip of its own ([marketing-names.md](marketing-names.md)).
- **Menu.** The Add feature menu's Digital entry is available. It is blocked beside an upside barrier, absolute return in both directions and on a deposit, with the reason; a minimum return exists on deposits only, so it never meets it.
- **Samples.** Worst-of barrier digital note (Citigroup) and Worst-of fixed-return barrier note (BMO), both re-read as extracted text on 24 October 2026. The JPMorgan and Jump notes have not been re-read, so open questions 1 (JPMorgan) and 2 stay open.
- **More sources.** Three BofA and Bank of Nova Scotia notes were read afterwards (sources 5 to 7). Two are samples: Leveraged digital barrier note and Autocallable basket note with a buffer and a digital return. The metals note is not, for the reason in source 6.
- **Not checked:** the chart at phone width and keyboard use of the handles with a screen reader.

## Open questions

1. What does the JPMorgan note pay on a rise: the digital return only, or the greater of it and a participation? *Partly settled:* the BMO note pays the digital return only and the Citigroup note the greater of the two, and the model covers both. The JPMorgan note is still to re-read.
2. Does the Jump note have a downside buffer or absolute return, so that it can be a second sample?
3. Is there a public note with a digital return observed on every close, or with a cap?
4. Should the minimum return become a digital return with no barrier (or a barrier at 0%), so the reference has one floor concept instead of two?
5. Should upside participation be allowed to start at a level above the initial level, so that a digital return followed by participation beyond a higher level (source 6) can be written? It would be a term of upside participation, not of the digital return.
6. Which does the first BofA note pay above a 20% rise, its formula or its illustrative table (source 5)? A final filing, or the product supplement, may settle it.
