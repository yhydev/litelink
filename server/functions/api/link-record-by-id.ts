import { requireRole } from "./middleware/auth"
import { json } from "./router"
import { LinkInfoRecordService } from "../services/link-record.service"
import { Database, Repository } from "../services/repository"

interface Env {
  DB: Database
}

function service(env: Env): LinkInfoRecordService {
  return new LinkInfoRecordService(new Repository(env.DB))
}

export async function patchLinkRecord(request: Request, env: Env, recordId: string): Promise<Response> {
  const user = requireRole(request, ["admin", "operator"])
  const body = (await request.json()) as {
    name?: string
    note?: string
    values?: Record<string, unknown>
    status?: "active" | "archived"
  }

  const item = await service(env).update(recordId, {
    name: body.name,
    note: body.note,
    values: body.values,
    status: body.status,
    actorId: user.id,
  })
  return json(item)
}

export async function onRequestPatch(context: {
  request: Request
  env: Env
  params: { recordId?: string }
}): Promise<Response> {
  const recordId = context.params.recordId
  if (!recordId) {
    return json({ error: "missing_record_id" }, 400)
  }
  return patchLinkRecord(context.request, context.env, recordId)
}
