import { readLocalDb } from "../src/local-db"

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
  const db = await readLocalDb()
  const record = db.linkRecords.find((row) => row.id === recordId) ?? null
  if (!record) {
    throw new Error("record_not_found")
  }
  const config = db.linkConfigs.find((row) => row.id === record.link_config_id) ?? null
  if (!config) {
    throw new Error("config_not_found")
  }

  const values = JSON.parse(record.values_json) as Record<string, unknown>
  const rendered = renderTemplate(config.command_template, values)
  return { renderedCommand: rendered.command, unresolvedVariables: rendered.unresolved }
}
