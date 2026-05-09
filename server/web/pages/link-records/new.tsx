import { Button, Card, CardBody } from "@heroui/react"

export default function NewLinkRecordPage() {
  return (
    <main>
      <Card className="card">
        <CardBody>
          <h1>Use Link Records</h1>
          <p className="section-lead">新增和编辑已经迁移到 Link Records 页面中的弹窗入口。</p>
          <Button as="a" color="primary" href="#/records" className="w-fit">
            Go to Link Records
          </Button>
        </CardBody>
      </Card>
    </main>
  )
}
