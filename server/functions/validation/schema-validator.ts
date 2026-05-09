export interface SchemaValidationResult {
  valid: boolean
  errors: string[]
}

export function validateSchemaDefinition(schema: unknown): SchemaValidationResult {
  if (!schema || typeof schema !== "object") {
    return { valid: false, errors: ["schema must be an object"] }
  }

  const schemaObj = schema as { type?: unknown; properties?: unknown }
  const errors: string[] = []

  if (schemaObj.type !== "object") {
    errors.push("schema.type must be 'object'")
  }

  if (!schemaObj.properties || typeof schemaObj.properties !== "object") {
    errors.push("schema.properties must be defined as an object")
  }

  return { valid: errors.length === 0, errors }
}

export function validateRecordBySchema(
  schema: Record<string, unknown>,
  values: Record<string, unknown>
): SchemaValidationResult {
  const required = Array.isArray(schema.required) ? (schema.required as string[]) : []
  const errors: string[] = []

  for (const field of required) {
    if (!(field in values)) {
      errors.push(`missing required field: ${field}`)
    }
  }

  return { valid: errors.length === 0, errors }
}
