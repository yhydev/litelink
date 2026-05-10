export interface TemplateItem {
  id: string
  name: string
  template: string
}

export interface ConnectionTemplatePayload {
  name: string
  template: string
}

export function createTemplateItem(name = "", template = ""): TemplateItem {
  return { id: `tpl_${crypto.randomUUID()}`, name, template }
}

export function toTemplateItems(items: ConnectionTemplatePayload[] | undefined): TemplateItem[] {
  if (items && items.length > 0) {
    return items.map((item) => createTemplateItem(item.name, item.template))
  }
  return [createTemplateItem("default", "")]
}

export function updateTemplateItem(list: TemplateItem[], id: string, patch: Partial<ConnectionTemplatePayload>): TemplateItem[] {
  return list.map((item) => (item.id === id ? { ...item, ...patch } : item))
}

export function addTemplateItem(list: TemplateItem[]): TemplateItem[] {
  return [...list, createTemplateItem()]
}

export function removeTemplateItem(list: TemplateItem[], id: string): TemplateItem[] {
  const next = list.filter((item) => item.id !== id)
  return next.length > 0 ? next : [createTemplateItem("default", "")]
}

export function moveTemplateItem(list: TemplateItem[], index: number, direction: -1 | 1): TemplateItem[] {
  const target = index + direction
  if (target < 0 || target >= list.length) return list
  const next = [...list]
  const current = next[index]
  next[index] = next[target]
  next[target] = current
  return next
}

export function getDuplicateTemplateNames(list: TemplateItem[]): string[] {
  const counts = list.reduce<Record<string, number>>((acc, item) => {
    const key = item.name.trim().toLowerCase()
    if (!key) return acc
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})
  return Object.keys(counts).filter((key) => counts[key] > 1)
}

export function extractTemplateVariables(template: string): string[] {
  const vars = [...template.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)].map((m) => m[1])
  return [...new Set(vars)]
}

export function toConnectionTemplatePayload(list: TemplateItem[]): ConnectionTemplatePayload[] {
  return list.map((item) => ({ name: item.name, template: item.template }))
}
