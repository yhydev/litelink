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
