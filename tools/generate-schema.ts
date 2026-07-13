/**
 * generate-schema — emits the catalog JSON schema (from the zod source of
 * truth in tools/schemas.ts) on STDOUT, so editors autocomplete/validate
 * catalog.json via its "$schema" field.
 * Re-run after any schema change: npm run gen:schema
 * (the npm script redirects stdout into content/catalog.schema.json)
 */
import { zodToJsonSchema } from 'zod-to-json-schema'
import { Catalog } from './schemas'

const schema = zodToJsonSchema(Catalog, { name: 'Catalog', $refStrategy: 'none' })
process.stdout.write(JSON.stringify(schema, null, 2) + '\n')
