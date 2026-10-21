import type { Product, Underlier } from '../domain/note'

// Sample products the builder can open, each with an address of its own (?example=slug). Each is modelled on a public product
// recorded in docs/sample-products.md, with synthetic names and levels, and uses only concepts the reference already explains.
// The public product a sample is modelled on, and how the sample differs from it beyond its synthetic underliers.
export interface SampleSource { title: string; url: string; note?: string }
export interface SampleProduct { slug: string; name: string; source: SampleSource; product: Product }
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
      { slug: 'capped-market-linked-deposit', name: 'Capped market-linked deposit', source: { title: 'Morgan Stanley capped market-linked CD', url: 'https://www.morganstanley.com/structuredinvestments/docs/summarysheets/61773TBB8_Summary_Sheet_Only.pdf', note: 'The maximum payment was set at pricing between 130% and 135%; this takes 130%.' }, product: product(60, { participations: [{ direction: 'upside', rate: 1, cap: 0.3 }] }, { wrapper: 'deposit' }) },
      { slug: 'leveraged-market-linked-deposit', name: 'Leveraged market-linked deposit', source: { title: 'Morgan Stanley trend index CD', url: 'https://www.morganstanley.com/structuredinvestments/docs/prospectus/prelim/ProspectusRed61773TAM5.pdf', note: 'The participation rate was set at pricing between 265% and 280%; this takes 265%. The CD’s underlier is a trend index.' }, product: product(60, { participations: [{ direction: 'upside', rate: 2.65 }] }, { wrapper: 'deposit' }) },
    ],
  },
  {
    label: 'Participation notes',
    samples: [
      {
        slug: 'capped-principal-protected-note',
        name: 'Capped principal-protected note',
        source: { title: 'Citigroup Global Markets market-linked securities on the Dow Jones Industrial Average, due 2029', url: 'https://www.sec.gov/Archives/edgar/data/200245/000191870426029060/form424b2.htm', note: 'The cap was set at pricing at 20% or more; this takes 20%. The 33 months run from pricing to valuation.' },
        product: product(33, { participations: [{ direction: 'upside', rate: 1, cap: 0.2 }], principalProtection: 1 }),
      },
      {
        slug: 'capped-barrier-note',
        name: 'Capped barrier note',
        source: { title: 'Citigroup Global Markets barrier securities on the S&P 500, due 2027', url: 'https://www.sec.gov/Archives/edgar/data/200245/000191870426029728/form424b2.htm', note: 'The cap was set at pricing at 11.25% or more; this takes 11.25%.' },
        product: product(12, { participations: [{ direction: 'downside', barrier: { level: 0.8, observation: 'final' }, rate: 1 }, { direction: 'upside', rate: 1, cap: 0.1125 }] }),
      },
      // The buffer rate is the initial level divided by the buffer level, which reaches a 100% loss when the underlier falls to zero.
      {
        slug: 'capped-buffered-note',
        name: 'Capped buffered note',
        source: { title: 'JPMorgan Chase Financial capped buffered enhanced participation equity notes on the S&P 500, due 2028', url: 'https://www.sec.gov/Archives/edgar/data/19617/000121390026107651/ea0308033-01_424b2.htm', note: 'The cap level was set at pricing between 119.04% and 122.39%; this takes 119.04%. The 26 months are about the time from trade date to determination date.' },
        product: product(26, { participations: [{ direction: 'downside', buffer: 0.15, rate: 1 / 0.85 }, { direction: 'upside', rate: 1.4, cap: 0.1904 }] }),
      },
      {
        slug: 'lookback-barrier-note',
        name: 'Lookback barrier note',
        source: { title: 'JPMorgan uncapped lookback accelerated barrier note', url: 'https://www.sec.gov/Archives/edgar/data/19617/000121390026049358/ea0288297-01_424b2.htm', note: 'The leverage factor was set at pricing at 1.70 or more; this takes 1.70. The filing’s lookback reads every close for about six weeks; this reads six dates.' },
        product: product(60, { participations: [{ direction: 'downside', barrier: { level: 0.7, observation: 'final' }, rate: 1 }, { direction: 'upside', rate: 1.7 }] }, {
          underlier: single({ initial: { kind: 'lookback', observationCount: 6 }, final: { kind: 'final-date' } }),
        }),
      },
      {
        slug: 'worst-of-leveraged-barrier-note',
        name: 'Worst-of leveraged barrier note',
        source: { title: 'Citigroup Global Markets barrier securities on the worst performing of three indices, due 2025', url: 'https://www.sec.gov/Archives/edgar/data/200245/000095010321020057/dp163912_424b2-us2176334.htm', note: 'The 42 months run from pricing to valuation.' },
        product: product(42, { participations: [{ direction: 'downside', barrier: { level: 0.8, observation: 'final' }, rate: 1 }, { direction: 'upside', rate: 1.415 }] }, { underlier: worstOf('Index A', 'Index B', 'Index C') }),
      },
      {
        slug: 'dual-directional-buffered-note',
        name: 'Dual directional buffered note',
        source: { title: 'Morgan Stanley Dual Directional Buffered Participation Securities, No. 19,026', url: 'https://www.morganstanley.com/structuredinvestments/docs/prospectus/prelim/ProspectusRed61781LXR6.pdf', note: 'The maximum payment was set at pricing between 169% and 171%; this takes 169%.' },
        product: product(60, { participations: [{ direction: 'downside', buffer: 0.15, absoluteReturn: { rate: 1 }, rate: 1 }, { direction: 'upside', rate: 1, cap: 0.69 }] }),
      },
      {
        slug: 'worst-of-dual-directional-buffered-note',
        name: 'Worst-of dual directional buffered note',
        source: { title: 'Morgan Stanley Dual Directional Buffered PLUS, No. 19,021', url: 'https://www.morganstanley.com/structuredinvestments/docs/prospectus/prelim/ProspectusRed61781LVU1.pdf', note: 'The leverage factor was set at pricing between 139% and 154%; this takes 139%.' },
        product: product(60, { participations: [{ direction: 'downside', buffer: 0.2, absoluteReturn: { rate: 1 }, rate: 1 }, { direction: 'upside', rate: 1.39 }] }, { underlier: worstOf('Index A', 'Index B', 'Index C') }),
      },
      {
        slug: 'worst-of-dual-directional-barrier-note',
        name: 'Worst-of dual directional barrier note',
        source: { title: 'Morgan Stanley Dual Directional Trigger PLUS, No. 18,961', url: 'https://www.morganstanley.com/structuredinvestments/docs/prospectus/prelim/ProspectusRed61781LUU2.pdf', note: 'The leverage factor was set at pricing between 125% and 140%; this takes 125%.' },
        product: product(48, { participations: [{ direction: 'downside', barrier: { level: 0.7, observation: 'final' }, absoluteReturn: { rate: 0.5 }, rate: 1 }, { direction: 'upside', rate: 1.25 }] }, { underlier: worstOf('Index A', 'Index B') }),
      },
    ],
  },
  {
    label: 'Barrier absolute return',
    samples: [
      {
        slug: 'barrier-absolute-return-note',
        name: 'Barrier absolute return note',
        source: { title: 'JPMorgan Financial barrier absolute return market linked notes, 2018', url: 'https://www.sec.gov/Archives/edgar/data/19617/000161577418007603/s111907_424b2.htm' },
        product: product(24, { participations: [], barrierAbsoluteReturn: { rate: 1, lowerBarrier: { level: 0.7625, observation: 'daily-close' }, upperBarrier: { level: 1.2375, observation: 'daily-close' }, conditionalReturn: 0.02 } }),
      },
      {
        slug: 'barrier-absolute-return-note-without-conditional-return',
        name: 'Barrier absolute return note without a conditional return',
        source: { title: 'Barclays Bank PLC barrier absolute return market linked notes, 2025', url: 'https://www.sec.gov/Archives/edgar/data/312070/000095010325010558/dp233273_424b2-7706ubs.htm', note: 'The filing’s term is approximately 13 months; this takes 13.' },
        product: product(13, { participations: [], barrierAbsoluteReturn: { rate: 1, lowerBarrier: { level: 0.84, observation: 'daily-close' }, upperBarrier: { level: 1.16, observation: 'daily-close' } } }),
      },
    ],
  },
  {
    label: 'Autocallable notes',
    samples: [
      {
        slug: 'autocallable-contingent-coupon-note',
        name: 'Autocallable contingent coupon note',
        source: { title: 'JPMorgan auto callable contingent interest note on one stock, 2026', url: 'https://www.sec.gov/Archives/edgar/data/19617/000121390026045661/ea0286921-01_424b2.htm' },
        product: product(36, { participations: [{ direction: 'downside', barrier: { level: 0.4, observation: 'final' }, rate: 1 }] }, {
          redemption: { kind: 'autocall', schedule: { frequency: 'monthly' }, trigger: 1, nonCallReviews: 5, triggerStep: 0, callAmount: 0, callAmountBasis: 'flat', callOnFinalReview: false },
          coupon: { schedule: { frequency: 'monthly' }, rate: 0.1735, barrier: 0.5, memory: true },
        }),
      },
      // The 1.25 rate makes the loss reach 100% when the worst asset falls to zero.
      {
        slug: 'worst-of-autocallable-contingent-coupon-note',
        name: 'Worst-of autocallable contingent coupon note with a buffer',
        source: { title: 'JPMorgan auto callable contingent interest note on two funds, 2026', url: 'https://www.sec.gov/Archives/edgar/data/19617/000121390026108339/ea0308243-01_424b2.htm', note: 'The filing’s underliers are two funds.' },
        product: product(12, { participations: [{ direction: 'downside', buffer: 0.2, rate: 1.25 }] }, {
          redemption: { kind: 'autocall', schedule: { frequency: 'monthly' }, trigger: 1, nonCallReviews: 5, triggerStep: 0, callAmount: 0, callAmountBasis: 'flat', callOnFinalReview: false },
          coupon: { schedule: { frequency: 'monthly' }, rate: 0.1415, barrier: 0.8, memory: true },
          underlier: worstOf('Index A', 'Index B'),
        }),
      },
      {
        slug: 'worst-of-step-down-autocallable-note',
        name: 'Worst-of step-down autocallable note',
        source: { title: 'UBS trigger autocallable note, 2025', url: 'https://www.sec.gov/Archives/edgar/data/1114446/000183988225047092/ubs_424b2-26373.htm', note: 'The filing’s call prices, $1,187.50 to $2,125, are what this pays on a call.' },
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
      {
        slug: 'callable-contingent-coupon-note',
        name: 'Callable contingent coupon note',
        source: { title: 'BofA Finance issuer callable yield note, 2024', url: 'https://www.sec.gov/Archives/edgar/data/1682472/000148105724004907/form424b2.htm', note: 'Issued 10 April 2024 and first callable 10 October 2024, read here as one quarterly review without a call.' },
        product: product(36, { participations: [{ direction: 'downside', barrier: { level: 0.7, observation: 'final' }, rate: 1 }] }, {
          redemption: { kind: 'issuer-call', schedule: { frequency: 'quarterly' }, nonCallReviews: 1, callAmount: 0, callAmountBasis: 'flat' },
          coupon: { schedule: { frequency: 'monthly' }, rate: 0.082, barrier: 0.7, memory: false },
        }),
      },
      {
        slug: 'worst-of-callable-contingent-coupon-note',
        name: 'Worst-of callable contingent coupon note',
        source: { title: 'JPMorgan callable contingent interest note on three indices, 2023', url: 'https://www.sec.gov/Archives/edgar/data/19617/000121390023083784/ea165015_424b2.htm', note: 'The coupon rate was set at pricing at 11.30% a year or more; this takes 11.30%.' },
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

// Whether two products state the same terms. A key whose value is undefined is the same as a missing one, as in JSON, and numbers
// agree to the eight decimals the builder keeps: it holds a rate as a percent to six, so 1 / 0.85 comes back as 1.17647059.
export function sameProduct(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, i) => sameProduct(item, b[i]))
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 1e-8
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return a === b
  const keys = (value: object) => Object.entries(value).filter(([, item]) => item !== undefined).map(([key]) => key)
  const [aKeys, bKeys] = [keys(a), keys(b)]
  return aKeys.length === bKeys.length && aKeys.every((key) => sameProduct((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]))
}
