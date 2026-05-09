import { requireRole } from "./middleware/auth"
import { json } from "./router"
import { CommandRunService } from "../services/command-run.service"
import { Database, Repository } from "../services/repository"
import { assertDispatchAllowed } from "./middleware/dispatch-guard"

interface Env {
  DB: Database
}

function service(env: Env): CommandRunService {
  return new CommandRunService(new Repository(env.DB))
}

export async function dispatchCommand(request: Request, env: Env, recordId: string): Promise<Response> {
  const user = requireRole(request, ["admin", "operator"])
  assertDispatchAllowed(request)
  const body = (await request.json()) as { localEndpoint?: string }
  if (!body.localEndpoint) {
    return json({ error: "missing_local_endpoint" }, 400)
  }

  const run = await service(env).dispatch({
    recordId,
    localEndpoint: body.localEndpoint,
    actorId: user.id,
  })

  const statusCode = run.requestStatus === "accepted" ? 202 : run.requestStatus === "timeout" ? 408 : 502
  return json(run, statusCode)
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
