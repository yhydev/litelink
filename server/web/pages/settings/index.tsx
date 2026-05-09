import { useState } from "react"
import { DEFAULT_ENDPOINT, getLocalEndpoint, setLocalEndpoint } from "../../src/local-endpoint"
import { getS3Config, setS3Config, type S3Config } from "../../src/storage-config"
import { s3Store } from "../../src/s3-storage"

export default function SettingsPage() {
  const [localEndpoint, setLocalEndpointState] = useState(() => getLocalEndpoint())
  const [s3Config, setS3ConfigState] = useState<S3Config>(() => getS3Config())
  const [saved, setSaved] = useState("")
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState("")

  function save() {
    const value = localEndpoint.trim() || DEFAULT_ENDPOINT
    setLocalEndpoint(value)
    setLocalEndpointState(value)
    setS3Config({
      endpoint: s3Config.endpoint.trim(),
      region: s3Config.region.trim() || "auto",
      bucket: s3Config.bucket.trim(),
      accessKeyId: s3Config.accessKeyId.trim(),
      secretAccessKey: s3Config.secretAccessKey.trim(),
      prefix: s3Config.prefix.trim(),
      passphrase: s3Config.passphrase,
    })
    setSaved("已保存到 localStorage")
  }

  async function testConnection() {
    setTesting(true)
    setTestResult("")
    try {
      save()
      const result = await s3Store.testConnection()
      setTestResult(result.message)
    } catch (error) {
      setTestResult(error instanceof Error ? `连接失败: ${error.message}` : "连接失败")
    } finally {
      setTesting(false)
    }
  }

  return (
    <main>
      <h1>Settings</h1>
      <p className="section-lead">纯前端模式：配置浏览器直连 S3 与本地 Local Endpoint，所有配置仅保存在 localStorage。</p>
      <section className="card">
        <label className="field">
          <span>Local Endpoint</span>
          <input value={localEndpoint} onChange={(e) => setLocalEndpointState(e.target.value)} placeholder={DEFAULT_ENDPOINT} />
        </label>
        <label className="field">
          <span>S3 Endpoint</span>
          <input value={s3Config.endpoint} onChange={(e) => setS3ConfigState((prev) => ({ ...prev, endpoint: e.target.value }))} placeholder="https://<accountid>.r2.cloudflarestorage.com" />
        </label>
        <label className="field">
          <span>S3 Region</span>
          <input value={s3Config.region} onChange={(e) => setS3ConfigState((prev) => ({ ...prev, region: e.target.value }))} placeholder="auto" />
        </label>
        <label className="field">
          <span>S3 Bucket</span>
          <input value={s3Config.bucket} onChange={(e) => setS3ConfigState((prev) => ({ ...prev, bucket: e.target.value }))} placeholder="litelink-data" />
        </label>
        <label className="field">
          <span>Access Key ID</span>
          <input value={s3Config.accessKeyId} onChange={(e) => setS3ConfigState((prev) => ({ ...prev, accessKeyId: e.target.value }))} />
        </label>
        <label className="field">
          <span>Secret Access Key</span>
          <input type="password" value={s3Config.secretAccessKey} onChange={(e) => setS3ConfigState((prev) => ({ ...prev, secretAccessKey: e.target.value }))} />
        </label>
        <label className="field">
          <span>Object Prefix</span>
          <input value={s3Config.prefix} onChange={(e) => setS3ConfigState((prev) => ({ ...prev, prefix: e.target.value }))} placeholder="litelink/prod" />
        </label>
        <label className="field">
          <span>Encryption Passphrase</span>
          <input type="password" value={s3Config.passphrase} onChange={(e) => setS3ConfigState((prev) => ({ ...prev, passphrase: e.target.value }))} placeholder="至少 16 位" />
        </label>
        <div className="actions-row">
          <button type="button" className="btn btn-primary" onClick={save}>
            保存
          </button>
          <button type="button" className="btn" onClick={() => void testConnection()} disabled={testing}>
            {testing ? "测试中..." : "测试连接"}
          </button>
        </div>
        {saved && <p className="success-note">{saved}</p>}
        {testResult && <p className={testResult.startsWith("连接成功") ? "success-note" : "error-note"}>{testResult}</p>}
      </section>
    </main>
  )
}
