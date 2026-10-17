# Names for calls and coupons

Proposed, not built. Since the model gained an autocall, an issuer call and a contingent coupon, products with them show no marketing name and, when unprotected, no category ([marketing-names.md](marketing-names.md)). This document records what public sources say and proposes the smallest set of rules.

## Sources

- [FINRA, Risk Control Assessment glossary](https://www.finra.org/sites/default/files/RCA_Glossary.pdf). A US regulator's wording, but its terms are "defined solely for the purpose of the FINRA Risk Control Assessment", not investor education.
- [SSPA Swiss Derivative Map](https://sspa.ch/wp-content/uploads/2020/09/map_en.pdf): the Yield Enhancement product types and the glossary of additional features. Already a source in [marketing-names.md](marketing-names.md).
- [SEC, Investor Bulletin: Structured Notes](https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-76). The page refused the fetch (403), so only a search summary was read, as for the bulletin already cited.
- Product titles in public US pricing supplements: "Auto Callable Contingent Interest Notes" ([JPMorgan, 424B2](https://www.sec.gov/Archives/edgar/data/19617/000121390026108339/ea0308243-01_424b2.htm)), "Autocallable Contingent Income Barrier Notes" ([424B2](https://www.sec.gov/Archives/edgar/data/83246/000110465922073999/tm0dps_424b2.pdf)), "Contingent Coupon Autocallable Yield Notes" ([424B2](https://www.sec.gov/Archives/edgar/data/1053092/000095010321015942/dp159868_424b2-u6216.htm)) and BofA's issuer callable yield note ([424B2](https://www.sec.gov/Archives/edgar/data/1682472/000148105724004907/form424b2.htm), see [issuer-call.md](issuer-call.md)).
- Educational and issuer pages on "Phoenix" notes ([ARK Funds](https://www.ark-funds.com/articles/etf/what-is-an-autocallable), [Goodvest](https://www.goodvest.fr/blog/strategie-investissement/produits-structures-phoenix-definition-exemple)). Neither is a regulator's or the SSPA's definition.

## Established (from the sources)

| Term | What the source says |
| :--- | :--- |
| Autocallable | FINRA: "Autocallable notes and CDs are structured retail products that are automatically called by the issuer prior to maturity if the performance of one or more reference assets meets pre-specified conditions". "Payment upon autocall can vary, with some products offering full return of principal and others exposing investors to loss of principal." The feature "can be found in a variety of different structured product types". SSPA glossary, *Auto-Callable*: if on an observation day the price is on or above "a previously defined barrier ('autocall trigger'), the product is redeemed prior to maturity". |
| Callable | SSPA glossary: "The issuer has the right to cancel early, however, there is no obligation to do so." FINRA's glossary describes some notes as "callable at an issuer's discretion". The SEC bulletin (search summary) describes a call provision that lets the issuer redeem early at its discretion. |
| Conditional or contingent coupon | SSPA glossary, *Conditional Coupon*: "A scenario exists where the coupon is not repaid (also: coupon at risk)." US titles say contingent interest, contingent income or contingent coupon. No source defines one of these as the generic name. |
| Express Certificate (1255, 1260) | SSPA, Yield Enhancement: "Coupon payment depends on conditions", "Limited profit opportunity (cap)", and "Usually equipped with an autocall trigger: If the underlying is quoted above the autocall trigger on the observation date, the nominal amount plus any coupon is repaid early". The barrier version (1260) adds: "Touching the barrier results in an underlying delivery and/or cash settlement". What the version without a barrier (1255) pays at maturity below the strike is not stated. |
| Capital Protection Certificate with Coupon (1140) | SSPA, Capital Protection: "Minimum redemption at expiry equivalent to the capital protection", "The coupon amount is dependent on the performance of the underlying", "Periodic coupon payment is expected". |
| Yield Enhancement | SSPA category holding the Express and reverse convertible types. FINRA describes a reverse convertible as a note with "an attractive periodic fixed coupon" and principal "generally at risk". |
| Phoenix | Educational pages: an autocallable whose conditional coupons are paid on each observation date, often with memory, unlike a "classic" autocall that pays them together on the call. The sources disagree on whether memory is part of the name. |

## Proposed rules

Example-specific assumptions, as in [marketing-names.md](marketing-names.md). Each is a separate chip, since several names can apply.

| Rule (model terms) | Shown name | Vocabulary | Note |
| :--- | :--- | :--- | :--- |
| On a note: the redemption is an autocall | Autocallable note | US descriptive (FINRA), SSPA glossary | Any payoff, since FINRA says the feature appears in many product types and payment on the call varies. Rests on the redemption. |
| On a note: the redemption is an issuer call | Callable note | SSPA glossary, US descriptive | The reason says the issuer may call and need not; the scenario chooses. |
| On a note: a contingent coupon | Contingent coupon note | US descriptive (issuer titles), SSPA *Conditional Coupon* | The reason adds "with memory" when the coupon has it. The three US titles use three words; "coupon" is the one the model and the SSPA use. |
| On a note: an autocall, a contingent coupon, a downside barrier, no upside participation, no protection | Express certificate | SSPA (1260 Express-Barrier-Certificate) | The cap SSPA lists is the absence of upside participation: the return is the coupons. A buffer instead of a barrier, or no downside feature, gets no Express name, since 1255's maturity payment is unverified. |

Category:

| Rule (model terms) | Category | Note |
| :--- | :--- | :--- |
| On a note: no protection, a contingent coupon, no upside participation | Yield Enhancement | The SSPA puts both the Express and the reverse convertible types here; both pay a coupon in place of upside. Protection still decides first, so a protected note with a coupon stays Capital Protection, which matches SSPA 1140. |

An unprotected note with a call and no coupon, or a coupon beside upside participation, keeps no category.

With 100% protection and a coupon, the Principal-protected note reason would add that the Swiss taxonomy calls this a Capital Protection Certificate with Coupon, as it already names 1100 for participation.

## Not proposed

- **Phoenix.** Market usage whose sources disagree on memory. It could be added later as market usage for an autocall with a coupon and memory, like the shark fin note.
- **Reverse convertible.** FINRA and the SSPA describe a fixed coupon, paid whatever the underlier does, and the SSPA adds delivery of the underlier. The model has only a contingent coupon and pays cash.
- **One combined name** such as "Autocallable contingent coupon note". The US titles combine the parts in different orders; separate chips say the same and match each part.

## Open questions

1. Is FINRA's Risk Control Assessment glossary a strong enough source for a US descriptive name, given its stated purpose? The SSPA glossary supports the same word.
2. Should the Express certificate rule also cover a buffer, as in the two-fund note ([contingent-autocall.md](contingent-autocall.md))? The SSPA's barrier version describes a barrier, so the proposal excludes it.
3. Does Yield Enhancement need the coupon to be the only return, or also an autocall? The proposal places a bullet note with a coupon there, by analogy with the reverse convertible.
4. Do the caveats added for a call or coupon ([marketing-names.md](marketing-names.md)) stay once these names exist? The proposal keeps them on the maturity names and gives the new names their own reasons.
