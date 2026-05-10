import { useEffect, useState } from "react"
import { Button, Input, Modal, ModalBody, ModalContent, ModalHeader, Tab, Tabs } from "@heroui/react"
import LinkConfigsPage from "../pages/link-configs/index"
import EndpointPage from "../pages/endpoint/index"
import LinkRecordsPage from "../pages/link-records/index"
import SecurityPage from "../pages/security/index"
import StoragePage from "../pages/storage/index"
import {
  clearImportTokenFromUrl,
  S3_LOCK_CHANGED_EVENT,
  getMasterPasswordErrorMessage,
  hasAnyS3ConfigMaterial,
  hasEncryptedS3Config,
  hasLegacyPlainS3Config,
  hasPendingImportTokenInUrl,
  initializeMasterPassword,
  importFromUrlToken,
  lockS3ConfigSession,
  migrateLegacyPlainConfig,
  touchS3ConfigActivity,
  unlockS3Config,
} from "./storage-config"

type RouteKey = "configs" | "records" | "security" | "storage" | "endpoint"
type AuthMode = "none" | "import-unlock" | "unlock" | "setup"

const routes: Array<{ key: RouteKey; label: string; hash: string }> = [
  { key: "configs", label: "Configs", hash: "#/configs" },
  { key: "records", label: "Records", hash: "#/records" },
  { key: "security", label: "Security", hash: "#/security" },
  { key: "storage", label: "Storage", hash: "#/storage" },
  { key: "endpoint", label: "Endpoint", hash: "#/endpoint" },
]

function getRouteFromHash(): RouteKey {
  const hash = window.location.hash.trim()
  if (hash === "#/records") return "records"
  if (hash === "#/records/") return "records"
  if (hash === "#/records/new") return "records"
  if (hash === "#/security") return "security"
  if (hash === "#/security/") return "security"
  if (hash === "#/storage") return "storage"
  if (hash === "#/storage/") return "storage"
  if (hash === "#/endpoint") return "endpoint"
  if (hash === "#/endpoint/") return "endpoint"
  if (hash === "#/configs") return "configs"
  if (hash === "#/configs/") return "configs"
  return "records"
}

