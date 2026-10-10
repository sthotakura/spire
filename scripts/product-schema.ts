import { createGenerator } from 'ts-json-schema-generator'

// The rules that tie fields together. A schema describes shape, variants and ranges, so these live in validateProduct and are
// listed here so a reader of the schema knows what it does not say.
const crossFieldRules = [
  'Each participation direction appears at most once.',
  'A buffer and a downside barrier cannot both apply to a downside participation, and absolute return on a fall needs one of them.',
  'An upside barrier and a cap cannot both apply to an upside participation.',
  'A barrier observed daily needs a single underlier with a fixed initial level, and a daily downside barrier cannot be combined with absolute return on a fall.',
  'Barrier absolute return replaces participation, so it cannot be combined with participations, a minimum return, lookback, a basket or averaging.',
  'A deposit has no downside participation and no principal protection, and a minimum return is for deposits only. A minimum return is less than any cap.',
  'A basket needs unique asset names, one initial level for each asset and no other, and weights that add up to 1.',
]

// The JSON Schema of a product, generated from the domain types so the types stay the one source of truth. It describes shape,
// variants and ranges. Descriptions and ranges come from the JSDoc on the types in src/domain/note.ts.
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
  const { $schema, description, ...rest } = generator.createSchema('Product') as Record<string, unknown>
  return {
    $schema,
    title: 'SPIRe product',
    description: `${description} This schema describes shape, variants and ranges only. validateProduct enforces the rules that tie fields together: ${crossFieldRules.join(' ')}`,
    ...rest,
  }
}

// The schema as committed: two-space JSON with a final newline.
export const productSchemaText = () => `${JSON.stringify(buildProductSchema(), null, 2)}\n`
