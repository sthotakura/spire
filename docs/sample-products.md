# Sample products

The builder has a menu of sample products, grouped by family. Each opens a complete, valid product, and each has its own address, `?example=<slug>`, so a link opens the builder on that product. The samples are listed in `src/content/examples.ts`.

## Decisions

- **Modelled on public products, with generic names.** Each sample reproduces the structure of one public product recorded in the research notes, using only concepts the reference already explains. The menu names the structure generically, never the issuer or the product's own title. Underliers are synthetic indices starting at 100, and principal is 1,000.
- **Curated, not generated.** The menu does not list the schema's examples in `scripts/product-examples.ts`; those exist to exercise each feature of the structure. A sample is added by hand when a public product can be reproduced in full.
- **Beside the page heading, not in the Structure panel.** Opening a sample replaces the whole page: the sentence, outline, chart, calculation and JSON. Inside the panel it read as one of the product's terms. Beside the heading it takes no extra height; below 900px it wraps under the intro.
- **Grouped.** Market-linked deposits, participation notes, barrier absolute return, autocallable notes and issuer callable notes, as `<optgroup>`s of one select.
- **Terms only.** An address names the product's terms, not a scenario. Opening a sample returns every scenario input to where a first visit starts (a final level of 110, a basket's assets each up 10%, no review levels, closes or issuer call set by hand), and every term the sample leaves out to its first value, so the menu and the address open it the same way.
- **The address follows the terms.** Once the reader changes a term, `?example` is removed and the menu returns to its placeholder, so the address never names a product the builder does not show. Choosing a sample replaces the address rather than adding a history entry, so Back leaves the builder.
- **No address, no sample.** A visit with no `?example` opens the starting note, as before. An address naming no sample opens the starting note and drops the slug.
- **Linked from the book.** Each sample is linked from the chapter that explains it, by its address on the published site, which the book view opens within the app.
- **A query, not a path.** `/spire/?example=…` is served by `index.html` with HTTP 200 on Pages. A path such as `/spire/examples/…` would be served by `404.html`, as a book chapter is.

## The samples and their sources

Where a filing gives a range set on the pricing date, the sample takes the low end. The terms the research notes did not record were re-read in the filings on 18 October 2026: the three Morgan Stanley PDFs as text extracted from the files, and the others through a summarising fetch tool. The two market-linked CDs are as recorded in [deposit.md](deposit.md).

