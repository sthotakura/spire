# Upside participation above a digital return

Agreed and built on 5 November 2026, as proposed below with the recommended answer to each decision, except for the departures listed under *As built*. It answers open question 5 of [digital-return.md](digital-return.md): can upside participation start at a level above the initial level?

## What it means

Some digital notes pay a fixed return across a wide range, and then a leveraged share of any rise beyond the level where that fixed return has been earned. A note with a 56% digital return pays 56% at any final level from 100 to 156. Above 156 it pays the 56% plus 150% of the rise beyond 156.

The level is not a free choice in these notes. It is 100% plus the digital return, the point at which the underlier has risen by as much as the digital return already pays. So the holder is paid the greater of the digital return and the rise, and is paid leverage only on what lies beyond that point.

The reference can already express a digital return beside leveraged participation, but that is a different payoff, and both are real:

| | Measured from the initial level | Measured from the digital return |
| :--- | :--- | :--- |
| **Above the digital floor** | Principal + rate × the whole rise | Principal + digital return + rate × the rise beyond the digital return |
| **Where the line leaves the floor** | Where rate × the rise overtakes the digital return, which is not a term of the note | At 100% + the digital return, a stated term |
| **Public example** | Bank of Nova Scotia: "the greater of" a 47.44% digital return and 150% of the basket return ([digital-return.md](digital-return.md), source 7) | The notes below |

At a rate of 100% the two are the same payoff. They part only with leverage.

## Established concepts

Four final pricing supplements were read on 5 November 2026 through a summarising fetch tool, because the SEC refused a direct download. All four are about 4 to 6 years, on the lesser or least performing of their underliers where there are two, and have no cap.

