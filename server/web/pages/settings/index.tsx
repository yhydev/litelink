import { useState } from "react"
import { Button, Card, CardBody, Divider, Input } from "@heroui/react"
import { DEFAULT_ENDPOINT, getLocalEndpoint, setLocalEndpoint } from "../../src/local-endpoint"
import { getS3Config, setS3Config, type S3Config } from "../../src/storage-config"
import { s3Store } from "../../src/s3-storage"
import { syncFromS3, syncToS3 } from "../../src/sync-service"

export default function SettingsPage() {
  const [localEndpoint, setLocalEndpointState] = useState(() => getLocalEndpoint())
  const [s3Config, setS3ConfigState] = useState<S3Config>(() => getS3Config())
  const [saved, setSaved] = useState("")
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState("")
  const [syncingToS3, setSyncingToS3] = useState(false)
  const [syncingFromS3, setSyncingFromS3] = useState(false)
  const [syncResult, setSyncResult] = useState("")

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

  async function handleSyncToS3() {
    setSyncingToS3(true)
    setSyncResult("")
    try {
      save()
      const result = await syncToS3()
      setSyncResult(result.message)
    } catch (error) {
      setSyncResult(error instanceof Error ? `同步失败: ${error.message}` : "同步失败")
    } finally {
      setSyncingToS3(false)
    }
  }

  async function handleSyncFromS3() {
    setSyncingFromS3(true)
    setSyncResult("")
    try {
      save()
      const result = await syncFromS3()
      setSyncResult(result.message)
    } catch (error) {
      setSyncResult(error instanceof Error ? `同步失败: ${error.message}` : "同步失败")
    } finally {
      setSyncingFromS3(false)
    }
  }

  return (
    <main>
      <h1>Settings</h1>
      <p className="section-lead">纯前端模式：配置浏览器直连 S3 与本地 Local Endpoint，所有配置仅保存在 localStorage。</p>
      <Card className="card">
        <CardBody className="list-grid">
        <label className="field">
          <span>Local Endpoint</span>
          <Input value={localEndpoint} onValueChange={setLocalEndpointState} placeholder={DEFAULT_ENDPOINT} />
        </label>
        <Divider />
        <label className="field">
          <span>S3 Endpoint</span>
          <Input value={s3Config.endpoint} onValueChange={(value) => setS3ConfigState((prev) => ({ ...prev, endpoint: value }))} placeholder="https://<accountid>.r2.cloudflarestorage.com" />
        </label>
        <label className="field">
          <span>S3 Region</span>
          <Input value={s3Config.region} onValueChange={(value) => setS3ConfigState((prev) => ({ ...prev, region: value }))} placeholder="auto" />
        </label>
        <label className="field">
          <span>S3 Bucket</span>
          <Input value={s3Config.bucket} onValueChange={(value) => setS3ConfigState((prev) => ({ ...prev, bucket: value }))} placeholder="litelink-data" />
        </label>
        <label className="field">
          <span>Access Key ID</span>
          <Input value={s3Config.accessKeyId} onValueChange={(value) => setS3ConfigState((prev) => ({ ...prev, accessKeyId: value }))} />
        </label>
        <label className="field">
          <span>Secret Access Key</span>
          <Input type="password" value={s3Config.secretAccessKey} onValueChange={(value) => setS3ConfigState((prev) => ({ ...prev, secretAccessKey: value }))} />
        </label>
        <label className="field">
          <span>Object Prefix</span>
          <Input value={s3Config.prefix} onValueChange={(value) => setS3ConfigState((prev) => ({ ...prev, prefix: value }))} placeholder="litelink/prod" />
        </label>
        <label className="field">
          <span>Encryption Passphrase</span>
          <Input type="password" value={s3Config.passphrase} onValueChange={(value) => setS3ConfigState((prev) => ({ ...prev, passphrase: value }))} placeholder="至少 16 位" />
        </label>
        <div className="actions-row">
          <Button type="button" color="primary" onPress={save}>
            保存
          </Button>
          <Button className="app-btn app-btn-ghost" type="button" variant="flat" onPress={() => void testConnection()} isDisabled={testing}>
            {testing ? "测试中..." : "测试连接"}
          </Button>
          <Button className="app-btn app-btn-ghost" type="button" variant="flat" onPress={() => void handleSyncToS3()} isDisabled={syncingToS3 || syncingFromS3}>
            {syncingToS3 ? "同步中..." : "同步到 S3"}
          </Button>
          <Button className="app-btn app-btn-ghost" type="button" variant="flat" onPress={() => void handleSyncFromS3()} isDisabled={syncingToS3 || syncingFromS3}>
            {syncingFromS3 ? "同步中..." : "从 S3 同步到本地"}
          </Button>
        </div>
        {saved && <p className="success-note">{saved}</p>}
        {testResult && <p className={testResult.startsWith("连接成功") ? "success-note" : "error-note"}>{testResult}</p>}
        {syncResult && <p className={syncResult.includes("成功") ? "success-note" : "error-note"}>{syncResult}</p>}
        </CardBody>
      </Card>
    </main>
  )
}
