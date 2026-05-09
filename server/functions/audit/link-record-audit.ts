import { Repository } from "../services/repository"
import { writeAuditEvent } from "./audit-service"

export async function auditLinkRecordCreate(repo: Repository, actorId: string, recordId: string, linkConfigId: string): Promise<void> {
  await writeAuditEvent(repo, {
    actorId,
    actionType: "record.create",
    targetType: "LinkRecord",
    targetId: recordId,
    metadata: { linkConfigId },
  })
}

export async function auditLinkRecordUpdate(repo: Repository, actorId: string, recordId: string): Promise<void> {
  await writeAuditEvent(repo, {
    actorId,
    actionType: "record.update",
    targetType: "LinkRecord",
    targetId: recordId,
  })
}
