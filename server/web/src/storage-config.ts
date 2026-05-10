export interface S3Config {
  endpoint: string
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  prefix: string
  passphrase: string
}

interface Envelope {
  v: "enc_v1"
  salt: string
  iv: string
  cipher: string
}

const LEGACY_STORAGE_KEY = "litelink.s3.config.v1"
const STORAGE_KEY = "litelink.s3.config.enc.v1"
const AUTO_LOCK_MINUTES_KEY = "litelink.security.autolock.minutes"
const DEFAULT_AUTO_LOCK_MINUTES = 15
const ENC_V1 = "enc_v1"
export const S3_LOCK_CHANGED_EVENT = "litelink:s3-lock-changed"

type S3LockState = "locked" | "unlocked"

let unlockedConfig: S3Config | null = null
let masterPasswordInMemory = ""
let unlockTimer: number | null = null
let lastActivityAt = 0

function emitLockState(state: S3LockState): void {
  window.dispatchEvent(new CustomEvent(S3_LOCK_CHANGED_EVENT, { detail: { state } }))
}

export const EMPTY_S3_CONFIG: S3Config = {
  endpoint: "",
  region: "auto",
  bucket: "",
  accessKeyId: "",
  secretAccessKey: "",
  prefix: "",
  passphrase: "",
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

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"])
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 210000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  )
}

async function encryptText(plain: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt)
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain))
  const env: Envelope = { v: ENC_V1, salt: b64(salt), iv: b64(iv), cipher: b64(new Uint8Array(cipher)) }
  return JSON.stringify(env)
}

async function decryptText(encrypted: string, password: string): Promise<string> {
  const env = JSON.parse(encrypted) as Partial<Envelope>
  if (env.v !== ENC_V1 || !env.salt || !env.iv || !env.cipher) throw new Error("invalid_encrypted_payload")
  const key = await deriveKey(password, unb64(env.salt))
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(env.iv) }, key, unb64(env.cipher))
    return new TextDecoder().decode(plain)
  } catch {
    throw new Error("unlock_failed")
  }
}

function normalizeConfig(parsed: Partial<S3Config>): S3Config {
  return {
    endpoint: parsed.endpoint ?? "",
    region: parsed.region ?? "auto",
    bucket: parsed.bucket ?? "",
    accessKeyId: parsed.accessKeyId ?? "",
    secretAccessKey: parsed.secretAccessKey ?? "",
    prefix: parsed.prefix ?? "",
    passphrase: parsed.passphrase ?? "",
  }
}

export function hasEncryptedS3Config(): boolean {
  return Boolean(localStorage.getItem(STORAGE_KEY))
}

export function hasLegacyPlainS3Config(): boolean {
  return Boolean(localStorage.getItem(LEGACY_STORAGE_KEY))
}

export function getS3Config(): S3Config {
  if (unlockedConfig) {
    return { ...unlockedConfig }
  }
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) {
      return { ...EMPTY_S3_CONFIG }
    }
    const parsed = JSON.parse(raw) as Partial<S3Config>
    return normalizeConfig(parsed)
  } catch {
    return { ...EMPTY_S3_CONFIG }
  }
}

export function isS3ConfigUnlocked(): boolean {
  return Boolean(unlockedConfig)
}

export function lockS3ConfigSession(): void {
  unlockedConfig = null
  masterPasswordInMemory = ""
  if (unlockTimer !== null) {
    window.clearTimeout(unlockTimer)
    unlockTimer = null
  }
  emitLockState("locked")
}

export function getAutoLockMinutes(): number {
  const raw = localStorage.getItem(AUTO_LOCK_MINUTES_KEY)
  const n = raw ? Number(raw) : DEFAULT_AUTO_LOCK_MINUTES
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_AUTO_LOCK_MINUTES
  return Math.floor(n)
}

function scheduleAutoLock(): void {
  if (!isS3ConfigUnlocked()) return
  if (unlockTimer !== null) {
    window.clearTimeout(unlockTimer)
    unlockTimer = null
  }
  const timeoutMs = getAutoLockMinutes() * 60 * 1000
  const delay = Math.max(1, timeoutMs - (Date.now() - lastActivityAt))
  unlockTimer = window.setTimeout(() => {
    if (Date.now() - lastActivityAt >= timeoutMs) {
      lockS3ConfigSession()
    } else {
      scheduleAutoLock()
    }
  }, delay)
}

