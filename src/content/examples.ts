import type { Product, Underlier } from '../domain/note'

// Sample products the builder can open, each with an address of its own (?example=slug). Each is modelled on a public product
// recorded in docs/sample-products.md, with synthetic names and levels, and uses only concepts the reference already explains.
export interface SampleProduct { slug: string; name: string; product: Product }
export interface SampleGroup { label: string; samples: SampleProduct[] }

const index = (name: string) => ({ kind: 'equity-index' as const, name })
const single = (determination: Extract<Underlier, { kind: 'single' }>['determination'] = { initial: { kind: 'given', level: 100 }, final: { kind: 'final-date' } }): Underlier => ({
  kind: 'single',
  components: [{ asset: index('Synthetic Index') }],
  determination,
})
// A worst-of basket of synthetic indices, each starting at 100.
const worstOf = (...names: string[]): Underlier => ({
  kind: 'basket',
  components: names.map((name) => ({ asset: index(name) })),
  determination: { initial: { kind: 'given', levels: names.map((asset) => ({ asset, level: 100 })) }, final: { kind: 'final-date' }, basketReturn: { kind: 'worst-of' } },
})
const product = (months: number, payoff: Product['payoff'], terms: Partial<Product> = {}): Product => ({
  wrapper: 'note',
  principalAmount: 1000,
  term: { months },
  redemption: 'bullet',
  underlier: single(),
  payoff,
  ...terms,
})

