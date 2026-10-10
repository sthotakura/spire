import { mkdirSync, writeFileSync } from 'node:fs'
import { productSchemaText } from './product-schema'

// Writes docs/schema/product.schema.json. Run it with `npm run schema` after adding or changing a field of the structure.
mkdirSync('docs/schema', { recursive: true })
writeFileSync('docs/schema/product.schema.json', productSchemaText())
console.log('wrote docs/schema/product.schema.json')
