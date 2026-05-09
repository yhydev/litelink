import { requireRole } from "./middleware/auth"
import { json } from "./router"
import { Database, Repository } from "../services/repository"
import { assertDispatchAllowed } from "./middleware/dispatch-guard"
import { dispatchToLocalEndpoint } from "../services/local-dispatch"
import { renderTemplateCommand } from "../validation/template-renderer"

interface Env {
  DB: Database
}

export async function dispatchCommand(request: Request, env: Env, recordId: string): Promise<Response> {
  requireRole(request, ["admin", "operator"])
  assertDispatchAllowed(request)
  const body = (await request.json()) as { localEndpoint?: string }
  if (!body.localEndpoint) {
    return json({ error: "missing_local_endpoint" }, 400)
  }

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
  if (rendered.unresolvedVariables.length > 0) {
    return json({ error: "unresolved_variables", unresolvedVariables: rendered.unresolvedVariables }, 422)
  }

  const runId = `run_${crypto.randomUUID()}`
  const sentAt = new Date().toISOString()
  try {
    const result = await dispatchToLocalEndpoint(body.localEndpoint, {
      runId,
      command: rendered.command,
      sentAt,
    })

    return json({
      runId,
      renderedCommand: rendered.command,
      requestStatus: result.accepted ? "accepted" : result.status === 408 ? "timeout" : "rejected",
      executionStatus: result.accepted ? "running" : "failed",
      statusMessage: result.accepted ? "dispatched" : `dispatch_failed_${result.status}`,
      dispatchTarget: body.localEndpoint,
      result: result.body,
    }, result.accepted ? 202 : result.status === 408 ? 408 : 502)
  } catch {
    return json({
      runId,
      renderedCommand: rendered.command,
      requestStatus: "timeout",
      executionStatus: "failed",
      statusMessage: "dispatch_exception",
      dispatchTarget: body.localEndpoint,
    }, 408)
  }
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
  return dispatchCommand(context.request, context.env, recordId)
}
