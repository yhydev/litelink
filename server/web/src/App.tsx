import { useEffect, useState } from "react"
import { Tab, Tabs } from "@heroui/react"
import LinkConfigsPage from "../pages/link-configs/index"
import LinkRecordsPage from "../pages/link-records/index"
import NewLinkRecordPage from "../pages/link-records/new"
import SettingsPage from "../pages/settings/index"
import { touchS3ConfigActivity } from "./storage-config"

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

  useEffect(() => {
    function onHashChange() {
      setRoute(getRouteFromHash())
    }

    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
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

      {route === "configs" && <LinkConfigsPage />}
      {route === "records" && <LinkRecordsPage />}
      {route === "new-record" && <NewLinkRecordPage />}
      {route === "settings" && <SettingsPage />}
    </div>
  )
}
