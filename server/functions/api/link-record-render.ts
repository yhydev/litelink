import { requireRole } from "./middleware/auth"
import { json } from "./router"
import { Database, Repository } from "../services/repository"
import { renderTemplateCommand } from "../validation/template-renderer"

interface Env {
  DB: Database
}

export async function renderCommand(request: Request, env: Env, recordId: string): Promise<Response> {
  requireRole(request, ["admin", "operator"])
  const repo = new Repository(env.DB)
  const record = await repo.getLinkRecordById(recordId)
  if (!record) {
    return json({ error: "record_not_found" }, 404)
  }

  const config = await repo.getLinkConfigById(record.link_config_id)
  if (!config) {
    return json({ error: "config_not_found" }, 404)
  }

  const values = JSON.parse(record.values_json) as Record<string, unknown>
  const rendered = renderTemplateCommand(config.command_template, values)
  return json({ renderedCommand: rendered.command, unresolvedVariables: rendered.unresolvedVariables })
}

export async function onRequestPost(context: {
  request: Request
  env: Env
  params: { recordId?: string }
}): Promise<Response> {
  const recordId = context.params.recordId
  if (!recordId) {
    return json({ error: "missing_record_id" }, 400)
  }
  return renderCommand(context.request, context.env, recordId)
}
