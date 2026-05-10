import { readLocalDb, updateLocalDb } from "../src/local-db"

export interface LinkConfigPayload {
  name: string
  description?: string
  schema: Record<string, unknown>
  connectionTemplates: Array<{ name: string; template: string }>
}

function extractVariables(template: string): string[] {
  return [...template.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)].map((item) => item[1])
}

function normalizeTemplates(raw: unknown): Array<{ name: string; template: string }> {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        const value = item as { name?: unknown; template?: unknown }
        return {
          name: typeof value.name === "string" ? value.name.trim() : "",
          template: typeof value.template === "string" ? value.template.trim() : "",
        }
      })
      .filter((item) => item.name && item.template)
  }
  if (typeof raw === "string" && raw.trim()) {
    const text = raw.trim()
    try {
      const parsed = JSON.parse(text) as unknown
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => {
            const value = item as { name?: unknown; template?: unknown }
            return {
              name: typeof value.name === "string" ? value.name.trim() : "",
              template: typeof value.template === "string" ? value.template.trim() : "",
            }
          })
          .filter((item) => item.name && item.template)
      }
    } catch {
      // legacy plain template string
    }
    return [{ name: "default", template: text }]
  }
  return []
}

function validateTemplates(schema: Record<string, unknown>, templates: Array<{ name: string; template: string }>) {
  if (templates.length === 0) {
    throw new Error("connection_template_required")
  }
  const names = new Set<string>()
  const props = (schema.properties as Record<string, unknown>) ?? {}
  for (const item of templates) {
    if (!item.name.trim()) throw new Error("template_name_required")
    if (!item.template.trim()) throw new Error("template_content_required")
    if (names.has(item.name)) throw new Error(`duplicate_template_name: ${item.name}`)
    names.add(item.name)
    const unresolved = extractVariables(item.template).filter((key) => !(key in props))
    if (unresolved.length > 0) {
      throw new Error(`invalid_template(${item.name}): ${unresolved.join(", ")}`)
    }
  }
}

export async function fetchLinkConfigs(): Promise<unknown[]> {
  const db = await readLocalDb()
  const rows = [...db.linkConfigs].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  return rows.map((row) => ({
    id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      schema: JSON.parse(row.schema_json),
      connectionTemplates: normalizeTemplates((row as { connection_templates_json?: string }).connection_templates_json ?? row.command_template),
      status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  }))
}

export async function createLinkConfig(payload: LinkConfigPayload): Promise<unknown> {
  if (!payload.name.trim()) {
    throw new Error("name_required")
  }
  validateTemplates(payload.schema, payload.connectionTemplates)

  const now = new Date().toISOString()
  const item = {
    id: `cfg_${crypto.randomUUID()}`,
    name: payload.name,
    description: payload.description ?? null,
    schema_json: JSON.stringify(payload.schema),
    command_template: "",
    connection_templates_json: JSON.stringify(payload.connectionTemplates),
    status: "active" as const,
    created_by: "local-dev-user",
    created_at: now,
    updated_by: "local-dev-user",
    updated_at: now,
  }
  await updateLocalDb((db) => ({
    ...db,
    linkConfigs: [...db.linkConfigs, item],
  }))
  return {
    id: item.id,
    name: item.name,
    description: payload.description,
    schema: payload.schema,
    connectionTemplates: payload.connectionTemplates,
    status: item.status,
    updatedAt: item.updated_at,
  }
}

export async function updateLinkConfig(id: string, payload: Partial<LinkConfigPayload> & { status?: "active" | "inactive" }): Promise<unknown> {
  const db = await readLocalDb()
  const existing = db.linkConfigs.find((row) => row.id === id) ?? null
  if (!existing) {
    throw new Error("not_found")
  }

  const nextSchema = payload.schema ?? (JSON.parse(existing.schema_json) as Record<string, unknown>)
  const existingTemplates = normalizeTemplates((existing as { connection_templates_json?: string }).connection_templates_json ?? existing.command_template)
  const nextTemplates = payload.connectionTemplates ?? existingTemplates
  validateTemplates(nextSchema, nextTemplates)

  const now = new Date().toISOString()
  await updateLocalDb((current) => ({
    ...current,
    linkConfigs: current.linkConfigs.map((row) => {
      if (row.id !== id) return row
      return {
        ...row,
        name: payload.name !== undefined ? payload.name : row.name,
        description: payload.description !== undefined ? payload.description : row.description,
        schema_json: JSON.stringify(nextSchema),
        command_template: row.command_template,
        connection_templates_json: JSON.stringify(nextTemplates),
        status: payload.status ?? row.status,
        updated_by: "local-dev-user",
        updated_at: now,
      }
    }),
  }))
  const updated = (await readLocalDb()).linkConfigs.find((row) => row.id === id) ?? null
  return updated
}
