# Early redemption rights: public sources

Research record, read 8 November 2026. It asks which equity-linked products carry a holder put, an issuer call and an automatic call, alone or together. The autocall and the issuer call are built, alone or together; the holder put is not. The working definitions of each right are in [feature-map.md](feature-map.md), and the issuer call is in [issuer-call.md](issuer-call.md).

## Established from the filings

### One product with all three rights

Morgan Stanley's S&P 500 Crude Oil Linked ETNs due 1 July 2031 ([Pricing Supplement No. 27, Amendment No. 1, 424B2](https://www.sec.gov/Archives/edgar/data/895421/000095010311005435/dp27830_424b2-ps27.htm)) state an automatic call, an issuer call and a holder repurchase right on the same security.

| Right | Filing's term | What ends the product | When | Payment |
| :--- | :--- | :--- | :--- | :--- |
| Automatic | "Automatic call" | The intraday indicative value "has declined by at least 50%" from the closing indicative value at the most recent index rebalancing (the $25 principal before the first) | "at any time during any index business day" | Repurchase settlement amount |
| Issuer | "Issuer call right" | The issuer's choice, in whole, on at least three business days' notice | "at any time" | Repurchase settlement amount |
| Holder | Repurchase right | The holder, for 100,000 ETNs or more, by irrevocable notice | Any repurchase date; last notice 25 June 2031 | Repurchase settlement amount less a 0.125% fee |

- **Repurchase settlement amount:** principal × index performance ratio, less a tracking fee of 0.79% a year. At maturity the ETN pays the same amount.
- **The rights interact through the valuation date.** A call notice sent before or on the day of a holder's repurchase notice, or the day an automatic call is triggered, makes the call notice date the valuation date. No ordering is stated between a holder's notice and an automatic call.
- **The underlier is only partly equity.** The index combines the S&P 500 Total Return Index with long crude oil futures, $1 of equity exposure and $1 of oil exposure for each $1 of principal. The filing says the ETNs are not a hedged investment, despite the index's name.
- **It differs from the autocall this reference models.** The automatic call is a stop-loss on a fall, tested continuously on the ETN's own value against a level reset monthly, and it pays current value. The reference's autocall tests the underlier at or above a trigger on stated reviews and pays principal plus a call amount.

### Holder rights on equity-linked products

