# Marketing names

A marketing name is the label a seller puts on a note, such as "principal-protected note". It is not a contract term and no single authority defines it. Two notes with the same payoff can carry different names, and one name can cover slightly different payoffs. SPIRe shows names as hints beside the structure the reader built. The structure stays the authoritative description.

Only generic, publicly used names appear here. Branded product names are excluded.

## Sources

- [FINRA, Understanding Structured Notes With Principal Protection](https://www.finra.org/investors/insights/structured-notes-principal-protection) (US regulator's investor education).
- [SEC and FINRA, Structured Notes with Principal Protection](https://www.sec.gov/newsroom/press-releases/2011-118-sec-finra-warn-retail-investors-about-investing-structured-notes-principal-protection) and the SEC Investor Bulletin on structured notes (US regulator's investor education; the bulletin page could not be fetched, so only search excerpts were checked).
- [Morgan Stanley market-linked CD summary](https://www.morganstanley.com/structuredinvestments/docs/summarysheets/61765QBM0_Summary_Sheet_Only.pdf) (a public US market-linked certificate of deposit) and the MiFID II definition of a structured deposit ([ESMA single rulebook](https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/mifid-ii/article-4-definitions)); see [deposit.md](deposit.md).
- [SSPA Swiss Derivative Map](https://sspa.ch/wp-content/uploads/2020/09/map_en.pdf) and [SSPA products overview](https://sspa.ch/en/products/) (European product taxonomy from the Swiss Structured Products Association).

## Established (from the sources)

| Term | What the source says |
| :--- | :--- |
| Full principal protection | FINRA: some notes "are designed to provide 100 percent, or full, principal protection if held to maturity". |
| Partial principal protection | FINRA: "other structured notes offer only partial principal protection, such as 10 percent". SSPA's glossary defines *Partial Capital Protection* as "between 90% and 100% of the nominal value". The two sources draw the line differently. |
| Participation rate, cap | FINRA lists "participation rates, caps on upside performance or floors on downside performance" as features and defines none of them. SSPA's glossary entry for *Participation* (German text in the English PDF, translated here) says the investor profits from the underlier's performance "1:1, over- or under-proportionally". SSPA groups products that follow the underlier under the category *Participation*. *Capped Participation*: "The product has a maximum yield." |
| Capital Protection Note with Participation (1100) | SSPA: "Minimum redemption at expiry equivalent to the capital protection", with "Participation in underlying price increase above the strike". Capital protection is "a percentage of the nominal (e.g. 100%)". |
| Tracker Certificate (1300) | SSPA: "Reflects underlying price moves 1:1". |
| Outperformance Certificate (1310) | SSPA: "Disproportionate participation (outperformance) in positive performance above the strike", and 1:1 when below the strike. |
| Leveraged or enhanced participation with a cap | The SEC bulletin describes notes with a leveraged or enhanced participation rate "only up to a capped, maximum amount" (search excerpt). |
| Market-linked CD, structured deposit | Morgan Stanley: market-linked CDs are "time deposit obligations" that pay "$1,000 for each CD … plus a supplemental amount" based on an index. MiFID II: a structured deposit is a deposit "which is fully repayable at maturity" with interest paid "according to a formula". |
| Buffer | FINRA: "a buffer typically provides 'hard protection' such that if the buffer level is breached, an investor's potential principal loss is restricted to the extent of losses in excess of the buffer". "Buffered" is also the plain descriptive word US offering documents filed with the SEC use in note titles. |

## Rules for SPIRe

These are example-specific assumptions about when a name fits the model's terms, not definitions from the sources. Several names can apply to one note. A note with no protection, no participation and no cap gets no name.

| Rule (model terms) | Shown name | Vocabulary | Note |
| :--- | :--- | :--- | :--- |
| Protection is 100% | Principal-protected note | US descriptive | With upside participation, SSPA calls this a Capital Protection Note with Participation. |
| Protection is above 0% and below 100% | Partially principal-protected note | US descriptive | Any level in between counts as partial, following FINRA's example of 10%. SSPA's narrower 90%–100% definition is noted in the hint. |
| On a note: upside rate is 100%, downside rate is 100%, no protection, no buffer, no cap | Tracker | SSPA (Tracker Certificate) | 1:1 in both directions. |
| On a note: upside rate is above 100%, downside rate is 100%, no protection, no buffer, no cap | Outperformance | SSPA (Outperformance Certificate) | Leveraged or enhanced upside in US descriptive wording. |
| On a note: upside participation selected, no protection, no buffer, no cap, and neither of the two rules above applies | Participation note | SSPA (category *Participation*) | Covers upside alone, and upside with downside at other rates: for example upside 80% with downside 100%, or upside 100% with downside 90%. Downside participation alone gets no name. This is a category label, not a product type from the SSPA map, so it is the least specific name here. |
| Cap is present with upside participation | Capped participation | US descriptive, SSPA glossary | The cap is a maximum return on principal. |
| Deposit with upside participation | Market-linked deposit | US descriptive (market-linked CD), EU and UK (structured deposit) | Principal is repaid by the wrapper, so a deposit gets none of the note names above. |
| Buffer is present with downside participation | Buffered note | US descriptive | Without downside participation the buffer has nothing to absorb, so it gets no name. |

A protection of 0% counts as no protection. The two pay the same, and the documentation already treats "absent" and "0%" as different descriptions of the same payment.

## Interface

The names appear as chips under the summary sentence, after the label "Often marketed as". Selecting a chip opens a short reason and highlights the part of the note it rests on. A name that rests on one part selects that part. A name that rests on several selects the whole payoff. The rules live in `src/content/names.ts`.

## Open questions

- SSPA's Outperformance Certificate is described without a cap. Whether a capped, leveraged note carries "Outperformance" in its name is unverified, so only "Capped participation" is shown for it.
- With upside participation and no downside participation selected, the model repays principal on a fall. Whether that is a "principal-protected" structure or only resembles one is undecided. The rules look only at the protection term, so a note with upside participation alone is called only a participation note.
- US usage has no formal taxonomy comparable to SSPA's. The US descriptive names above are plain-language labels from regulator material, not a defined list.
- Names for structures with barriers or coupons are outside the model's terms and are not shown.
- A note with both a buffer and a protection floor shows both names. No generic name for the combination was found.

Names describe how a structure is commonly presented, not what it pays. Payoffs remain illustrations of contractual payments under stated assumptions, not valuations, investment advice, or guarantees of issuer payment.