export function App() {
  const [route, setRoute] = useState<RouteKey>(() => getRouteFromHash())
  const [authMode, setAuthMode] = useState<AuthMode>("none")
  const [masterPassword, setMasterPassword] = useState("")
  const [confirmMasterPassword, setConfirmMasterPassword] = useState("")
  const [unlocking, setUnlocking] = useState(false)
  const [unlockError, setUnlockError] = useState("")
  const [importToken, setImportToken] = useState("")

  useEffect(() => {
    if (!window.location.hash.trim()) {
      window.location.hash = "#/records"
    }

    function onHashChange() {
      setRoute(getRouteFromHash())
    }

    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [])

  const safeRoute: RouteKey = routes.some((item) => item.key === route) ? route : "records"

  useEffect(() => {
    function detectAuthMode(token: string): AuthMode {
      if (token.trim()) return "import-unlock"
      if (hasAnyS3ConfigMaterial()) return "unlock"
      return "setup"
    }

    function syncUnlockState() {
      const params = new URLSearchParams(window.location.search)
      const token = params.get("import") || ""
      setImportToken(token)
      setAuthMode(detectAuthMode(token))
    }

    function onLockChanged() {
      syncUnlockState()
    }

    syncUnlockState()
    window.addEventListener(S3_LOCK_CHANGED_EVENT, onLockChanged)
    return () => window.removeEventListener(S3_LOCK_CHANGED_EVENT, onLockChanged)
  }, [])

  useEffect(() => {
    function onActivity() {
      touchS3ConfigActivity()
    }

    window.addEventListener("pointerdown", onActivity)
    window.addEventListener("keydown", onActivity)
    return () => {
      window.removeEventListener("pointerdown", onActivity)
      window.removeEventListener("keydown", onActivity)
    }
  }, [])

  async function handleGlobalUnlock() {
    setUnlockError("")
    setUnlocking(true)
    try {
      if (authMode === "setup") {
        if (!masterPassword.trim()) {
          throw new Error("master_password_required")
        }
        if (masterPassword !== confirmMasterPassword) {
          throw new Error("master_password_mismatch")
        }
        await initializeMasterPassword(masterPassword)
        setConfirmMasterPassword("")
      } else if (importToken) {
        await importFromUrlToken(importToken, masterPassword)
        clearImportTokenFromUrl()
        setImportToken("")
      }
      if (authMode !== "setup" && hasLegacyPlainS3Config() && !hasEncryptedS3Config()) {
        await migrateLegacyPlainConfig(masterPassword)
      }
      if (authMode !== "setup") {
        await unlockS3Config(masterPassword)
      }
      setMasterPassword("")
      setAuthMode("none")
    } catch (error) {
      if (authMode === "setup") {
        setUnlockError(`设置失败: ${getMasterPasswordErrorMessage(error, "请重试")}`)
      } else {
        setUnlockError(`解锁失败: ${getMasterPasswordErrorMessage(error, "请重试")}`)
      }
    } finally {
      setUnlocking(false)
    }
  }

  return (
    <div className="app dark">
      <div className="nav-wrap">
        <Tabs
          aria-label="Navigation"
          selectedKey={safeRoute}
          onSelectionChange={(key) => {
            const found = routes.find((item) => item.key === key)
            if (found) {
              window.location.hash = found.hash
            }
          }}
          variant="underlined"
          color="primary"
          className="nav"
        >
          {routes.map((item) => (
            <Tab key={item.key} title={item.label} />
          ))}
        </Tabs>
        <div className="nav-actions">
          <Button className="app-btn app-btn-ghost" type="button" variant="flat" onPress={lockS3ConfigSession}>
            锁定
          </Button>
        </div>
      </div>

      {authMode === "none" && route === "configs" && <LinkConfigsPage />}
      {authMode === "none" && route === "records" && <LinkRecordsPage />}
      {authMode === "none" && route === "security" && <SecurityPage />}
      {authMode === "none" && route === "storage" && <StoragePage />}
      {authMode === "none" && route === "endpoint" && <EndpointPage />}

      <Modal
        isOpen={authMode !== "none"}
        hideCloseButton
        isDismissable={false}
        isKeyboardDismissDisabled
        classNames={{
          backdrop: "app-modal-backdrop",
          base: "app-modal-content",
          header: "app-modal-header",
          body: "app-modal-body",
        }}
      >
        <ModalContent>
          <ModalHeader>{authMode === "setup" ? "设置 Master Password" : "输入 Master Password"}</ModalHeader>
          <ModalBody>
            {authMode === "setup" ? (
              <p className="section-lead">首次使用请先设置 Master Password，后续将用于 S3 配置加解密。</p>
            ) : (
              <p className="section-lead">检测到已保存 S3 配置，继续使用前请先解锁。</p>
            )}
            {hasPendingImportTokenInUrl() && <p className="info-note">检测到导入链接：输入 Master Password 后将自动导入此设备。</p>}
            <label className="field">
              <span>{authMode === "setup" ? "New Master Password" : "Master Password"}</span>
              <Input
                type="password"
                value={masterPassword}
                onValueChange={setMasterPassword}
                placeholder={authMode === "setup" ? "设置用于加解密的 Master Password" : "用于解锁 S3 配置密文"}
                isDisabled={unlocking}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !unlocking) {
                    event.preventDefault()
                    void handleGlobalUnlock()
                  }
                }}
              />
            </label>
            {authMode === "setup" && (
              <label className="field">
                <span>Confirm Master Password</span>
                <Input
                  type="password"
                  value={confirmMasterPassword}
                  onValueChange={setConfirmMasterPassword}
                  placeholder="再次输入 Master Password"
                  isDisabled={unlocking}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !unlocking) {
                      event.preventDefault()
                      void handleGlobalUnlock()
                    }
                  }}
                />
              </label>
            )}
            <div className="actions-row">
              <Button color="primary" onPress={() => void handleGlobalUnlock()} isLoading={unlocking} isDisabled={unlocking}>
                {authMode === "setup" ? "确认并进入" : "解锁"}
              </Button>
            </div>
            {unlockError && <p className="error-note">{unlockError}</p>}
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  )
}
