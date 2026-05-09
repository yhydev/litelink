export interface LinkInfoRecord {
  id: string
  linkConfigId: string
  name: string
  note: string
  values: Record<string, unknown>
  type: string
  status: "active" | "archived"
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
}

export interface CreateLinkInfoRecordInput {
  linkConfigId: string
  name: string
  note?: string
  values: Record<string, unknown>
  actorId: string
}

export interface UpdateLinkInfoRecordInput {
  name?: string
  note?: string
  values?: Record<string, unknown>
  status?: "active" | "archived"
  actorId: string
}
