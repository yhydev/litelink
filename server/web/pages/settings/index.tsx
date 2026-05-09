import { useState } from "react"
import { DEFAULT_ENDPOINT, getLocalEndpoint, setLocalEndpoint } from "../../src/local-endpoint"

export default function SettingsPage() {
  const [localEndpoint, setLocalEndpointState] = useState(() => getLocalEndpoint())
  const [saved, setSaved] = useState("")

  function save() {
    const value = localEndpoint.trim() || DEFAULT_ENDPOINT
    setLocalEndpoint(value)
    setLocalEndpointState(value)
    setSaved("已保存")
  }

  return (
    <main>
      <h1>Settings</h1>
      <p className="section-lead">配置浏览器直连本地 client 的 Local Endpoint。</p>
      <section className="card">
        <label className="field">
          <span>Local Endpoint</span>
          <input value={localEndpoint} onChange={(e) => setLocalEndpointState(e.target.value)} placeholder={DEFAULT_ENDPOINT} />
        </label>
        <div className="actions-row">
          <button type="button" className="btn btn-primary" onClick={save}>
            保存
          </button>
        </div>
        {saved && <p className="success-note">{saved}</p>}
      </section>
    </main>
  )
}
