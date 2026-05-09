import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Button, Input, Modal, ModalBody, ModalContent, ModalHeader, Select, SelectItem } from "@heroui/react"
import { SchemaDrivenForm } from "./SchemaDrivenForm"
import { ErrorNotice } from "../common/ErrorNotice"
import { createLinkRecord, updateLinkRecord } from "../../services/link-record-api"

function getSelectionValue(keys: unknown): string {
  if (keys === "all") {
    return ""
  }
  if (!(keys instanceof Set)) {
    return ""
  }
  const first = keys.values().next().value
  return typeof first === "string" ? first : ""
}

interface ConfigItem {
  id: string
  name: string
  schema: Record<string, unknown>
}

interface RecordItem {
  id: string
  linkConfigId: string
  name: string
  note: string
  values: Record<string, unknown>
  status: "active" | "archived"
}

interface Props {
  mode: "create" | "edit"
  configs: ConfigItem[]
  defaultConfigId?: string
  record?: RecordItem
  onClose: () => void
  onSaved: () => void | Promise<void>
}

function DialogShell({ title, subtitle, children, onClose }: { title: string; subtitle: string; children: ReactNode; onClose: () => void }) {
  return (
      <Modal isOpen onOpenChange={(open) => !open && onClose()} size="5xl" scrollBehavior="inside" classNames={{ backdrop: "app-modal-backdrop" }}>
        <ModalContent className="app-modal-content">
          <ModalHeader className="app-modal-header">
            <div>
              <p className="modal-kicker">connection record</p>
              <h2>{title}</h2>
              <p className="modal-subtitle">{subtitle}</p>
            </div>
          </ModalHeader>
          <ModalBody className="app-modal-body">{children}</ModalBody>
        </ModalContent>
      </Modal>
  )
}

export function LinkRecordDialog({ mode, configs, defaultConfigId, record, onClose, onSaved }: Props) {
  const [selectedConfigId, setSelectedConfigId] = useState(defaultConfigId ?? record?.linkConfigId ?? "")
  const [name, setName] = useState(record?.name ?? "")
  const [note, setNote] = useState(record?.note ?? "")
  const [status, setStatus] = useState<"active" | "archived">(record?.status ?? "active")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setSelectedConfigId(defaultConfigId ?? record?.linkConfigId ?? configs[0]?.id ?? "")
    setName(record?.name ?? "")
    setNote(record?.note ?? "")
    setStatus(record?.status ?? "active")
    setError("")
    setSaving(false)
  }, [defaultConfigId, record, mode, configs])

  const selectedConfig = useMemo(() => configs.find((item) => item.id === selectedConfigId), [configs, selectedConfigId])
  const dialogError = error || (!selectedConfig ? "暂无可用配置" : "")

  async function handleSubmit(values: Record<string, unknown>) {
    if (!selectedConfig) {
      setError("请先选择一个 LinkConfig")
      return
    }

    setSaving(true)
    setError("")
    try {
      if (!name.trim()) {
        setError("名称不能为空")
        return
      }

      if (mode === "create") {
        await createLinkRecord(selectedConfig.id, name.trim(), note.trim(), values)
      } else if (record) {
        await updateLinkRecord(record.id, { name: name.trim(), note: note.trim(), values, status })
      }
      await onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <DialogShell
      title={mode === "create" ? "新增连接记录" : "编辑连接记录"}
      subtitle={mode === "create" ? "选择配置并填写字段，保存后会进入列表。" : `正在编辑 ${record?.id ?? "record"}`}
      onClose={onClose}
    >
      {mode === "create" && (
        <label className="field modal-field">
          <span>LinkConfig</span>
          <Select
            classNames={{
              trigger: "app-select-trigger",
              value: "app-select-value",
              popoverContent: "app-select-popover",
              listbox: "app-select-listbox",
            }}
            selectedKeys={selectedConfigId ? [selectedConfigId] : []}
            onSelectionChange={(keys) => {
              setSelectedConfigId(getSelectionValue(keys))
            }}
            placeholder="Select one"
          >
            {configs.map((item) => (
              <SelectItem key={item.id}>{item.name}</SelectItem>
            ))}
          </Select>
        </label>
      )}

      {mode === "edit" && record && <div className="modal-meta mono">{record.linkConfigId}</div>}

      {selectedConfig && (
        <div className="modal-body">
          <div className="form-grid">
            <label className="field">
              <span>名称</span>
                <Input classNames={{ inputWrapper: "app-input-wrap", input: "app-input-text" }} value={name} onValueChange={setName} isRequired />
              </label>
              <label className="field">
                <span>备注</span>
                <Input classNames={{ inputWrapper: "app-input-wrap", input: "app-input-text" }} value={note} onValueChange={setNote} />
              </label>
          </div>

          {mode === "edit" && (
            <label className="field modal-field">
              <span>Status</span>
              <Select
                classNames={{
                  trigger: "app-select-trigger",
                  value: "app-select-value",
                  popoverContent: "app-select-popover",
                  listbox: "app-select-listbox",
                }}
                selectedKeys={[status]}
                onSelectionChange={(keys) => {
                  const value = getSelectionValue(keys)
                  setStatus(value === "archived" ? "archived" : "active")
                }}
              >
                <SelectItem key="active">active</SelectItem>
                <SelectItem key="archived">archived</SelectItem>
              </Select>
            </label>
          )}

          <div className="modal-form-wrap">
            <SchemaDrivenForm
              key={`${selectedConfig.id}-${mode}`}
              schema={selectedConfig.schema}
              initialValues={record?.values}
              submitLabel={saving ? "Saving..." : mode === "create" ? "Create Record" : "Save Changes"}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      )}

      {dialogError && <ErrorNotice detail={dialogError} />}

      <div className="row-actions">
        <Button className="app-btn app-btn-ghost" variant="light" onPress={onClose}>关闭</Button>
      </div>
    </DialogShell>
  )
}
