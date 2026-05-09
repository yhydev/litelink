type Handler = (request: Request) => Promise<Response>

const routes = new Map<string, Handler>()

function key(method: string, pathname: string): string {
  return `${method.toUpperCase()} ${pathname}`
}

export function registerRoute(method: string, pathname: string, handler: Handler): void {
  routes.set(key(method, pathname), handler)
}

export async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const handler = routes.get(key(request.method, url.pathname))

  if (!handler) {
    return json({ error: "not_found" }, 404)
  }

  try {
    return await handler(request)
  } catch (error) {
    if (error instanceof Response) {
      return error
    }

    return json(
      {
        error: "internal_error",
        message: error instanceof Error ? error.message : "Unexpected error",
      },
      500
    )
  }
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  })
}
