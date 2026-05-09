import { patchLinkConfig } from "../link-config-by-id"
import { json } from "../router"
import { Database } from "../../services/repository"

interface Env {
  DB: Database
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
