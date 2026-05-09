export type LinkConfigStatus = "active" | "inactive"

export interface LinkConfig {
  id: string
  name: string
  description?: string
  schema: Record<string, unknown>
  commandTemplate: string
  status: LinkConfigStatus
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
}

export interface CreateLinkConfigInput {
  name: string
  description?: string
  schema: Record<string, unknown>
  commandTemplate: string
  actorId: string
}

export interface UpdateLinkConfigInput {
  name?: string
  description?: string
  schema?: Record<string, unknown>
  commandTemplate?: string
  status?: LinkConfigStatus
  actorId: string
}
