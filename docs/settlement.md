# Settlement

Proposed on 4 November 2026; nothing is built. The model calculates what a payment is worth, and treats all of it as cash. This proposal adds the term that says part of it can arrive as shares of the underlier. It reverses an earlier decision that settlement belongs with issuance ([coupon.md](coupon.md), [call-and-coupon-names.md](call-and-coupon-names.md)), so it needs agreement before any code.

## What it means

**Settlement** is the form a payment takes. In **cash settlement** the holder receives money. In **physical settlement**, or **delivery**, the holder receives shares of the underlier, and usually cash for any fraction of a share.

Delivery does not change what the payment is worth on the final date. The share count is fixed when the note is priced, so after a fall the holder owns shares worth less than principal, valued at the final level. What it changes is what the holder ends up owning: from then on the holder has shares, with their price risk, and not a claim for money.

## Established concepts

Eight public documents that deliver, and one that does not, were read on 4 November 2026. The seven SEC filings were read through a summarising fetch tool, not as raw text. The two Swiss documents were read as text extracted from their PDFs.

| Document | Underlier | Downside | Coupon and call | What it delivers |
| :--- | :--- | :--- | :--- | :--- |
| [Credit Suisse 2022, 424B2](https://www.sec.gov/Archives/edgar/data/1053092/000095010322016505/dp181209_424b2-f2006.htm) | Worst of two stocks | 45% barrier, final date | Fixed; autocall | Principal ÷ initial level of the worst |
| [RBC 2019, 424B2](https://www.sec.gov/Archives/edgar/data/1000275/000114036119019003/form424b2.htm) | One stock | 75% barrier, final date | Fixed; no call | Principal ÷ initial level |
| [RBC 2014, 424B2](https://www.sec.gov/Archives/edgar/data/0001000275/000121465914006589/j924142424b2.htm) | Worst of three stocks | 75% trigger, final date | Contingent; autocall | Principal ÷ initial level of the worst |
| [JPMorgan 2014, 424B2](https://www.sec.gov/Archives/edgar/data/0000019617/000095010314005611/dp48621_424b2-2767.htm) (preliminary) | One stock | 60% barrier, every close | Fixed; autocall | Principal ÷ initial level, if the final level is also below the initial level |
| [RBC 2009, 424B2](https://www.sec.gov/Archives/edgar/data/0001000275/000121465909000107/f11490424b2.txt) | One stock | Buffer, rate 1 | Fixed; no call | Principal ÷ initial level, **plus cash of principal × buffer** |
| [TD 2025, 424B2](https://www.sec.gov/Archives/edgar/data/947263/000114036125006567/ef20044740_424b2.htm) | One exchange-traded fund | 10% buffer, rate 1 ÷ 0.9 | None; digital return above the buffer | **Principal ÷ buffer level**, with no other cash |
| [ZKB 2026, final terms](https://data.payoff.ch/termsheets/CH1534733378_en_20260423_002844.pdf) | Worst of three stocks | 53% barrier, continuous | Fixed; no call | Principal ÷ initial level of the worst, if any final level is below its initial level |
| [Julius Baer, termsheet](https://docs.juliusbaer.com/documents/alias/KeyInformation_149842130_EN) | Worst of three stocks | 65% barrier, final date | Coupon; a 105% lock-in | Denomination × FX rate ÷ strike of the worst |

A ninth document points the other way. The [RBC 2020 geared buffered reverse convertible](https://www.sec.gov/Archives/edgar/data/1000275/000114036120009067/form424b2.htm) is linked to an index and pays only cash: 20% buffer, rate 1.25, 625 at a final level of 50.

| Finding | Evidence |
| :--- | :--- |
| **Delivery happens only where the holder bears a fall.** A call, a coupon, and a payment of principal or more are always cash. | All eight |
| **It does not depend on the coupon or the call.** It appears with a fixed coupon, a contingent coupon and none, with an autocall and with no call. | The table above |
| **It does not depend on the wrapper.** Notes and Swiss and German certificates all deliver. | The table; [certificate.md](certificate.md) |
| **A barrier reached is not enough.** If the barrier was reached during the term but the final level is at or above the initial level, the holder receives cash. | JPMorgan 2014; ZKB 2026 |
| **The worst stock is the one delivered**, and its own initial level sets the count. ZKB's ratios of 5.028411, 2.431788 and 2.989805 are 1,000 ÷ each initial level. | Credit Suisse; RBC 2014; ZKB; Julius Baer |
| **A fraction of a share is paid in cash at the final level**, so rounding does not change the value on the final date. | Credit Suisse, TD 2025 and Julius Baer state it. RBC 2009 and RBC 2014 do not state a price. |
| **The issuer can often pay cash instead**, of equal value at the final level. Not all reserve this: TD only falls back to cash if delivery is prohibited or impractical. | Credit Suisse; all three RBC delivering notes; JPMorgan 2014 |
| **The holder bears the price move from the final date to payment.** The filings state the value on the valuation date. | TD 2025 warns of this directly |
| **An index is settled in cash**, even under the name "reverse convertible". | RBC 2020 |

## The main finding: the terms already state the delivery

A buffer looked as if it would need a conversion price of its own. It does not. A fall that downside participation applies to pays:

```text
payment = principal × (1 − rate × (fall − buffer))
```

Rewriting this as a number of shares at the final level plus a fixed amount of cash:

```text
shares = principal × rate ÷ initial level
cash   = principal × (1 − rate × (1 − buffer))
```

No buffer means a buffer of 0. All three patterns in the filings are this one formula, from terms the model already has:

| Pattern | Rate | Buffer | Shares | Cash |
| :--- | ---: | ---: | :--- | :--- |
| Barrier (Credit Suisse, RBC 2019, JPMorgan) | 1 | 0 | principal ÷ initial | 0 |
| Buffer at rate 1 (RBC 2009) | 1 | b | principal ÷ initial | principal × b |
| Geared buffer (TD 2025) | 1 ÷ (1 − b) | b | principal ÷ buffer level | 0 |

Each was run through `maturityPayment` in a throwaway script, and shares × final level + cash equals the model's payment:

| Case (principal, initial level) | Final level | Model | Shares | Cash |
| :--- | ---: | ---: | ---: | ---: |
| Credit Suisse terms (1,000, 100) | 40 | 400.00 | 10 | 0 |
| RBC 2019 terms (1,000, 100) | 50 | 500.00 | 10 | 0 |
| RBC 2009 terms (1,000, 100) | 75 | 950.00 | 10 | 200 |
| TD 2025 terms (10,000, 100) | 80 | 8,888.89 | 111.1111 | 0 |
| JPMorgan 2014 terms (1,000, 83.45), lowest close 41.73 | 79.28 | 950.03 | 11.9832 | 0 |

All five are the filings' own example values. So **delivery adds no arithmetic and no new number**: the payment stays as it is, and settlement only says what form it takes.

## Smallest model

A term on downside participation, beside the buffer and the barrier:

```json
{ "direction": "downside", "barrier": { "level": 0.45, "observation": "final" }, "rate": 1, "settlement": "delivery" }
```

- **`settlement?: 'cash' | 'delivery'`**, with cash when absent, in the style of `callAmountBasis`.
- **No share count, conversion price or ratio.** They are derived, as above.
- **No rounding, cash election, or adjustment factor.** These are mechanics with no effect on the value on the final date. A hint can state them in words.
- **The payment function is unchanged.** A new pure function reports the shares, the cash and which asset, from the payment's own inputs.

### Where it goes

Three homes were considered.

| Home | For | Against |
| :--- | :--- | :--- |
| **On downside participation (recommended)** | Every document delivers only where the holder bears a fall. A note with no downside cannot state delivery at all, so a deposit and barrier absolute return are ruled out with no rule. It matches how the type already holds the features that only make sense with a fall. | It sits inside the payoff although it is not arithmetic. A delivery on a rise, if one exists, would not fit. |
| A `settlement` field beside `payoff` | Termsheets list settlement as a term of its own. It would keep settlement visibly apart from the payoff. | It needs rules for what it applies to, and it reads as if the whole note were settled that way, which no document does. |
| Under the wrapper | None | Settlement varies among notes with the same legal form. |


## The rules

**When delivery applies.** At the end of the term, when all of these hold:

1. No call has ended the product.
2. The final level is below the initial level.
3. Downside participation sets the payment: the barrier was reached, or the fall is beyond the buffer, and no digital return's floor applies.

Otherwise the payment is cash.

**What is delivered.** `shares = principal × rate ÷ initial level` of the single asset or the worst-of asset with the lowest return, using that asset's own initial level, and `cash = principal × (1 − rate × (1 − buffer))`.

**Validation.**

| Combination | Result | Why |
| :--- | :--- | :--- |
| Rate × (1 − buffer) above 1 | Rejected | The cash would be negative: the holder would owe the issuer. Compare with a tolerance, since (1 ÷ 0.9) × 0.9 may not be exactly 1 in floating point. |
| An index or strategy index, including any such component of a worst-of | Rejected | It cannot be delivered, and any component can end up the worst. |
| A weighted or best-of basket | Rejected | No public note read does this, and it is not settled which assets would be delivered. |
| An averaged final level | Rejected | The shares are worth their close, not an average, so shares × final level would not equal the payment. |
| Principal protection | Rejected | A floor is not a share count plus fixed cash, and no note read has both. |
| Rate below 1, for example shares for half the fall and cash for the rest | Allowed, stated | Coherent, by the formula. No public note was read with it. |
| Lookback initial level, on a single asset | Allowed, stated | Coherent: the determined initial level sets the count. No public note was read with it. |
| Absolute return | Allowed, stated | Coherent: a fall paid as a gain is cash, and one past it is delivered. No public note was read with it. |

## Synthetic worked examples

A note of 1,000 on Synthetic Stock, initial level 100, delivering.

| Downside | Final level | Payment | Holder receives |
| :--- | ---: | ---: | :--- |
| Barrier at 45%, rate 1 | 60 | 1,000.00 | Cash |
| Barrier at 45%, rate 1 | 40 | 400.00 | 10 shares |
| Buffer of 20%, rate 1 | 75 | 950.00 | 10 shares and 200.00 in cash |
| Buffer of 10%, rate 1 ÷ 0.9 | 80 | 888.89 | 11.1111 shares: 11 shares, with the fraction in cash |

The worst of Stock A (initial level 200) and Stock B (initial level 50), a barrier at 45%, rate 1. Stock A ends at 150, down 25%, and Stock B at 20, down 60%. Stock B is the worst, so the holder receives 1,000 ÷ 50 = 20 shares of Stock B, worth 400.00 at the final level.

## Consequences if agreed

- **Domain.** The optional term, the validation above, and a pure function for shares, cash and asset. `paymentBreakdown` does not change.
- **Schema.** JSDoc, `npm run schema`, an example for each pattern, boundary cases, and the rules added to the validator-only list.
- **Interface.** A Settlement row under Downside participation, offering Cash and Delivery, with Delivery unavailable on an index. It must not shift the layout when selected. The calculation and outcome state the shares and the cash. The chart keeps drawing value at the final level.
- **Book.** A new chapter, and notes in chapters 2, 5, 11, 12 and 21. It says that the value shown is on the final date and that a holder of shares bears later moves.
- **Samples.** A delivering sample needs synthetic stocks, since the worst-of samples use synthetic indices. The Credit Suisse note ([coupon.md](coupon.md), decision 6) would then show something new and could become one.
- **The scope rule.** The docs that place settlement under issuance change to: *whether a note can deliver is structure; the mechanics of delivering are issuance*.

## Differences this does not cover

These appear in the documents above and belong to other concepts:

- **Barrier edge and observation.** ZKB's knock-in is when a value "touches or falls below" the level, continuously, and Julius Baer's is "at or below" it. The model reads closes, strictly below ([daily-observation.md](daily-observation.md)).
- **Lock-in and quanto.** Julius Baer's 105% lock-in pays cash once reached, and its share count includes an FX rate. Neither is modelled.
- **A strike below the initial level.** See [certificate.md](certificate.md), open question 3.

## Assumptions

- Eight documents from two markets are a modest sample, and three of them come from one issuer. "Only where the holder bears a fall" rests on them, and no search was made for notes that deliver on a rise, such as exchangeable notes.
- The US and Swiss documents describe the same concept, though their terms differ: physical delivery amount and ratio.
- The summarising fetch tool produced most of the SEC quotations. The calculations above agree with them, but the quotations were not checked against the printed filings.

## Open questions

1. **Does delivery count as structure?** This reverses the earlier decision. The proposal says yes, for the term only, on the ground that it changes what the holder ends up owning.
2. **Is the term on downside participation?** Recommended above. It would need revisiting if a note that delivers on a rise is read.
3. **Should the "Reverse convertible" name wait for this?** The name was held back because it was tied to delivery. RBC 2020 uses it for a cash-only note on an index, and SSPA's 1230 is a Yield Enhancement type whose ZKB example states "cash or physical settlement". So the name may belong to a coupon with downside participation and no upside, whatever the settlement. That can be decided without building delivery, but needs more reading of the SSPA and FINRA definitions.
4. **Funds.** TD delivers shares of an exchange-traded fund, and the model's asset kinds are equity, equity index and strategy index. Delivery needs either a fund kind or `equity` read to include fund shares. The proposal leaves delivery on `equity` first, as the smallest step, which excludes TD's underlier.
5. **Should the interface state a share count that is not whole?** The formula gives 11.1111 where a holder receives 11 and cash. The proposal shows the count to four decimal places, as TD does, and states that fractions are paid in cash.
