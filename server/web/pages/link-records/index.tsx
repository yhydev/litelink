import { useEffect, useMemo, useState } from "react"
import { Button, Select, SelectItem, Spinner, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react"
import { fetchLinkConfigs } from "../../services/link-config-api"
import { fetchLinkRecords } from "../../services/link-record-api"
import { renderConnectionAddress } from "../../services/command-run-api"
import { LinkRecordDialog } from "../../components/link-record/LinkRecordDialog"

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
  connectionTemplates?: Array<{ name: string; template: string }>
}

interface RecordItem {
  id: string
  linkConfigId: string
  name: string
  note: string
  type: string
  values: Record<string, unknown>
  status: "active" | "archived"
}

export default function LinkRecordsPage() {
  const [configs, setConfigs] = useState<ConfigItem[]>([])
  const [configsLoading, setConfigsLoading] = useState(true)
  const [selectedId, setSelectedId] = useState("")
  const [records, setRecords] = useState<RecordItem[]>([])
  const [recordsLoading, setRecordsLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null)
  const [listError, setListError] = useState("")
  const [feedbackById, setFeedbackById] = useState<Record<string, string>>({})

  useEffect(() => {
    void (async () => {
      setConfigsLoading(true)
      try {
        setConfigs((await fetchLinkConfigs()) as ConfigItem[])
      } catch (err) {
        setListError(err instanceof Error ? err.message : "加载配置失败")
      } finally {
        setConfigsLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    void (async () => {
      setRecordsLoading(true)
      try {
        setListError("")
        const items = (await fetchLinkRecords(selectedId || undefined)) as RecordItem[]
        setRecords(items)
      } catch (err) {
        setListError(err instanceof Error ? err.message : "加载记录失败")
      } finally {
        setRecordsLoading(false)
      }
    })()
  }, [selectedId])

  const editingRecord = useMemo(() => records.find((item) => item.id === editingRecordId) ?? null, [records, editingRecordId])
  const configNameById = useMemo(() => {
    const map: Record<string, string> = {}
    for (const item of configs) {
      map[item.id] = item.name
    }
    return map
  }, [configs])

  async function refreshRecords() {
    setRecordsLoading(true)
    try {
      setListError("")
      const items = (await fetchLinkRecords(selectedId || undefined)) as RecordItem[]
      setRecords(items)
    } catch (err) {
      setListError(err instanceof Error ? err.message : "加载记录失败")
    } finally {
      setRecordsLoading(false)
    }
  }

  function openCreate() {
    setCreateOpen(true)
  }

  function openEdit(recordId: string) {
    setEditingRecordId(recordId)
  }

  function closeDialogs() {
    setCreateOpen(false)
    setEditingRecordId(null)
  }

  async function openRenderedAddressInNewTab(event: React.MouseEvent<HTMLAnchorElement>, recordId: string, templateName: string) {
    event.preventDefault()
    setFeedbackById((prev) => ({ ...prev, [recordId]: `正在渲染模板 ${templateName}...` }))
    try {
      const rendered = await renderConnectionAddress(recordId, templateName)
      if (rendered.unresolvedVariables.length > 0) {
        setFeedbackById((prev) => ({
          ...prev,
          [recordId]: `缺少变量: ${rendered.unresolvedVariables.join(", ")}`,
        }))
        return
      }
      const url = rendered.renderedAddress.trim()
      if (!url) {
        setFeedbackById((prev) => ({ ...prev, [recordId]: "渲染结果为空" }))
        return
      }
      const opened = window.open(url, "_blank", "noopener,noreferrer")
      if (!opened) {
        setFeedbackById((prev) => ({ ...prev, [recordId]: "浏览器阻止了新窗口，请允许弹窗后重试" }))
        return
      }
      setFeedbackById((prev) => ({ ...prev, [recordId]: `已打开: ${url}` }))
    } catch (error) {
      setFeedbackById((prev) => ({ ...prev, [recordId]: error instanceof Error ? error.message : "连接失败" }))
    }
  }

  return (
    <main>
      <div className="page-head">
        <div>
          <h1>Link Records</h1>
          <p className="section-lead">每条记录一行，只展示名称、备注、类型；新增和编辑都在弹出框里完成。</p>
        </div>
        <div className="toolbar-right">
          <label className="field compact-field">
            <span>Filter by LinkConfig</span>
            <Select
              classNames={{
                trigger: "app-select-trigger",
                value: "app-select-value",
                popoverContent: "app-select-popover",
                listbox: "app-select-listbox",
              }}
              selectedKeys={selectedId ? [selectedId] : []}
              onSelectionChange={(keys) => {
                setSelectedId(getSelectionValue(keys))
              }}
              placeholder="All"
            >
              {configs.map((item) => (
                <SelectItem key={item.id}>{item.name}</SelectItem>
              ))}
            </Select>
          </label>
          <Button color="primary" onPress={openCreate} type="button">
            新增连接
          </Button>
        </div>
      </div>

      <section className="card table-card">
        {listError && <p className="error-note">{listError}</p>}
        {configsLoading || recordsLoading ? (
          <div className="table-loading-wrap">
            <Spinner label="Loading..." color="primary" />
          </div>
        ) : (
          <Table aria-label="link records" removeWrapper classNames={{ table: "app-table" }}>
            <TableHeader>
              <TableColumn>名称</TableColumn>
              <TableColumn>备注</TableColumn>
              <TableColumn>类型</TableColumn>
              <TableColumn>操作</TableColumn>
            </TableHeader>
            <TableBody items={records} emptyContent="暂无记录">
              {(record) => {
                return (
                  <TableRow key={record.id}>
                    <TableCell><div className="record-name">{record.name || "—"}</div></TableCell>
                    <TableCell className="record-note">
                      <span className="record-note-ellipsis" title={record.note || ""}>{record.note || "—"}</span>
                    </TableCell>
                    <TableCell><span className="type-pill">{configNameById[record.linkConfigId] || "—"}</span></TableCell>
                    <TableCell>
                      <div className="row-actions">
                        <Button className="app-btn app-btn-ghost" size="sm" variant="flat" onPress={() => openEdit(record.id)} type="button">编辑</Button>
                        {(configs.find((item) => item.id === record.linkConfigId)?.connectionTemplates ?? []).map((tpl) => (
                          <a
                            key={`${record.id}-${tpl.name}`}
                            className="app-btn app-btn-primary"
                            href="#"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => {
                              void openRenderedAddressInNewTab(event, record.id, tpl.name)
                            }}
                          >
                            {tpl.name}
                          </a>
                        ))}
                      </div>
                      {feedbackById[record.id] && <div className="row-note">{feedbackById[record.id]}</div>}
                    </TableCell>
                  </TableRow>
                )
              }}
            </TableBody>
          </Table>
        )}
      </section>

      {createOpen && (
        <LinkRecordDialog
          mode="create"
          configs={configs}
          defaultConfigId={selectedId || configs[0]?.id}
          onClose={closeDialogs}
          onSaved={refreshRecords}
        />
      )}

      {editingRecord && (
        <LinkRecordDialog
          mode="edit"
          configs={configs}
          record={editingRecord}
          onClose={closeDialogs}
          onSaved={refreshRecords}
        />
      )}
    </main>
  )
}
