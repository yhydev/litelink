import { requireRole } from "./middleware/auth"
import { json } from "./router"
import { CommandRunService } from "../services/command-run.service"
import { Database, Repository } from "../services/repository"

interface Env {
  DB: Database
}

export async function onRequestGet(context: { request: Request; env: Env }): Promise<Response> {
  requireRole(context.request, ["admin", "operator"])
  const svc = new CommandRunService(new Repository(context.env.DB))
  const items = await svc.listRuns()
  return json({ items })
}
