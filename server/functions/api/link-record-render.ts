import { requireRole } from "./middleware/auth"
import { json } from "./router"
import { CommandRunService } from "../services/command-run.service"
import { Database, Repository } from "../services/repository"

interface Env {
  DB: Database
}

function service(env: Env): CommandRunService {
  return new CommandRunService(new Repository(env.DB))
}

export async function renderCommand(request: Request, env: Env, recordId: string): Promise<Response> {
  requireRole(request, ["admin", "operator"])
  const result = await service(env).render(recordId)
  return json({ renderedCommand: result.renderedCommand, unresolvedVariables: result.unresolvedVariables })
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
