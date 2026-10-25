# Certificate

Research into whether a certificate is a wrapper of its own, beside the note and the deposit. Nothing is built yet: Certificate is listed in the Wrapper dropdown and marked unavailable. A warrant, listed beside it, is a separate question and is not covered here.

## Established concepts

Three public documents were read: two key information documents (KIDs) under German law and one Swiss key information sheet.

| | Swiss capital protection certificate ([Julius Baer, valor 37684449](https://derivatives.juliusbaer.com/Content/Document/ba68aeb4-9d76-4f37-9565-bdb77055ccce/37684449_TS_EN_20180802.pdf)) | German express certificate ([BNP Paribas KID, DE000PU99SA5](https://kid.bnpparibas.com/DE000PU99SA5_DE.pdf)) | German open-end certificate ([HVB KID, DE000HVB12Y9](https://hartmutwalz.de/2021/wp-content/uploads/2019/01/BIB_DE000HVB12Y9.pdf)) |
| :--- | :--- | :--- | :--- |
| Legal form | Not a collective investment scheme, and holders "are exposed to the credit risk of the Issuer" | "eine Inhaberschuldverschreibung, die unter deutschem Recht begeben wurde" (a bearer bond issued under German law) | The same wording |
| Amount the payment refers to | A denomination of EUR 1,000, issued at 100% | A nominal value (Nennwert) | None. The redemption amount is the underlier's reference price × a ratio (Bezugsverhältnis) of 1 |
| Term | Fixed, with a final fixing date and a final redemption date | Fixed ("eine feste Laufzeit"), with automatic early redemption | "keine fixe Laufzeit" (no fixed term) |
| Early redemption | None stated | Called when the close is at or above 100% of the initial level on a review date | The holder may redeem on yearly dates, and the issuer may terminate on yearly dates |
| Payment | 95% of the denomination, plus denomination × max(0, 100% × (final − strike) ÷ initial) on the worst-performing of four indices, with the strike at 95% | The nominal value, or delivery of shares once the daily-observed barrier has been breached | Reference price × ratio, less any fee, plus dividend amounts paid during the life of the certificate |
| SSPA category | Capital Protection Certificate with Participation (1100) | — | — |

- **A certificate is a debt security of its issuer**, as a note is. All three documents expose the holder to the issuer's ability to pay. Under German law the form is a bearer bond (Inhaberschuldverschreibung).
- **With a denomination, a certificate's payment rules are the note's.** The Swiss certificate's payment is a protection floor plus worst-of upside participation above a strike, all stated per EUR 1,000 denomination. The German express certificate is an autocall with a barrier, stated per nominal value. The reference can already model the core of both payoffs. Two parts it cannot yet model are the strike below the initial level and the physical delivery.
- **The name is a market convention, not a separate payment rule.** The SSPA's taxonomy calls a capital-protected note with participation a certificate (1100). This reference already uses the SSPA's certificate names (Bonus, Twin-win, Express) as names for notes ([marketing-names.md](marketing-names.md)).
- **In the US, "certificate" usually means a certificate of deposit**, which this reference models as the deposit wrapper ([deposit.md](deposit.md)).

## What is distinct, and where it belongs

Only the open-end certificate differs from a note, and each difference belongs to another concept, not to the wrapper:

| Difference | Concept it belongs to | In the reference today |
| :--- | :--- | :--- |
| No fixed term | Term and redemption | A term is required |
| The holder may redeem on stated dates | Redemption | Puttable is listed and unavailable |
| The issuer may terminate on stated dates | Redemption | An issuer call exists, with a fixed term |
| Payment = reference price × ratio, with no denomination | Payoff and terms | Every payment is a multiple of the principal amount |
| A loss is measured against the purchase price | Pricing | Out of scope |
| A fee that reduces the reference price | Payoff | Not modelled |
| Dividend amounts paid during the life of the certificate | A periodic payment, like a coupon | Not modelled |

## Proposal

1. **No certificate wrapper value yet.** A wrapper value whose rules are the note's would teach that the two differ in behaviour when they differ only in name and market. [02-wrapper.md](book/02-wrapper.md) warns against exactly that shortcut.
2. **Explain the name instead.** The book's wrapper chapter now says, under Note, that Swiss and German issuers commonly call such debt securities certificates. The Certificate entry stays in the dropdown, unavailable, and its hint says the same.
3. **Treat the open-end tracker as a possible later product**, not a wrapper. It needs a term with no maturity, holder redemption, a ratio-based payment with no principal amount, and a fee, and each of these is its own concept. The ratio and the missing principal amount overlap with what a warrant needs, so the two can be designed together.

## Assumptions

- Three documents from two markets are a small sample. The conclusion that a certificate with a denomination follows the note's payment rules rests on them and on the SSPA's use of the name.
- The legal and tax differences between a Swiss or German certificate and a US note, such as listing, bearer form and tax classification, are issuance matters and are out of scope.

## Open questions

1. **Does the reader need Certificate to be selectable?** If yes, it could be offered as another name for the note wrapper, with identical rules, rather than as a wrapper of its own. That would show the name without implying different behaviour.
2. **The SIX Swiss Exchange describes certificates as bearer debt instruments** in search excerpts, but this was not confirmed on a page that could be read. A primary Swiss source for the legal form would strengthen the first finding.
3. **A strike below the initial level**, as in the Swiss certificate's 95% strike, is not modelled. It mirrors the open question of upside participation that starts above the initial level ([digital-return.md](digital-return.md), open question 5).
