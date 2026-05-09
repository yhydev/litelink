interface Props {
  code?: string
  detail?: string
}

const messageMap: Record<string, string> = {
  invalid_schema: "Schema 格式无效，请检查 JSON Schema 结构。",
  invalid_template: "命令模板变量与 Schema 字段不匹配。",
  unresolved_variables: "命令存在未解析变量，请补全记录字段。",
  dispatch_failed: "本地下发失败，请确认本地客户端在线并可访问。",
  link_config_not_found_or_inactive: "所选配置不存在或已停用。",
}

export function ErrorNotice({ code, detail }: Props) {
  if (!code && !detail) {
    return null
  }

  return (
    <div role="alert" className="error-notice">
      <strong>操作失败：</strong>
      <span>{code ? messageMap[code] ?? code : "请求失败"}</span>
      {detail && <pre>{detail}</pre>}
    </div>
  )
}
