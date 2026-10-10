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
]
