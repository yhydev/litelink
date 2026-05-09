export interface DispatchPayload {
  runId: string
  command: string
  sentAt: string
  signature?: string
}

export interface DispatchResult {
  accepted: boolean
  status: number
  body: unknown
}

export async function dispatchToLocalEndpoint(
  endpoint: string,
  payload: DispatchPayload,
  timeoutMs = 5000
): Promise<DispatchResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    let body: unknown = null
    try {
      body = await response.json()
    } catch {
      body = await response.text()
    }

    return {
      accepted: response.ok,
      status: response.status,
      body,
    }
  } finally {
    clearTimeout(timer)
  }
}
