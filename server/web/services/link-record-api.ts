import { s3Store } from "../src/s3-storage"

export async function createLinkRecord(linkConfigId: string, name: string, note: string, values: Record<string, unknown>): Promise<unknown> {
  const config = await s3Store.getActiveLinkConfigById(linkConfigId)
  if (!config) {
    throw new Error("link_config_not_found_or_inactive")
  }
  const now = new Date().toISOString()
  const row = {
    id: `rec_${crypto.randomUUID()}`,
    link_config_id: linkConfigId,
    name,
    note,
    values_json: JSON.stringify(values),
    status: "active" as const,
    created_by: "local-dev-user",
    created_at: now,
    updated_by: "local-dev-user",
    updated_at: now,
  }
  await s3Store.createLinkRecord(row)
  return row
}

export async function updateLinkRecord(recordId: string, payload: { name?: string; note?: string; values?: Record<string, unknown>; status?: "active" | "archived" }): Promise<unknown> {
  const existing = await s3Store.getLinkRecordById(recordId)
  if (!existing) {
    throw new Error("not_found")
  }
  const now = new Date().toISOString()
  await s3Store.updateLinkRecord(recordId, (row) => ({
    ...row,
    name: payload.name ?? row.name,
    note: payload.note ?? row.note,
    values_json: JSON.stringify(payload.values ?? JSON.parse(row.values_json)),
    status: payload.status ?? row.status,
    updated_by: "local-dev-user",
    updated_at: now,
  }))
  return s3Store.getLinkRecordById(recordId)
}

export async function fetchLinkRecords(linkConfigId?: string): Promise<unknown[]> {
  const rows = await s3Store.listLinkRecords(linkConfigId)
  return rows.map((row) => {
    const values = JSON.parse(row.values_json) as Record<string, unknown>
    const type = ["type", "protocol", "protocolType", "kind"].map((k) => values[k]).find((v) => v !== undefined && v !== null && v !== "")
    return {
      id: row.id,
      linkConfigId: row.link_config_id,
      name: row.name,
      note: row.note,
      values,
      type: type ? String(type) : "",
      status: row.status,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedBy: row.updated_by,
      updatedAt: row.updated_at,
    }
  })
}
