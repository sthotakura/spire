# Public document search for holder puts

**Retrieval update, 27 November 2026:** Three issue-specific pricing supplements have now been downloaded from LuxSE. See [the downloaded documents](sources/puttable/README.md). This supersedes the unsuccessful retrieval status for XS3463578438, XS3007576005 and LU2690371641 below. Other entries remain a record of the earlier searches.

Research log, 27 November 2026. This is source discovery, not an implementation decision. Identifiers below are transcribed from the supplied screenshot; repeated rows are deduplicated. No product terms are inferred from an identifier or a product name. Any eventual SPIRe example must remain synthetic.

## Search inventory

| ISIN | Public evidence located | Offering terms located? |
| :--- | :--- | :--- |
| XS1466161350 | [Listing particulars](https://ise-prodnr-eu-west-1-data-integration.s3-eu-west-1.amazonaws.com/legacy/ListingParticulars_434c73cc-f762-4800-b534-50fe04c22078.PDF) | Yes; holder put in Condition 10(c), printed page 64 |
| LU1816923590 | No exact-match document located | No |
| LU1924402115 | No exact-match document located | No |
| US17327E1661 | [SEC fund holdings report](https://www.sec.gov/Archives/edgar/data/1120543/000175272422068848/primary_doc.xml), also showing CUSIP 17327E166 | No; holdings disclosure does not establish put rights |
| LU2461996394 | No exact-match document located | No |
| XS2660386587 | No exact-match document located | No |
| XS2810846159 | No exact-match document located | No |
| LU2690371641 | [LuxSE security record](https://www.luxse.com/security/LU2690371641/413766), certificate referencing Citi Equity GB Short Put Series 3 TR Index | No; index name does not establish holder redemption rights |
| LU2904973885 | [Euronext daily official list, 10 April 2025](https://live.euronext.com/sites/default/files/statistics/dol/DOL2025-04-10.pdf), printed page 1674, identifies Series CGMFL2025-1366, Delta-1 certificates linked to Transwarp Technology Shanghai shares | No; listing description does not establish put rights |
| LU2904961104 | No exact-match document located | No |
| XS3185634972 | No exact-match document located | No |

The screenshot repeats LU2690371641 twice and LU2904961104 three times. There are 11 distinct identifiers. Unsuccessful searches mean no document was located in this search, not that none is public. Exact identifier searches and terms/prospectus variants were checked. The LuxSE document tab could not be checked because the browser CLI daemon failed to start.

## Verified equity-linked put: XS1466161350

The listing particulars identify a Citigroup Global Markets Funding Luxembourg exchangeable bond. The ISIN is confirmed on printed page 78.

- Condition 4, printed pages 40–41: a Free Float Event requires free float at or below 10% for at least 30 consecutive days while shares remain in the exchange property. The contractual definition of free float applies.
- Condition 10(c), printed page 64: the holder may require redemption following that event, at principal plus accrued unpaid interest. The put notice is irrevocable.
- The exercise period runs from the event until 30 days after it, or 30 days after the event notice if later. Payment follows 14 calendar days after the period expires, adjusted to the next TARGET business day.
- Condition 10(d), printed page 64: the first redemption notice prevails where multiple notices are given under Condition 10.
- The share-exchange right is distinct from the holder put.

This establishes an equity-linked example of a stated-price, event-triggered holder put. It does not establish an unconditional scheduled put on arbitrary equity payoffs, or a put calculated by applying the maturity payoff formula early.

## Earlier scheduled-put reference

[CUSIP 17291W3E9, SEC pricing supplement dated 28 May 2026](https://www.sec.gov/Archives/edgar/data/200245/000095010326008002/dp247495_424b2-26nir051422d.htm), Key Terms page PS-2 and Annex A:

- Annual holder repurchase dates begin 29 May 2029.
- Per 1,000 principal, stated prices are 970 for 2029–2030, 980 for 2031–2033, 990 for 2034–2036, and 1,000 for 2037–2065, plus accrued unpaid interest.
- Minimum exercised principal is 10,000, then increments of 1,000. Notice must arrive 15 business days before the date, subject to the stated procedures and acknowledgement requirements.

This is a floating-rate debt example, with a scheduled holder right and a stated payment schedule.

## Implications for the existing proposal

[holder-put.md](holder-put.md) proposes a tracker-only put using a current contractual formula. Keep that proposal distinct from these two observed cases:

1. Scheduled holder election with stated redemption prices.
2. Event-triggered holder election at principal plus accrued interest.
3. Tracker redemption using a specified value formula (the existing proposal's sources).

The exchangeable bond qualifies the proposal's statement that no equity-linked source has a stated put price: one has now been located, but its right is conditional on a corporate event. A model needs to distinguish eligibility, holder election, payment basis, and notice/valuation/payment timing. No broader combinations or event priority rules are established by this search.

Next research step: obtain issue-specific final terms or pricing supplements for the unresolved identifiers before assigning them put behavior. For LU2690371641, inspect the LuxSE Documents tab and the applicable programme conditions together with the issue-specific terms.

## Second screenshot: participation certificates

Searched 27 November 2026: 28 rows, 25 distinct ISINs. XS2930017079, XS3125683147 and XS3125669153 each appear twice. No issue-specific pricing supplement or final terms was retrieved for this batch.

### Sources

- **N:** [Issuer notice dated 29 January 2026](https://docs.publicnow.com/viewDoc?filename=181674%5CEXT%5C309A7807AAB0075289B06123D1D593AFE9247864_E2C610DBA1F1B8CE1AF94E515E10E5E4BDF81CD1.PDF). Schedule 1 extends exercise to 16 February 2027; Schedule 2 to 11 February 2028, with automatic exercise deferred accordingly. It names the eleven matches marked N below. Copies of the relevant offering circular, pricing supplement and final terms are available free at Citibank Europe Plc, 1 North Wall Quay, Dublin 1, Ireland. This is an amendment notice, not the original settlement formula.
- **L:** [Euronext daily official list dated 10 April 2025](https://live.euronext.com/sites/default/files/statistics/dol/DOL2025-04-10.pdf), printed page 1688: XS2810828504, ITC Hotels participation certificates, Series CGMHI2025-0028.
- **A:** [Euronext admission notice dated 2 January 2026](https://docs.publicnow.com/viewDoc?filename=37199%5CEXT%5C403B5A7BCF5C3791B0112AA8C44BC46E2F0B3F02_87E3D1AD9D4DF3C055C006C1D3745831B9CDA33B.PDF): XS3077250374, Series CGMHI2026-0008. The extracted notice says Final Terms, but no target document was retrieved. Direct PDF download to inspect annotations returned HTTP 403.
- **J:** [Euronext admission notice dated 13 May 2026](https://docs.publicnow.com/viewDoc?filename=37199%5CEXT%5CBCDBB00A9958BF5B03BE5E69F47BC38A9FA64FF2_D1C407785B85D7441A0FEE63FD0AF9706530A6A0.PDF): XS3125683147, Japan participation certificates linked to NIDEC, Series CGMHI2026-0222, Tranche 2.
- **X:** [LuxSE security record](https://www.luxse.com/security/XS3463578438/563425): XS3463578438, a structured bond referencing Citi US Equity Put Ratio Series 6 EUR TR Index, maturing 3 November 2031. The index name does not establish holder put rights.
- **P:** [Citi Warrant Programme base prospectus dated 13 December 2023](https://ise-prodnr-eu-west-1-data-integration.s3-eu-west-1.amazonaws.com/202312/53b328ee-585b-421e-9b53-209e4ecc813c.pdf), printed page 55: describes APAC participation certificates and their cash or physical settlement. Background only: applicability of this edition to these later issues is not verified. Issue terms specify exercise and settlement details.

### Inventory

| ISIN | Public evidence | Underlier where identified |
| :--- | :--- | :--- |
| XS2930019364 | N, Schedule 2 | TCL |
| XS2930017079 | N, Schedule 2 | Taiwan Semiconductor |
| XS2810828504 | L | ITC Hotels |
| XS2930013326 | N, Schedule 2 | Kweichow Moutai |
| XS2930005496 | N, Schedule 2 | Ninebot |
| XS2930006031 | N, Schedule 2 | Zhejiang Century Huatong |
| XS3077252586 | N, Schedule 1 | Hang Seng Biotech Net TRI |
| XS3077249442 | N, Schedule 2 | Xian Longi Silicon |
| XS3007576005 | No exact-match document located | Unverified |
| XS3077250374 | N, Schedule 2; A | China National Software |
| XS3077255415 | N, Schedule 2 | Xi An Aero-Engine |
| XS3077250960 | N, Schedule 2 | Zhejiang Supcon |
| XS3077244557 | No exact-match document located | Unverified |
| XS3077244641 | No exact-match document located | Unverified |
| XS3077245614 | No exact-match document located | Unverified |
| XS3077245457 | N, Schedule 2 | Montage Technology |
| XS3125683147 | J | NIDEC |
| XS3125669153 | No exact-match document located | Unverified |
| XS3125682172 | No exact-match document located | Unverified |
| XS3125684970 | No exact-match document located | Unverified |
| XS3125668692 | No exact-match document located | Unverified |
| XS3125667702 | No exact-match document located | Unverified |
| XS3125673932 | No exact-match document located | Unverified |
| XS3125670839 | No exact-match document located | Unverified |
| XS3463578438 | X | Citi US Equity Put Ratio Series 6 EUR TR Index |

### Relevance to SPIRe

The amendment is evidence of contractual exercise periods, but does not establish voluntary early-exercise dates, notice requirements, fees or the payment basis. These remain useful candidates for tracker exercise research; they are not yet verified examples for the holder-put model. Read the applicable original issue terms, programme edition and amendments together before deriving rules. No application code or agreed model changed in this search.
