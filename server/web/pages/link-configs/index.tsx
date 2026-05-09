import { useEffect, useState } from "react"
import { createLinkConfig, fetchLinkConfigs, updateLinkConfig, type LinkConfigPayload } from "../../services/link-config-api"
import { LinkConfigForm } from "../../components/link-config/LinkConfigForm"

interface ConfigItem extends LinkConfigPayload {
  id: string
  status: "active" | "inactive"
  updatedAt: string
}

export default function LinkConfigsPage() {
  const [items, setItems] = useState<ConfigItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<ConfigItem | null>(null)

  async function load() {
    setLoading(true)
    setError("")
    try {
      setItems((await fetchLinkConfigs()) as ConfigItem[])
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <main>
      <div className="page-head">
        <div>
          <h1>Link Configs</h1>
          <p className="section-lead">管理可复用配置模板（Schema + Command Template）。</p>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-primary" type="button" onClick={() => setCreateOpen(true)}>
            新增配置
          </button>
        </div>
      </div>

      <section className="card table-card">
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p className="error-note">{error}</p>
        ) : (
          <table className="records-table">
            <thead>
              <tr>
                <th>名称</th>
                <th>描述</th>
                <th>状态</th>
                <th>更新时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="record-name">{item.name}</div>
                    <div className="row-note mono">{item.id}</div>
                  </td>
                  <td className="record-note">{item.description || "—"}</td>
                  <td>
                    <span className="type-pill">{item.status}</span>
                  </td>
                  <td className="muted-cell">{new Date(item.updatedAt).toLocaleString()}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn" type="button" onClick={() => setEditing(item)}>
                        编辑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {createOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setCreateOpen(false)}>
          <div className="modal-panel" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="modal-kicker">link config</p>
                <h2>新增配置</h2>
              </div>
              <button className="btn modal-close" onClick={() => setCreateOpen(false)} type="button">
                ×
              </button>
            </div>
            <LinkConfigForm
              submitLabel="Create Config"
              onSubmit={async (payload) => {
                await createLinkConfig(payload)
                await load()
                setCreateOpen(false)
              }}
            />
          </div>
        </div>
      )}

      {editing && (
        <div className="modal-backdrop" role="presentation" onClick={() => setEditing(null)}>
          <div className="modal-panel" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="modal-kicker">link config</p>
                <h2>编辑配置</h2>
                <p className="modal-subtitle mono">{editing.id}</p>
              </div>
              <button className="btn modal-close" onClick={() => setEditing(null)} type="button">
                ×
              </button>
            </div>
            <LinkConfigForm
              initialValue={{
                name: editing.name,
                description: editing.description,
                schema: editing.schema,
                commandTemplate: editing.commandTemplate,
              }}
              submitLabel="Save Changes"
              onSubmit={async (payload) => {
                await updateLinkConfig(editing.id, payload)
                await load()
                setEditing(null)
              }}
            />
          </div>
        </div>
      )}
    </main>
  )
}
