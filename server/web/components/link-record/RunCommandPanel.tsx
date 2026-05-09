import { useState } from "react"
import { dispatchCommand, renderCommand } from "../../services/command-run-api"

interface Props {
  recordId: string
}

export function RunCommandPanel({ recordId }: Props) {
  const [localEndpoint, setLocalEndpoint] = useState("http://127.0.0.1:8788/local/execute")
  const [preview, setPreview] = useState("")
  const [status, setStatus] = useState("")

  return (
    <section className="card run-panel">
      <h3>Run Command</h3>
      <div className="actions-row">
        <button
          className="btn"
        onClick={async () => {
          const res = await renderCommand(recordId)
          setPreview(res.renderedCommand)
          if (res.unresolvedVariables.length > 0) {
            setStatus(`未解析变量: ${res.unresolvedVariables.join(",")}`)
          }
        }}
      >
        Preview Command
        </button>
      </div>
      <pre>{preview || "Click preview to generate command"}</pre>

      <label className="field">
        <span>Local Endpoint</span>
        <input value={localEndpoint} onChange={(e) => setLocalEndpoint(e.target.value)} />
      </label>
      <div className="actions-row">
        <button
          className="btn btn-primary"
        onClick={async () => {
          const res = (await dispatchCommand(recordId, localEndpoint)) as { requestStatus?: string; executionStatus?: string }
          setStatus(`request=${res.requestStatus ?? "unknown"}, execution=${res.executionStatus ?? "unknown"}`)
        }}
      >
        Dispatch
        </button>
      </div>
      {status && <p className="status-text">{status}</p>}
    </section>
  )
}
