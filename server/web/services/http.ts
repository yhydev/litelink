const DEFAULT_USER_ID = "local-dev-user"
const DEFAULT_USER_ROLE = "admin"

function withAuthHeaders(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers)
  if (!headers.has("x-user-id")) {
    headers.set("x-user-id", DEFAULT_USER_ID)
  }
  if (!headers.has("x-user-role")) {
    headers.set("x-user-role", DEFAULT_USER_ROLE)
  }

  return {
    ...init,
    headers,
  }
}

export async function httpFetch(input: string, init?: RequestInit): Promise<Response> {
  return fetch(input, withAuthHeaders(init))
}

export async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string; message?: string }
    return data.error ?? data.message ?? fallback
  } catch {
    return fallback
  }
}
