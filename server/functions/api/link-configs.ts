import { requireRole } from "./middleware/auth"
import { json } from "./router"
import { LinkConfigService } from "../services/link-config.service"
import { Database, Repository } from "../services/repository"

interface Env {
  DB: Database
}

function service(env: Env): LinkConfigService {
  return new LinkConfigService(new Repository(env.DB))
}

export async function listLinkConfigs(request: Request, env: Env): Promise<Response> {
  requireRole(request, ["admin", "operator"])
  const items = await service(env).list()
  return json({ items })
}

export async function createLinkConfig(request: Request, env: Env): Promise<Response> {
  const user = requireRole(request, ["admin"])
  const body = (await request.json()) as {
    name?: string
    description?: string
    schema?: Record<string, unknown>
    commandTemplate?: string
  }

  if (!body.name || !body.schema || !body.commandTemplate) {
    return json({ error: "missing_required_fields" }, 400)
  }

  const item = await service(env).create({
    name: body.name,
    description: body.description,
    schema: body.schema,
    commandTemplate: body.commandTemplate,
    actorId: user.id,
  })
  return json(item, 201)
}

export async function onRequestGet(context: { request: Request; env: Env }): Promise<Response> {
  return listLinkConfigs(context.request, context.env)
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  return createLinkConfig(context.request, context.env)
}
