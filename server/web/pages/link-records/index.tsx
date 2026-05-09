import { useEffect, useMemo, useState } from "react"
import { fetchLinkConfigs } from "../../services/link-config-api"
import { fetchLinkRecords } from "../../services/link-record-api"
import { renderCommand } from "../../services/command-run-api"
import { LinkRecordDialog } from "../../components/link-record/LinkRecordDialog"
import { getLocalEndpoint } from "../../src/local-endpoint"
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
  type: string
  values: Record<string, unknown>
  status: "active" | "archived"
}

interface RowFeedback {
  kind: "success" | "error" | "info"
  text: string
}

export default function LinkRecordsPage() {
  const [configs, setConfigs] = useState<ConfigItem[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [records, setRecords] = useState<RecordItem[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null)
  const [feedbackById, setFeedbackById] = useState<Record<string, RowFeedback>>({})
  const [connectingById, setConnectingById] = useState<Record<string, boolean>>({})
  const [listError, setListError] = useState("")

  useEffect(() => {
    void (async () => {
      try {
        setConfigs((await fetchLinkConfigs()) as ConfigItem[])
      } catch (err) {
        setListError(err instanceof Error ? err.message : "加载配置失败")
      }
    })()
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        setListError("")
        const items = (await fetchLinkRecords(selectedId || undefined)) as RecordItem[]
        setRecords(items)
      } catch (err) {
        setListError(err instanceof Error ? err.message : "加载记录失败")
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
    try {
      setListError("")
      const items = (await fetchLinkRecords(selectedId || undefined)) as RecordItem[]
      setRecords(items)
    } catch (err) {
      setListError(err instanceof Error ? err.message : "加载记录失败")
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

  async function connectRow(record: RecordItem) {
    setConnectingById((prev) => ({ ...prev, [record.id]: true }))
    setFeedbackById((prev) => ({ ...prev, [record.id]: { kind: "info", text: "正在打开..." } }))
    try {
      const rendered = await renderCommand(record.id)
      if (rendered.unresolvedVariables.length > 0) {
        setFeedbackById((prev) => ({
          ...prev,
          [record.id]: {
            kind: "error",
            text: `缺少变量: ${rendered.unresolvedVariables.join(", ")}`,
          },
        }))
        return
      }

      const endpoint = getLocalEndpoint().trim()
      const endpointUrl = new URL(endpoint)
      endpointUrl.searchParams.set("command", rendered.renderedCommand)
      endpointUrl.searchParams.set("runId", `web_${record.id}_${Date.now()}`)

      const opened = window.open(endpointUrl.toString(), "_blank", "noopener,noreferrer")
      if (!opened) {
        throw new Error("浏览器阻止了新窗口，请允许弹窗后重试")
      }

      setFeedbackById((prev) => ({
        ...prev,
        [record.id]: {
          kind: "success",
          text: `已打开本地执行页 · ${endpointUrl.toString()}`,
        },
      }))
    } catch (error) {
      setFeedbackById((prev) => ({
        ...prev,
        [record.id]: {
          kind: "error",
          text: error instanceof Error ? error.message : "连接失败",
        },
      }))
    } finally {
      setConnectingById((prev) => ({ ...prev, [record.id]: false }))
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
            <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              <option value="">All</option>
              {configs.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-primary" onClick={openCreate} type="button">
            新增连接
          </button>
        </div>
      </div>

      <section className="card table-card">
        {listError && <p className="error-note">{listError}</p>}
        <table className="records-table">
          <thead>
            <tr>
              <th>名称</th>
              <th>备注</th>
              <th>类型</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => {
              const feedback = feedbackById[record.id]

              return (
                <tr key={record.id}>
                  <td>
                    <div className="record-name">{record.name || "—"}</div>
                  </td>
                  <td className="record-note">{record.note || "—"}</td>
                  <td>
                    <span className="type-pill">{configNameById[record.linkConfigId] || "—"}</span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn" onClick={() => openEdit(record.id)} type="button">
                        编辑
                      </button>
                      <button className="btn btn-primary" onClick={() => void connectRow(record)} disabled={connectingById[record.id]} type="button">
                        {connectingById[record.id] ? "连接中" : "连接"}
                      </button>
                    </div>
                    {feedback && <div className={`row-note ${feedback.kind === "error" ? "error-note" : feedback.kind === "success" ? "success-note" : "info-note"}`}>{feedback.text}</div>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
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
