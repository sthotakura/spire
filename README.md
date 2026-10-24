# SPIRe

**Structured Products Interactive Reference** is a public learning project for exploring structured-product concepts from first principles. Its first goal is an interactive website where a learner can assemble a small structure, see its contractual payoff, and understand the assumptions behind it.

SPIRe uses generic public concepts and synthetic examples. It does not describe or reproduce any proprietary issuance platform.

## What it covers

The starting note is a bullet note linked to one equity or equity index. It only repays principal, and the reader adds features one at a time. Each feature is a small, separate part of the structure, so a combination is composed rather than hard-coded as a product type.

- **Wrapper and term.** A **note**, or a **deposit** that a bank repays in full at the end of its term. A note's **bullet** redemption is one payment at maturity. A deposit with upside participation, and optionally a cap or a minimum return, is a market-linked deposit.
- **Underlier.** One equity or equity index, or a weighted basket, a worst-of or a best-of. The initial level comes from the determination method: point to point, lookback (the lowest of the initial level and several later levels), or averaging (the final level is the average of several levels).
- **Payoff at maturity.** Upside and downside participation, principal protection (the contractual floor on the maturity payment), a buffer against the first part of a fall, a barrier below which the whole fall counts (observed on the final date or on every close), a cap on the return, absolute return, an upside barrier, and a digital return (a fixed return paid as a floor while the final level is at or above its own barrier). A note with none of them repays principal.
- **Reviews and early redemption.** A review schedule, with an **autocall** (the note redeems early when the underlier is at or above a trigger, which can step), a non-call period, a call amount, and an **issuer call** (the issuer's choice of review).
- **Coupons.** A contingent coupon on its own schedule, paid when the underlier is at or above a coupon barrier, with optional memory of missed coupons.

Principal protection is a separate economic rule from participation: participation sets the payment above the floor. Contractual payment depends on the issuer's ability to pay. The concepts, with their definitions and assumptions, are in the book and in [docs/feature-map.md](docs/feature-map.md).

## Interface direction

The single-page application shows the product as an outline of its concepts: wrapper, redemption behavior, term, underlier (its asset, initial level and determination method), coupon, and payoff. Each term sits beside the concept it belongs to. The note starts with no payoff features, so it only repays principal, and the reader adds features one at a time.

Beside the outline the page shows a one-sentence summary of the note, a payoff diagram with draggable handles, a worked calculation of the payment, a scenario table, and the note's structure as JSON. A product with reviews also gets a review table, with the level read on each date and named paths such as a rise and a recovery. Selecting a concept highlights it in each of them.

A menu beside the page heading, "Start from a sample", opens sample products, each modelled on a public product with synthetic underliers and a generic name, grouped by family. Twenty in all, from market-linked deposits to callable contingent coupon notes. Each has its own link, such as `/spire/?example=dual-directional-buffered-note`; a visit with no link opens the starting note. While a sample is open, an ⓘ beside the menu links to the public filing it is modelled on and says how the sample differs. The samples and their sources are in [docs/sample-products.md](docs/sample-products.md).

Under the summary, "Often marketed as" lists generic names a structure like this is commonly sold under, such as a principal-protected note, a capped participation note or an Express certificate. They are hints drawn from public sources, not definitions, and a note that fits none shows none. Each name's popup also names the broad category the terms place the note in: Capital Protection, Participation or Yield Enhancement. The rules are recorded in [docs/marketing-names.md](docs/marketing-names.md).

The reference supports only the combinations we can define and test precisely. Other choices are visible and marked unavailable, without suggesting they already work, and a combination that is not supported is said to be so rather than given invented behavior. A fixed coupon, for example, is still a proposal ([docs/coupon.md](docs/coupon.md)). The interface design is recorded in [docs/annotated-outline-task.md](docs/annotated-outline-task.md).

## Technology direction

The reader-facing book, **Structured products, built from their parts**, is
written in `docs/book/` and rendered by the book view. Its chapter navigation
is generated from the numbered Markdown files. See
[docs/book-outline.md](docs/book-outline.md) for chapter status and the working
research behind each chapter. Locally, open `/book/`; the production base path
places it under `/spire/book/`. The builder and the book are routes of one
client-side routed app (`/` and `/book/<chapter>`), sharing one header; the Pages
workflow serves `index.html` as `404.html` so a direct visit to a chapter reaches
the router. The book has 21 chapters, all still drafts.

Use TypeScript and Vue with Vite to build a static single-page application. Keep payoff logic and validation in framework-independent TypeScript modules. Add a backend only when a concrete capability requires one.

## Boundaries

The first milestone does not cover real market pricing, volatility, Greeks, live data, trade booking, document generation, issuance workflows, security identifiers, regulatory processing, or AI. Scenarios illustrate contractual maturity amounts, not market value or investment outcomes.

See [PLAN.md](PLAN.md) for the immediate work and open questions.

The structure the page shows as JSON has a JSON Schema in [docs/schema/product.schema.json](docs/schema/product.schema.json) (also served by the site at `product.schema.json`, linked under the JSON), generated from the domain types with `npm run schema`. It lists every variant and feature, with descriptions, numeric limits and seventeen example products. Two of the rules that tie fields together are written into it; the validator enforces all of them, and the schema's description lists which is which.

The original first-milestone concepts and example are recorded in [docs/milestone-1.md](docs/milestone-1.md). The subsequent separation of protection, upside participation, and downside participation is recorded in [docs/participation-and-protection.md](docs/participation-and-protection.md), the buffer in [docs/buffer.md](docs/buffer.md), averaging in [docs/averaging.md](docs/averaging.md), lookback in [docs/lookback.md](docs/lookback.md), the term in [docs/term.md](docs/term.md), the market-linked deposit in [docs/deposit.md](docs/deposit.md), absolute return in [docs/absolute-return.md](docs/absolute-return.md), barriers in [docs/barrier.md](docs/barrier.md) and [docs/upside-barrier.md](docs/upside-barrier.md), baskets and worst-of in [docs/basket.md](docs/basket.md) and [docs/worst-of.md](docs/worst-of.md), reviews and autocall in [docs/observation-dates.md](docs/observation-dates.md), [docs/autocall-observation-schedule.md](docs/autocall-observation-schedule.md) and [docs/non-call-period.md](docs/non-call-period.md), the issuer call in [docs/issuer-call.md](docs/issuer-call.md), coupons in [docs/contingent-coupon.md](docs/contingent-coupon.md) and [docs/coupon.md](docs/coupon.md), and the sample products in [docs/sample-products.md](docs/sample-products.md).

## Run locally

```sh
npm install
npm run dev
```

Use `npm test` for the domain scenarios and `npm run build` for type checking and a static production build. Amounts displayed in the interface are rounded to two decimal places; the calculator uses JavaScript numbers for this learning example and is not a production money calculation. The calculator reads synthetic scenario levels, not market data.

## After adding or changing a feature

Two generated files are not updated by `npm test` or `npm run build`, so regenerate them by hand and commit the result:

```sh
npm run schema        # docs/schema/product.schema.json, from the domain types
npm run book-charts   # docs/book/charts/*.svg, drawn from the running app
```

`npm run book-charts` needs a browser once: `npx playwright install chromium`. It also needs an entry in `scripts/book-charts.ts` for any chart a new feature should show, and the chart embedded in its chapter with `![caption](charts/name.svg)`. The schema has a test that fails when it is stale; the charts do not, so this step is easy to forget.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` tests and builds the site on pushes to `main`, then deploys `dist` to GitHub Pages. In the repository's **Settings → Pages**, set **Build and deployment → Source** to **GitHub Actions**. The workflow builds with `/spire/` as the asset base for the repository site at `https://sthotakura.github.io/spire/`.

## Analytics

The published site counts visits with [GoatCounter](https://www.goatcounter.com/), which records aggregate page views without cookies or personal data. Visits from `localhost` are not counted.
