import { readFileSync } from 'node:fs'
import Ajv, { type ValidateFunction } from 'ajv'
import { beforeAll, describe, expect, it } from 'vitest'
import { productIssues, type BarrierAbsoluteReturn, type DownsideParticipation, type Product, type UpsideParticipation } from '../src/domain/note'
import { startingProduct } from '../src/domain/starting-note'
import { productSchemaText } from './product-schema'

// The schema is generated from the domain types. These tests keep it current, check it accepts the products the model supports, and
// check its numeric limits agree with validateProduct, which states them a second time.
let generated = ''
let validate: ValidateFunction

beforeAll(() => {
  generated = productSchemaText()
  validate = new Ajv().compile(JSON.parse(generated))
}, 60_000)

// A product as JSON carries it: no undefined keys.
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const schemaAccepts = (product: unknown) => validate(clone(product)) as boolean
const validatorAccepts = (product: Product) => productIssues(product).length === 0

const base: Product = {
  wrapper: 'note',
  principalAmount: 1000,
  term: { months: 36 },
  redemption: 'bullet',
  underlier: {
    kind: 'single',
    components: [{ asset: { kind: 'equity-index', name: 'Synthetic Index' } }],
    determination: { initial: { kind: 'given', level: 100 }, final: { kind: 'final-date' } },
  },
  payoff: { participations: [] },
}
const withPayoff = (payoff: Product['payoff'], overrides: Partial<Product> = {}): Product => ({ ...base, ...overrides, payoff })
const downside = (terms: Partial<DownsideParticipation>) => withPayoff({ participations: [{ direction: 'downside', rate: 1, ...terms }] })
const upside = (terms: Partial<UpsideParticipation>) => withPayoff({ participations: [{ direction: 'upside', rate: 1, ...terms }] })
const bothWays = (terms: Partial<BarrierAbsoluteReturn>) => withPayoff({
  participations: [],
  barrierAbsoluteReturn: { rate: 1, lowerBarrier: { level: 0.8, observation: 'final' }, upperBarrier: { level: 1.25, observation: 'final' }, ...terms },
})
const deposit = (minimumReturn: number) => withPayoff({ participations: [{ direction: 'upside', rate: 1 }], minimumReturn }, { wrapper: 'deposit' })
const determined = (determination: Extract<Product['underlier'], { kind: 'single' }>['determination']) => ({ ...base, underlier: { ...(base.underlier as object), determination } }) as Product
const basket = (levels: number[], names = ['Index A', 'Index B']): Product => ({
  ...base,
  underlier: {
    kind: 'basket',
    components: names.map((name) => ({ asset: { kind: 'equity-index' as const, name }, weight: 1 / names.length })),
    determination: { initial: { kind: 'given', levels: names.map((asset, i) => ({ asset, level: levels[i] })) }, final: { kind: 'final-date' }, basketReturn: { kind: 'weighted' } },
  },
})

