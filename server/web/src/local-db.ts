import type { LinkConfigRow, LinkRecordRow } from "./s3-storage"
import { getS3Config } from "./storage-config"

const ENC_V1 = "enc_v1"
const DB_STORAGE_KEY = "litelink.db.enc.v1"
const DEVICE_ID_KEY = "litelink.device.id.v1"

interface Envelope {
  v: typeof ENC_V1
  salt: string
  iv: string
  cipher: string
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

export interface LocalDb {
  version: 1
  meta: {
    deviceId: string
    updatedAt: string
    lastSyncAt?: string
  }
  linkConfigs: LinkConfigRow[]
  linkRecords: LinkRecordRow[]
  auditEvents: AuditEventRow[]
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
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(env.iv) }, key, unb64(env.cipher))
    return new TextDecoder().decode(plain)
  } catch {
    throw new Error("decrypt_failed")
  }
}

function getDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_ID_KEY)
  if (existing) return existing
  const next = `dev_${crypto.randomUUID()}`
  localStorage.setItem(DEVICE_ID_KEY, next)
  return next
}

function nowIso(): string {
  return new Date().toISOString()
}

function emptyDb(): LocalDb {
  return {
    version: 1,
    meta: {
      deviceId: getDeviceId(),
      updatedAt: nowIso(),
    },
    linkConfigs: [],
    linkRecords: [],
    auditEvents: [],
  }
}

function getPassphrase(): string {
  const passphrase = getS3Config().passphrase
  if (!passphrase.trim()) {
    throw new Error("请先在 Settings 配置 Encryption Passphrase")
  }
  return passphrase
}

export async function readLocalDb(): Promise<LocalDb> {
  const encrypted = localStorage.getItem(DB_STORAGE_KEY)
  if (!encrypted) {
    return emptyDb()
  }
  const passphrase = getPassphrase()
  const plain = await decryptText(encrypted, passphrase)
  const parsed = JSON.parse(plain) as Partial<LocalDb>
  return {
    version: 1,
    meta: {
      deviceId: parsed.meta?.deviceId ?? getDeviceId(),
      updatedAt: parsed.meta?.updatedAt ?? nowIso(),
      lastSyncAt: parsed.meta?.lastSyncAt,
    },
    linkConfigs: Array.isArray(parsed.linkConfigs) ? parsed.linkConfigs : [],
    linkRecords: Array.isArray(parsed.linkRecords) ? parsed.linkRecords : [],
    auditEvents: Array.isArray(parsed.auditEvents) ? parsed.auditEvents : [],
  }
}

export async function writeLocalDb(db: LocalDb): Promise<void> {
  const passphrase = getPassphrase()
  const next: LocalDb = {
    ...db,
    version: 1,
    meta: {
      ...db.meta,
      deviceId: db.meta.deviceId || getDeviceId(),
      updatedAt: nowIso(),
    },
  }
  const encrypted = await encryptText(JSON.stringify(next), passphrase)
  localStorage.setItem(DB_STORAGE_KEY, encrypted)
}

export async function updateLocalDb(mutator: (db: LocalDb) => LocalDb): Promise<LocalDb> {
  const current = await readLocalDb()
  const next = mutator(current)
  await writeLocalDb(next)
  return readLocalDb()
}

export function getLocalDbStorageKey(): string {
  return DB_STORAGE_KEY
}
