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

export async function patchLinkConfig(request: Request, env: Env, configId: string): Promise<Response> {
  const user = requireRole(request, ["admin"])
  const body = (await request.json()) as {
    name?: string
    description?: string
    schema?: Record<string, unknown>
    commandTemplate?: string
    status?: "active" | "inactive"
  }

  const item = await service(env).update(configId, {
    name: body.name,
    description: body.description,
    schema: body.schema,
    commandTemplate: body.commandTemplate,
    status: body.status,
    actorId: user.id,
  })
  return json(item)
}

export async function onRequestPatch(context: {
  request: Request
  env: Env
  params: { configId?: string }
}): Promise<Response> {
  const configId = context.params.configId
  if (!configId) {
    return json({ error: "missing_config_id" }, 400)
  }
  return patchLinkConfig(context.request, context.env, configId)
}
