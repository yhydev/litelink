import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Button, Input } from "@heroui/react"
import { ErrorNotice } from "../common/ErrorNotice"

interface Props {
  schema: Record<string, unknown>
  initialValues?: Record<string, unknown>
  submitLabel?: string
  onSubmit: (values: Record<string, unknown>) => Promise<void>
}

export function SchemaDrivenForm({ schema, initialValues, submitLabel = "Save Record", onSubmit }: Props) {
  const properties = useMemo(
    () => ((schema.properties as Record<string, { title?: string; type?: string }>) ?? {}),
    [schema]
  )
  const required = useMemo(() => new Set((schema.required as string[]) ?? []), [schema])
  const [values, setValues] = useState<Record<string, unknown>>(initialValues ?? {})
  const [error, setError] = useState("")

  useEffect(() => {
    setValues(initialValues ?? {})
  }, [initialValues, schema])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    try {
      await onSubmit(values)
    } catch {
      setError("保存失败，请检查输入")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      {Object.entries(properties).map(([field, meta]) => (
        <label key={field} className="field">
          <span>{meta.title ?? field}</span>
          <Input
            classNames={{ inputWrapper: "app-input-wrap", input: "app-input-text" }}
            required={required.has(field)}
            type={meta.type === "number" ? "number" : "text"}
            value={values[field] === undefined || values[field] === null ? "" : String(values[field])}
            onValueChange={(raw) => {
              const nextValue =
                meta.type === "number"
                  ? raw.trim() === ""
                    ? undefined
                    : Number(raw)
                  : raw
              setValues((prev) => ({
                ...prev,
                [field]: nextValue,
              }))
            }}
          />
        </label>
      ))}
      <ErrorNotice detail={error || undefined} />
      <div className="actions-row">
        <Button type="submit" color="primary">{submitLabel}</Button>
      </div>
    </form>
  )
}
