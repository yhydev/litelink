import { useEffect, useState } from "react"
import { fetchCommandRuns } from "../../services/command-run-api"

export default function CommandRunsPage() {
  const [items, setItems] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError("")
      try {
        setItems(await fetchCommandRuns())
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载失败")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <main>
      <h1>Command Runs</h1>
      <p className="section-lead">查看命令请求状态、执行状态与时间线。</p>
      <section className="card">
        {loading ? <p>Loading...</p> : error ? <p className="error-note">{error}</p> : <pre>{JSON.stringify(items, null, 2)}</pre>}
      </section>
    </main>
  )
}
