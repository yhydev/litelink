import { useEffect, useState, type FormEvent } from "react"
import { Button, Input, Textarea } from "@heroui/react"
import type { LinkConfigPayload } from "../../services/link-config-api"
import { ErrorNotice } from "../common/ErrorNotice"

interface Props {
  initialValue?: LinkConfigPayload
  onSubmit: (payload: LinkConfigPayload) => Promise<void>
  submitLabel?: string
}

export function LinkConfigForm({ initialValue, onSubmit, submitLabel = "Save" }: Props) {
  const [name, setName] = useState(initialValue?.name ?? "")
  const [description, setDescription] = useState(initialValue?.description ?? "")
  const [schemaText, setSchemaText] = useState(JSON.stringify(initialValue?.schema ?? { type: "object", properties: {} }, null, 2))
  const [connectionTemplates, setConnectionTemplates] = useState<Array<{ name: string; template: string }>>(
    initialValue?.connectionTemplates?.length ? initialValue.connectionTemplates : [{ name: "default", template: "" }]
  )
  const [error, setError] = useState("")

  const normalizedNameCounts = connectionTemplates.reduce<Record<string, number>>((acc, item) => {
    const key = item.name.trim().toLowerCase()
    if (!key) return acc
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  const duplicateTemplateNames = Object.keys(normalizedNameCounts).filter((name) => normalizedNameCounts[name] > 1)

  useEffect(() => {
    setName(initialValue?.name ?? "")
    setDescription(initialValue?.description ?? "")
    setSchemaText(JSON.stringify(initialValue?.schema ?? { type: "object", properties: {} }, null, 2))
    setConnectionTemplates(initialValue?.connectionTemplates?.length ? initialValue.connectionTemplates : [{ name: "default", template: "" }])
    setError("")
  }, [initialValue])

  function updateTemplate(index: number, patch: Partial<{ name: string; template: string }>) {
    setConnectionTemplates((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function addTemplate() {
    setConnectionTemplates((prev) => [...prev, { name: "", template: "" }])
  }

  function removeTemplate(index: number) {
    setConnectionTemplates((prev) => {
      const next = prev.filter((_, i) => i !== index)
      return next.length > 0 ? next : [{ name: "default", template: "" }]
    })
  }

  function moveTemplate(index: number, direction: -1 | 1) {
    setConnectionTemplates((prev) => {
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      const current = next[index]
      next[index] = next[target]
      next[target] = current
      return next
    })
  }

  function getTemplateVariables(template: string): string[] {
    const vars = [...template.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)].map((m) => m[1])
    return [...new Set(vars)]
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")

    try {
      const schema = JSON.parse(schemaText) as Record<string, unknown>
      if (duplicateTemplateNames.length > 0) {
        throw new Error(`模板名称重复: ${duplicateTemplateNames.join(", ")}`)
      }
      await onSubmit({ name, description, schema, connectionTemplates })
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败，请检查 schema/connectionTemplates 是否合法")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      <label className="field">
        <span>Name</span>
        <Input classNames={{ inputWrapper: "app-input-wrap", input: "app-input-text" }} value={name} onValueChange={setName} isRequired />
      </label>
      <label className="field">
        <span>Description</span>
        <Input classNames={{ inputWrapper: "app-input-wrap", input: "app-input-text" }} value={description} onValueChange={setDescription} />
      </label>
      <label className="field field-wide">
        <span>JSON Schema</span>
        <Textarea classNames={{ inputWrapper: "app-input-wrap", input: "app-input-text" }} value={schemaText} onValueChange={setSchemaText} minRows={14} isRequired />
      </label>
      <label className="field field-wide">
        <span>Connection Templates</span>
        <div className="list-grid">
          {connectionTemplates.map((item, index) => (
            <div key={`tpl-${index}`} className="card" style={{ padding: 12 }}>
              <div className="form-grid">
                <label className="field">
                  <span>Template Name</span>
                  <Input
                    classNames={{ inputWrapper: "app-input-wrap", input: "app-input-text" }}
                    value={item.name}
                    onValueChange={(value) => updateTemplate(index, { name: value })}
                    placeholder="例如: ssh-prod"
                    isRequired
                  />
                  {item.name.trim() && normalizedNameCounts[item.name.trim().toLowerCase()] > 1 && (
                    <p className="error-note">模板名重复，请修改</p>
                  )}
                </label>
                <label className="field field-wide">
                  <span>Address Template</span>
                  <Textarea
                    classNames={{ inputWrapper: "app-input-wrap", input: "app-input-text" }}
                    value={item.template}
                    onValueChange={(value) => updateTemplate(index, { template: value })}
                    placeholder="例如: ssh://{{user}}@{{host}}:{{port}}"
                    minRows={3}
                    isRequired
                  />
                  <p className="row-note">
                    变量: {getTemplateVariables(item.template).length > 0 ? getTemplateVariables(item.template).join(", ") : "无"}
                  </p>
                </label>
              </div>
              <div className="actions-row">
                <Button
                  type="button"
                  variant="flat"
                  className="app-btn app-btn-ghost"
                  onPress={() => moveTemplate(index, -1)}
                  isDisabled={index === 0}
                >
                  上移
                </Button>
                <Button
                  type="button"
                  variant="flat"
                  className="app-btn app-btn-ghost"
                  onPress={() => moveTemplate(index, 1)}
                  isDisabled={index === connectionTemplates.length - 1}
                >
                  下移
                </Button>
                <Button type="button" variant="flat" className="app-btn app-btn-ghost" onPress={() => removeTemplate(index)}>
                  删除模板
                </Button>
              </div>
            </div>
          ))}
          <div className="actions-row">
            <Button type="button" variant="flat" className="app-btn app-btn-ghost" onPress={addTemplate}>
              新增模板
            </Button>
          </div>
        </div>
      </label>
      <ErrorNotice detail={error || undefined} />
      <div className="actions-row">
        <Button type="submit" color="primary">{submitLabel}</Button>
      </div>
    </form>
  )
}
