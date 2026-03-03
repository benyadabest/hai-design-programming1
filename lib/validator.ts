import Ajv from 'ajv'
import { schemaMap } from './schemas'
import type { AppMode } from './types'

const ajv = new Ajv({ allErrors: true })

type ValidatableMode = keyof typeof schemaMap

export function validate(mode: AppMode, raw: unknown): void {
  if (!(mode in schemaMap)) {
    // Modes like 'running', 'concept_selection' don't have schemas — skip
    return
  }
  const schema = schemaMap[mode as ValidatableMode]
  const valid = ajv.validate(schema, raw)
  if (!valid) {
    const errors = ajv.errors?.map((e) => `${e.instancePath || '(root)'} ${e.message}`).join('; ')
    throw new Error(`Schema validation failed for mode "${mode}": ${errors}`)
  }
}
