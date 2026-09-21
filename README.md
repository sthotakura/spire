# SPIRe

**Structured Products Issuance Reference** is a public learning project for exploring structured-product concepts from first principles. Its first goal is an interactive website where a learner can assemble a small structure, see its contractual payoff, and understand the assumptions behind it.

SPIRe uses generic public concepts and synthetic examples. It does not describe or reproduce any proprietary issuance platform.

## First example

The first structure under consideration is a bullet note linked to one equity or equity index, with point-to-point upside participation. The proposed example compares an initial and a hypothetical final underlier level, applies a participation rate to positive performance, and displays a maturity payment, scenario table, diagram, and plain-English explanation.

**First product decision:** use a 100% principal-protected participation note. The bullet wrapper means there is one payment at maturity; principal protection is a separate economic rule that sets the contractual maturity payment floor at 100% of principal. The name "principal-protected note" describes this combination, but the model should keep the protection rule distinct from the wrapper. Contractual payment depends on the issuer's ability to pay.

## Interface direction

The planned single-page application uses a guided sequence:

1. Choose a wrapper.
2. Choose a payoff mechanic.
3. Set the underlier, determination method, and relevant terms.
4. Explore hypothetical outcomes using a payoff diagram, scenario table, and explanation.

The first release will support only the combination we can define and test precisely. Other choices can be shown as future concepts without suggesting they already work. Observation or valuation schedules belong in a later example that actually uses them.

## Technology direction

Use TypeScript and Vue with Vite to build a static single-page application. Keep payoff logic and validation in framework-independent TypeScript modules. Add a backend only when a concrete capability requires one.

## Boundaries

The first milestone does not cover real market pricing, volatility, Greeks, live data, trade booking, document generation, issuance workflows, security identifiers, regulatory processing, or AI. Scenarios illustrate contractual maturity amounts, not market value or investment outcomes.

See [PLAN.md](PLAN.md) for the immediate work and open questions.

## Run locally

```sh
npm install
npm run dev
```

Use `npm test` for the domain scenarios and `npm run build` for type checking and a static production build. The app currently supports the first synthetic product only. Amounts displayed in the interface are rounded to two decimal places; the calculator uses JavaScript numbers for this learning example and is not a production money calculation.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` tests and builds the site on pushes to `main`, then deploys `dist` to GitHub Pages. In the repository's **Settings → Pages**, set **Build and deployment → Source** to **GitHub Actions**. The workflow builds with `/spire/` as the asset base for the repository site at `https://sthotakura.github.io/spire/`.
