import { useEffect, useState } from "react"
import { Button, Card, CardBody, Divider, Input } from "@heroui/react"
import {
  changeMasterPassword,
  createUrlImportToken,
  getMasterPasswordErrorMessage,
  isS3ConfigUnlocked,
  S3_LOCK_CHANGED_EVENT,
  touchS3ConfigActivity,
} from "../../src/storage-config"

export default function SecurityPage() {
  const [unlocked, setUnlocked] = useState(() => isS3ConfigUnlocked())
  const [currentMasterPassword, setCurrentMasterPassword] = useState("")
  const [nextMasterPassword, setNextMasterPassword] = useState("")
  const [confirmNextMasterPassword, setConfirmNextMasterPassword] = useState("")
  const [shareMasterPassword, setShareMasterPassword] = useState("")
  const [shareExpireMinutes, setShareExpireMinutes] = useState("10")
  const [shareUrl, setShareUrl] = useState("")
  const [passwordResult, setPasswordResult] = useState("")

  useEffect(() => {
    function onLockChanged() {
      setUnlocked(isS3ConfigUnlocked())
    }

    window.addEventListener(S3_LOCK_CHANGED_EVENT, onLockChanged)
    return () => window.removeEventListener(S3_LOCK_CHANGED_EVENT, onLockChanged)
  }, [])

  function buildImportUrl(token: string): string {
    const url = new URL(window.location.href)
    url.searchParams.set("import", token)
    return url.toString()
  }

  async function handleChangeMasterPassword() {
    setPasswordResult("")
    if (!unlocked) {
      setPasswordResult("修改失败: 请先完成全局解锁")
      return
    }
    if (nextMasterPassword !== confirmNextMasterPassword) {
      setPasswordResult("修改失败: 两次输入的新密码不一致")
      return
    }
    try {
      await changeMasterPassword(currentMasterPassword, nextMasterPassword)
      setCurrentMasterPassword("")
      setNextMasterPassword("")
      setConfirmNextMasterPassword("")
      setPasswordResult("Master Password 修改成功")
      touchS3ConfigActivity()
    } catch (error) {
      setPasswordResult(`修改失败: ${getMasterPasswordErrorMessage(error, "请重试")}`)
    }
  }

  async function handleGenerateImportUrl() {
    setPasswordResult("")
    setShareUrl("")
    if (!unlocked) {
      setPasswordResult("生成失败: 请先完成全局解锁")
      return
    }
    try {
      const minutes = Number(shareExpireMinutes)
      const token = await createUrlImportToken(shareMasterPassword, minutes)
      const url = buildImportUrl(token)
      setShareUrl(url)
      await navigator.clipboard.writeText(url)
      setPasswordResult("导入链接已生成并复制到剪贴板")
      touchS3ConfigActivity()
    } catch (error) {
      setPasswordResult(`生成失败: ${getMasterPasswordErrorMessage(error, "请重试")}`)
    }
  }

  return (
    <main>
      <h1>Security</h1>
      <p className="section-lead">仅包含 Master Password 相关操作。锁定入口已迁移到顶部导航右侧。</p>
      <Card className="card">
        <CardBody className="list-grid">
          {passwordResult && <p className={passwordResult.includes("成功") ? "success-note" : "error-note"}>{passwordResult}</p>}
          {!unlocked && <p className="info-note">未解锁状态下，当前页面操作不可用。</p>}
          <label className="field">
            <span>Current Master Password</span>
            <Input type="password" value={currentMasterPassword} onValueChange={setCurrentMasterPassword} placeholder="输入当前 Master Password" isDisabled={!unlocked} />
          </label>
          <label className="field">
            <span>New Master Password</span>
            <Input type="password" value={nextMasterPassword} onValueChange={setNextMasterPassword} placeholder="输入新的 Master Password" isDisabled={!unlocked} />
          </label>
          <label className="field">
            <span>Confirm New Master Password</span>
            <Input type="password" value={confirmNextMasterPassword} onValueChange={setConfirmNextMasterPassword} placeholder="再次输入新的 Master Password" isDisabled={!unlocked} />
          </label>
          <div className="actions-row">
            <Button type="button" color="primary" onPress={() => void handleChangeMasterPassword()} isDisabled={!unlocked}>
              修改 Master Password
            </Button>
          </div>
          <Divider />
          <label className="field">
            <span>Share Master Password</span>
            <Input type="password" value={shareMasterPassword} onValueChange={setShareMasterPassword} placeholder="用于生成导入链接" isDisabled={!unlocked} />
          </label>
          <label className="field">
            <span>Link Expire Minutes</span>
            <Input value={shareExpireMinutes} onValueChange={setShareExpireMinutes} placeholder="10" isDisabled={!unlocked} />
          </label>
          <div className="actions-row">
            <Button type="button" color="primary" onPress={() => void handleGenerateImportUrl()} isDisabled={!unlocked}>
              生成导入链接
            </Button>
          </div>
          {shareUrl && <p className="info-note mono">{shareUrl}</p>}
        </CardBody>
      </Card>
    </main>
  )
}
