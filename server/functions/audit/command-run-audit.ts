import { Repository } from "../services/repository"
import { writeAuditEvent } from "./audit-service"

export async function auditCommandRunRequested(repo: Repository, actorId: string, runId: string): Promise<void> {
  await writeAuditEvent(repo, {
    actorId,
    actionType: "run.request",
    targetType: "CommandRun",
    targetId: runId,
  })
}

export async function auditCommandRunResult(repo: Repository, actorId: string, runId: string, status: string): Promise<void> {
  await writeAuditEvent(repo, {
    actorId,
    actionType: "run.result",
    targetType: "CommandRun",
    targetId: runId,
    metadata: { status },
  })
}
