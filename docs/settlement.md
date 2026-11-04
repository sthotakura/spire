# Settlement

Proposed on 4 November 2026; nothing is built. The model calculates what a payment is worth, and treats all of it as cash. This proposal adds a term on the product that says part of it can arrive as shares of the underlier. It was agreed to be a term on the product, which changes an earlier decision that settlement belongs with issuance. The rest of the proposal still needs agreement before any code.

## What it means

**Settlement** is the form a payment takes. In **cash settlement** the holder receives money. In **physical settlement**, or **delivery**, the holder receives shares of the underlier, and usually cash for any fraction of a share.

Delivery does not change what the payment is worth on the final date. The share count is fixed when the note is priced, so after a fall the holder owns shares worth less than principal, valued at the final level. What it changes is what the holder ends up owning: from then on the holder has shares, with their price risk, and not a claim for money.

## Established concepts

These are reverse convertibles with a barrier or a buffer. The classic form, with neither, has its section below. All were read on 4 November 2026. The SEC filings were read through a summarising fetch tool, not as raw text. The Swiss documents and the two explainers were read as text extracted from their PDFs.

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
| **In a reverse convertible, delivery happens only where the holder bears a fall.** A call, a coupon, and a payment of principal or more are always cash. | All eight, and the classic form below. The ELKS below is not a reverse convertible and delivers on a rise too. |
| **It does not depend on the coupon or the call.** It appears with a fixed coupon, a contingent coupon and none, with an autocall and with no call. | The table above |
| **It does not depend on the wrapper.** Notes and Swiss and German certificates all deliver. | The table; [certificate.md](certificate.md) |
| **A barrier reached is not enough.** If the barrier was reached during the term but the final level is at or above the initial level, the holder receives cash. | JPMorgan 2014; ZKB 2026 |
| **The worst stock is the one delivered**, and its own initial level sets the count. ZKB's ratios of 5.028411, 2.431788 and 2.989805 are 1,000 ÷ each initial level. | Credit Suisse; RBC 2014; ZKB; Julius Baer |
| **A fraction of a share is paid in cash at the final level**, so rounding does not change the value on the final date. | Credit Suisse, TD 2025 and Julius Baer state it. RBC 2009 and RBC 2014 do not state a price. |
| **The issuer can often pay cash instead**, of equal value at the final level. Not all reserve this: TD only falls back to cash if delivery is prohibited or impractical. | Credit Suisse; all three RBC delivering notes; JPMorgan 2014 |
| **The holder bears the price move from the final date to payment.** The filings state the value on the valuation date. | TD 2025 warns of this directly |
| **An index is settled in cash**, even under the name "reverse convertible". | RBC 2020 |

## The classic reverse convertible

The documents above protect the holder until a barrier or a buffer gives way. The classic form does not. It has a **strike** and nothing else: at or above the strike the holder receives principal, and below it the holder receives shares, whatever happened during the term.