| Note | Digital return | Threshold | Rate | Downside |
| :--- | ---: | ---: | ---: | :--- |
| [JPMorgan Uncapped Digital Barrier Notes, 2025](https://www.sec.gov/Archives/edgar/data/19617/000121390025027653/ea0236742-01_424b2.htm), two indices | 56% | 156% | 150% | 70% barrier; principal from 70 to 100 |
| [JPMorgan Uncapped Buffered Digital Notes, 2026](https://www.sec.gov/Archives/edgar/data/19617/000121390026026723/ea0281377-01_424b2.htm), an index and a fund | 49% | 149% | 200% | 15% buffer; the digital return is paid down to 85 |
| [JPMorgan Uncapped Buffered Digital Notes, 2022](https://www.sec.gov/Archives/edgar/data/19617/000121390022044684/s140365_424b2.htm), one index | 15% | 115% | 104.55% | 15% buffer; the digital return is paid down to 85 |
| [BofA Digital Return Plus Notes, 2026](https://www.sec.gov/Archives/edgar/data/1682472/000191870426018506/form424b2.htm), two funds | 96.5% | 196.5% | 150% | 80% barrier; principal from 80 to 100 |

| Finding | Source |
| :--- | :--- |
| **The formula.** Above the threshold: "$1,000 + ($1,000 × Contingent Digital Return) + [$1,000 × (Lesser Performing Index Return - Contingent Digital Return) × Upside Leverage Factor]". | JPMorgan 2025; the same in the other two |
| **The threshold is 100% plus the digital return in all four.** JPMorgan 2025 states it: "156.00% of the Initial Value (equal to 100.00% plus the Contingent Digital Return)". | All four, as figures |
| **The tables reconcile.** 180 pays $1,920 and 157 pays $1,575 (2025); 180 pays $2,110 (2026); 116 pays $1,160.455 (2022); 250 pays $2,767.50 and 200 pays $2,017.50 (BofA). | Each filing's table |
| **Below the threshold the payment is the digital return.** A final level at the threshold is in the digital range, and pays the same under either formula, so equality does not change the payment. | JPMorgan, all three |
| **Names differ.** JPMorgan calls the level the Upside Leverage Threshold and the rate the Upside Leverage Factor; BofA calls them the Upside Threshold Value and the Upside Participation Rate. Neither is a term across issuers. | Those filings |

The BofA formulas are images that the tool could not read. Its conditions, cover wording ("150.00% upside exposure ... beyond 196.50% of its Starting Value") and table all fit the JPMorgan formula, but its formula itself is inferred.

These searches found no note whose threshold differs from 100% plus the digital return, and none with this feature and no digital return. That is a limited search, not evidence that they do not exist.

## Why not a level of its own

The obvious model is a number on upside participation, as open question 5 assumed. That was tried on paper first, and the current digital floor exposes the problem.

```json
{ "direction": "upside", "rate": 1.5, "startLevel": 1.56 }
```

- **It does not work with the floor as it is.** The digital return is a greater-of floor. Principal + 150% × the rise beyond 156 stays below the 1,560 floor until a final level of about 193, and then pays less than the note: at 180 it pays 1,360, floored to 1,560, where the note pays 1,920.
- **Entering a different level to fit would be wrong.** A start level of about 118.67 would draw the correct line through the floor, but that number appears nowhere in the note.
- **Making it additive needs a second rule.** "A start level adds to what the payoff pays at that level" does reproduce the note, but then a participation with no start level is a greater-of and one with a start level just above 100 is an addition. A tiny change in the term would add the whole digital return to the payment.
- **It allows combinations nobody has shown,** such as a threshold unrelated to the digital return, each of which would need its own stated behaviour.

## Smallest model

A term on upside participation saying what the rise is measured from. It holds no number, so the threshold cannot disagree with the digital return.

```json
"payoff": {
  "participations": [
    { "direction": "downside", "rate": 1, "barrier": { "level": 0.7, "observation": "final" } },
    { "direction": "upside", "rate": 1.5, "measuredFrom": "digital-return" }
  ],
  "digitalReturn": { "amount": 0.56, "barrier": { "level": 1, "observation": "final" } }
}
```

- **`measuredFrom`**: `"initial-level"` (the default, today's behaviour) or `"digital-return"`, which needs a digital return. The app writes the default, as it does the redemption's.
- **The threshold is derived**: 100% + the digital return, as an underlier level, rounded as every barrier level is. It is reported in the payment breakdown and shown in the calculation and on the chart.
- **The rule**, with `a` the digital return and `R` the underlier's return:

  ```
  R > a:  participated return = a + rate × (R − a)
  R ≤ a:  participated return = 0, and the digital floor applies as it does today
  ```

  The cap and the floors then apply in their existing order, so nothing else in the payment changes. The line is continuous at the threshold, so which side the threshold falls on does not matter.

### Combinations

Almost everything comes from the digital return, which is why this stays small.

- **Inherited from the digital return.** A digital return is for notes only and cannot sit beside an upside barrier, barrier absolute return or a minimum return, so neither can this.
- **The digital barrier** is at most 100%, so it is always met at the threshold.
- **A buffer, a downside barrier and principal protection** act on falls and are unchanged.
- **A basket** reads its basket level. For a worst-of, the lowest asset above its threshold is the same test as the filings' "each".
- **Averaging, lookback, a call and a coupon** read as they do for any payoff.
- **A cap** appears in no note read, and all four are uncapped. It is coherent, since a digital return must already be below any cap, so it is allowed and limits the whole payment, and the book says no public note was found with it.
- **Delivery** is unaffected, since a rise is paid in cash.

## Synthetic worked example

A note of 1,000 on a synthetic index with an initial level of 100: a 20% digital return with its barrier at 100%, 150% upside participation, and a 70% downside barrier at 100% downside participation. The threshold is 120.

| Final level | Measured from the digital return | Measured from the initial level |
| ---: | ---: | ---: |
| 69 | 690 | 690 |
| 70 | 1,000 | 1,000 |
| 99 | 1,000 | 1,000 |
| 100 | 1,200 | 1,200 |
| 110 | 1,200 | 1,200 |
| 120 | 1,200 | 1,300 |
| 140 | 1,500 | 1,600 |
| 160 | 1,800 | 1,900 |

The second column leaves the floor at 120, the third at about 113.33. From 120 up, the gap is a constant 100: principal × digital return × (rate − 1). At a rate of 100% there is no gap.

## Decisions

1. **A term with no number, or a level of its own?** Recommended: `measuredFrom`, for the reasons above. It reproduces all four notes and cannot hold a contradiction. The cost is that the feature exists only beside a digital return, so a note with a flat range and no digital return, or a threshold other than 100% plus the digital return, cannot be written. If one is found, a number can be added then.

2. **What the outline calls it.** Recommended: a row under upside participation, "Measured from", with "Initial level" and "Digital return level", available once a digital return is added. With the digital return, the row states the threshold as a level. Its hint gives the issuer terms, Upside Leverage Threshold and Upside Threshold Value, so a reader can match it to a filing.

3. **Which note becomes a sample.** Recommended: JPMorgan 2025 under a generic name, such as "Worst-of digital note with leverage above the digital return". Its formula is in text, states the threshold rule and has a table that reconciles. The 2026 and 2022 notes stay as sources, and BofA stays out because its formulas are images and a sample should come from a filing that can be read in full. I would re-read the chosen filing's rows against the running app before adding it.

4. **Allow a cap?** Recommended: allowed and stated, as above. The alternative is to block it until a note shows one.

## What changed

- **Domain.** `measuredFrom` on `UpsideParticipation` with its JSDoc, the validator rule, the rule above in `paymentBreakdown`, and the threshold in the breakdown.
- **Schema.** `npm run schema`, a product example, and the rule added to the list of rules only the validator checks in `scripts/product-schema.ts`.
- **Interface.** The outline row, its concept and highlights, and its hint.
- **Calculation and text.** A calculation step naming the threshold, the payment rule, the summary and the outcome sentence.
- **Chart and path.** The line leaves the floor at the threshold with a label there. The rate handle has to follow the steeper part only, and the amount handle moves the threshold too, so both need checking. The calculation path gains no stage of its own, but its upside stage has to draw the new line.
- **Names.** `src/content/names.ts` has a Leveraged market-linked step up note rule that describes the greater-of form, so it must not show for this form. The digital return reason and the leveraged chips need checking too, since "greater of" and "rate on the rise" no longer describe it. No generic public name for this form was found, so it gets no chip of its own.
- **Book.** A part of "A digital return" in chapter 12 with a chart from `scripts/book-charts.ts`, comparing the two forms; a line in chapter 8; chapter 18 if the JSON example needs it; and the outline's working material.
- **Working documents.** Open question 5 of [digital-return.md](digital-return.md) closed, source 6 updated, and a note in [feature-map.md](feature-map.md) that this is not the "additional upside" candidate of a second tier.
- **Tests.** Every table row quoted above as a domain test, the worked example, both forms equal at a rate of 100%, and continuity at the threshold.

## As built

- **The default is not written.** The proposal had the app write `"measuredFrom": "initial-level"`, as it does the redemption's defaults. Every note with upside participation would then have changed in the Structure JSON and stopped matching its sample, for a term that matters only beside a digital return. The key appears only as `"digital-return"`, and the schema states the default.
- **The outline states the threshold in the option**, "Digital return level (156%)", so choosing it adds no row or text. The row shows only when the product has both upside participation and a digital return.
- **No chart label at the threshold itself.** The upside label says "Each 1% rise beyond +56% adds 1.5%", on the part of the line it describes. The rate handle sits halfway from the threshold to the end of the axis, and with a digital return of 100% or more the sloped part starts past the axis, so the handle is not shown.
- **Also updated:** chapters 8 and 18, [marketing-names.md](marketing-names.md), [certificate.md](certificate.md) and the sample list. Chapter 15 still describes the digital return as a greater-of floor, which stays true of the floor.
- **Not checked:** keyboard use of the new select with a screen reader, and the chart at phone width beyond the check that the page does not overflow.

## Assumptions

- The threshold is 100% plus the digital return in every note this models. It is a rule of this reference, taken from the four notes read.
- The rule reads the determined initial and final levels, as the digital barrier does, including with averaging and lookback, which no note read combines with it.

## Open questions

1. **BofA's other note.** The S&P 500 Futures note ([digital-return.md](digital-return.md), source 5) says "the greater of" 150% of the return and $1,300 on its cover, which is the initial-level form, but its table ($1,450 at 140, $1,750 at 160) is exactly the digital-return form at a threshold of 130. The reference could now write either, so the contradiction is easier to see, but this does not settle it. It stays out of the samples.
2. **A second tier.** Participation at one rate from the initial level and a higher rate above a level, one reading of "additional upside" in [feature-map.md](feature-map.md), is not covered. No public note was found.
3. **A strike away from the initial level.** The Swiss certificate's 95% strike ([certificate.md](certificate.md), open question 3) and outperformance certificates whose participation starts at a strike are not covered. They would need the numeric level this proposal leaves out.
