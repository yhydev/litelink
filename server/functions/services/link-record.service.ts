import { auditLinkRecordCreate } from "../audit/link-record-audit"
import { validateRecordBySchema } from "../validation/schema-validator"
import { CreateLinkInfoRecordInput, LinkInfoRecord, UpdateLinkInfoRecordInput } from "./link-record.types"
import { Repository } from "./repository"
import { auditLinkRecordUpdate } from "../audit/link-record-audit"

function readSummary(values: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = values[key]
    if (value !== undefined && value !== null && value !== "") {
      return String(value)
    }
  }
  return ""
}

function buildSummary(values: Record<string, unknown>): { name: string; note: string; type: string } {
  return {
    name: readSummary(values, ["name", "title", "displayName", "host", "hostname"]),
    note: readSummary(values, ["note", "remark", "record", "description", "comment"]),
    type: readSummary(values, ["type", "protocol", "protocolType", "kind"]),
  }
}

function toModel(row: {
  id: string
  link_config_id: string
  name: string
  note: string
  values_json: string
  status: "active" | "archived"
  created_by: string
  created_at: string
  updated_by: string
  updated_at: string
}): LinkInfoRecord {
  const values = JSON.parse(row.values_json) as Record<string, unknown>
  const summary = buildSummary(values)
  return {
    id: row.id,
    linkConfigId: row.link_config_id,
    name: row.name,
    note: row.note,
    values,
    type: summary.type,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  }
}

export class LinkInfoRecordService {
  constructor(private readonly repo: Repository) {}

  async create(input: CreateLinkInfoRecordInput): Promise<LinkInfoRecord> {
    const config = await this.repo.getActiveLinkConfigById(input.linkConfigId)
    if (!config) {
      throw new Response(JSON.stringify({ error: "link_config_not_found_or_inactive" }), { status: 400 })
    }

    const schema = JSON.parse(config.schema_json) as Record<string, unknown>
    const validation = validateRecordBySchema(schema, input.values)
    if (!validation.valid) {
      throw new Response(JSON.stringify({ error: "invalid_record_values", details: validation.errors }), { status: 400 })
    }

    const id = `rec_${crypto.randomUUID()}`
    const now = new Date().toISOString()

    await this.repo.createLinkRecord({
      id,
      linkConfigId: input.linkConfigId,
      name: input.name,
      note: input.note ?? "",
      valuesJson: JSON.stringify(input.values),
      actorId: input.actorId,
      now,
    })

    await auditLinkRecordCreate(this.repo, input.actorId, id, input.linkConfigId)

    const summary = buildSummary(input.values)

    return {
      id,
      linkConfigId: input.linkConfigId,
      name: input.name,
      note: input.note ?? "",
      values: input.values,
      type: summary.type,
      status: "active",
      createdBy: input.actorId,
      createdAt: now,
      updatedBy: input.actorId,
      updatedAt: now,
    }
  }

  async list(linkConfigId?: string): Promise<LinkInfoRecord[]> {
    const rows = await this.repo.listLinkRecordsByConfig(linkConfigId)
    return rows.map(toModel)
  }

  async update(recordId: string, input: UpdateLinkInfoRecordInput): Promise<LinkInfoRecord> {
    const existing = await this.repo.getLinkRecordById(recordId)
    if (!existing) {
      throw new Response(JSON.stringify({ error: "not_found" }), { status: 404 })
    }

    const config = await this.repo.getLinkConfigById(existing.link_config_id)
    if (!config) {
      throw new Response(JSON.stringify({ error: "link_config_not_found_or_inactive" }), { status: 400 })
    }

    const nextValues = input.values ?? JSON.parse(existing.values_json)
    const schema = JSON.parse(config.schema_json) as Record<string, unknown>
    const validation = validateRecordBySchema(schema, nextValues)
    if (!validation.valid) {
      throw new Response(JSON.stringify({ error: "invalid_record_values", details: validation.errors }), { status: 400 })
    }

    const now = new Date().toISOString()
    await this.repo.updateLinkRecord({
      id: recordId,
      name: input.name ?? existing.name,
      note: input.note ?? existing.note,
      valuesJson: JSON.stringify(nextValues),
      status: input.status ?? existing.status,
      actorId: input.actorId,
      now,
    })

    await auditLinkRecordUpdate(this.repo, input.actorId, recordId)

    const updated = await this.repo.getLinkRecordById(recordId)
    if (!updated) {
      throw new Response(JSON.stringify({ error: "not_found" }), { status: 404 })
    }

    return toModel(updated)
  }
}
