import { httpFetch, readErrorMessage } from "./http"

export interface LinkConfigPayload {
  name: string
  description?: string
  schema: Record<string, unknown>
  commandTemplate: string
}

export async function fetchLinkConfigs(): Promise<unknown[]> {
  const response = await httpFetch("/api/link-configs")
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "failed_to_fetch_link_configs"))
  }
  const data = (await response.json()) as { items: unknown[] }
  return data.items
}

export async function createLinkConfig(payload: LinkConfigPayload): Promise<unknown> {
  const response = await httpFetch("/api/link-configs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "create_failed"))
  }
  return response.json()
}

export async function updateLinkConfig(id: string, payload: Partial<LinkConfigPayload> & { status?: "active" | "inactive" }): Promise<unknown> {
  const response = await httpFetch(`/api/link-configs/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "update_failed"))
  }
  return response.json()
}
