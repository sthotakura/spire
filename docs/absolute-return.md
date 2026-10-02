# Absolute return

This increment adds absolute return as a sub-feature of downside participation, next to the buffer. It does not add absolute return above a barrier, worst-of baskets, a separate maximum for the absolute return, or pricing. The work follows section 15 of [PLAN.md](../PLAN.md), which nested the buffer and cap under their directions.

## Established concepts

- **Absolute return** pays a fall in the underlier as a gain, over a limited range of falls. Outside that range the feature pays nothing. Issuers sell notes with it as "dual directional", because the holder can gain whether the underlier rises or falls.
- Two public notes, both preliminary pricing supplements dated October 1, 2026, give the buffered form with participation on the upside. One is on a single index with a cap ([Dual Directional Buffered Participation Securities, No. 19,026](https://www.morganstanley.com/structuredinvestments/docs/prospectus/prelim/ProspectusRed61781LXR6.pdf)), and the other on the worst performing of three indices with leveraged upside ([Dual Directional Buffered PLUS, No. 19,021](https://www.morganstanley.com/structuredinvestments/docs/prospectus/prelim/ProspectusRed61781LVU1.pdf)). Both state the payment at maturity in three cases:
  - if the final level "is greater than the initial level": principal plus the upside payment, "subject to the maximum upside payment at maturity" in the capped note;
  - if the final level "is equal to or less than the initial level but is greater than or equal to the buffer level": "stated principal amount + (stated principal amount × absolute underlier return × absolute return participation rate)", where the absolute underlier return is "the absolute value of the underlier percent change. For example, a -5.00% underlier percent change will result in a +5.00% absolute underlier return";
  - if the final level "is less than the buffer level": "stated principal amount × (performance factor + buffer amount)", where the performance factor is final level / initial level. This is a buffer with 100% downside participation ([buffer.md](buffer.md)).
- A third note from the same issuer and date applies the same absolute return and buffer rule with a different upside ([Dual Directional Buffered Jump Securities, No. 19,075](https://www.morganstanley.com/structuredinvestments/docs/prospectus/prelim/ProspectusRed61781LYB0.pdf)). If the final level "is greater than or equal to the initial level", it pays principal plus "the greater of (i) stated principal amount × underlier percent change and (ii) upside payment", a fixed amount of $530 to $550 set on the pricing date. Its examples: a 20% rise pays $1,530, an 80% rise pays $1,800, a 5% fall pays $1,050, and a 95% fall pays $250. With a 20% buffer, the absolute return is "effectively limited to a positive return of 20%".
- The **absolute return participation rate** is a stated term, 100% in all three notes. In each, the leverage factor or the maximum upside payment is set on the pricing date, but this rate is fixed in the preliminary terms.
- The range is bounded by the buffer. The capped note has a 15% buffer and says the payment "will effectively be limited to a positive return of 15%" in the absolute return case. Its risk factors call that return "effectively capped, because the absolute return participation feature is operative only if the level of the underlier has not declined below its buffer level".
- The capped note's examples: a 5% rise pays $1,050, a 100% rise pays the $1,690 maximum, a 5% fall pays $1,050, and a 95% fall pays $200. The leveraged note's: a 5% rise pays $1,069.50 at a 139% leverage factor, a 5% fall pays $1,050, and a 95% fall pays $250.
- The **maximum upside payment** sits on the upside case only. The absolute return case is not "subject to" it. In the capped note it cannot bind there anyway: a 69% maximum return is above the 15% the buffer allows.
- The payment jumps at the buffer level. From the formulas, in the capped note a final level of 85% of the initial level pays $1,150, and 84.99% pays about $999.90. Neither filing gives a table row on each side; the diagrams draw the drop.
- The SSPA's **Twin Win Certificate (1340)** has the barrier form: "Profits possible with rising and falling underlying", "Falling underlying price converts into profit up to the barrier", and "If the barrier is breached, the product changes into a Tracker Certificate", so the whole fall then counts ([SSPA Swiss Derivative Map](https://sspa.ch/wp-content/uploads/2020/09/map_en.pdf)). Its barrier is drawn as observed during the product's lifetime, which the model does not support ([barrier.md](barrier.md)).

## Proposal

Absolute return belongs to downside participation, after the buffer and before the rate:

```json
{ "direction": "downside", "buffer": 0.15, "absoluteReturn": { "rate": 1 }, "rate": 1 }
```

```text
underlier return = final level / initial level - 1

participated return =
  upside rate × return,                        when the return is positive and upside is selected
  absolute return rate × |return|,             when -buffer ≤ return ≤ 0
  downside rate × (return + buffer),           when return < -buffer

unfloored payment = principal × (1 + participated return), with the cap applied to upside participation only
maturity payment  = max(floor, unfloored payment)
```

One rule covers it: absolute return pays when downside participation applies to none of the fall. With a buffer, that is a fall no larger than the buffer. The same rule would cover a fall that leaves the final level at or above a barrier, which is why absolute return sits on downside participation rather than inside the buffer.

## Decisions

1. **Absolute return is a sub-feature of downside participation**, not of the buffer. A buffer or a barrier marks where downside participation starts. Absolute return decides what happens before that, so it belongs to the same direction as both. Its key comes after `buffer` and before `rate`, in the order the payment applies them.
2. **It requires a buffer.** Without a buffer or barrier, downside participation applies to every fall, so absolute return has no range to pay in. The barrier form (the SSPA Twin Win) is public, but no filing with its exact terms has been read, so absolute return with a barrier is not allowed yet.
3. **A cap limits upside participation only.** This follows the capped note, where the maximum upside payment applies to the upside case alone, and it follows the model: since section 15 of the plan the cap is part of upside participation. Until now the payment applied the cap to any payment above it, which made no difference because only a rise could pay more than principal. With absolute return a fall can too, so the payment changes to apply the cap only on a rise. A cap below the buffer is allowed: with a 10% cap and a 15% buffer, a 15% fall pays 1,150 while no rise pays more than 1,100. No public note shows this, and it is not prevented.
4. **Upside participation is not required.** Without it a rise repays principal and a fall within the buffer pays a gain. No public note with this shape was found, but the rule is well defined without upside participation.
5. **The rate is a term**, greater than zero, because both notes state it as one. Neither shows a rate other than 100%.
6. **The edge belongs to absolute return.** A fall of exactly the buffer pays the full absolute return, as both notes say ("greater than or equal to the buffer level"). This matches the barrier, where a final level at the barrier repays principal. As in the notes, the payment compares the final level with the buffer level, initial level × (1 − buffer), rather than the return with the buffer, which floating-point arithmetic would put just outside it.
7. **A flat return stays in the upside case.** The model treats a flat return as upside. The participation and leveraged notes put an unchanged level in the absolute return case instead, but there both cases pay principal, so only the label in the calculation differs. The jump note puts it in the upside case, where it matters: an unchanged level pays the fixed upside payment, $1,530 in its example, not principal. The model's choice agrees with that note.
8. **The minimum payment stays derived.** Both notes state a "minimum payment at maturity" equal to the buffer amount. It follows from the buffer and a 100% downside rate (a final level of 0 pays principal × buffer), so it is not a separate term.

## Consequences

- **Outline.** Absolute return nests under Downside participation, after Buffer, with its rate. The Add feature menu marks it "Needs a buffer" until a buffer exists, as the buffer is marked until downside participation exists. Removing the buffer removes absolute return.
- **Summary, payment rule and outcome.** The summary adds "paying the fall as a gain within the buffer". The payment rule adds the absolute return line between the upside and downside lines. The outcome sentence says, within the buffer, that the fall is paid as a gain, and beyond it, that the absolute return no longer applies.
- **Calculation.** An absolute return step, e.g. `Absolute return 100% × |−5%| = 5%`. It is muted beyond the buffer and on a rise.
- **Chart.** The line rises to the left of the initial level, up to the buffer level, then drops to the buffered loss. It is drawn as two pieces with no connecting segment, as for the barrier. Absolute return needs its own colour, checked against the colours it can touch: downside, upside, buffer, cap, protection and principal.
- **Scenarios.** One row at the buffer level, marked "at buffer": the most the absolute return can pay. It moves with the buffer and replaces a fixed row at the same level, as the barrier row does.
- **Structure JSON.** `absoluteReturn` appears under downside participation, as in the proposal.
- **Marketing names.** None at first. "Dual directional" appears only in issuer product names here, and the SSPA's Twin Win describes the barrier form, not the buffered one. See the open questions.
- **Deposits.** A deposit has no downside participation, so it cannot have absolute return. No new rule is needed.

## Synthetic worked example

Principal 1,000, initial level 100, 120% upside participation with a 40% cap, a 15% buffer, 100% absolute return, 100% downside participation, no protection.

| Final level | Return | Case | Participated return | Payment |
| ---: | ---: | :--- | :--- | ---: |
| 140 | +40% | Upside, capped | 120% × 40% = 48%, capped at 40% | 1,400 |
| 110 | +10% | Upside | 120% × 10% = 12% | 1,120 |
| 100 | 0% | Upside | 0% | 1,000 |
| 95 | −5% | Absolute return | 100% × 5% = 5% | 1,050 |
| 85 | −15% | Absolute return, at the buffer | 100% × 15% = 15% | 1,150 |
| 84.99 | −15.01% | Beyond the buffer | 100% × (−15.01% + 15%) = −0.01% | 999.90 |
| 50 | −50% | Beyond the buffer | 100% × (−50% + 15%) = −35% | 650 |
| 0 | −100% | Beyond the buffer | 100% × (−100% + 15%) = −85% | 150 |

With a 90% protection floor added, the last two rows pay 900. The floor does not reach the absolute return range, which always pays at least principal.

## Assumptions and limits

- The fall is measured from the level the buffer is measured from: the initial level, or the lookback level when the note has lookback ([lookback.md](lookback.md)).
- With averaging, the absolute return reads the averaged final level, as the buffer does. No averaging note with absolute return was verified.
- The payoff describes contractual maturity amounts, not present value, investment advice, or guaranteed issuer payment.
- Levels and amounts are synthetic.

## Open questions

1. **Absolute return above a barrier.** The SSPA Twin Win has this form, with a barrier observed during the product's lifetime. Is there a public note with a barrier observed on the final date only, which the model could express? It would allow absolute return with a barrier without changing the rule above.
2. **Rates other than 100%.** Is there a public note whose absolute return participation rate is not 100%?
3. **A maximum on the absolute return itself.** Both notes bound it with the buffer alone. Does any note state a separate maximum?
4. **Names.** Is there a generic public name for the buffered form? "Twin win" may be used loosely for it, but the SSPA definition is the barrier form.
5. **A fixed upside payment.** The jump note pays the greater of the underlier's rise and a fixed return whenever the final level is at or above the initial level. That is an upside feature the model does not have. It is close to the deposit's minimum return, but paid only when the underlier has not fallen, so the payment jumps at the initial level as well as at the buffer. Absolute return does not depend on it, and it is not part of this increment.
6. **Worst-of.** The leveraged note applies the rule to the worst performing of three indices. It is modelled when worst-of is ([basket.md](basket.md)).
