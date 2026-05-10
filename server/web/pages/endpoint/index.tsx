import { useState } from "react"
import { Button, Card, CardBody, Input } from "@heroui/react"
import { DEFAULT_ENDPOINT, getLocalEndpoint, setLocalEndpoint } from "../../src/local-endpoint"

export default function EndpointPage() {
  const [localEndpoint, setLocalEndpointState] = useState(() => getLocalEndpoint())
  const [saved, setSaved] = useState("")

  function saveEndpoint() {
    const value = localEndpoint.trim() || DEFAULT_ENDPOINT
    setLocalEndpoint(value)
    setLocalEndpointState(value)
    setSaved("本地连接地址已保存")
  }

  return (
    <main>
      <h1>Endpoint</h1>
      <p className="section-lead">配置连接本地执行器的地址，Records 页的“连接”操作会读取这里的值。</p>
      <Card className="card">
        <CardBody className="list-grid">
          <label className="field">
            <span>Local Endpoint</span>
            <Input value={localEndpoint} onValueChange={setLocalEndpointState} placeholder={DEFAULT_ENDPOINT} />
          </label>
          <div className="actions-row">
            <Button type="button" color="primary" onPress={saveEndpoint}>
              保存
            </Button>
          </div>
          {saved && <p className="success-note">{saved}</p>}
        </CardBody>
      </Card>
    </main>
  )
}
