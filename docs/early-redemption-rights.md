# Early redemption rights: public sources

Research record, read 8 November 2026, with three Luxembourg-listed pricing supplements and two other filings added on 27 November 2026. It asks which equity-linked products carry a holder put, an issuer call and an automatic call, alone or together. The autocall, the issuer call and the holder put are built, alone or together; the holder put at current value, on a tracker ([holder-put.md](holder-put.md)). The working definitions of each right are in [feature-map.md](feature-map.md), and the issuer call is in [issuer-call.md](issuer-call.md).

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
| [Citigroup Global Markets Funding Luxembourg notes on the Citi US Equity Put Ratio Series 6 EUR TR Index, Series CGMFL213839](sources/puttable/XS3463578438-pricing-supplement.pdf) (2026, due 2031) | Proprietary equity strategy index | Any Index Business Day before the final valuation date, for "some or all" of the notes, on irrevocable notice at least one Index Business Day ahead | The redemption amount on the date named in the notice | At any time on irrevocable notice at least five Index Business Days ahead, same amount; also, if the index closes at or below 50% of the strike level, the issuer "may (but is not obliged to) elect to redeem" |
| [Ensemble Investment Corporation certificates on the EQ Gold Overlay Basket, Series 2026-12](sources/puttable/XS3007576005-issue-terms.pdf) (2026, due 2031) | Basket of two proprietary indices on gold and equity | Any Basket Business Day, "in whole, but not in part", on notice at least two Basket Business Days ahead | max(10%, Overnight Amount + Basket Reference Amount) × the denomination on the put valuation date | At any time by an Issuer Call Notice, same formula; also automatic if the basket closes below 60% of its start level |
| [Citigroup Global Markets Funding Luxembourg certificates on the Citi Equity GB Short Put Series 3 TR Index, Series CGMFL2024-10012](sources/puttable/LU2690371641-issue-terms.pdf) (2024, exercise period to 2027) | Proprietary equity strategy index | American-style exercise from 10 October 2024 to 11 October 2027 | GBP 100 × Max[0, index level × (1 − 0.06%) ÷ (strike level × (1 + 0.06%))] on the valuation date, 11 October 2027; an earlier exercise's valuation is in the general conditions, not read | Optional early termination on at least ten days' notice, same formula |
| [3.625% Puttable Equity-Linked Senior Notes](https://www.sec.gov/Archives/edgar/data/38067/000095012311083052/R14.htm) | The issuer's own Class A shares | At any time before maturity or a put termination date (2014 notes) | 68.7758 shares per $1,000 | None found; the issuer may end the put when its shares are at least 130% of the put value price |

- **Five pay current value.** The UBS, BCV and JPMorgan products, the CGMFL213839 notes and the Ensemble certificates pay what the product is worth under its own formula on the valuation date, on a holder's exercise and on an issuer's termination alike. The GB Short Put certificates pay that formula on the issuer's termination and at the end of the exercise period; how they value an earlier exercise was not read. The definition in earlier versions of the feature map, a stated put price, does not describe them.
- **A fixed-term note with a put.** The CGMFL213839 notes (pricing supplement dated 30 October 2026; trade date 19 October 2026, strike date 20 October 2026, final valuation 20 October 2031, maturity 3 November 2031; EUR 100,000 denomination; no interest) run five years. Their item 28 lists three events, any of which ends them at the Mandatory Early Redemption Amount: (a) a Trigger Event, the Interim Level at or below the Trigger Level, which lets the issuer elect to redeem; (b) an Issuer Call Event; (c) an Investor Put Event. The separate Investor Put field, item 25, says "Not Applicable": the holder's right is in item 28. Schedule 1 pays `CA × Max[0, (1.00 + Leverage × Index Amount)]` at maturity and on early redemption alike, with Leverage 100%, Index Amount `(Index(t) × (1 – Execution Cost(t)) / Strike Level) – 1`, an execution cost of 0.80%, and Strike Level = Index(0) × (1 + 0.80%), 1565.7466. The Trigger Level is 50% of the Strike Level, 782.8733. The pricing supplement states no order between the three events; that, and the full exercise procedure, would be in the Offering Circular's General Conditions, which were not read.
- **The Ensemble certificates** (pricing supplement dated 23 July 2026; strike date 2 July 2026, final valuation 2 July 2031, maturity 10 July 2031; USD 10,000 units; zero coupon) pay on maturity, on a holder's put and on an early redemption the same Schedule 1 formula: the denomination × max(10%, Overnight Amount + Basket Reference Amount). The Overnight Amount accrues daily at SOFR on an Actual/360 basis and starts at 1 − Entry Cost; the Basket Reference Amount is Basket Level × (1 − Exit Cost) ÷ Basket Level at the strike − 1. Item 23 states "Issuer Call: Not Applicable" but points to item 28, whose Mandatory Early Redemption Event is an Issuer Call Event or a Trigger Event, the basket below 60% of its start level. Payment is five Basket Business Days after the put valuation date.
- **The GB Short Put certificates** are exercised by the holder, not put: an American-style certificate is a right the holder exercises during an exercise period, and Automatic Exercise applies at its end. The index's name, a short put strategy, is a property of the underlier and not of the holder's right. How an exercise before the end is valued is in the programme's general conditions, which were not read. The Unit is GBP 100, and the entry and exit fees are 0.06% each.
- **Which right prevails.** The exchangeable bond below states that the first notice given prevails. BCV states it: the investor may terminate "provided that the Issuer has not already exercised its right of termination".
- **The corporate note** works as a convertible bond and is not a structured product example. The page read does not name the issuer.

### Holder rights outside equity

- **A stated put price.** [BofA Finance floating rate senior notes due 2075, 424B2](https://www.sec.gov/Archives/edgar/data/1682472/000191870425003048/form424b2.htm) (preliminary) pay compounded SOFR plus a spread. Holders may require repayment each 28 February from 2027 to 2074, at 97% of principal from 2027, 98% from 2030, 99% from 2033 and 100% from 2036, plus accrued interest, on 30 to 60 days' notice.
- **The same stepped put price, from Citi.** [Citigroup Global Markets Holdings floating rate notes due 29 May 2066, 424B2](https://www.sec.gov/Archives/edgar/data/200245/000095010326008002/dp247495_424b2-26nir051422d.htm) (pricing supplement dated 28 May 2026, read 27 November 2026) pay compounded SOFR plus 0.10%, at least 0.00%, quarterly on Actual/360, with no issuer call. The holder may have the notes repurchased, in whole or in part, "on any repurchase date on or after May 29, 2029", once every twelve months, at $970 per $1,000 in 2029 and 2030, $980 from 2031, $990 from 2034 and $1,000 from 2037, plus accrued and unpaid interest. Notice is due fifteen business days before the date and "may not be revoked", with a minimum of $10,000. The filing has no worked examples. It is not equity-linked, and its 40-year term is beyond 120 months.
- **A put on an event, on an exchangeable bond.** [Citigroup Global Markets Funding Luxembourg €374,200,000 0.50 per cent. Guaranteed Exchangeable Bonds due 2023, listing particulars](https://ise-prodnr-eu-west-1-data-integration.s3-eu-west-1.amazonaws.com/legacy/ListingParticulars_434c73cc-f762-4800-b534-50fe04c22078.PDF) (dated 26 January 2016, read 27 November 2026) are exchangeable into Telekom Austria shares, 13,863 per €100,000. After a "Free Float Event", when the freely traded shares are 10% or less of those issued for at least 30 consecutive days, the holder may require redemption "at its principal amount, together with accrued and unpaid interest" on a put date 14 days after a 30-day put period. The issuer may call at principal when 75% or more of the bonds are exchanged or cancelled, after an offer that leaves only cash, or from 25 August 2021 when the shares are worth more than €130,000 per bond on 20 of 30 trading days. Where both act, Condition 10(d) states: "If more than one notice of redemption is given pursuant to this Condition 10, the first of such notices to be given shall prevail." Like the corporate note above, it works as a convertible bond and is not a structured product example, and its put is set off by an event, not held on stated dates.
- **Oil and volatility ETNs** carry the same weekly or daily holder redemption as the equity ones. They are not equity-linked, so they are not sources here.

### Conventional notes treat the calls as alternatives

- **BofA Finance:** "The notes will either be callable by BofA Finance LLC at its option prior to maturity ... or automatically callable prior to maturity" ([product supplement](https://www.sec.gov/Archives/edgar/data/70858/000119312523201261/d518933d424b2.htm)).
- **Barclays:** its Trigger Phoenix Callable Optimization Securities "will not be automatically called under any circumstances" ([424B2](https://www.sec.gov/Archives/edgar/data/312070/000095010314000513/dp43385_424b2-ubs17.htm)).
- **Holder repayment is usually excluded.** Morgan Stanley's [equity-linked product supplement](https://www.sec.gov/Archives/edgar/data/895421/000095010323016337/dp202677_424b2-epselnotes.htm) says "You will not have the right to present the notes to us for repayment prior to maturity, unless we otherwise specify", and that the pricing supplement will say whether notes are "puttable by you". No such note was found.

## What was not found

- **A classic autocall beside an issuer call.** No product was found with a level-triggered upside autocall on observation dates and a discretionary issuer call.
- **An equity-linked product with a stated put price on stated dates.** The only equity-linked stated price read is the exchangeable bond's, and it is set off by an event.
- **An order between a holder's put and an automatic call on the same date.**

**How far the search went.** Web searches of SEC filings, Swiss termsheets and European final terms, and EDGAR full-text queries limited to 424B2. About 15 filings were opened and read. Most EDGAR hits were not opened (147 for "automatic call" with "issuer call", 1,152 for "automatic early redemption" with "at our election"), and Swiss and European documents were mostly seen as search excerpts, so these are gaps in what was read, not evidence that no such product exists.

Two false leads, recorded so they are not chased again:

- The [Barclays AutoCallable Notes due 2027](https://www.sec.gov/Archives/edgar/data/312070/000119312517067609/d347422d424b2.htm) carry "ISSUER CALL" in a header line, but the body, read in full, has only the automatic call.
- Some JPMorgan and BofA issuer-callable notes mention being "automatically called" in passing, without defining an automatic call in the parts read ([example](https://www.sec.gov/Archives/edgar/data/19617/000182912621014830/jpm_424b2.htm)).

## What this means for the reference

- **The rights can sit on one product**, so a model of one redemption kind per product cannot describe the Morgan Stanley ETN or the three holder-right products above, which all have an issuer's right as well.
- **One can be a sample.** The CGMFL213839 notes run five years on a one-for-one formula, so their structure fits a tracker with a holder put, with differences stated in [holder-put.md](holder-put.md). Each of the others needs something the reference does not model: an open-ended term, a term beyond 120 months, a running fee, a cash account, or an intraday trigger.

## Decisions

- **Shape.** A redemption is `bullet` or `early-redemption`, and an early redemption lists its `mechanisms`, at least one and at most one of each kind. The order has no meaning. The adjustment factor stays on the redemption, since it belongs to the maturity payment.
- **Composition.** Each mechanism keeps its own schedule and rule. The product ends on the earliest event, compared by month.
- **Same date (assumption).** The issuer's call comes first and the trigger is not tested. No source states a rule for an upside autocall and an issuer call, since none has both. The Morgan Stanley ETN gives the issuer's notice precedence over an automatic call on the same day, and this follows it. There is no field for this: one can be added if a source states otherwise.
- **The combination is allowed deliberately**, with no public example found, because each part is already defined. The book says so.

## Open questions

1. How a holder put is built. Built at current value on 27 November 2026 ([holder-put.md](holder-put.md)), with the CGMFL213839 notes as its sample. A stated put price is still open.
2. Whether a running fee or an open-ended term should be modelled, since most holder-right products have one.
3. Whether the issuer's call should also be able to pay current value, as it does on the products with holder rights above.
