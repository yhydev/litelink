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

function parseConnectionTemplates(config: { connection_templates_json?: string; command_template: string }): Array<{ name: string; template: string }> {
  if (config.connection_templates_json) {
    const source = config.connection_templates_json.trim()
    try {
      const parsed = JSON.parse(source) as Array<{ name?: unknown; template?: unknown }>
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => ({
            name: typeof item.name === "string" ? item.name.trim() : "",
            template: typeof item.template === "string" ? item.template.trim() : "",
          }))
          .filter((item) => item.name && item.template)
      }
    } catch {
      if (source) {
        return [{ name: "default", template: source }]
      }
      return []
    }
  }
  if (config.command_template.trim()) {
    return [{ name: "default", template: config.command_template.trim() }]
  }
  return []
}

export async function renderConnectionAddress(
  recordId: string,
  templateName: string
): Promise<{ renderedAddress: string; unresolvedVariables: string[] }> {
  const db = await readLocalDb()
  const record = db.linkRecords.find((row) => row.id === recordId) ?? null
  if (!record) {
    throw new Error("record_not_found")
  }
  const config = db.linkConfigs.find((row) => row.id === record.link_config_id) ?? null
  if (!config) {
    throw new Error("config_not_found")
  }
  const templates = parseConnectionTemplates(config as { connection_templates_json?: string; command_template: string })
  const selected = templates.find((item) => item.name === templateName)
  if (!selected) {
    throw new Error("template_not_found")
  }

  const values = JSON.parse(record.values_json) as Record<string, unknown>
  const rendered = renderTemplate(selected.template, values)
  return { renderedAddress: rendered.command, unresolvedVariables: rendered.unresolved }
}
