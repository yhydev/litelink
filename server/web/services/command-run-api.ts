import { s3Store } from "../src/s3-storage"

function renderTemplate(template: string, values: Record<string, unknown>): { command: string; unresolved: string[] } {
  const unresolved: string[] = []
  const command = template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const value = values[key]
    if (value === undefined || value === null || value === "") {
      unresolved.push(key)
      return ""
    }
    return String(value)
  })
  return { command, unresolved }
}

export async function renderCommand(recordId: string): Promise<{ renderedCommand: string; unresolvedVariables: string[] }> {
  const record = await s3Store.getLinkRecordById(recordId)
  if (!record) {
    throw new Error("record_not_found")
  }
  const config = await s3Store.getLinkConfigById(record.link_config_id)
  if (!config) {
    throw new Error("config_not_found")
  }

  const values = JSON.parse(record.values_json) as Record<string, unknown>
  const rendered = renderTemplate(config.command_template, values)
  return { renderedCommand: rendered.command, unresolvedVariables: rendered.unresolved }
}

export async function dispatchCommand(recordId: string, localEndpoint: string): Promise<unknown> {
  const rendered = await renderCommand(recordId)
  if (rendered.unresolvedVariables.length > 0) {
    throw new Error(`unresolved_variables: ${rendered.unresolvedVariables.join(", ")}`)
  }
  const now = new Date().toISOString()
  const row = {
    id: `run_${crypto.randomUUID()}`,
    link_config_id: "",
    link_record_id: recordId,
    rendered_command: rendered.renderedCommand,
    dispatch_target: localEndpoint,
    request_status: "accepted" as const,
    execution_status: "pending" as const,
    status_message: "opened_by_browser",
    requested_by: "local-dev-user",
    requested_at: now,
    completed_at: null,
  }
  const record = await s3Store.getLinkRecordById(recordId)
  if (record) {
    row.link_config_id = record.link_config_id
  }
  await s3Store.createCommandRun(row)
  return row
}

export async function fetchCommandRuns(): Promise<unknown[]> {
  const rows = await s3Store.listCommandRuns()
  return rows.map((row) => ({
    id: row.id,
    linkConfigId: row.link_config_id,
    linkRecordId: row.link_record_id,
    renderedCommand: row.rendered_command,
    dispatchTarget: row.dispatch_target,
    requestStatus: row.request_status,
    executionStatus: row.execution_status,
    statusMessage: row.status_message ?? undefined,
    requestedBy: row.requested_by,
    requestedAt: row.requested_at,
    completedAt: row.completed_at ?? undefined,
  }))
}
