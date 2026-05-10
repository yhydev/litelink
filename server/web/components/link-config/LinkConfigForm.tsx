import { useEffect, useState, type FormEvent } from "react"
import { Button, Input, Textarea } from "@heroui/react"
import type { LinkConfigPayload } from "../../services/link-config-api"
import { ErrorNotice } from "../common/ErrorNotice"
import {
  addTemplateItem,
  extractTemplateVariables,
  getDuplicateTemplateNames,
  moveTemplateItem,
  removeTemplateItem,
  toConnectionTemplatePayload,
  toTemplateItems,
  updateTemplateItem,
  type TemplateItem,
} from "./template-editor-state"

interface Props {
  initialValue?: LinkConfigPayload
  onSubmit: (payload: LinkConfigPayload) => Promise<void>
  submitLabel?: string
}

export function LinkConfigForm({ initialValue, onSubmit, submitLabel = "Save" }: Props) {
  const [name, setName] = useState(initialValue?.name ?? "")
  const [description, setDescription] = useState(initialValue?.description ?? "")
  const [schemaText, setSchemaText] = useState(JSON.stringify(initialValue?.schema ?? { type: "object", properties: {} }, null, 2))
  const [connectionTemplates, setConnectionTemplates] = useState<TemplateItem[]>(toTemplateItems(initialValue?.connectionTemplates))
  const [error, setError] = useState("")

  const normalizedNameCounts = connectionTemplates.reduce<Record<string, number>>((acc, item) => {
    const key = item.name.trim().toLowerCase()
    if (!key) return acc
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  const duplicateTemplateNames = getDuplicateTemplateNames(connectionTemplates)

  useEffect(() => {
    setName(initialValue?.name ?? "")
    setDescription(initialValue?.description ?? "")
    setSchemaText(JSON.stringify(initialValue?.schema ?? { type: "object", properties: {} }, null, 2))
    setConnectionTemplates(toTemplateItems(initialValue?.connectionTemplates))
    setError("")
  }, [initialValue])

  function updateTemplate(id: string, patch: Partial<{ name: string; template: string }>) {
    setConnectionTemplates((prev) => updateTemplateItem(prev, id, patch))
  }

  function addTemplate() {
    setConnectionTemplates((prev) => addTemplateItem(prev))
  }

  function removeTemplate(id: string) {
    setConnectionTemplates((prev) => removeTemplateItem(prev, id))
  }

  function moveTemplate(index: number, direction: -1 | 1) {
    setConnectionTemplates((prev) => moveTemplateItem(prev, index, direction))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")

    try {
      const schema = JSON.parse(schemaText) as Record<string, unknown>
      if (duplicateTemplateNames.length > 0) {
        throw new Error(`模板名称重复: ${duplicateTemplateNames.join(", ")}`)
      }
      await onSubmit({
        name,
        description,
        schema,
        connectionTemplates: toConnectionTemplatePayload(connectionTemplates),
      })
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
            <div key={item.id} className="card" style={{ padding: 12 }}>
              <div className="form-grid">
                <label className="field">
                  <span>Template Name</span>
                  <Input
                    classNames={{ inputWrapper: "app-input-wrap", input: "app-input-text" }}
                    value={item.name}
                    onValueChange={(value) => updateTemplate(item.id, { name: value })}
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
                    onValueChange={(value) => updateTemplate(item.id, { template: value })}
                    placeholder="例如: ssh://{{user}}@{{host}}:{{port}}"
                    minRows={3}
                    isRequired
                  />
                  <p className="row-note">
                    变量: {extractTemplateVariables(item.template).length > 0 ? extractTemplateVariables(item.template).join(", ") : "无"}
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
                <Button type="button" variant="flat" className="app-btn app-btn-ghost" onPress={() => removeTemplate(item.id)}>
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
