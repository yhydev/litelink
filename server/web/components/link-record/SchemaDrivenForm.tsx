import { useMemo } from "react"
import { Input } from "@heroui/react"

interface Props {
  schema: Record<string, unknown>
  values: Record<string, unknown>
  onValuesChange: (values: Record<string, unknown>) => void
}

export function SchemaDrivenForm({ schema, values, onValuesChange }: Props) {
  const properties = useMemo(
    () => ((schema.properties as Record<string, { title?: string; type?: string }>) ?? {}),
    [schema]
  )
  const required = useMemo(() => new Set((schema.required as string[]) ?? []), [schema])

  return (
    <div className="form-grid">
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
              onValuesChange({
                ...values,
                [field]: nextValue,
              })
            }}
          />
        </label>
      ))}
    </div>
  )
}
