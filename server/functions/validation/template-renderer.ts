const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}/g

export interface RenderResult {
  command: string
  unresolvedVariables: string[]
}

export function collectTemplateVariables(template: string): string[] {
  const vars = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = VARIABLE_PATTERN.exec(template)) !== null) {
    vars.add(match[1])
  }
  return [...vars]
}

export function renderTemplateCommand(
  template: string,
  values: Record<string, unknown>
): RenderResult {
  const unresolved: string[] = []
  const command = template.replace(VARIABLE_PATTERN, (_full, key: string) => {
    const raw = values[key]
    if (raw === undefined || raw === null) {
      unresolved.push(key)
      return ""
    }
    return String(raw)
  })

  return { command, unresolvedVariables: unresolved }
}
