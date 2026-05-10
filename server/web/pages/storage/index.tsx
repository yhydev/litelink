import { useEffect, useState } from "react"
import { Button, Card, CardBody, Divider, Input } from "@heroui/react"
import {
  EMPTY_S3_CONFIG,
  S3_LOCK_CHANGED_EVENT,
  getS3Config,
  isS3ConfigUnlocked,
  setS3Config,
  touchS3ConfigActivity,
  type S3Config,
} from "../../src/storage-config"
import { s3Store } from "../../src/s3-storage"
import { syncFromS3, syncToS3 } from "../../src/sync-service"

export default function StoragePage() {
  const [s3Config, setS3ConfigState] = useState<S3Config>(() => (isS3ConfigUnlocked() ? getS3Config() : { ...EMPTY_S3_CONFIG }))
  const [unlocked, setUnlocked] = useState(() => isS3ConfigUnlocked())
  const [saved, setSaved] = useState("")
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState("")
  const [syncingToS3, setSyncingToS3] = useState(false)
  const [syncingFromS3, setSyncingFromS3] = useState(false)
  const [syncResult, setSyncResult] = useState("")

  useEffect(() => {
    function onLockChanged() {
      const nextUnlocked = isS3ConfigUnlocked()
      setUnlocked(nextUnlocked)
      setS3ConfigState(nextUnlocked ? getS3Config() : { ...EMPTY_S3_CONFIG })
      setSaved("")
      setTestResult("")
      setSyncResult("")
    }

    window.addEventListener(S3_LOCK_CHANGED_EVENT, onLockChanged)
    return () => window.removeEventListener(S3_LOCK_CHANGED_EVENT, onLockChanged)
  }, [])

  async function save() {
    if (!isS3ConfigUnlocked()) {
      setSaved("请先解锁配置")
      return
    }
    await setS3Config({
      endpoint: s3Config.endpoint.trim(),
      region: s3Config.region.trim() || "auto",
      bucket: s3Config.bucket.trim(),
      accessKeyId: s3Config.accessKeyId.trim(),
      secretAccessKey: s3Config.secretAccessKey.trim(),
      prefix: s3Config.prefix.trim(),
      passphrase: s3Config.passphrase,
    })
    setSaved("已保存到 localStorage")
    touchS3ConfigActivity()
  }

  async function testConnection() {
    if (!isS3ConfigUnlocked()) {
      setTestResult("连接失败: 请先解锁配置")
      return
    }
    setTesting(true)
    setTestResult("")
    try {
      await save()
      const result = await s3Store.testConnection()
      setTestResult(result.message)
    } catch (error) {
      setTestResult(error instanceof Error ? `连接失败: ${error.message}` : "连接失败")
    } finally {
      setTesting(false)
    }
  }

  async function handleSyncToS3() {
    if (!isS3ConfigUnlocked()) {
      setSyncResult("同步失败: 请先解锁配置")
      return
    }
    setSyncingToS3(true)
    setSyncResult("")
    try {
      await save()
      const result = await syncToS3()
      setSyncResult(result.message)
    } catch (error) {
      setSyncResult(error instanceof Error ? `同步失败: ${error.message}` : "同步失败")
    } finally {
      setSyncingToS3(false)
    }
  }

  async function handleSyncFromS3() {
    if (!isS3ConfigUnlocked()) {
      setSyncResult("同步失败: 请先解锁配置")
      return
    }
    setSyncingFromS3(true)
    setSyncResult("")
    try {
      await save()
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
      <h1>Storage</h1>
      <p className="section-lead">仅包含 S3 配置、连接测试与同步操作。</p>
      <Card className="card">
        <CardBody className="list-grid">
          {!unlocked && <p className="info-note">未解锁状态下，S3 配置与同步操作不可用。</p>}
          <label className="field">
            <span>S3 Endpoint</span>
            <Input value={s3Config.endpoint} onValueChange={(value) => setS3ConfigState((prev) => ({ ...prev, endpoint: value }))} placeholder="https://&lt;accountid&gt;.r2.cloudflarestorage.com" isDisabled={!unlocked} />
          </label>
          <label className="field">
            <span>S3 Region</span>
            <Input value={s3Config.region} onValueChange={(value) => setS3ConfigState((prev) => ({ ...prev, region: value }))} placeholder="auto" isDisabled={!unlocked} />
          </label>
          <label className="field">
            <span>S3 Bucket</span>
            <Input value={s3Config.bucket} onValueChange={(value) => setS3ConfigState((prev) => ({ ...prev, bucket: value }))} placeholder="litelink-data" isDisabled={!unlocked} />
          </label>
          <label className="field">
            <span>Access Key ID</span>
            <Input value={s3Config.accessKeyId} onValueChange={(value) => setS3ConfigState((prev) => ({ ...prev, accessKeyId: value }))} isDisabled={!unlocked} />
          </label>
          <label className="field">
            <span>Secret Access Key</span>
            <Input type="password" value={s3Config.secretAccessKey} onValueChange={(value) => setS3ConfigState((prev) => ({ ...prev, secretAccessKey: value }))} isDisabled={!unlocked} />
          </label>
          <label className="field">
            <span>Object Prefix</span>
            <Input value={s3Config.prefix} onValueChange={(value) => setS3ConfigState((prev) => ({ ...prev, prefix: value }))} placeholder="litelink/prod" isDisabled={!unlocked} />
          </label>
          <label className="field">
            <span>Encryption Passphrase</span>
            <Input type="password" value={s3Config.passphrase} onValueChange={(value) => setS3ConfigState((prev) => ({ ...prev, passphrase: value }))} placeholder="至少 16 位" isDisabled={!unlocked} />
          </label>
          <Divider />
          <div className="actions-row">
            <Button type="button" color="primary" onPress={() => void save()} isDisabled={!unlocked}>
              保存
            </Button>
            <Button className="app-btn app-btn-ghost" type="button" variant="flat" onPress={() => void testConnection()} isDisabled={testing || !unlocked}>
              {testing ? "测试中..." : "测试连接"}
            </Button>
            <Button className="app-btn app-btn-ghost" type="button" variant="flat" onPress={() => void handleSyncToS3()} isDisabled={syncingToS3 || syncingFromS3 || !unlocked}>
              {syncingToS3 ? "同步中..." : "同步到 S3"}
            </Button>
            <Button className="app-btn app-btn-ghost" type="button" variant="flat" onPress={() => void handleSyncFromS3()} isDisabled={syncingToS3 || syncingFromS3 || !unlocked}>
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
