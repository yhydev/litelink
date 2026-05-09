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

export async function createLinkRecord(request: Request, env: Env): Promise<Response> {
  const user = requireRole(request, ["admin", "operator"])
  const body = (await request.json()) as {
    linkConfigId?: string
    name?: string
    note?: string
    values?: Record<string, unknown>
  }

  if (!body.linkConfigId || !body.name || !body.values || typeof body.values !== "object") {
    return json({ error: "missing_required_fields" }, 400)
  }

  const item = await service(env).create({
    linkConfigId: body.linkConfigId,
    name: body.name,
    note: body.note,
    values: body.values,
    actorId: user.id,
  })
  return json(item, 201)
}

export async function listLinkRecords(request: Request, env: Env): Promise<Response> {
  requireRole(request, ["admin", "operator"])
  const url = new URL(request.url)
  const linkConfigId = url.searchParams.get("linkConfigId") ?? undefined
  const items = await service(env).list(linkConfigId)
  return json({ items })
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  return createLinkRecord(context.request, context.env)
}

export async function onRequestGet(context: { request: Request; env: Env }): Promise<Response> {
  return listLinkRecords(context.request, context.env)
}