| Sample | Modelled on | Terms | Simplifications |
| :--- | :--- | :--- | :--- |
| Capped market-linked deposit | Morgan Stanley capped market-linked CD ([summary](https://www.morganstanley.com/structuredinvestments/docs/summarysheets/61773TBB8_Summary_Sheet_Only.pdf)) | Deposit, 5 years, 100% upside, maximum 130% | Range 130% to 135% |
| Leveraged market-linked deposit | Morgan Stanley trend index CD ([disclosure supplement](https://www.morganstanley.com/structuredinvestments/docs/prospectus/prelim/ProspectusRed61773TAM5.pdf)) | Deposit, 5 years, 265% upside, no maximum | Range 265% to 280%; the underlier is a trend index |
| Lookback barrier note | JPMorgan uncapped lookback accelerated barrier note ([424B2](https://www.sec.gov/Archives/edgar/data/19617/000121390026049358/ea0288297-01_424b2.htm)) | 5 years, lookback initial level, 170% upside, 70% downside barrier on the final date | Leverage "at least 1.70"; the lookback reads every close for about six weeks, the sample reads six dates |
| Dual directional buffered note | Morgan Stanley Dual Directional Buffered Participation Securities, No. 19,026 ([PDF](https://www.morganstanley.com/structuredinvestments/docs/prospectus/prelim/ProspectusRed61781LXR6.pdf)) | 5 years, 100% upside, maximum 169%, 15% buffer, 100% absolute return | Range 169% to 171% |
| Worst-of dual directional buffered note | Morgan Stanley Dual Directional Buffered PLUS, No. 19,021 ([PDF](https://www.morganstanley.com/structuredinvestments/docs/prospectus/prelim/ProspectusRed61781LVU1.pdf)) | 5 years, worst of three, 139% upside, no maximum, 20% buffer, 100% absolute return | Range 139% to 154% |
| Worst-of dual directional barrier note | Morgan Stanley Dual Directional Trigger PLUS, No. 18,961 ([PDF](https://www.morganstanley.com/structuredinvestments/docs/prospectus/prelim/ProspectusRed61781LUU2.pdf)) | 4 years, worst of two, 125% upside, 70% downside threshold on the final date, 50% absolute return | Range 125% to 140% |
| Barrier absolute return note | JPMorgan Financial, 2018 ([424B2](https://www.sec.gov/Archives/edgar/data/19617/000161577418007603/s111907_424b2.htm)) | 2 years, barriers at 76.25% and 123.75% on every close, 2% conditional return | None |
| Barrier absolute return note without a conditional return | Barclays Bank PLC, 2025 ([424B2](https://www.sec.gov/Archives/edgar/data/312070/000095010325010558/dp233273_424b2-7706ubs.htm)) | 13 months, barriers at 84% and 116% on every close, principal only after a barrier event | "Approximately 13 months" |
| Autocallable contingent coupon note | JPMorgan auto callable contingent interest note on one stock, 2026 ([424B2](https://www.sec.gov/Archives/edgar/data/19617/000121390026045661/ea0286921-01_424b2.htm)) | 3 years, monthly reviews, 17.35% a year at 50% with memory, autocall at 100% from review 6, 40% downside barrier | None |
| Worst-of autocallable contingent coupon note with a buffer | JPMorgan auto callable contingent interest note on two funds, 2026 ([424B2](https://www.sec.gov/Archives/edgar/data/19617/000121390026108339/ea0308243-01_424b2.htm)) | 12 months, monthly reviews, worst of two, 14.15% a year at 80% with memory, autocall at 100% from review 6, 20% buffer at a rate of 1.25 | Funds stand as synthetic indices |
| Worst-of step-down autocallable note | UBS trigger autocallable note, 2025 ([424B2](https://www.sec.gov/Archives/edgar/data/1114446/000183988225047092/ubs_424b2-26373.htm)) | 3 years, semi-annual, worst of three, trigger 100% stepping down 5% to 75%, 37.5% a year, final review a call, 50% downside threshold | None; the filing's call prices, $1,187.50 to $2,125, are what the sample pays |
| Callable contingent coupon note | BofA Finance issuer callable yield note, 2024 ([424B2](https://www.sec.gov/Archives/edgar/data/1682472/000148105724004907/form424b2.htm)) | 3 years, issuer call quarterly from the second review, 8.20% a year paid monthly at 70% without memory, 70% downside threshold | Issued 10 April 2024 and first callable 10 October 2024, read as one quarterly review without a call |
| Worst-of callable contingent coupon note | JPMorgan callable contingent interest note on three indices, 2023 ([424B2](https://www.sec.gov/Archives/edgar/data/19617/000121390023083784/ea165015_424b2.htm)) | 2 years, monthly, worst of three, issuer call from review 6, 11.30% a year at 75% without memory, 70% trigger value at maturity | Rate "at least 11.30%" |

## Public products not used

- The Morgan Stanley basket CD averages 28 quarterly closes; the reference averages at most 12 dates.
- The JPMorgan lookback buffered note reads the lesser performing of two indices; lookback is not available on a basket.
- The Morgan Stanley Jump Securities and the JPMorgan digital barrier note pay a fixed digital return, which is not modelled.
- The two GS Finance barrier absolute return notes pay a minimum return inside the barriers, which barrier absolute return does not model.
- The HSBC barrier absolute return note repeats the JPMorgan one with barriers set on the trade date.
- The BofA fixed coupon autocall needs a fixed coupon. Shark fin notes are described only in educational material.
