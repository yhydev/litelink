import { Repository } from "../services/repository"
import { writeAuditEvent } from "./audit-service"

export async function auditLinkConfigCreate(repo: Repository, actorId: string, configId: string): Promise<void> {
  await writeAuditEvent(repo, {
    actorId,
    actionType: "config.create",
    targetType: "LinkConfig",
    targetId: configId,
  })
}

export async function auditLinkConfigUpdate(repo: Repository, actorId: string, configId: string): Promise<void> {
  await writeAuditEvent(repo, {
    actorId,
    actionType: "config.update",
    targetType: "LinkConfig",
    targetId: configId,
  })
}

export async function auditLinkConfigDeactivate(repo: Repository, actorId: string, configId: string): Promise<void> {
  await writeAuditEvent(repo, {
    actorId,
    actionType: "config.deactivate",
    targetType: "LinkConfig",
    targetId: configId,
  })
}
