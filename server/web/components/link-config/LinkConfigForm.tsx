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
  const [commandTemplate, setCommandTemplate] = useState(initialValue?.commandTemplate ?? "")
  const [error, setError] = useState("")

  useEffect(() => {
    setName(initialValue?.name ?? "")
    setDescription(initialValue?.description ?? "")
    setSchemaText(JSON.stringify(initialValue?.schema ?? { type: "object", properties: {} }, null, 2))
    setCommandTemplate(initialValue?.commandTemplate ?? "")
    setError("")
  }, [initialValue])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")

    try {
      const schema = JSON.parse(schemaText) as Record<string, unknown>
      await onSubmit({ name, description, schema, commandTemplate })
    } catch {
      setError("保存失败，请检查 schema/template 是否合法")
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
        <span>Command Template</span>
        <Textarea classNames={{ inputWrapper: "app-input-wrap", input: "app-input-text" }} value={commandTemplate} onValueChange={setCommandTemplate} minRows={4} isRequired />
      </label>
      <ErrorNotice detail={error || undefined} />
      <div className="actions-row">
        <Button type="submit" color="primary">{submitLabel}</Button>
      </div>
    </form>
  )
}
