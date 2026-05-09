export type RequestStatus = "accepted" | "rejected" | "timeout"
export type ExecutionStatus = "pending" | "running" | "succeeded" | "failed" | "cancelled"

export interface CommandRun {
  id: string
  linkConfigId: string
  linkRecordId: string
  renderedCommand: string
  dispatchTarget: string
  requestStatus: RequestStatus
  executionStatus: ExecutionStatus
  statusMessage?: string
  requestedBy: string
  requestedAt: string
  completedAt?: string
}
