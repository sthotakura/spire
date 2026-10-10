import { readFileSync } from 'node:fs'
import Ajv, { type ValidateFunction } from 'ajv'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { productIssues, type BarrierAbsoluteReturn, type DownsideParticipation, type Product, type UpsideParticipation } from '../src/domain/note'
import { startingProduct } from '../src/domain/starting-note'
import { productExamples } from './product-examples'
import { productSchemaText, schemaId } from './product-schema'

// The schema is generated from the domain types. These tests keep it current, check it accepts the products the model supports, check
// its numeric limits and its two conditions agree with validateProduct, which states them a second time, and keep it readable.
type Json = Record<string, any>
let generated = ''
let schema: Json
let validate: ValidateFunction
let compileWarnings = 0

beforeAll(() => {
  generated = productSchemaText()
  schema = JSON.parse(generated)
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  validate = new Ajv().compile(schema)
  compileWarnings = warn.mock.calls.length
  warn.mockRestore()
}, 60_000)

// A product as JSON carries it: no undefined keys.
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const schemaAccepts = (product: unknown) => validate(clone(product)) as boolean
const validatorAccepts = (product: Product) => productIssues(product).length === 0
// Visits every object and array in the schema, with its path.
const walk = (node: unknown, visit: (value: Json, path: string) => void, path = '#') => {
  if (Array.isArray(node)) node.forEach((item, i) => walk(item, visit, `${path}/${i}`))
  else if (node !== null && typeof node === 'object') {
    visit(node as Json, path)
    for (const [key, value] of Object.entries(node)) walk(value, visit, `${path}/${key}`)
  }
}

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
const bothWays = (terms: Partial<BarrierAbsoluteReturn>, payoff: Partial<Product['payoff']> = {}, overrides: Partial<Product> = {}) => withPayoff({
  participations: [],
  barrierAbsoluteReturn: { rate: 1, lowerBarrier: { level: 0.8, observation: 'final' }, upperBarrier: { level: 1.25, observation: 'final' }, ...terms },
  ...payoff,
}, overrides)
const deposit = (minimumReturn: number) => withPayoff({ participations: [{ direction: 'upside', rate: 1 }], minimumReturn }, { wrapper: 'deposit' })
const determined = (determination: Extract<Product['underlier'], { kind: 'single' }>['determination']) => ({ ...base, underlier: { ...(base.underlier as object), determination } }) as Product
const basket = (levels: number[], names = ['Index A', 'Index B'], weights?: number[]): Product => ({
  ...base,
  underlier: {
    kind: 'basket',
    components: names.map((name, i) => ({ asset: { kind: 'equity-index' as const, name }, weight: weights?.[i] ?? 1 / names.length })),
    determination: { initial: { kind: 'given', levels: names.map((asset, i) => ({ asset, level: levels[i] })) }, final: { kind: 'final-date' }, basketReturn: { kind: 'weighted' } },
  },
})

