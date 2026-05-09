import { useEffect, useState } from "react"
import LinkConfigsPage from "../pages/link-configs/index"
import LinkRecordsPage from "../pages/link-records/index"
import NewLinkRecordPage from "../pages/link-records/new"
import CommandRunsPage from "../pages/command-runs/index"
import SettingsPage from "../pages/settings/index"

type RouteKey = "configs" | "records" | "new-record" | "runs" | "settings"

const routes: Array<{ key: RouteKey; label: string; hash: string }> = [
  { key: "configs", label: "Configs", hash: "#/configs" },
  { key: "records", label: "Records", hash: "#/records" },
  { key: "runs", label: "Runs", hash: "#/runs" },
  { key: "settings", label: "Settings", hash: "#/settings" },
]

function getRouteFromHash(): RouteKey {
  const hash = window.location.hash
  if (hash === "#/records") return "records"
  if (hash === "#/records/new") return "new-record"
  if (hash === "#/runs") return "runs"
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

  return (
    <div className="app">
      <nav className="nav">
        {routes.map((item) => (
          <a key={item.key} href={item.hash} className={route === item.key ? "active" : ""}>
            {item.label}
          </a>
        ))}
      </nav>

      {route === "configs" && <LinkConfigsPage />}
      {route === "records" && <LinkRecordsPage />}
      {route === "new-record" && <NewLinkRecordPage />}
      {route === "runs" && <CommandRunsPage />}
      {route === "settings" && <SettingsPage />}
    </div>
  )
}
