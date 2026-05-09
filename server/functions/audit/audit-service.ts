import { Repository } from "../services/repository"

export interface AuditInput {
  actorId: string
  actionType: string
  targetType: "LinkConfig" | "LinkRecord" | "CommandRun"
  targetId: string
  metadata?: Record<string, unknown>
}

function createId(): string {
  return `aud_${crypto.randomUUID()}`
}

export async function writeAuditEvent(repo: Repository, input: AuditInput): Promise<void> {
  await repo.createAuditEvent({
    id: createId(),
    actorId: input.actorId,
    actionType: input.actionType,
    targetType: input.targetType,
    targetId: input.targetId,
    metadataJson: input.metadata ? JSON.stringify(input.metadata) : undefined,
    createdAt: new Date().toISOString(),
  })
}
