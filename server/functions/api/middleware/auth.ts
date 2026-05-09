export type UserRole = "admin" | "operator"

export interface RequestUser {
  id: string
  role: UserRole
}

export interface AuthenticatedRequest extends Request {
  user?: RequestUser
}

export function getRequestUser(request: Request): RequestUser | null {
  const userId = request.headers.get("x-user-id")
  const role = request.headers.get("x-user-role") as UserRole | null
  if (!userId || !role) {
    return null
  }
  if (role !== "admin" && role !== "operator") {
    return null
  }
  return { id: userId, role }
}

export function requireRole(request: Request, allowedRoles: UserRole[]): RequestUser {
  const user = getRequestUser(request)
  if (!user) {
    throw new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 })
  }
  if (!allowedRoles.includes(user.role)) {
    throw new Response(JSON.stringify({ error: "forbidden" }), { status: 403 })
  }
  return user
}
