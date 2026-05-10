import { readLocalDb, updateLocalDb } from "../src/local-db"

export interface LinkConfigPayload {
  name: string
  description?: string
  schema: Record<string, unknown>
  commandTemplate: string
}

export async function fetchLinkConfigs(): Promise<unknown[]> {
  const db = await readLocalDb()
  const rows = [...db.linkConfigs].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    schema: JSON.parse(row.schema_json),
    commandTemplate: row.command_template,
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
  const props = (payload.schema.properties as Record<string, unknown>) ?? {}
  const unresolved = [...payload.commandTemplate.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)]
    .map((item) => item[1])
    .filter((key) => !(key in props))
  if (unresolved.length > 0) {
    throw new Error(`invalid_template: ${unresolved.join(", ")}`)
  }

  const now = new Date().toISOString()
  const item = {
    id: `cfg_${crypto.randomUUID()}`,
    name: payload.name,
    description: payload.description ?? null,
    schema_json: JSON.stringify(payload.schema),
    command_template: payload.commandTemplate,
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
    commandTemplate: payload.commandTemplate,
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
  const nextTemplate = payload.commandTemplate ?? existing.command_template
  const props = (nextSchema.properties as Record<string, unknown>) ?? {}
  const unresolved = [...nextTemplate.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)]
    .map((item) => item[1])
    .filter((key) => !(key in props))
  if (unresolved.length > 0) {
    throw new Error(`invalid_template: ${unresolved.join(", ")}`)
  }

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
        command_template: nextTemplate,
        status: payload.status ?? row.status,
        updated_by: "local-dev-user",
        updated_at: now,
      }
    }),
  }))
  const updated = (await readLocalDb()).linkConfigs.find((row) => row.id === id) ?? null
  return updated
}
