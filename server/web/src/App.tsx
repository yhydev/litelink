import { useEffect, useState } from "react"
import { Button, Input, Modal, ModalBody, ModalContent, ModalHeader, Tab, Tabs } from "@heroui/react"
import LinkConfigsPage from "../pages/link-configs/index"
import LinkRecordsPage from "../pages/link-records/index"
import NewLinkRecordPage from "../pages/link-records/new"
import SettingsPage from "../pages/settings/index"
import {
  S3_LOCK_CHANGED_EVENT,
  hasEncryptedS3Config,
  hasLegacyPlainS3Config,
  getMasterPasswordErrorMessage,
  migrateLegacyPlainConfig,
  shouldRequireMasterPassword,
  touchS3ConfigActivity,
  unlockS3Config,
} from "./storage-config"

type RouteKey = "configs" | "records" | "new-record" | "settings"

const routes: Array<{ key: RouteKey; label: string; hash: string }> = [
  { key: "configs", label: "Configs", hash: "#/configs" },
  { key: "records", label: "Records", hash: "#/records" },
  { key: "settings", label: "Settings", hash: "#/settings" },
]

function getRouteFromHash(): RouteKey {
  const hash = window.location.hash
  if (hash === "#/records") return "records"
  if (hash === "#/records/new") return "new-record"
  if (hash === "#/settings") return "settings"
  if (hash === "#/configs") return "configs"
  return "records"
}

export function App() {
  const [route, setRoute] = useState<RouteKey>(() => getRouteFromHash())
  const [requireUnlock, setRequireUnlock] = useState(() => shouldRequireMasterPassword())
  const [masterPassword, setMasterPassword] = useState("")
  const [unlocking, setUnlocking] = useState(false)
  const [unlockError, setUnlockError] = useState("")

  useEffect(() => {
    function onHashChange() {
      setRoute(getRouteFromHash())
    }

    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [])

  useEffect(() => {
    function syncUnlockState() {
      setRequireUnlock(shouldRequireMasterPassword())
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
      if (hasLegacyPlainS3Config() && !hasEncryptedS3Config()) {
        await migrateLegacyPlainConfig(masterPassword)
      }
      await unlockS3Config(masterPassword)
      setMasterPassword("")
      setRequireUnlock(false)
    } catch (error) {
      setUnlockError(`解锁失败: ${getMasterPasswordErrorMessage(error, "请重试")}`)
    } finally {
      setUnlocking(false)
    }
  }

  return (
    <div className="app dark">
      <Tabs
        aria-label="Navigation"
        selectedKey={route}
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

      {!requireUnlock && route === "configs" && <LinkConfigsPage />}
      {!requireUnlock && route === "records" && <LinkRecordsPage />}
      {!requireUnlock && route === "new-record" && <NewLinkRecordPage />}
      {!requireUnlock && route === "settings" && <SettingsPage />}

      <Modal
        isOpen={requireUnlock}
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
          <ModalHeader>输入 Master Password</ModalHeader>
          <ModalBody>
            <p className="section-lead">检测到已保存 S3 配置，继续使用前请先解锁。</p>
            <label className="field">
              <span>Master Password</span>
              <Input
                type="password"
                value={masterPassword}
                onValueChange={setMasterPassword}
                placeholder="用于解锁 S3 配置密文"
                isDisabled={unlocking}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !unlocking) {
                    event.preventDefault()
                    void handleGlobalUnlock()
                  }
                }}
              />
            </label>
            <div className="actions-row">
              <Button color="primary" onPress={() => void handleGlobalUnlock()} isLoading={unlocking} isDisabled={unlocking}>
                解锁
              </Button>
            </div>
            {unlockError && <p className="error-note">{unlockError}</p>}
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  )
}
