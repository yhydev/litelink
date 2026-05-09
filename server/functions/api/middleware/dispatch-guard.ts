const recentKeys = new Map<string, number>()

function nowMs(): number {
  return Date.now()
}

export function assertDispatchAllowed(request: Request, windowMs = 10_000): void {
  const key = request.headers.get("idempotency-key") || request.headers.get("x-idempotency-key")
  const source = request.headers.get("x-forwarded-for") || "unknown"
  const compound = `${source}:${key ?? "none"}`

  const last = recentKeys.get(compound)
  const now = nowMs()
  if (last && now - last < windowMs) {
    throw new Response(JSON.stringify({ error: "duplicate_dispatch" }), { status: 429 })
  }

  recentKeys.set(compound, now)

  if (recentKeys.size > 2000) {
    for (const [k, t] of recentKeys) {
      if (now - t > windowMs) {
        recentKeys.delete(k)
      }
    }
  }
}
