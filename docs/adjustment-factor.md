# Adjustment factor and the delta one note

Agreed and built on 5 November 2026.

## What it means

A delta one note gives the holder the whole move of its underlier in both directions, with no cap, buffer, floor or coupon. Three public Morgan Stanley notes add one term to that, which they call the Adjustment Factor:

```text
Adjusted return = final level × adjustment factor ÷ initial level − 1
Payment         = principal + principal × adjusted return
```

The factor decides where the holder gets principal back. At 99.35% the underlier must rise about 0.65% to reach it. At 101% a fall of about 0.99% still reaches it.

## Decisions

- **It belongs to the redemption.** Decided by the project owner: the factor can apply to any redemption, so it is a term of the redemption and not of the payoff. `redemption` was the string `"bullet"` for a bullet product, which could hold no term, so a bullet redemption is now the object `{ "kind": "bullet" }`, like the other two kinds.
- **It defaults to 1, on every product.** Absent means 1, which changes nothing. The builder leaves it out of the structure at 100%, as it leaves out cash settlement.
- **The delta one sample starts at 1.** Decided by the project owner. The sample's ⓘ states the filing's 99.35%, and the reader can set it under Redemption.
- **The sample is one for one by composition.** It is 100% upside and 100% downside participation. There is no delta one type.
- **Delta One is a marketing name.** Decided by the project owner. It is shown beside Tracker on the same rule, so any product that fits has it, as in [marketing-names.md](marketing-names.md). A factor other than 1 does not remove it, since the notes that carry the name state one. The rates are still one for one, but they apply to the factor times the underlier's move, so the hint of this name, and of any name that states a rate, says so: at 99%, where a 100% rate sets the payment, a move of 1% of the initial level changes it by 0.99% of principal. A cap or a floor that binds sets the payment instead, so there the move changes nothing. Those hints therefore state the rate, not the resulting move. The Delta One hint also separates the title from the payoff: the title says a delta of one, and a factor scales the payment's move without changing the title.

## Assumptions

These are this reference's choices, not statements in any filing:

- **It reads through the maturity payment's return only.** A call amount, a coupon and a level read on a review do not read that return, so the factor does not change them. An autocall's trigger, on the last review too, reads the unadjusted level. The filings have no call or coupon, so this is not tested against a public note.
- **It applies before participation, a cap and a floor,** since they read the return it produces. At a rate other than 100% the two rates meet where the adjusted return is zero, not at the initial level. No filing has such a rate.
- **It is allowed on any wrapper, underlier and determination.** On a basket it multiplies the basket level. Only single-index notes were read.

## Not combined

A factor other than 1 is rejected beside a buffer, a downside or upside barrier, a digital return, and barrier absolute return. Each tests the final level against a level of its own, and no note read says whether that test reads the level before or after the factor. It is also rejected beside delivery, where shares are worth their close and a share count would have to carry the factor.

## Public sources

Read on 5 November 2026 through a fetch tool that returned about the first half of each filing verbatim, covering the terms, the formula, the table and the examples. Each table was checked row by row against the formula; rows agree to the filing's ten-cent rounding.

| Filing | Factor | Final level | Used? |
| :--- | :--- | :--- | :--- |
| [Morgan Stanley No. 1,411](https://www.sec.gov/Archives/edgar/data/895421/000095010314003449/dp46435_424b2-ps1411.htm), TOPIX | 99.35% | Average of five dates | The sample. All 23 rows are tests. Its tax section has stray wording about a "downside threshold level", which has no effect on the payoff |
| [Morgan Stanley No. 744](https://www.sec.gov/Archives/edgar/data/895421/000095010313002483/dp37739_424b2-ps744.htm), TOPIX | 98.63% | One date | Not used: Example 3's text says 660.00 and its formula prints 576.00. The result matches 660.00 and the table agrees |
| [Morgan Stanley No. 1,408](https://www.sec.gov/Archives/edgar/data/895421/000095010314003370/dp46344_424b2-ps1408.htm), STOXX Europe 600 Basic Resources and the euro | 101% | One date | Not used: its level is the index times a spot rate, and currency is not modelled. Five of its rows test a factor above 1, on the level alone |
| [Barclays Pure Beta Voyager performance update](https://www.sec.gov/Archives/edgar/data/312070/000119312512332208/d391032dfwp.htm) | None; a fee of 1.75% a year | Not stated | Not used: a monthly update with an inventory of "Delta One Structured Notes" on a total return index, and no payment formula |

## Open questions

- **What the factor pays for.** The parts read do not say why a factor is 98.63%, 99.35% or 101%. The reference states what it does and gives no reason.
- **What "delta one" means.** None of the parts read defines the name. Reading it as a one-for-one move is the general meaning of delta, the change in an instrument's value per unit change in its underlier, and not a statement in these filings.
- **A fee a year.** The Barclays update lists a fee of 1.75% a year, which would grow with time where a factor is fixed. How it applies is not stated there. To pursue if a term sheet for those notes is read.
- **Whether a final-date barrier reads the adjusted level.** Unsettled, so not combined, until a public note states it.