describe('product schema', () => {
  it('is up to date: run npm run schema after adding or changing a field of the structure', () => {
    const committed = readFileSync('docs/schema/product.schema.json', 'utf8').replace(/\r\n/g, '\n')
    expect(committed === generated, 'docs/schema/product.schema.json is stale; run npm run schema').toBe(true)
  })

  it('compiles without strict-mode warnings', () => {
    expect(compileWarnings).toBe(0)
  })

  describe('accepts the products the model supports', () => {
    it.each(productExamples.map(([title, product]) => [title, product] as const))('%s', (_, product) => {
      expect(validatorAccepts(product), 'validateProduct rejects the example').toBe(true)
      expect(schemaAccepts(product), JSON.stringify(validate.errors)).toBe(true)
    })

    it('publishes exactly these examples', () => {
      expect(schema.examples).toEqual(productExamples.map(([, product]) => clone(product)))
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

  // Each case changes one value across a limit, or breaks one of the two conditions. The schema and validateProduct state these
  // separately, so they must agree.
  describe('agrees with validateProduct on the numeric limits and the two conditions', () => {
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
      // Condition: barrier absolute return replaces participation and has no minimum return.
      ['barrier absolute return beside an upside participation', bothWays({}, { participations: [{ direction: 'upside', rate: 1 }] }), false],
      ['barrier absolute return with a minimum return', bothWays({}, { minimumReturn: 0.05 }, { wrapper: 'deposit' }), false],
      ['barrier absolute return alone', bothWays({}), true],
      // Condition: a deposit has no downside participation or protection, and a minimum return is for deposits only.
      ['a deposit with downside participation', withPayoff({ participations: [{ direction: 'downside', rate: 1 }] }, { wrapper: 'deposit' }), false],
      ['a deposit with principal protection', withPayoff({ participations: [], principalProtection: 1 }, { wrapper: 'deposit' }), false],
      ['a deposit with upside participation', withPayoff({ participations: [{ direction: 'upside', rate: 1 }] }, { wrapper: 'deposit' }), true],
      ['a note with a minimum return', withPayoff({ participations: [], minimumReturn: 0.05 }), false],
    ]

    it.each(cases)('%s', (_, product, expected) => {
      expect(validatorAccepts(product), 'validateProduct').toBe(expected)
      expect(schemaAccepts(product), `schema: ${JSON.stringify(validate.errors)}`).toBe(expected)
    })
  })

  // The schema's description says these rules are not in it. If one is written into the schema later, this fails: move it from the
  // list of rules validateProduct checks to the list of conditions in scripts/product-schema.ts.
  describe('leaves these rules to validateProduct', () => {
    it.each([
      ['two upside participations', withPayoff({ participations: [{ direction: 'upside', rate: 1 }, { direction: 'upside', rate: 2 }] })],
      ['a buffer and a downside barrier together', downside({ buffer: 0.1, barrier: { level: 0.7, observation: 'final' } })],
      ['a cap and an upside barrier together', upside({ cap: 0.2, barrier: { level: 1.3, observation: 'final' } })],
      ['basket weights that do not add up to 1', basket([100, 100], ['Index A', 'Index B'], [5, 5])],
      ['barrier absolute return with lookback', { ...bothWays({}), underlier: determined({ initial: { kind: 'lookback', observationCount: 3 }, final: { kind: 'final-date' } }).underlier } as Product],
    ])('%s', (_, product) => {
      expect(schemaAccepts(product), 'schema').toBe(true)
      expect(validatorAccepts(product), 'validateProduct').toBe(false)
    })
  })

  describe('reads well to someone outside the repository', () => {
    it('names its draft and its address', () => {
      expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#')
      expect(schema.$id).toBe(schemaId)
    })

    it('cites no repository file and uses no research wording in a description or a title', () => {
      const offending: string[] = []
      walk(schema, (node, path) => {
        for (const key of ['description', 'title']) {
          if (typeof node[key] === 'string' && /docs\/|\.md\b|verified/i.test(node[key])) offending.push(`${path}/${key}`)
        }
      })
      expect(offending).toEqual([])
    })

    it('has a description for every type it defines', () => {
      expect(Object.entries(schema.definitions).filter(([, definition]) => !(definition as Json).description).map(([name]) => name)).toEqual([])
    })

    it('keeps nothing beside a $ref, which draft-07 ignores', () => {
      const offending: string[] = []
      walk(schema, (node, path) => { if (node.$ref !== undefined && Object.keys(node).length > 1) offending.push(path) })
      expect(offending).toEqual([])
    })

    it('says oneOf for a union told apart by a constant key, and names each variant', () => {
      const unnamed: string[] = []
      let unions = 0
      walk(schema, (node, path) => {
        expect(node.anyOf, `anyOf at ${path}`).toBeUndefined()
        if (!Array.isArray(node.oneOf)) return
        unions++
        node.oneOf.forEach((member: Json, i: number) => { if (member.$ref === undefined && !member.title) unnamed.push(`${path}/oneOf/${i}`) })
      })
      expect(unions).toBeGreaterThan(0)
      expect(unnamed).toEqual([])
    })

    it('says which limits belong to this reference and not to the product type', () => {
      const { Term, InitialDetermination, FinalDetermination, UpperBarrier, UpsideBarrier } = schema.definitions
      const texts = [Term.properties.months, InitialDetermination.oneOf[1].properties.observationCount, FinalDetermination.oneOf[1].properties.observationCount, UpperBarrier.properties.level, UpsideBarrier.properties.level].map((p: Json) => p.description)
      for (const text of texts) expect(text).toMatch(/this reference/i)
    })
  })
})
