export interface Database {
  prepare(query: string): {
    bind(...values: unknown[]): {
      first<T = unknown>(): Promise<T | null>
      run(): Promise<unknown>
      all<T = unknown>(): Promise<{ results: T[] }>
    }
  }
}

export interface LinkConfigRow {
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
}

export interface LinkRecordRow {
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
}

export interface CommandRunRow {
  id: string
  link_config_id: string
  link_record_id: string
  rendered_command: string
  dispatch_target: string
  request_status: "accepted" | "rejected" | "timeout"
  execution_status: "pending" | "running" | "succeeded" | "failed" | "cancelled"
  status_message: string | null
  requested_by: string
  requested_at: string
  completed_at: string | null
}

export class Repository {
  constructor(private readonly db: Database) {}

  async getActiveLinkConfigById(id: string): Promise<LinkConfigRow | null> {
    return this.db
      .prepare("SELECT * FROM link_configs WHERE id = ? AND status = 'active'")
      .bind(id)
      .first<LinkConfigRow>()
  }

  async listLinkConfigs(): Promise<LinkConfigRow[]> {
    const result = await this.db.prepare("SELECT * FROM link_configs ORDER BY updated_at DESC").all<LinkConfigRow>()
    return result.results
  }

  async getLinkConfigById(id: string): Promise<LinkConfigRow | null> {
    return this.db.prepare("SELECT * FROM link_configs WHERE id = ?").bind(id).first<LinkConfigRow>()
  }

  async createLinkConfig(input: {
    id: string
    name: string
    description?: string
    schemaJson: string
    commandTemplate: string
    actorId: string
    now: string
  }): Promise<void> {
    await this.db
      .prepare(
        "INSERT INTO link_configs (id, name, description, schema_json, command_template, status, created_by, created_at, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)"
      )
      .bind(
        input.id,
        input.name,
        input.description ?? null,
        input.schemaJson,
        input.commandTemplate,
        input.actorId,
        input.now,
        input.actorId,
        input.now
      )
      .run()
  }

  async createLinkRecord(input: {
    id: string
    linkConfigId: string
    name: string
    note: string
    valuesJson: string
    actorId: string
    now: string
  }): Promise<void> {
    await this.db
      .prepare(
        "INSERT INTO link_records (id, link_config_id, name, note, values_json, status, created_by, created_at, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)"
      )
      .bind(input.id, input.linkConfigId, input.name, input.note, input.valuesJson, input.actorId, input.now, input.actorId, input.now)
      .run()
  }

  async updateLinkRecord(input: {
    id: string
    name: string
    note: string
    valuesJson: string
    status: "active" | "archived"
    actorId: string
    now: string
  }): Promise<void> {
    await this.db
      .prepare("UPDATE link_records SET name = ?, note = ?, values_json = ?, status = ?, updated_by = ?, updated_at = ? WHERE id = ?")
      .bind(input.name, input.note, input.valuesJson, input.status, input.actorId, input.now, input.id)
      .run()
  }

  async listLinkRecordsByConfig(linkConfigId?: string): Promise<LinkRecordRow[]> {
    if (linkConfigId) {
      const result = await this.db
        .prepare("SELECT * FROM link_records WHERE link_config_id = ? ORDER BY updated_at DESC")
        .bind(linkConfigId)
        .all<LinkRecordRow>()
      return result.results
    }

    const result = await this.db.prepare("SELECT * FROM link_records ORDER BY updated_at DESC").all<LinkRecordRow>()
    return result.results
  }

  async getLinkRecordById(id: string): Promise<LinkRecordRow | null> {
    return this.db.prepare("SELECT * FROM link_records WHERE id = ?").bind(id).first<LinkRecordRow>()
  }

  async createCommandRun(input: {
    id: string
    linkConfigId: string
    linkRecordId: string
    renderedCommand: string
    dispatchTarget: string
    requestStatus: "accepted" | "rejected" | "timeout"
    executionStatus: "pending" | "running" | "succeeded" | "failed" | "cancelled"
    statusMessage?: string
    requestedBy: string
    requestedAt: string
    completedAt?: string
  }): Promise<void> {
    await this.db
      .prepare(
        "INSERT INTO command_runs (id, link_config_id, link_record_id, rendered_command, dispatch_target, request_status, execution_status, status_message, requested_by, requested_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(
        input.id,
        input.linkConfigId,
        input.linkRecordId,
        input.renderedCommand,
        input.dispatchTarget,
        input.requestStatus,
        input.executionStatus,
        input.statusMessage ?? null,
        input.requestedBy,
        input.requestedAt,
        input.completedAt ?? null
      )
      .run()
  }

  async listCommandRuns(): Promise<CommandRunRow[]> {
    const result = await this.db.prepare("SELECT * FROM command_runs ORDER BY requested_at DESC").all<CommandRunRow>()
    return result.results
  }

  async updateLinkConfig(input: {
    id: string
    name: string
    description?: string
    schemaJson: string
    commandTemplate: string
    status: "active" | "inactive"
    actorId: string
    now: string
  }): Promise<void> {
    await this.db
      .prepare(
        "UPDATE link_configs SET name = ?, description = ?, schema_json = ?, command_template = ?, status = ?, updated_by = ?, updated_at = ? WHERE id = ?"
      )
      .bind(
        input.name,
        input.description ?? null,
        input.schemaJson,
        input.commandTemplate,
        input.status,
        input.actorId,
        input.now,
        input.id
      )
      .run()
  }

  async createAuditEvent(input: {
    id: string
    actorId: string
    actionType: string
    targetType: string
    targetId: string
    metadataJson?: string
    createdAt: string
  }): Promise<void> {
    await this.db
      .prepare(
        "INSERT INTO audit_events (id, actor_id, action_type, target_type, target_id, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(
        input.id,
        input.actorId,
        input.actionType,
        input.targetType,
        input.targetId,
        input.metadataJson ?? null,
        input.createdAt
      )
      .run()
  }
}
