import { httpFetch, readErrorMessage } from "./http"

export async function renderCommand(recordId: string): Promise<{ renderedCommand: string; unresolvedVariables: string[] }> {
  const response = await httpFetch(`/api/link-records/${recordId}/render-command`, { method: "POST" })
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "render_failed"))
  }
  return response.json()
}

export async function dispatchCommand(recordId: string, localEndpoint: string): Promise<unknown> {
  const response = await httpFetch(`/api/link-records/${recordId}/dispatch`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ localEndpoint }),
  })
  const data = (await response.json()) as { requestStatus?: string; executionStatus?: string; error?: string }
  if (!response.ok && response.status !== 202 && response.status !== 408 && response.status !== 502) {
    throw new Error(data.error ?? "dispatch_failed")
  }
  return data
}

export async function fetchCommandRuns(): Promise<unknown[]> {
  const response = await httpFetch("/api/command-runs")
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "fetch_command_runs_failed"))
  }
  const data = (await response.json()) as { items: unknown[] }
  return data.items
}