export function touchS3ConfigActivity(): void {
  if (!isS3ConfigUnlocked()) return
  lastActivityAt = Date.now()
  scheduleAutoLock()
}

export async function unlockS3Config(masterPassword: string): Promise<S3Config> {
  if (!masterPassword.trim()) {
    throw new Error("master_password_required")
  }
  const encrypted = localStorage.getItem(STORAGE_KEY)
  if (!encrypted) {
    masterPasswordInMemory = masterPassword
    unlockedConfig = { ...EMPTY_S3_CONFIG }
    lastActivityAt = Date.now()
    scheduleAutoLock()
    emitLockState("unlocked")
    return { ...EMPTY_S3_CONFIG }
  }
  const plain = await decryptText(encrypted, masterPassword)
  const parsed = normalizeConfig(JSON.parse(plain) as Partial<S3Config>)
  unlockedConfig = parsed
  masterPasswordInMemory = masterPassword
  lastActivityAt = Date.now()
  scheduleAutoLock()
  emitLockState("unlocked")
  return { ...parsed }
}

export async function setS3Config(config: S3Config): Promise<void> {
  if (!masterPasswordInMemory.trim()) {
    throw new Error("config_locked")
  }
  const normalized = normalizeConfig(config)
  const encrypted = await encryptText(JSON.stringify(normalized), masterPasswordInMemory)
  localStorage.setItem(STORAGE_KEY, encrypted)
  unlockedConfig = normalized
  touchS3ConfigActivity()
}

export async function changeMasterPassword(currentPassword: string, nextPassword: string): Promise<void> {
  if (!currentPassword.trim()) {
    throw new Error("master_password_required")
  }
  if (!nextPassword.trim()) {
    throw new Error("new_master_password_required")
  }
  const encrypted = localStorage.getItem(STORAGE_KEY)
  if (!encrypted) {
    throw new Error("encrypted_config_not_found")
  }
  const plain = await decryptText(encrypted, currentPassword)
  const reEncrypted = await encryptText(plain, nextPassword)
  localStorage.setItem(STORAGE_KEY, reEncrypted)
  masterPasswordInMemory = nextPassword
  touchS3ConfigActivity()
}

export function getUnlockedS3ConfigOrThrow(): S3Config {
  if (!unlockedConfig) {
    throw new Error("config_locked")
  }
  touchS3ConfigActivity()
  return { ...unlockedConfig }
}

export async function migrateLegacyPlainConfig(masterPassword: string): Promise<boolean> {
  const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
  if (!raw) return false
  const parsed = normalizeConfig(JSON.parse(raw) as Partial<S3Config>)
  const encrypted = await encryptText(JSON.stringify(parsed), masterPassword)
  localStorage.setItem(STORAGE_KEY, encrypted)
  localStorage.removeItem(LEGACY_STORAGE_KEY)
  unlockedConfig = parsed
  masterPasswordInMemory = masterPassword
  lastActivityAt = Date.now()
  scheduleAutoLock()
  emitLockState("unlocked")
  return true
}

export function shouldRequireMasterPassword(): boolean {
  return (hasEncryptedS3Config() || hasLegacyPlainS3Config()) && !isS3ConfigUnlocked()
}

export function getMasterPasswordErrorMessage(error: unknown, fallback = "操作失败"): string {
  if (!(error instanceof Error)) return fallback
  switch (error.message) {
    case "master_password_required":
      return "请输入 Master Password"
    case "new_master_password_required":
      return "请输入新的 Master Password"
    case "unlock_failed":
      return "Master Password 不正确"
    case "encrypted_config_not_found":
      return "未找到可修改的加密配置"
    case "config_locked":
      return "当前会话已锁定，请先解锁"
    default:
      return error.message || fallback
  }
}

export function assertS3ConfigReady(config: S3Config): void {
  const missing: string[] = []
  if (!config.endpoint.trim()) missing.push("endpoint")
  if (!config.region.trim()) missing.push("region")
  if (!config.bucket.trim()) missing.push("bucket")
  if (!config.accessKeyId.trim()) missing.push("accessKeyId")
  if (!config.secretAccessKey.trim()) missing.push("secretAccessKey")
  if (!config.passphrase.trim()) missing.push("passphrase")
  if (missing.length > 0) {
    throw new Error(`请先在 Settings 配置 S3: ${missing.join(", ")}`)
  }
}
