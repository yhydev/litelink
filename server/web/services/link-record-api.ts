import { httpFetch, readErrorMessage } from "./http"

export async function createLinkRecord(linkConfigId: string, name: string, note: string, values: Record<string, unknown>): Promise<unknown> {
  const response = await httpFetch("/api/link-records", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ linkConfigId, name, note, values }),
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "create_record_failed"))
  }

  return response.json()
}

export async function updateLinkRecord(recordId: string, payload: { name?: string; note?: string; values?: Record<string, unknown>; status?: "active" | "archived" }): Promise<unknown> {
  const response = await httpFetch(`/api/link-records/${recordId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "update_record_failed"))
  }

  return response.json()
}

export async function fetchLinkRecords(linkConfigId?: string): Promise<unknown[]> {
  const query = linkConfigId ? `?linkConfigId=${encodeURIComponent(linkConfigId)}` : ""
  const response = await httpFetch(`/api/link-records${query}`)
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "fetch_records_failed"))
  }
  const data = (await response.json()) as { items: unknown[] }
  return data.items
}
