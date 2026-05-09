import { S3Client, GetObjectCommand, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3"
import { assertS3ConfigReady, getS3Config, type S3Config } from "./storage-config"

const ENC_V1 = "enc_v1"

interface Envelope {
  v: typeof ENC_V1
  salt: string
  iv: string
  cipher: string
}

export interface LinkConfigRow {
  id: string
  name: string
  description: string | null
  schema_json: string
  command_template: string
  status: "active" | "inactive"
  created_by: string
  created_at: string
  updated_by: string
  updated_at: string
}

export interface LinkRecordRow {
  id: string
  link_config_id: string
  name: string
  note: string
  values_json: string
  status: "active" | "archived"
  created_by: string
  created_at: string
  updated_by: string
  updated_at: string
}

export interface CommandRunRow {
  id: string
  link_config_id: string
  link_record_id: string
  rendered_command: string
  dispatch_target: string
  request_status: "accepted" | "rejected" | "timeout"
  execution_status: "pending" | "running" | "succeeded" | "failed" | "cancelled"
  status_message: string | null
  requested_by: string
  requested_at: string
  completed_at: string | null
}

interface AuditEventRow {
  id: string
  actor_id: string
  action_type: string
  target_type: string
  target_id: string
  metadata_json: string | null
  created_at: string
}

interface TableData {
  linkConfigs: LinkConfigRow[]
  linkRecords: LinkRecordRow[]
  commandRuns: CommandRunRow[]
  auditEvents: AuditEventRow[]
}

const TABLE_FILES: Record<keyof TableData, string> = {
  linkConfigs: "link-configs.json.enc",
  linkRecords: "link-records.json.enc",
  commandRuns: "command-runs.json.enc",
  auditEvents: "audit-events.json.enc",
}

function b64(bytes: Uint8Array): string {
  let s = ""
  for (let i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

function unb64(text: string): Uint8Array {
  const bin = atob(text)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i)
  return out
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"])
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 210000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  )
}

async function encryptText(plain: string, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(passphrase, salt)
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain))
  const env: Envelope = { v: ENC_V1, salt: b64(salt), iv: b64(iv), cipher: b64(new Uint8Array(cipher)) }
  return JSON.stringify(env)
}

async function decryptText(encrypted: string, passphrase: string): Promise<string> {
  const env = JSON.parse(encrypted) as Partial<Envelope>
  if (env.v !== ENC_V1 || !env.salt || !env.iv || !env.cipher) throw new Error("invalid_encrypted_payload")
  const key = await deriveKey(passphrase, unb64(env.salt))
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(env.iv) }, key, unb64(env.cipher))
  return new TextDecoder().decode(plain)
}

function normalizePrefix(prefix: string): string {
  const trimmed = prefix.trim().replace(/^\/+|\/+$/g, "")
  return trimmed ? `${trimmed}/` : ""
}

function makeClient(cfg: S3Config): S3Client {
  return new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  })
}

async function objectToText(body: unknown): Promise<string> {
  if (body && typeof (body as { transformToString?: () => Promise<string> }).transformToString === "function") {
    return (body as { transformToString: () => Promise<string> }).transformToString()
  }
  throw new Error("unsupported_s3_response_body")
}

async function readTable<T extends keyof TableData>(table: T): Promise<TableData[T]> {
  const cfg = getS3Config()
  assertS3ConfigReady(cfg)
  const client = makeClient(cfg)
  const key = `${normalizePrefix(cfg.prefix)}${TABLE_FILES[table]}`
  try {
    const out = await client.send(new GetObjectCommand({ Bucket: cfg.bucket, Key: key }))
    const encrypted = await objectToText(out.Body)
    const plain = await decryptText(encrypted, cfg.passphrase)
    const parsed = JSON.parse(plain) as unknown
    return Array.isArray(parsed) ? (parsed as TableData[T]) : ([] as TableData[T])
  } catch (error) {
    const name = (error as { name?: string })?.name
    if (name === "NoSuchKey" || name === "NotFound") {
      return [] as TableData[T]
    }
    throw error
  }
}

async function writeTable<T extends keyof TableData>(table: T, rows: TableData[T]): Promise<void> {
  const cfg = getS3Config()
  assertS3ConfigReady(cfg)
  const client = makeClient(cfg)
  const key = `${normalizePrefix(cfg.prefix)}${TABLE_FILES[table]}`
  const encrypted = await encryptText(JSON.stringify(rows), cfg.passphrase)
  await client.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: encrypted,
      ContentType: "application/json",
    })
  )
}

export const s3Store = {
  async testConnection(): Promise<{ ok: true; message: string }> {
    const cfg = getS3Config()
    assertS3ConfigReady(cfg)
    const client = makeClient(cfg)
    await client.send(
      new ListObjectsV2Command({
        Bucket: cfg.bucket,
        MaxKeys: 1,
      })
    )
    return { ok: true, message: "连接成功：已通过 S3 API 访问 bucket" }
  },
  async listLinkConfigs(): Promise<LinkConfigRow[]> {
    const rows = await readTable("linkConfigs")
    return [...rows].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  },
  async getLinkConfigById(id: string): Promise<LinkConfigRow | null> {
    const rows = await readTable("linkConfigs")
    return rows.find((row) => row.id === id) ?? null
  },
  async getActiveLinkConfigById(id: string): Promise<LinkConfigRow | null> {
    const rows = await readTable("linkConfigs")
    return rows.find((row) => row.id === id && row.status === "active") ?? null
  },
  async createLinkConfig(row: LinkConfigRow): Promise<void> {
    const rows = await readTable("linkConfigs")
    rows.push(row)
    await writeTable("linkConfigs", rows)
  },
  async updateLinkConfig(id: string, updater: (row: LinkConfigRow) => LinkConfigRow): Promise<void> {
    const rows = await readTable("linkConfigs")
    const index = rows.findIndex((row) => row.id === id)
    if (index < 0) throw new Error("not_found")
    rows[index] = updater(rows[index])
    await writeTable("linkConfigs", rows)
  },

  async listLinkRecords(linkConfigId?: string): Promise<LinkRecordRow[]> {
    const rows = await readTable("linkRecords")
    const filtered = linkConfigId ? rows.filter((row) => row.link_config_id === linkConfigId) : rows
    return [...filtered].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  },
  async getLinkRecordById(id: string): Promise<LinkRecordRow | null> {
    const rows = await readTable("linkRecords")
    return rows.find((row) => row.id === id) ?? null
  },
  async createLinkRecord(row: LinkRecordRow): Promise<void> {
    const rows = await readTable("linkRecords")
    rows.push(row)
    await writeTable("linkRecords", rows)
  },
  async updateLinkRecord(id: string, updater: (row: LinkRecordRow) => LinkRecordRow): Promise<void> {
    const rows = await readTable("linkRecords")
    const index = rows.findIndex((row) => row.id === id)
    if (index < 0) throw new Error("not_found")
    rows[index] = updater(rows[index])
    await writeTable("linkRecords", rows)
  },

  async listCommandRuns(): Promise<CommandRunRow[]> {
    const rows = await readTable("commandRuns")
    return [...rows].sort((a, b) => b.requested_at.localeCompare(a.requested_at))
  },
  async createCommandRun(row: CommandRunRow): Promise<void> {
    const rows = await readTable("commandRuns")
    rows.push(row)
    await writeTable("commandRuns", rows)
  },
}
