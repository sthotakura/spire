# SPIRe

**Structured Products Interactive Reference** is a public learning project for exploring structured-product concepts from first principles. Its first goal is an interactive website where a learner can assemble a small structure, see its contractual payoff, and understand the assumptions behind it.

SPIRe uses generic public concepts and synthetic examples. It does not describe or reproduce any proprietary issuance platform.

## First example

The first structure is a bullet note linked to one equity or equity index, with point-to-point participation. The example compares an initial and a hypothetical final underlier level (with lookback, the initial level is the lowest of it and several levels observed after pricing; with averaging, the final level is the average of several observed levels), applies selected participation rules to positive or negative performance, enforces a configurable contractual protection floor, and displays a maturity payment, scenario table, diagram, and plain-English explanation. Upside participation, downside participation, principal protection, a buffer against the first part of a fall, a barrier below which the whole fall counts, and a cap on the maximum return are each optional; a note with none of them repays principal.

The wrapper is a **note**; **bullet** describes its one-payment-at-maturity redemption behavior. Principal protection is a separate economic rule that sets the contractual maturity-payment floor as a percentage of principal. Upside and downside participation determine the payment above that floor. Contractual payment depends on the issuer's ability to pay.

## Interface direction

The single-page application shows the product as an outline of its concepts: wrapper, redemption behavior, underlier (its asset, initial level and determination method), and payoff. Each term sits beside the concept it belongs to. The note starts with no payoff features, so it only repays principal, and the reader adds a buffer, a cap, downside participation, principal protection, and upside participation one at a time.

Beside the outline the page shows a one-sentence summary of the note, a payoff diagram with draggable handles, a worked calculation of the maturity payment, a scenario table, and the note's structure as JSON. Selecting a concept highlights it in each of them.

Under the summary, "Often marketed as" lists generic names a structure like this is commonly sold under, such as a principal-protected note or a capped participation note. They are hints drawn from public sources, not definitions, and a note that fits none shows none. The rules are recorded in [docs/marketing-names.md](docs/marketing-names.md).

The first release supports only the combination we can define and test precisely. Other choices are visible and marked unavailable, without suggesting they already work. Observation or valuation schedules will arrive with an example that actually uses them; where they belong is an open question in [docs/underlier-model.md](docs/underlier-model.md). The interface design is recorded in [docs/annotated-outline-task.md](docs/annotated-outline-task.md).

## Technology direction

Use TypeScript and Vue with Vite to build a static single-page application. Keep payoff logic and validation in framework-independent TypeScript modules. Add a backend only when a concrete capability requires one.

## Boundaries

The first milestone does not cover real market pricing, volatility, Greeks, live data, trade booking, document generation, issuance workflows, security identifiers, regulatory processing, or AI. Scenarios illustrate contractual maturity amounts, not market value or investment outcomes.

See [PLAN.md](PLAN.md) for the immediate work and open questions.

The original first-milestone concepts and example are recorded in [docs/milestone-1.md](docs/milestone-1.md). The subsequent separation of protection, upside participation, and downside participation is recorded in [docs/participation-and-protection.md](docs/participation-and-protection.md), the buffer in [docs/buffer.md](docs/buffer.md), averaging in [docs/averaging.md](docs/averaging.md), and lookback in [docs/lookback.md](docs/lookback.md).

## Run locally

```sh
npm install
npm run dev
```

Use `npm test` for the domain scenarios and `npm run build` for type checking and a static production build. The app currently supports the first synthetic product only. Amounts displayed in the interface are rounded to two decimal places; the calculator uses JavaScript numbers for this learning example and is not a production money calculation.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` tests and builds the site on pushes to `main`, then deploys `dist` to GitHub Pages. In the repository's **Settings → Pages**, set **Build and deployment → Source** to **GitHub Actions**. The workflow builds with `/spire/` as the asset base for the repository site at `https://sthotakura.github.io/spire/`.

## Analytics

The published site counts visits with [GoatCounter](https://www.goatcounter.com/), which records aggregate page views without cookies or personal data. Visits from `localhost` are not counted.
