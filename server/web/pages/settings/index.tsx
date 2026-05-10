import { useState } from "react"
import { Button, Card, CardBody, Divider, Input } from "@heroui/react"
import { DEFAULT_ENDPOINT, getLocalEndpoint, setLocalEndpoint } from "../../src/local-endpoint"
import {
  EMPTY_S3_CONFIG,
  getS3Config,
  hasEncryptedS3Config,
  hasLegacyPlainS3Config,
  isS3ConfigUnlocked,
  lockS3ConfigSession,
  migrateLegacyPlainConfig,
  setS3Config,
  touchS3ConfigActivity,
  unlockS3Config,
  type S3Config,
} from "../../src/storage-config"
import { s3Store } from "../../src/s3-storage"
import { syncFromS3, syncToS3 } from "../../src/sync-service"

export default function SettingsPage() {
  const [localEndpoint, setLocalEndpointState] = useState(() => getLocalEndpoint())
  const [s3Config, setS3ConfigState] = useState<S3Config>(() => (isS3ConfigUnlocked() ? getS3Config() : { ...EMPTY_S3_CONFIG }))
  const [masterPassword, setMasterPassword] = useState("")
  const [unlocked, setUnlocked] = useState(() => isS3ConfigUnlocked())
  const [unlockResult, setUnlockResult] = useState("")
  const [saved, setSaved] = useState("")
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState("")
  const [syncingToS3, setSyncingToS3] = useState(false)
  const [syncingFromS3, setSyncingFromS3] = useState(false)
  const [syncResult, setSyncResult] = useState("")

  async function save() {
    if (!unlocked) {
      setSaved("请先解锁配置")
      return
    }
    const value = localEndpoint.trim() || DEFAULT_ENDPOINT
    setLocalEndpoint(value)
    setLocalEndpointState(value)
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

  async function handleUnlock() {
    setUnlockResult("")
    try {
      if (hasLegacyPlainS3Config() && !hasEncryptedS3Config()) {
        await migrateLegacyPlainConfig(masterPassword)
      }
      const cfg = await unlockS3Config(masterPassword)
      setS3ConfigState(cfg)
      setUnlocked(true)
      setUnlockResult("解锁成功")
    } catch (error) {
      setUnlocked(false)
      setS3ConfigState({ ...EMPTY_S3_CONFIG })
      setUnlockResult(error instanceof Error ? `解锁失败: ${error.message}` : "解锁失败")
    }
  }

  function handleLock() {
    lockS3ConfigSession()
    setUnlocked(false)
    setS3ConfigState({ ...EMPTY_S3_CONFIG })
    setSaved("")
    setTestResult("")
    setSyncResult("")
    setUnlockResult("已锁定")
  }

  async function testConnection() {
    if (!unlocked) {
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
    if (!unlocked) {
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
    if (!unlocked) {
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
      <h1>Settings</h1>
      <p className="section-lead">进入页面请先输入 Master Password 解锁（仅保存在内存会话）。后续读取与保存都会使用该口令进行加解密。</p>
      <Card className="card">
        <CardBody className="list-grid">
        <label className="field">
          <span>Master Password</span>
          <Input type="password" value={masterPassword} onValueChange={setMasterPassword} placeholder="用于解锁 S3 配置密文" />
        </label>
        <div className="actions-row">
          <Button type="button" color="primary" onPress={() => void handleUnlock()}>
            解锁
          </Button>
          <Button className="app-btn app-btn-ghost" type="button" variant="flat" onPress={handleLock}>
            锁定
          </Button>
        </div>
        {unlockResult && <p className={unlockResult.includes("成功") || unlockResult.includes("已锁定") ? "success-note" : "error-note"}>{unlockResult}</p>}
        {!unlocked && <p className="info-note">未解锁状态下，S3 配置与同步操作不可用。</p>}
        <Divider />
        <label className="field">
          <span>Local Endpoint</span>
          <Input value={localEndpoint} onValueChange={setLocalEndpointState} placeholder={DEFAULT_ENDPOINT} />
        </label>
        <Divider />
        <label className="field">
          <span>S3 Endpoint</span>
          <Input value={s3Config.endpoint} onValueChange={(value) => setS3ConfigState((prev) => ({ ...prev, endpoint: value }))} placeholder="https://<accountid>.r2.cloudflarestorage.com" isDisabled={!unlocked} />
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
