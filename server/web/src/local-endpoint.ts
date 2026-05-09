export const DEFAULT_ENDPOINT = "http://127.0.0.1:8788/local/execute"
export const ENDPOINT_STORAGE_KEY = "litelink.localEndpoint"

export function getLocalEndpoint(): string {
  if (typeof window === "undefined") {
    return DEFAULT_ENDPOINT
  }
  return window.localStorage.getItem(ENDPOINT_STORAGE_KEY) || DEFAULT_ENDPOINT
}

export function setLocalEndpoint(value: string): void {
  if (typeof window === "undefined") {
    return
  }
  window.localStorage.setItem(ENDPOINT_STORAGE_KEY, value)
}
