# Structured Products, Built from Their Parts

This is the working outline for SPIRe's reader-facing book. It is written as
the author's understanding develops. The book uses synthetic examples and
public concepts; it is not a valuation guide, investment advice, or a
guarantee of issuer payment.

The book and the application share vocabulary, but they have different jobs:
the application lets a reader compose a structure, while the book explains
why each part exists and how the rules work. The existing files in `docs/`
remain working research and design records. Reader-facing chapters belong in
`docs/book/`.

## Chapters

| Chapter | Status | Reader-facing chapter | Working material |
| --- | --- | --- | --- |
| 1. What is a structured product? | Draft | [Read chapter](book/01-what-is-a-structured-product.md) | [README](../README.md) |
| 2. Wrapper | Draft | [Read chapter](book/02-wrapper.md) | [Term](term.md), [Deposit](deposit.md) |
| 3. Redemption behaviour | Draft | [Read chapter](book/03-redemption.md) | [Feature map](feature-map.md) |
| 4. Term | Draft | [Read chapter](book/04-term.md) | [Term](term.md) |
| 5. Underliers | Draft | [Read chapter](book/05-underliers.md) | [Underlier model](underlier-model.md), [Basket](basket.md) |
| 6. Determination methods | Draft | [Read chapter](book/06-determination.md) | [Averaging](averaging.md), [Lookback](lookback.md) |
| 7. Payoff and payment | Draft | [Read chapter](book/07-payoff-and-payment.md) | [Participation and protection](participation-and-protection.md) |
| 8. Participation | Draft | [Read chapter](book/08-participation.md) | [Participation and protection](participation-and-protection.md) |
| 9. Principal protection | Draft | [Read chapter](book/09-principal-protection.md) | [Participation and protection](participation-and-protection.md) |
| 10. Cap | Draft | [Read chapter](book/10-cap.md) | [Absolute return](absolute-return.md) |
| 11. Buffer | Draft | [Read chapter](book/11-buffer.md) | [Buffer](buffer.md) |
| 12. Barrier | Draft | [Read chapter](book/12-barrier.md) | [Barrier](barrier.md) |
| 13. Absolute return | Draft | [Read chapter](book/13-absolute-return.md) | [Absolute return](absolute-return.md) |
| 14. Combining payoff features | Draft | [Read chapter](book/14-combining-features.md) | [Feature map](feature-map.md) |
| 15. Worked synthetic examples | Draft | [Read chapter](book/15-worked-examples.md) | [Milestone 1](milestone-1.md) |
| 16. Payoff diagrams and scenarios | Draft | [Read chapter](book/16-diagrams-and-scenarios.md) | [Payoff chart](payoff-chart.md) |
| 17. The structure as JSON | Draft | [Read chapter](book/17-structure-as-json.md) | [Underlier model](underlier-model.md) |
| 18. Market-linked deposits | Draft | [Read chapter](book/18-market-linked-deposits.md) | [Deposit](deposit.md) |
| 19. Boundaries of the reference | Draft | [Read chapter](book/19-boundaries.md) | [README](../README.md) |
| Coupons | Planned | — | [Coupon](coupon.md) |
| Observation dates and early redemption | Planned | — | [Observation dates](observation-dates.md), [Feature map](feature-map.md) |

Draft means reader-facing text exists and is available in the book view; it
does not mean editorial review is complete. Determination and deposits have
their own chapters because each needs an explanation beyond the overview of
underliers and wrappers. Coupons and scheduling remain planned rather than
being published from implementation proposals.

## Chapter standard

Each chapter should normally include:

1. A public definition in plain language.
2. Why the concept exists.
3. One small synthetic example.
4. A calculation, diagram, or scenario where useful.
5. Relationships to nearby concepts.
6. Clearly labelled example assumptions and scope limits.
7. Open questions only where uncertainty matters to the reader.

Internal implementation debates, rejected alternatives, source-reading notes,
and detailed architecture decisions stay in the working documents.
