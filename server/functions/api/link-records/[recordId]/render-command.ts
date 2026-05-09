import { renderCommand } from "../../link-record-render"
import { json } from "../../router"
import { Database } from "../../../services/repository"

interface Env {
  DB: Database
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