| Product | Linked to | Holder's right | Payment | Issuer's right |
| :--- | :--- | :--- | :--- | :--- |
| [UBS Open End Certificate on the Solactive Value Investoren TR Index](https://keyinvest-ch-fr.ubs.com/filedb/deliver/xuuid/g001b82e5defe78560eb1b87ce552da87a48/name/DE000UBS1SV7_Termsheet_en.pdf) (2012) | Equity index of investment companies | Each 30 June from 2013, effective one year after exercise | The redemption amount on the effective date, after a 0.35% a year fee | At any time, three months' notice, same amount |
| [BCV Tracker Certificate, Piguet Galland Méga-tendances USD](https://www.bcv.ch/termsheet/54357232_en.pdf) (2020) | Actively managed basket of equity certificates | Last Tuesday of each quarter, from nine months after issue, one month's notice | Basket value on the effective date | At any time from nine months after issue, one month's notice, same formula; also below 25% of the issue price |
| [JPMorgan Alerian MLP Index ETNs due 2044](https://www.sec.gov/Archives/edgar/data/19617/000121390023097004/ea167102_424b2.htm) (preliminary) | Energy master limited partnership index | Weekly, minimum 50,000 notes | Intrinsic value less 0.125% | From 26 July 2024, on five business days' notice, intrinsic value |
| [3.625% Puttable Equity-Linked Senior Notes](https://www.sec.gov/Archives/edgar/data/38067/000095012311083052/R14.htm) | The issuer's own Class A shares | At any time before maturity or a put termination date (2014 notes) | 68.7758 shares per $1,000 | None found; the issuer may end the put when its shares are at least 130% of the put value price |

- **Three pay current value.** The UBS, BCV and JPMorgan products pay what the product is worth under its own formula on the valuation date, on a holder's exercise and on an issuer's termination alike. The definition in earlier versions of the feature map, a stated put price, does not describe them.
- **Which right prevails.** BCV states it: the investor may terminate "provided that the Issuer has not already exercised its right of termination".
- **The corporate note** works as a convertible bond and is not a structured product example. The page read does not name the issuer.

### Holder rights outside equity

- **A stated put price.** [BofA Finance floating rate senior notes due 2075, 424B2](https://www.sec.gov/Archives/edgar/data/1682472/000191870425003048/form424b2.htm) (preliminary) pay compounded SOFR plus a spread. Holders may require repayment each 28 February from 2027 to 2074, at 97% of principal from 2027, 98% from 2030, 99% from 2033 and 100% from 2036, plus accrued interest, on 30 to 60 days' notice.
- **Oil and volatility ETNs** carry the same weekly or daily holder redemption as the equity ones. They are not equity-linked, so they are not sources here.

### Conventional notes treat the calls as alternatives

- **BofA Finance:** "The notes will either be callable by BofA Finance LLC at its option prior to maturity ... or automatically callable prior to maturity" ([product supplement](https://www.sec.gov/Archives/edgar/data/70858/000119312523201261/d518933d424b2.htm)).
- **Barclays:** its Trigger Phoenix Callable Optimization Securities "will not be automatically called under any circumstances" ([424B2](https://www.sec.gov/Archives/edgar/data/312070/000095010314000513/dp43385_424b2-ubs17.htm)).
- **Holder repayment is usually excluded.** Morgan Stanley's [equity-linked product supplement](https://www.sec.gov/Archives/edgar/data/895421/000095010323016337/dp202677_424b2-epselnotes.htm) says "You will not have the right to present the notes to us for repayment prior to maturity, unless we otherwise specify", and that the pricing supplement will say whether notes are "puttable by you". No such note was found.

## What was not found

- **A classic autocall beside an issuer call.** No product was found with a level-triggered upside autocall on observation dates and a discretionary issuer call.
- **A fixed-term structured note with a holder put**, on an equity underlier.
- **An equity-linked product with a stated put price.**

**How far the search went.** Web searches of SEC filings, Swiss termsheets and European final terms, and EDGAR full-text queries limited to 424B2. About 15 filings were opened and read. Most EDGAR hits were not opened (147 for "automatic call" with "issuer call", 1,152 for "automatic early redemption" with "at our election"), and Swiss and European documents were mostly seen as search excerpts, so these are gaps in what was read, not evidence that no such product exists.

Two false leads, recorded so they are not chased again:

- The [Barclays AutoCallable Notes due 2027](https://www.sec.gov/Archives/edgar/data/312070/000119312517067609/d347422d424b2.htm) carry "ISSUER CALL" in a header line, but the body, read in full, has only the automatic call.
- Some JPMorgan and BofA issuer-callable notes mention being "automatically called" in passing, without defining an automatic call in the parts read ([example](https://www.sec.gov/Archives/edgar/data/19617/000182912621014830/jpm_424b2.htm)).

## What this means for the reference

- **The rights can sit on one product**, so a model of one redemption kind per product cannot describe the Morgan Stanley ETN or the three holder-right products above, which all have an issuer's right as well.
- **None of these is a sample yet.** Each needs something the reference does not model: an open-ended term, a term beyond 120 months, a running fee, or an intraday trigger.

## Decisions

- **Shape.** A redemption is `bullet` or `early-redemption`, and an early redemption lists its `mechanisms`, at least one and at most one of each kind. The order has no meaning. The adjustment factor stays on the redemption, since it belongs to the maturity payment.
- **Composition.** Each mechanism keeps its own schedule and rule. The product ends on the earliest event, compared by month.
- **Same date (assumption).** The issuer's call comes first and the trigger is not tested. No source states a rule for an upside autocall and an issuer call, since none has both. The Morgan Stanley ETN gives the issuer's notice precedence over an automatic call on the same day, and this follows it. There is no field for this: one can be added if a source states otherwise.
- **The combination is allowed deliberately**, with no public example found, because each part is already defined. The book says so.

## Open questions

1. Whether a put pays current value, a stated price, or either.
2. Whether a running fee or an open-ended term should be modelled, since most holder-right products have one.
3. Whether the issuer's call should also be able to pay current value, as it does on the products with holder rights above.
