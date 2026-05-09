import { validateSchemaDefinition } from "../validation/schema-validator"
import { collectTemplateVariables } from "../validation/template-renderer"
import { writeAuditEvent } from "../audit/audit-service"
import { Repository } from "./repository"
import { CreateLinkConfigInput, LinkConfig, UpdateLinkConfigInput } from "./link-config.types"

function toModel(row: {
  id: string
  name: string
  description: string | null
  schema_json: string
  command_template: string
  status: "active" | "inactive"
  created_by: string
  created_at: string
  updated_by: string
  updated_at: string
}): LinkConfig {
  return {
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
  }
}

export class LinkConfigService {
  constructor(private readonly repo: Repository) {}

  async list(): Promise<LinkConfig[]> {
    const rows = await this.repo.listLinkConfigs()
    return rows.map(toModel)
  }

  async create(input: CreateLinkConfigInput): Promise<LinkConfig> {
    const schemaResult = validateSchemaDefinition(input.schema)
    if (!schemaResult.valid) {
      throw new Response(JSON.stringify({ error: "invalid_schema", details: schemaResult.errors }), { status: 400 })
    }

    const vars = collectTemplateVariables(input.commandTemplate)
    const schemaProperties = new Set(Object.keys((input.schema.properties as Record<string, unknown>) ?? {}))
    const unresolved = vars.filter((v) => !schemaProperties.has(v))
    if (unresolved.length > 0) {
      throw new Response(JSON.stringify({ error: "invalid_template", unresolvedVariables: unresolved }), { status: 400 })
    }

    const id = `cfg_${crypto.randomUUID()}`
    const now = new Date().toISOString()

    await this.repo.createLinkConfig({
      id,
      name: input.name,
      description: input.description,
      schemaJson: JSON.stringify(input.schema),
      commandTemplate: input.commandTemplate,
      actorId: input.actorId,
      now,
    })

    await writeAuditEvent(this.repo, {
      actorId: input.actorId,
      actionType: "config.create",
      targetType: "LinkConfig",
      targetId: id,
      metadata: { name: input.name },
    })

    return {
      id,
      name: input.name,
      description: input.description,
      schema: input.schema,
      commandTemplate: input.commandTemplate,
      status: "active",
      createdBy: input.actorId,
      createdAt: now,
      updatedBy: input.actorId,
      updatedAt: now,
    }
  }

  async update(id: string, input: UpdateLinkConfigInput): Promise<LinkConfig> {
    const existing = await this.repo.getLinkConfigById(id)
    if (!existing) {
      throw new Response(JSON.stringify({ error: "not_found" }), { status: 404 })
    }

    const nextSchema = input.schema ?? JSON.parse(existing.schema_json)
    const nextTemplate = input.commandTemplate ?? existing.command_template
    const schemaResult = validateSchemaDefinition(nextSchema)
    if (!schemaResult.valid) {
      throw new Response(JSON.stringify({ error: "invalid_schema", details: schemaResult.errors }), { status: 400 })
    }

    const vars = collectTemplateVariables(nextTemplate)
    const schemaProperties = new Set(Object.keys((nextSchema.properties as Record<string, unknown>) ?? {}))
    const unresolved = vars.filter((v) => !schemaProperties.has(v))
    if (unresolved.length > 0) {
      throw new Response(JSON.stringify({ error: "invalid_template", unresolvedVariables: unresolved }), { status: 400 })
    }

    const now = new Date().toISOString()
    await this.repo.updateLinkConfig({
      id,
      name: input.name ?? existing.name,
      description: input.description ?? existing.description ?? undefined,
      schemaJson: JSON.stringify(nextSchema),
      commandTemplate: nextTemplate,
      status: input.status ?? existing.status,
      actorId: input.actorId,
      now,
    })

    await writeAuditEvent(this.repo, {
      actorId: input.actorId,
      actionType: input.status === "inactive" ? "config.deactivate" : "config.update",
      targetType: "LinkConfig",
      targetId: id,
    })

    const updated = await this.repo.getLinkConfigById(id)
    if (!updated) {
      throw new Response(JSON.stringify({ error: "not_found" }), { status: 404 })
    }
    return toModel(updated)
  }
}