| Source | What it says |
| :--- | :--- |
| [SSPA Swiss Derivative Map, 2025](https://www.six-structured-products.com/arcmsdownload/e543551679ac2d6cfe0e8281c309a4e1/CONTENT.pdf/en_sspaswissmap_2025.pdf) | Reverse Convertible (1220): "If the underlying is below the strike at maturity: delivery underlying and/or cash settlement plus coupon". Barrier Reverse Convertible (1230): "When touching the barrier the product becomes a Reverse Convertible (1220)", and "the coupon is lower than for a reverse convertible (1220) with otherwise identical product conditions". |
| [Vontobel 1220, 10% on three stocks](https://data.payoff.ch/termsheets/CH1400444175_en_20250617_193023.pdf) | 33 months, worst of three, quarterly fixed coupon, no barrier, **strike 80%**. Number of underlyings 11.84413, 93.5979 and 25.02503, which are 1,000 ÷ each strike. |
| [Vontobel 1220, 4.576% on three stocks](https://data.payoff.ch/termsheets/CH1449118699_de_20250830_014205.pdf) | 36 months, worst of three, monthly fixed coupon, no barrier, **strike 75%**. |
| [Vontobel 1220, 7.616% quanto](https://data.payoff.ch/termsheets/CH1483484171_de_20251010_000100.pdf) | Worst of three, quarterly fixed coupon, no barrier, **strike 65%**. Its share count is nominal ÷ strike × an FX rate set at the final fixing. |
| [JPMorgan explainer, Aktienanleihen](https://www.jpmorgan-zertifikate.de/globalassets/library/product-education/items/aktienanleihen_2024_02.pdf) | A fictional single stock: nominal 1,000, strike 10, 8%, 100 shares. At 9.50 the shares are worth 950. With a strike of 9 it refers to 111.1111 shares, and at a final price of 8 pays 111 shares worth 888 and 0.88 for the fraction. |

How it differs from the barrier form, using the model's own payments on a note of 1,000 at an initial level of 10:

| Final level | Classic, strike 100% | Barrier at 80%, strike 100% |
| ---: | ---: | ---: |
| 10.00 | 1,000.00 | 1,000.00 |
| 9.50 | 950.00 **in shares** | 1,000.00 in cash |
| 8.00 | 800.00 **in shares** | 1,000.00 in cash |
| 7.99 | 799.00 **in shares** | 799.00 **in shares** |

- **Its loss starts at the strike, with no jump.** The barrier form pays principal down to the barrier, and then drops. Below the barrier the two pay the same, as SSPA's "becomes" says.
- **Its strike is often below the initial level.** The three Vontobel notes read set it at 65%, 75% and 80%. So its share count divides by the strike, not the initial level.
- **The model can already state its payment.** A strike at the initial level is downside participation at rate 1 with no barrier or buffer. A strike `k` below it is a buffer of 1 − `k` at a rate of 1 ÷ `k`, the same arithmetic as the TD note, reached from another direction.

No filing for a classic form on one stock was found. The searches and about a dozen termsheets found only worst-of forms; the single-stock example is the JPMorgan explainer's fictional one. Nor was a classic form found among US filings, which use a barrier or a buffer.

### A delivery on a rise

The [Citigroup ELKS on one stock, 2004](https://www.sec.gov/Archives/edgar/data/0000200245/000095012304005317/y96650bbe424b3.txt) has no strike below which it converts: it is mandatorily exchangeable. At or below its cap price, about 120% of the initial price, it delivers one share. Above that it delivers shares worth the cap price, or cash at the issuer's option. Unlike every note above, the holder receives shares when the stock has risen. The model states its payment as downside rate 1, upside rate 1 and a cap of 20%, but it is not a reverse convertible, and the proposed term would not cover it.

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

No buffer means a buffer of 0. All the patterns read are this one formula, from terms the model already has:

| Pattern | Rate | Buffer | Shares | Cash |
| :--- | ---: | ---: | :--- | :--- |
| Barrier (Credit Suisse, RBC 2019, JPMorgan) | 1 | 0 | principal ÷ initial | 0 |
| Buffer at rate 1 (RBC 2009) | 1 | b | principal ÷ initial | principal × b |
| Classic, strike at the initial level (JPMorgan explainer) | 1 | 0 | principal ÷ initial | 0 |
| Classic, strike `k` below it (Vontobel), or geared buffer (TD 2025) | 1 ÷ `k` | 1 − `k` | principal ÷ strike | 0 |

Each was run through `maturityPayment` in a throwaway script, and shares × final level + cash equals the model's payment:

| Case (principal, initial level) | Final level | Model | Shares | Cash |
| :--- | ---: | ---: | ---: | ---: |
| Credit Suisse terms (1,000, 100) | 40 | 400.00 | 10 | 0 |
| RBC 2019 terms (1,000, 100) | 50 | 500.00 | 10 | 0 |
| RBC 2009 terms (1,000, 100) | 75 | 950.00 | 10 | 200 |
| TD 2025 terms (10,000, 100) | 80 | 8,888.89 | 111.1111 | 0 |
| JPMorgan 2014 terms (1,000, 83.45), lowest close 41.73 | 79.28 | 950.03 | 11.9832 | 0 |
| JPMorgan explainer, strike 9 (1,000, 10) | 8 | 888.89 | 111.1111 | 0 |
| Vontobel terms, strike 80% (1,000, 105.54) | 63.32 | 749.97 | 11.8441 | 0 |

The first six are the documents' own example values, the explainer's rounded to 888.88. The last checks the termsheet's stated share count, at a final level chosen here. So **delivery adds no arithmetic and no new number**: the payment stays as it is, and settlement only says what form it takes.

## Smallest model

A term on the product, beside the redemption and the coupon:

```json
{
  "wrapper": "note",
  "redemption": "bullet",
  "settlement": "delivery",
  "payoff": { "participations": [{ "direction": "downside", "barrier": { "level": 0.45, "observation": "final" }, "rate": 1 }] }
}
```

- **`settlement?: 'cash' | 'delivery'`**, with cash when absent, in the style of `callAmountBasis`.
- **No share count, conversion price or ratio.** They are derived, as above.
- **No rounding, cash election, or adjustment factor.** These are mechanics with no effect on the value on the final date. A hint can state them in words.
- **The payment function is unchanged.** A new pure function reports the shares, the cash and which asset, from the payment's own inputs.

### Where it goes

**Decided: on the product.** Delivery may be a result of what participation does, but how the product settles is an attribute of the product. Participation says how much is owed. Settlement says how the product pays it. Termsheets agree, listing "Mode of settlement" or "Settlement" among the product's terms.

The term therefore states the product's method, and the payoff states when it comes into play. A product with delivery settlement still pays a coupon, a call and principal in cash, as the rules below say.

| Home | For | Against |
| :--- | :--- | :--- |
| **On the product (decided)** | It keeps settlement apart from the payoff arithmetic, and matches how termsheets list it. A later product such as the ELKS can use it too, with a rule of its own. | It needs validation for what it applies to, since a product with no downside participation has nothing to deliver. |
| On downside participation | A product with no downside could not state delivery at all. | It makes the method of payment a part of the participation, and the ELKS delivers on a rise too. |
| Under the wrapper | None | Settlement varies among notes with the same legal form. |


## The rules

**When delivery applies.** At the end of the term, when all of these hold:

1. No call has ended the product.
2. The final level is below the initial level.
3. Downside participation sets the payment: there is no barrier or it was reached, the fall is beyond any buffer, and no digital return's floor applies. A classic form has neither barrier nor buffer, or only the buffer that states its strike.

Otherwise the payment is cash.

**What is delivered.** `shares = principal × rate ÷ initial level` of the single asset or the worst-of asset with the lowest return, using that asset's own initial level, and `cash = principal × (1 − rate × (1 − buffer))`.

**Validation.**

| Combination | Result | Why |
| :--- | :--- | :--- |
| No downside participation, which also rules out a deposit and barrier absolute return | Rejected | Nothing would be delivered. A product could state delivery and never deliver, so it is an issue, not ignored. |
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
| Classic, strike at the initial level: no barrier, no buffer, rate 1 | 95 | 950.00 | 10 shares |
| Classic, strike 80%: buffer of 20%, rate 1.25 | 80 | 1,000.00 | Cash |
| Classic, strike 80%: buffer of 20%, rate 1.25 | 60 | 750.00 | 12.5 shares: 12 shares, with the fraction in cash |

The worst of Stock A (initial level 200) and Stock B (initial level 50), a barrier at 45%, rate 1. Stock A ends at 150, down 25%, and Stock B at 20, down 60%. Stock B is the worst, so the holder receives 1,000 ÷ 50 = 20 shares of Stock B, worth 400.00 at the final level.

## Consequences if agreed

- **Domain.** The optional term, the validation above, and a pure function for shares, cash and asset. `paymentBreakdown` does not change.
- **Schema.** JSDoc, `npm run schema`, an example for each pattern, boundary cases, and the rules added to the validator-only list.
- **Interface.** A Settlement row at product level, beside Redemption, offering Cash and Delivery, with Delivery unavailable on an index or with no downside participation. It must not shift the layout when selected. The calculation and outcome state the shares and the cash. The chart keeps drawing value at the final level.
- **Book.** A new chapter that sets out the classic and barrier forms side by side, and notes in chapters 2, 5, 11, 12 and 21. It says that the value shown is on the final date and that a holder of shares bears later moves.
- **Samples.** A delivering sample needs synthetic stocks, since the worst-of samples use synthetic indices. The Credit Suisse note ([coupon.md](coupon.md), decision 6) would then show something new and could become one.
- **The scope rule.** The docs that place settlement under issuance change to: *whether a note can deliver is structure; the mechanics of delivering are issuance*.

## Differences this does not cover

These appear in the documents above and belong to other concepts:

- **Barrier edge and observation.** ZKB's knock-in is when a value "touches or falls below" the level, continuously, and Julius Baer's is "at or below" it. The model reads closes, strictly below ([daily-observation.md](daily-observation.md)).
- **Lock-in and quanto.** Julius Baer's 105% lock-in pays cash once reached, and its share count includes an FX rate. Neither is modelled.
- **A strike below the initial level on an upside participation.** See [certificate.md](certificate.md), open question 3.
- **A barrier beside a strike below the initial level.** The model can state a strike below the initial level, or a barrier, but not both: a barrier's rate applies to the whole fall from the initial level. Every barrier note read here has its strike at 100%.
- **A strike above the initial level** would lose money on a rise, which downside participation cannot state. None was read.

## Assumptions

- The sample is modest, and leans on two issuers: three notes from RBC and three from Vontobel. "Only where the holder bears a fall" rests on the reverse convertibles read. One search for classic forms turned up the ELKS; exchangeable notes were not searched for as such.
- The classic form is established by SSPA's definition, one issuer's worst-of termsheets and an explainer, not by a single-stock filing.
- The US and Swiss documents describe the same concept, though their terms differ: physical delivery amount and ratio.
- The summarising fetch tool produced most of the SEC quotations. The calculations above agree with them, but the quotations were not checked against the printed filings.

## Decisions

1. **Settlement is a term on the product**, not on participation or the wrapper. Agreed on 4 November 2026.
2. **The term is a plain value, cash or delivery.** Rounding, fractions and an issuer's cash option do not change the value on the final date, so a hint states them. Agreed on 4 November 2026.
3. **The reverse convertible names do not wait for it.** SSPA's and FINRA's wording allow cash or shares. Built on 4 November 2026 ([call-and-coupon-names.md](call-and-coupon-names.md)).

## Open questions

1. **Funds.** TD delivers shares of an exchange-traded fund, and the model's asset kinds are equity, equity index and strategy index. Delivery needs either a fund kind or `equity` read to include fund shares. The proposal leaves delivery on `equity` first, as the smallest step, which excludes TD's underlier.
2. **Should the interface state a share count that is not whole?** The formula gives 11.1111 where a holder receives 11 and cash. The proposal shows the count to four decimal places, as TD does, and states that fractions are paid in cash.
3. **Should the strike be a term of its own?** The model reaches a classic strike of 80% through a buffer of 20% and a rate of 125%. That needs no new field, and it is the same arithmetic, but a reader looking for a strike will not find one. The proposal keeps the model as it is and explains the equivalence in the book and a hint. A named strike would state the same thing twice.