export const sampleGroups: SampleGroup[] = [
  {
    label: 'Market-linked deposits',
    samples: [
      // Morgan Stanley capped market-linked CD: a maximum payment of 130% to 135%, taken at the low end.
      { slug: 'capped-market-linked-deposit', name: 'Capped market-linked deposit', product: product(60, { participations: [{ direction: 'upside', rate: 1, cap: 0.3 }] }, { wrapper: 'deposit' }) },
      // Morgan Stanley trend index CD: participation of 265% to 280%, taken at the low end, with no maximum.
      { slug: 'leveraged-market-linked-deposit', name: 'Leveraged market-linked deposit', product: product(60, { participations: [{ direction: 'upside', rate: 2.65 }] }, { wrapper: 'deposit' }) },
    ],
  },
  {
    label: 'Participation notes',
    samples: [
      // Citigroup Global Markets market-linked securities on the Dow Jones Industrial Average, due 2029: a cap of at least 20%, taken
      // at the low end. Pricing to valuation is 33 months.
      {
        slug: 'capped-principal-protected-note',
        name: 'Capped principal-protected note',
        product: product(33, { participations: [{ direction: 'upside', rate: 1, cap: 0.2 }], principalProtection: 1 }),
      },
      // Citigroup Global Markets barrier securities on the S&P 500, due 2027: a cap of at least 11.25%, taken at the low end, and a
      // final barrier at 80% of the initial level.
      {
        slug: 'capped-barrier-note',
        name: 'Capped barrier note',
        product: product(12, { participations: [{ direction: 'downside', barrier: { level: 0.8, observation: 'final' }, rate: 1 }, { direction: 'upside', rate: 1, cap: 0.1125 }] }),
      },
      // JPMorgan Chase Financial capped buffered enhanced participation equity notes on the S&P 500, due 2028: a cap level of 119.04% to
      // 122.39%, taken at the low end, so a return of at most 19.04% at a rate of 1.40. The buffer rate is the initial level divided by
      // the buffer level, which reaches a 100% loss when the underlier falls to zero. Trade to determination is about 26 months.
      {
        slug: 'capped-buffered-note',
        name: 'Capped buffered note',
        product: product(26, { participations: [{ direction: 'downside', buffer: 0.15, rate: 1 / 0.85 }, { direction: 'upside', rate: 1.4, cap: 0.1904 }] }),
      },
      // JPMorgan uncapped lookback accelerated barrier note: a leverage factor of at least 1.70 and a barrier at 70% of the lookback
      // value. Its lookback period reads every close for about six weeks; this reads six dates.
      {
        slug: 'lookback-barrier-note',
        name: 'Lookback barrier note',
        product: product(60, { participations: [{ direction: 'downside', barrier: { level: 0.7, observation: 'final' }, rate: 1 }, { direction: 'upside', rate: 1.7 }] }, {
          underlier: single({ initial: { kind: 'lookback', observationCount: 6 }, final: { kind: 'final-date' } }),
        }),
      },
      // Morgan Stanley Dual Directional Buffered Participation Securities, No. 19,026: a maximum of 169% to 171%, taken at the low end.
      {
        slug: 'dual-directional-buffered-note',
        name: 'Dual directional buffered note',
        product: product(60, { participations: [{ direction: 'downside', buffer: 0.15, absoluteReturn: { rate: 1 }, rate: 1 }, { direction: 'upside', rate: 1, cap: 0.69 }] }),
      },
      // Morgan Stanley Dual Directional Buffered PLUS, No. 19,021: a leverage factor of 139% to 154%, taken at the low end.
      {
        slug: 'worst-of-dual-directional-buffered-note',
        name: 'Worst-of dual directional buffered note',
        product: product(60, { participations: [{ direction: 'downside', buffer: 0.2, absoluteReturn: { rate: 1 }, rate: 1 }, { direction: 'upside', rate: 1.39 }] }, { underlier: worstOf('Index A', 'Index B', 'Index C') }),
      },
      // Morgan Stanley Dual Directional Trigger PLUS, No. 18,961: a leverage factor of 125% to 140%, taken at the low end.
      {
        slug: 'worst-of-dual-directional-barrier-note',
        name: 'Worst-of dual directional barrier note',
        product: product(48, { participations: [{ direction: 'downside', barrier: { level: 0.7, observation: 'final' }, absoluteReturn: { rate: 0.5 }, rate: 1 }, { direction: 'upside', rate: 1.25 }] }, { underlier: worstOf('Index A', 'Index B') }),
      },
    ],
  },
  {
    label: 'Barrier absolute return',
    samples: [
      // JPMorgan Financial Barrier Absolute Return Market Linked Notes, 2018.
      {
        slug: 'barrier-absolute-return-note',
        name: 'Barrier absolute return note',
        product: product(24, { participations: [], barrierAbsoluteReturn: { rate: 1, lowerBarrier: { level: 0.7625, observation: 'daily-close' }, upperBarrier: { level: 1.2375, observation: 'daily-close' }, conditionalReturn: 0.02 } }),
      },
      // Barclays Bank PLC Barrier Absolute Return Market Linked Notes, 2025: about 13 months, read here as 13.
      {
        slug: 'barrier-absolute-return-note-without-conditional-return',
        name: 'Barrier absolute return note without a conditional return',
        product: product(13, { participations: [], barrierAbsoluteReturn: { rate: 1, lowerBarrier: { level: 0.84, observation: 'daily-close' }, upperBarrier: { level: 1.16, observation: 'daily-close' } } }),
      },
    ],
  },
  {
    label: 'Autocallable notes',
    samples: [
      // JPMorgan auto callable contingent interest note on a single stock, 2026.
      {
        slug: 'autocallable-contingent-coupon-note',
        name: 'Autocallable contingent coupon note',
        product: product(36, { participations: [{ direction: 'downside', barrier: { level: 0.4, observation: 'final' }, rate: 1 }] }, {
          redemption: { kind: 'autocall', schedule: { frequency: 'monthly' }, trigger: 1, nonCallReviews: 5, triggerStep: 0, callAmount: 0, callAmountBasis: 'flat', callOnFinalReview: false },
          coupon: { schedule: { frequency: 'monthly' }, rate: 0.1735, barrier: 0.5, memory: true },
        }),
      },
      // JPMorgan auto callable contingent interest note on the lesser performing of two funds, 2026. The 1.25 rate makes the loss
      // reach 100% when the worst asset falls to zero.
      {
        slug: 'worst-of-autocallable-contingent-coupon-note',
        name: 'Worst-of autocallable contingent coupon note with a buffer',
        product: product(12, { participations: [{ direction: 'downside', buffer: 0.2, rate: 1.25 }] }, {
          redemption: { kind: 'autocall', schedule: { frequency: 'monthly' }, trigger: 1, nonCallReviews: 5, triggerStep: 0, callAmount: 0, callAmountBasis: 'flat', callOnFinalReview: false },
          coupon: { schedule: { frequency: 'monthly' }, rate: 0.1415, barrier: 0.8, memory: true },
          underlier: worstOf('Index A', 'Index B'),
        }),
      },
      // UBS trigger autocallable note on the least performing of three stocks, 2025: a call return rate of 37.50% a year.
      {
        slug: 'worst-of-step-down-autocallable-note',
        name: 'Worst-of step-down autocallable note',
        product: product(36, { participations: [{ direction: 'downside', barrier: { level: 0.5, observation: 'final' }, rate: 1 }] }, {
          redemption: { kind: 'autocall', schedule: { frequency: 'semi-annual' }, trigger: 1, nonCallReviews: 0, triggerStep: -0.05, callAmount: 0.375, callAmountBasis: 'per-year', callOnFinalReview: true },
          underlier: worstOf('Index A', 'Index B', 'Index C'),
        }),
      },
    ],
  },
  {
    label: 'Issuer callable notes',
    samples: [
      // BofA Finance contingent income issuer callable yield note, 2024: callable quarterly from six months after issue.
      {
        slug: 'callable-contingent-coupon-note',
        name: 'Callable contingent coupon note',
        product: product(36, { participations: [{ direction: 'downside', barrier: { level: 0.7, observation: 'final' }, rate: 1 }] }, {
          redemption: { kind: 'issuer-call', schedule: { frequency: 'quarterly' }, nonCallReviews: 1, callAmount: 0, callAmountBasis: 'flat' },
          coupon: { schedule: { frequency: 'monthly' }, rate: 0.082, barrier: 0.7, memory: false },
        }),
      },
      // JPMorgan callable contingent interest note on the least performing of three indices, 2023: a rate of at least 11.30% a year.
      {
        slug: 'worst-of-callable-contingent-coupon-note',
        name: 'Worst-of callable contingent coupon note',
        product: product(24, { participations: [{ direction: 'downside', barrier: { level: 0.7, observation: 'final' }, rate: 1 }] }, {
          redemption: { kind: 'issuer-call', schedule: { frequency: 'monthly' }, nonCallReviews: 5, callAmount: 0, callAmountBasis: 'flat' },
          coupon: { schedule: { frequency: 'monthly' }, rate: 0.113, barrier: 0.75, memory: false },
          underlier: worstOf('Index A', 'Index B', 'Index C'),
        }),
      },
    ],
  },
]

export const sampleProducts: SampleProduct[] = sampleGroups.flatMap(({ samples }) => samples)

// A sample's address on the published site. The book links to samples this way, so a chapter read outside the app still opens one;
// the book view turns these links into links within the app.
export const sampleLink = (slug: string) => `https://sthotakura.github.io/spire/?example=${slug}`
export const sampleSlugIn = (href: string) => href.match(/^https:\/\/sthotakura\.github\.io\/spire\/\?example=([\w-]+)$/)?.[1]

export const sampleBySlug = (slug: unknown): SampleProduct | undefined => sampleProducts.find((sample) => sample.slug === slug)

// Whether two products state the same terms. A key whose value is undefined is the same as a missing one, as in JSON.
export function sameProduct(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, i) => sameProduct(item, b[i]))
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return a === b
  const keys = (value: object) => Object.entries(value).filter(([, item]) => item !== undefined).map(([key]) => key)
  const [aKeys, bKeys] = [keys(a), keys(b)]
  return aKeys.length === bKeys.length && aKeys.every((key) => sameProduct((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]))
}
