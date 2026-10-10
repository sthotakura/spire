import { createGenerator } from 'ts-json-schema-generator'
import { productExamples } from './product-examples'

type Json = Record<string, any>

export const schemaId = 'https://raw.githubusercontent.com/sthotakura/spire/main/docs/schema/product.schema.json'

// Rules that tie fields together and are also written into the schema as conditions, below.
const rulesInSchema = [
  'Barrier absolute return replaces participation: with it, participations is empty and there is no minimum return.',
  'A deposit has no downside participation and no principal protection, and a minimum return is for deposits only.',
]

// Rules only validateProduct checks. A schema describes shape and ranges, and a second copy of these is where the two would drift.
const rulesInValidator = [
  'Each participation direction appears at most once.',
  'A buffer and a downside barrier cannot both apply to a downside participation, and absolute return on a fall needs one of them.',
  'An upside barrier and a cap cannot both apply to an upside participation.',
  'A barrier observed daily needs a single underlier with a fixed initial level, and a daily downside barrier cannot be combined with absolute return on a fall.',
  'Barrier absolute return needs a single underlier with a fixed initial level and a final level on the final date: no lookback, basket or averaging.',
  'A minimum return is less than any cap.',
  'A basket needs unique asset names, one initial level for each asset and no other, and weights that add up to 1.',
]

// Names for the variants a union spells out inline, keyed by the value of the key that tells them apart. A variant that is a named
// type is named by its definition.
const variantTitles: Record<string, string> = {
  given: 'Fixed initial level',
  lookback: 'Lookback initial level',
  'final-date': 'Final level on the final date',
  averaging: 'Averaged final level',
}
const variantOf = (member: Json): string | undefined => member.properties?.kind?.const ?? member.properties?.direction?.const

// Three changes to what the generator writes:
// - A union becomes oneOf, not anyOf. Every union here is told apart by a constant key, so exactly one member matches, and oneOf
//   says that and gives tools the variants to offer.
// - An inline variant gets a title, so a reader sees its name and not only its shape.
// - A $ref with other keywords beside it becomes an allOf holding the $ref. Draft-07 ignores the siblings of a $ref, so a strict
//   reader would lose the description beside it.
function tidy(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(tidy)
  if (node === null || typeof node !== 'object') return node
  const out: Json = {}
  for (const [key, value] of Object.entries(node as Json)) out[key === 'anyOf' ? 'oneOf' : key] = tidy(value)
  if (Array.isArray(out.oneOf)) {
    out.oneOf = out.oneOf.map((member: Json) => {
      const title = member.$ref === undefined && member.title === undefined ? variantTitles[variantOf(member) ?? ''] : undefined
      return title === undefined ? member : { title, ...member }
    })
  }
  if (typeof out.$ref === 'string' && Object.keys(out).length > 1) {
    const { $ref, ...rest } = out
    return { allOf: [{ $ref }], ...rest }
  }
  return out
}

// The conditions for rulesInSchema. Boolean false for a property means it must be absent.
const payoffConditions: Json = {
  if: { required: ['barrierAbsoluteReturn'] },
  then: { type: 'object', properties: { participations: { type: 'array', maxItems: 0 }, minimumReturn: false } },
}
const rootConditions: Json = {
  if: { required: ['wrapper'], properties: { wrapper: { const: 'deposit' } } },
  then: {
    type: 'object',
    properties: {
      payoff: {
        type: 'object',
        properties: {
          principalProtection: false,
          participations: { type: 'array', items: { not: { type: 'object', required: ['direction'], properties: { direction: { const: 'downside' } } } } },
        },
      },
    },
  },
  else: { type: 'object', properties: { payoff: { type: 'object', properties: { minimumReturn: false } } } },
}

// The JSON Schema of a product, generated from the domain types so the types stay the one source of truth. Descriptions and numeric
// limits come from the JSDoc on the types in src/domain/note.ts. It describes shape, variants and ranges, and two rules that tie
// fields together; validateProduct enforces all the rules.
export function buildProductSchema(): Record<string, unknown> {
  const generator = createGenerator({
    path: 'src/domain/note.ts',
    tsconfig: 'tsconfig.json',
    type: 'Product',
    expose: 'export',
    topRef: false,
    jsDoc: 'extended',
    additionalProperties: false,
    sortProps: false,
    skipTypeCheck: true,
  })
  const { $schema, description, ...generated } = generator.createSchema('Product') as Json
  const { definitions, ...body } = tidy(generated) as Json
  body.properties.payoff = { ...body.properties.payoff, ...payoffConditions }
  return {
    $schema,
    $id: schemaId,
    title: 'SPIRe product',
    description: [
      description,
      '',
      'This schema gives shape, variants and ranges. These rules that tie fields together are written into it as conditions:',
      ...rulesInSchema.map((rule) => `- ${rule}`),
      '',
      'These are checked by validateProduct, not by the schema:',
      ...rulesInValidator.map((rule) => `- ${rule}`),
    ].join('\n'),
    ...body,
    allOf: [rootConditions],
    examples: productExamples.map(([, product]) => JSON.parse(JSON.stringify(product))),
    definitions,
  }
}

// The schema as committed: two-space JSON with a final newline.
export const productSchemaText = () => `${JSON.stringify(buildProductSchema(), null, 2)}\n`
