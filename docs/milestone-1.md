# Milestone 1: protected participation note

Milestone 1 is the smallest useful SPIRe reference: one synthetic note linked to one equity or equity-index underlier, with a contractual payment calculated at scheduled maturity. It demonstrates contractual payoff mechanics, not pricing, investment performance, or issuer creditworthiness.

## Established concepts

- The **wrapper** is a note: a contractual promise by its issuer.
- **Bullet redemption** means the example has one scheduled maturity payment and no early call.
- **Principal protection** is an economic rule that floors the formula's maturity payment at 100% of principal. Payment still depends on the issuer's ability to pay.
- **Upside participation** multiplies a positive underlier return by the participation rate. A flat or negative return contributes 0% to the payment formula.
- **Point-to-point determination** compares one initial underlier level with one hypothetical final level.
- The underlier is one synthetic equity or equity index. Multiple-underlier aggregation is not defined in this milestone.

The maturity payment is:

```text
underlier return = final level / initial level - 1
participated return = participation rate × max(underlier return, 0)
maturity payment = principal × (1 + participated return)
```

## Synthetic worked example

Assume a principal amount of 1,000 units, an initial underlier level of 100, and a 150% participation rate.

| Final level | Underlier return | Participated return | Maturity payment |
| ---: | ---: | ---: | ---: |
| 60 | -40% | 0% | 1,000 |
| 100 | 0% | 0% | 1,000 |
| 110 | 10% | 15% | 1,150 |
| 130 | 30% | 45% | 1,450 |

For the 110 final-level scenario, the positive underlier return is 10%. Multiplying it by the 150% participation rate produces a 15% participated return, so the formula pays 1,150 units at maturity.

## Example-specific assumptions

- Levels, amounts, dates, and the underlier are synthetic.
- The final level is a hypothetical scenario input, not an authoritative product term.
- Displayed amounts are rounded to two decimal places. The calculator uses JavaScript numbers and is not a production money calculation.
- There are no coupons, caps, buffers, barriers, observation schedules, valuation schedules, early-redemption rights, or physical settlement.
- The payoff diagram and scenarios show contractual maturity payments only. They are not valuations, investment advice, or guarantees of issuer payment.
- The JSON panel is a learning representation of this example, not an industry-standard issuance schema.

## Architecture decision

The domain model, validation, and maturity-payment function are framework-independent TypeScript in `src/domain/note.ts`. Vue owns user interaction and presentation in `src/App.vue`. Scenario results are derived from authoritative note terms rather than stored in the note.

Choice catalogs drive the wrapper, redemption, payoff, and underlier controls. An option appearing in a catalog does not give it domain behavior: unsupported choices remain disabled until their terms and calculations are defined and tested.

## Open questions for later milestones

- Which payoff mechanics can be combined independently of wrappers?
- When should observation and valuation schedules become explicit model concepts?
- Which terms are product economics, and which belong only to issuance?
- How should changes to authoritative terms invalidate derived results?
- How should baskets, best-of, worst-of, or other multiple-underlier aggregation methods be represented?
- How should coupons and downside exposure be composed before introducing examples such as reverse convertibles?

Pricing, live market data, Greeks, booking, issuance workflows, identifiers, document generation, regulatory processing, AI, microservices, and distributed infrastructure remain outside this milestone.
