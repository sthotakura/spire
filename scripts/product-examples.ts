import type { Product } from '../src/domain/note'
import { startingProduct } from '../src/domain/starting-note'

// Products the model supports, one for each family of features. The schema publishes them as its examples and the tests check that
// every one passes both the schema and validateProduct, so a feature added to the structure should get an example here.
const asset = (name: string) => ({ kind: 'equity-index' as const, name })
const single = (determination: Extract<Product['underlier'], { kind: 'single' }>['determination'] = { initial: { kind: 'given', level: 100 }, final: { kind: 'final-date' } }): Product['underlier'] => ({
  kind: 'single',
  components: [{ asset: asset('Synthetic Index') }],
  determination,
})
const note = (payoff: Product['payoff'], overrides: Partial<Product> = {}): Product => ({
  wrapper: 'note',
  principalAmount: 1000,
  term: { months: 36 },
  redemption: 'bullet',
  underlier: single(),
  payoff,
  ...overrides,
})

export const productExamples: ReadonlyArray<readonly [string, Product]> = [
  ['the starting note, which only repays principal', startingProduct],
  ['both participations with principal protection', note({ participations: [{ direction: 'downside', rate: 1 }, { direction: 'upside', rate: 1.5 }], principalProtection: 0.9 })],
  ['a buffer on the downside and a cap on the upside', note({ participations: [{ direction: 'downside', buffer: 0.1, rate: 1 }, { direction: 'upside', rate: 1, cap: 0.2 }] })],
  [
    'a barrier on each side, observed on every close, with a rebate',
    note({ participations: [{ direction: 'downside', barrier: { level: 0.7, observation: 'daily-close' }, rate: 1 }, { direction: 'upside', barrier: { level: 1.3, observation: 'daily-close', rebate: 0.02 }, rate: 0.8 }] }),
  ],
  ['absolute return on a fall within a buffer', note({ participations: [{ direction: 'downside', buffer: 0.15, absoluteReturn: { rate: 1 }, rate: 1 }, { direction: 'upside', rate: 1.25 }] })],
  [
    'barrier absolute return with a conditional return',
    note({ participations: [], barrierAbsoluteReturn: { rate: 1, lowerBarrier: { level: 0.8, observation: 'daily-close' }, upperBarrier: { level: 1.25, observation: 'daily-close' }, conditionalReturn: 0.02 } }),
  ],
  [
    'barrier absolute return with no conditional return, read on the final date',
    note({ participations: [], barrierAbsoluteReturn: { rate: 1, lowerBarrier: { level: 0.8, observation: 'final' }, upperBarrier: { level: 1.25, observation: 'final' } } }),
  ],
  [
    'a digital return of 26% paid while the worst of three assets is at or above 70% of its initial level, beside 1:1 participation both ways',
    note({ participations: [{ direction: 'downside', rate: 1 }, { direction: 'upside', rate: 1 }], digitalReturn: { amount: 0.26, barrier: { level: 0.7, observation: 'final' } } }, {
      underlier: {
        kind: 'basket',
        components: [{ asset: asset('Index A') }, { asset: asset('Index B') }, { asset: asset('Index C') }],
        determination: { initial: { kind: 'given', levels: [{ asset: 'Index A', level: 100 }, { asset: 'Index B', level: 50 }, { asset: 'Index C', level: 200 }] }, final: { kind: 'final-date' }, basketReturn: { kind: 'worst-of' } },
      },
    }),
  ],
  [
    'a digital return that is the most the note pays, with downside participation and no upside participation, on a worst-of basket',
    note({ participations: [{ direction: 'downside', rate: 1 }], digitalReturn: { amount: 0.0808, barrier: { level: 0.71, observation: 'final' } } }, {
      term: { months: 13 },
      underlier: {
        kind: 'basket',
        components: [{ asset: asset('Index A') }, { asset: asset('Index B') }],
        determination: { initial: { kind: 'given', levels: [{ asset: 'Index A', level: 100 }, { asset: 'Index B', level: 50 }] }, final: { kind: 'final-date' }, basketReturn: { kind: 'worst-of' } },
      },
    }),
  ],
  ['a digital return whose barrier is the initial level itself, beside participation both ways', note({ participations: [{ direction: 'downside', rate: 1 }, { direction: 'upside', rate: 1 }], digitalReturn: { amount: 0.15, barrier: { level: 1, observation: 'final' } } })],
  ['a deposit with upside participation and a minimum return', note({ participations: [{ direction: 'upside', rate: 1 }], minimumReturn: 0.05 }, { wrapper: 'deposit' })],
  [
    'lookback on the initial level and averaging on the final level',
    note({ participations: [{ direction: 'upside', rate: 1 }] }, { underlier: single({ initial: { kind: 'lookback', observationCount: 3 }, final: { kind: 'averaging', observationCount: 4 } }) }),
  ],
  [
    'a weighted basket of two assets',
    note({ participations: [{ direction: 'upside', rate: 1 }] }, {
      underlier: {
        kind: 'basket',
        components: [{ asset: asset('Index A'), weight: 0.5 }, { asset: asset('Index B'), weight: 0.5 }],
        determination: { initial: { kind: 'given', levels: [{ asset: 'Index A', level: 100 }, { asset: 'Index B', level: 100 }] }, final: { kind: 'final-date' }, basketReturn: { kind: 'weighted' } },
      },
    }),
  ],
  [
    'a worst-of basket with a buffer, whose loss reaches 100% when the worst asset falls to zero',
    note({ participations: [{ direction: 'downside', buffer: 0.2, rate: 1.25 }] }, {
      underlier: {
        kind: 'basket',
        components: [{ asset: asset('Index A') }, { asset: asset('Index B') }],
        determination: { initial: { kind: 'given', levels: [{ asset: 'Index A', level: 100 }, { asset: 'Index B', level: 50 }] }, final: { kind: 'final-date' }, basketReturn: { kind: 'worst-of' } },
      },
    }),
  ],
  [
    'a best-of basket with averaging',
    note({ participations: [{ direction: 'upside', rate: 1 }] }, {
      underlier: {
        kind: 'basket',
        components: [{ asset: asset('Index A') }, { asset: asset('Index B') }],
        determination: { initial: { kind: 'given', levels: [{ asset: 'Index A', level: 100 }, { asset: 'Index B', level: 100 }] }, final: { kind: 'averaging', observationCount: 4 }, basketReturn: { kind: 'best-of' } },
      },
    }),
  ],
  [
    'an autocall reviewed monthly on a worst-of basket that cannot be called before the sixth review, with a buffer at the end of the term',
    note({ participations: [{ direction: 'downside', buffer: 0.2, rate: 1.25 }] }, {
      term: { months: 12 },
      redemption: { kind: 'autocall', schedule: { frequency: 'monthly' }, trigger: 1, nonCallReviews: 5, callAmount: 0.08 },
      underlier: {
        kind: 'basket',
        components: [{ asset: asset('Index A') }, { asset: asset('Index B') }],
        determination: { initial: { kind: 'given', levels: [{ asset: 'Index A', level: 100 }, { asset: 'Index B', level: 50 }] }, final: { kind: 'final-date' }, basketReturn: { kind: 'worst-of' } },
      },
    }),
  ],
  [
    'an issuer call on a quarterly review, with a non-call period of two reviews and a 2% call amount, on a worst-of basket with a barrier',
    note({ participations: [{ direction: 'downside', barrier: { level: 0.7, observation: 'final' }, rate: 1 }] }, {
      term: { months: 36 },
      redemption: { kind: 'issuer-call', schedule: { frequency: 'quarterly' }, nonCallReviews: 2, callAmount: 0.02 },
      underlier: {
        kind: 'basket',
        components: [{ asset: asset('Index A') }, { asset: asset('Index B') }],
        determination: { initial: { kind: 'given', levels: [{ asset: 'Index A', level: 100 }, { asset: 'Index B', level: 50 }] }, final: { kind: 'final-date' }, basketReturn: { kind: 'worst-of' } },
      },
    }),
  ],
  [
    'an autocall reviewed every six months whose trigger steps down, whose call amount grows each year, and whose final review is also a call',
    note({ participations: [{ direction: 'downside', barrier: { level: 0.5, observation: 'final' }, rate: 1 }] }, {
      term: { months: 36 },
      redemption: { kind: 'autocall', schedule: { frequency: 'semi-annual' }, trigger: 1, triggerStep: -0.05, callAmount: 0.1, callAmountBasis: 'per-year', callOnFinalReview: true },
      underlier: {
        kind: 'basket',
        components: [{ asset: asset('Index A') }, { asset: asset('Index B') }, { asset: asset('Index C') }],
        determination: { initial: { kind: 'given', levels: [{ asset: 'Index A', level: 100 }, { asset: 'Index B', level: 50 }, { asset: 'Index C', level: 200 }] }, final: { kind: 'final-date' }, basketReturn: { kind: 'worst-of' } },
      },
    }),
  ],
  [
    'an autocall reviewed monthly with a contingent coupon of 17.35% a year at a 50% barrier, with memory, that cannot be called before the sixth review, and a 40% downside barrier at the end of the term',
    note({ participations: [{ direction: 'downside', barrier: { level: 0.4, observation: 'final' }, rate: 1 }] }, {
      term: { months: 36 },
      redemption: { kind: 'autocall', schedule: { frequency: 'monthly' }, trigger: 1, nonCallReviews: 5, callAmount: 0 },
      coupon: { schedule: { frequency: 'monthly' }, rate: 0.1735, barrier: 0.5, memory: true },
    }),
  ],
  [
    'an autocall reviewed quarterly with a contingent coupon reviewed monthly, on its own schedule',
    note({ participations: [{ direction: 'downside', barrier: { level: 0.6, observation: 'final' }, rate: 1 }] }, {
      term: { months: 24 },
      redemption: { kind: 'autocall', schedule: { frequency: 'quarterly' }, trigger: 1, nonCallReviews: 1, callAmount: 0 },
      coupon: { schedule: { frequency: 'monthly' }, rate: 0.12, barrier: 0.7 },
    }),
  ],
  [
    'a bullet note with a contingent coupon reviewed quarterly, at a 70% barrier, and a 70% downside barrier at the end of the term',
    note({ participations: [{ direction: 'downside', barrier: { level: 0.7, observation: 'final' }, rate: 1 }] }, {
      term: { months: 24 },
      coupon: { schedule: { frequency: 'quarterly' }, rate: 0.08, barrier: 0.7, memory: false },
    }),
  ],
  [
    'an autocall reviewed quarterly on a worst-of basket, with a fixed coupon of 11.72% a year paid on every review, a trigger stepping down from 95% and a 60% downside barrier at the end of the term',
    note({ participations: [{ direction: 'downside', barrier: { level: 0.6, observation: 'final' }, rate: 1 }] }, {
      term: { months: 18 },
      redemption: { kind: 'autocall', schedule: { frequency: 'quarterly' }, trigger: 1, triggerStep: -0.05, nonCallReviews: 1, callAmount: 0 },
      coupon: { schedule: { frequency: 'quarterly' }, rate: 0.1172 },
      underlier: {
        kind: 'basket',
        components: [{ asset: asset('Index A') }, { asset: asset('Index B') }, { asset: asset('Index C') }],
        determination: { initial: { kind: 'given', levels: [{ asset: 'Index A', level: 100 }, { asset: 'Index B', level: 50 }, { asset: 'Index C', level: 200 }] }, final: { kind: 'final-date' }, basketReturn: { kind: 'worst-of' } },
      },
    }),
  ],
]