describe('product schema', () => {
  it('is up to date: run npm run schema after adding or changing a field of the structure', () => {
    const committed = readFileSync('docs/schema/product.schema.json', 'utf8').replace(/\r\n/g, '\n')
    expect(committed === generated, 'docs/schema/product.schema.json is stale; run npm run schema').toBe(true)
  })

  describe('accepts the products the model supports', () => {
    const examples: Array<[string, Product]> = [
      ['the starting note', startingProduct],
      ['a note with both participations and protection', withPayoff({ participations: [{ direction: 'downside', rate: 1 }, { direction: 'upside', rate: 1.5 }], principalProtection: 0.9 })],
      ['a buffer and a cap', withPayoff({ participations: [{ direction: 'downside', buffer: 0.1, rate: 1 }, { direction: 'upside', rate: 1, cap: 0.2 }] })],
      ['a barrier on each side, observed daily, with a rebate', withPayoff({ participations: [{ direction: 'downside', barrier: { level: 0.7, observation: 'daily-close' }, rate: 1 }, { direction: 'upside', barrier: { level: 1.3, observation: 'daily-close', rebate: 0.02 }, rate: 0.8 }] })],
      ['absolute return under a buffer', withPayoff({ participations: [{ direction: 'downside', buffer: 0.15, absoluteReturn: { rate: 1 }, rate: 1 }, { direction: 'upside', rate: 1.25 }] })],
      ['barrier absolute return with a conditional return', bothWays({ conditionalReturn: 0.02, lowerBarrier: { level: 0.8, observation: 'daily-close' }, upperBarrier: { level: 1.25, observation: 'daily-close' } })],
      ['barrier absolute return with none', bothWays({})],
      ['a deposit with a minimum return', deposit(0.05)],
      ['lookback and averaging', withPayoff({ participations: [{ direction: 'upside', rate: 1 }] }, { underlier: { ...(base.underlier as object), determination: { initial: { kind: 'lookback', observationCount: 3 }, final: { kind: 'averaging', observationCount: 4 } } } as Product['underlier'] })],
      ['a weighted basket', basket([100, 100])],
    ]

    it.each(examples)('%s', (_, product) => {
      expect(validatorAccepts(product), 'validateProduct rejects the example').toBe(true)
      expect(schemaAccepts(product), JSON.stringify(validate.errors)).toBe(true)
    })
  })

  describe('rejects what is not a product', () => {
    it.each([
      ['a key it does not define', { ...clone(startingProduct), extra: 1 }],
      ['a misspelled key inside a feature', clone(withPayoff({ participations: [{ direction: 'upside', rate: 1, caps: 0.2 } as unknown as UpsideParticipation] }))],
      ['a wrapper it does not know', { ...clone(startingProduct), wrapper: 'certificate' }],
      ['an observation it does not know', clone(downside({ barrier: { level: 0.7, observation: 'daily' as never } }))],
      ['an underlier kind it does not know', { ...clone(startingProduct), underlier: { kind: 'worst-of' } }],
      ['a missing required key', (({ term: _term, ...rest }) => rest)(clone(startingProduct))],
    ])('%s', (_, product) => {
      expect(schemaAccepts(product)).toBe(false)
    })
  })

  // Each case changes one value across a limit. The schema and validateProduct state these limits separately, so they must agree.
  describe('agrees with validateProduct on the numeric limits', () => {
    const cases: Array<[string, Product, boolean]> = [
      ...[[0, false], [-1, false], [0.01, true]].map(([value, ok]): [string, Product, boolean] => [`principal ${value}`, { ...base, principalAmount: value as number }, ok as boolean]),
      ...[[0, false], [1, true], [120, true], [121, false], [1.5, false]].map(([value, ok]): [string, Product, boolean] => [`term of ${value} months`, { ...base, term: { months: value as number } }, ok as boolean]),
      ['downside rate 0', downside({ rate: 0 }), false], ['downside rate 0.01', downside({ rate: 0.01 }), true],
      ['upside rate 0', upside({ rate: 0 }), false], ['upside rate 0.01', upside({ rate: 0.01 }), true],
      ['buffer 0', downside({ buffer: 0 }), false], ['buffer 0.01', downside({ buffer: 0.01 }), true], ['buffer 1', downside({ buffer: 1 }), true], ['buffer 1.01', downside({ buffer: 1.01 }), false],
      ...[[0, false], [0.01, true], [0.99, true], [1, false], [1.2, false]].map(([value, ok]): [string, Product, boolean] => [`downside barrier at ${value}`, downside({ barrier: { level: value as number, observation: 'final' } }), ok as boolean]),
      ['absolute return rate 0', downside({ buffer: 0.15, absoluteReturn: { rate: 0 } }), false], ['absolute return rate 0.5', downside({ buffer: 0.15, absoluteReturn: { rate: 0.5 } }), true],
      ...[[1, false], [1.01, true], [2, true], [2.01, false]].map(([value, ok]): [string, Product, boolean] => [`upside barrier at ${value}`, upside({ barrier: { level: value as number, observation: 'final' } }), ok as boolean]),
      ['rebate 0', upside({ barrier: { level: 1.3, observation: 'final', rebate: 0 } }), false], ['rebate 0.01', upside({ barrier: { level: 1.3, observation: 'final', rebate: 0.01 } }), true],
      ['cap 0', upside({ cap: 0 }), false], ['cap 0.01', upside({ cap: 0.01 }), true],
      ...[[-0.01, false], [0, true], [1, true], [1.01, false]].map(([value, ok]): [string, Product, boolean] => [`protection ${value}`, withPayoff({ participations: [], principalProtection: value as number }), ok as boolean]),
      ['deposit minimum return 0', deposit(0), false], ['deposit minimum return 0.01', deposit(0.01), true],
      ...[[1, false], [2, true], [12, true], [13, false], [2.5, false]].flatMap(([value, ok]): Array<[string, Product, boolean]> => [
        [`lookback with ${value} observations`, determined({ initial: { kind: 'lookback', observationCount: value as number }, final: { kind: 'final-date' } }), ok as boolean],
        [`averaging over ${value} observations`, determined({ initial: { kind: 'given', level: 100 }, final: { kind: 'averaging', observationCount: value as number } }), ok as boolean],
      ]),
      ['initial level 0', determined({ initial: { kind: 'given', level: 0 }, final: { kind: 'final-date' } }), false],
      ['a basket of one asset', basket([100], ['Index A']), false], ['a basket with an initial level of 0', basket([100, 0]), false],
      ['a blank asset name', { ...base, underlier: { ...(base.underlier as object), components: [{ asset: { kind: 'equity', name: ' ' } }] } } as Product, false],
      ['an asset name', { ...base, underlier: { ...(base.underlier as object), components: [{ asset: { kind: 'equity', name: 'Synthetic Co' } }] } } as Product, true],
      ['barrier absolute return rate 0', bothWays({ rate: 0 }), false],
      ...[[0, false], [0.01, true], [0.99, true], [1, false]].map(([value, ok]): [string, Product, boolean] => [`lower barrier at ${value}`, bothWays({ lowerBarrier: { level: value as number, observation: 'final' } }), ok as boolean]),
      ...[[1, false], [1.01, true], [2, true], [2.01, false]].map(([value, ok]): [string, Product, boolean] => [`upper barrier at ${value}`, bothWays({ upperBarrier: { level: value as number, observation: 'final' } }), ok as boolean]),
      ['conditional return -0.01', bothWays({ conditionalReturn: -0.01 }), false], ['conditional return 0', bothWays({ conditionalReturn: 0 }), true],
    ]

    it.each(cases)('%s', (_, product, expected) => {
      expect(validatorAccepts(product), 'validateProduct').toBe(expected)
      expect(schemaAccepts(product), `schema: ${JSON.stringify(validate.errors)}`).toBe(expected)
    })
  })
})
