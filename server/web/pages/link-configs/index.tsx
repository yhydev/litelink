import { useEffect, useState } from "react"
import { Button, Chip, Modal, ModalBody, ModalContent, ModalHeader, Spinner, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react"
import { createLinkConfig, fetchLinkConfigs, updateLinkConfig, type LinkConfigPayload } from "../../services/link-config-api"
import { LinkConfigForm } from "../../components/link-config/LinkConfigForm"

interface ConfigItem extends LinkConfigPayload {
  id: string
  status: "active" | "inactive"
  updatedAt: string
}

export default function LinkConfigsPage() {
  const [items, setItems] = useState<ConfigItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<ConfigItem | null>(null)

  async function load() {
    setLoading(true)
    setError("")
    try {
      setItems((await fetchLinkConfigs()) as ConfigItem[])
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <main>
      <div className="page-head">
        <div>
          <h1>Link Configs</h1>
          <p className="section-lead">管理可复用配置模板（Schema + Command Template）。</p>
        </div>
        <div className="toolbar-right">
          <Button color="primary" type="button" onPress={() => setCreateOpen(true)}>
            新增配置
          </Button>
        </div>
      </div>

      <section className="card table-card">
        {error && <p className="error-note">{error}</p>}
        {loading ? (
          <div className="table-loading-wrap">
            <Spinner label="Loading..." color="primary" />
          </div>
        ) : (
          <Table aria-label="link config list" removeWrapper classNames={{ table: "app-table" }}>
            <TableHeader>
              <TableColumn>名称</TableColumn>
              <TableColumn>描述</TableColumn>
              <TableColumn>状态</TableColumn>
              <TableColumn>更新时间</TableColumn>
              <TableColumn>操作</TableColumn>
            </TableHeader>
            <TableBody items={items} emptyContent="暂无配置">
              {(item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="record-name">{item.name}</div>
                    <div className="row-note mono">{item.id}</div>
                  </TableCell>
                  <TableCell className="record-note">{item.description || "—"}</TableCell>
                  <TableCell>
                    <Chip size="sm" color={item.status === "active" ? "success" : "default"} variant="flat">{item.status}</Chip>
                  </TableCell>
                  <TableCell className="muted-cell">{new Date(item.updatedAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <Button className="app-btn app-btn-ghost" size="sm" variant="flat" onPress={() => setEditing(item)}>编辑</Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </section>

      <Modal
        isOpen={createOpen}
        onOpenChange={(open) => !open && setCreateOpen(false)}
        size="5xl"
        scrollBehavior="inside"
        classNames={{
          backdrop: "app-modal-backdrop",
          base: "app-modal-content",
          header: "app-modal-header",
          body: "app-modal-body",
        }}
      >
        <ModalContent>
          <ModalHeader>新增配置</ModalHeader>
          <ModalBody>
            <LinkConfigForm
              submitLabel="Create Config"
              onSubmit={async (payload) => {
                await createLinkConfig(payload)
                await load()
                setCreateOpen(false)
              }}
            />
          </ModalBody>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        size="5xl"
        scrollBehavior="inside"
        classNames={{
          backdrop: "app-modal-backdrop",
          base: "app-modal-content",
          header: "app-modal-header",
          body: "app-modal-body",
        }}
      >
        <ModalContent>
          <ModalHeader>编辑配置</ModalHeader>
          <ModalBody>
            {editing && <p className="modal-subtitle mono">{editing.id}</p>}
            <LinkConfigForm
              initialValue={{
                name: editing?.name ?? "",
                description: editing?.description ?? "",
                schema: editing?.schema ?? {},
                commandTemplate: editing?.commandTemplate ?? "",
              }}
              submitLabel="Save Changes"
              onSubmit={async (payload) => {
                if (!editing) return
                await updateLinkConfig(editing.id, payload)
                await load()
                setEditing(null)
              }}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </main>
  )
}
