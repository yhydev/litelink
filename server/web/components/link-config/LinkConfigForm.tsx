import { useEffect, useState, type FormEvent } from "react"
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
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label className="field">
        <span>Description</span>
        <input value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <label className="field field-wide">
        <span>JSON Schema</span>
        <textarea value={schemaText} onChange={(e) => setSchemaText(e.target.value)} rows={14} required />
      </label>
      <label className="field field-wide">
        <span>Command Template</span>
        <textarea value={commandTemplate} onChange={(e) => setCommandTemplate(e.target.value)} rows={4} required />
      </label>
      <ErrorNotice detail={error || undefined} />
      <div className="actions-row">
        <button type="submit" className="btn btn-primary">{submitLabel}</button>
      </div>
    </form>
  )
}
