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

interface UrlImportPayload {
  v: 1
  exp: number
  cipher: string
}

interface UrlImportData {
  encryptedConfig: string
  localEndpoint: string
}

const LEGACY_STORAGE_KEY = "litelink.s3.config.v1"
const STORAGE_KEY = "litelink.s3.config.enc.v1"
const AUTO_LOCK_MINUTES_KEY = "litelink.security.autolock.minutes"
const LOCAL_ENDPOINT_STORAGE_KEY = "litelink.localEndpoint"
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

function b64urlEncode(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ""
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function b64urlDecode(token: string): string {
  const normalized = token.replace(/-/g, "+").replace(/_/g, "/")
  const pad = normalized.length % 4
  const padded = normalized + (pad === 0 ? "" : "=".repeat(4 - pad))
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
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

export function hasAnyS3ConfigMaterial(): boolean {
  return hasEncryptedS3Config() || hasLegacyPlainS3Config()
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

export async function initializeMasterPassword(masterPassword: string): Promise<void> {
  if (!masterPassword.trim()) {
    throw new Error("master_password_required")
  }
  const encrypted = await encryptText(JSON.stringify(EMPTY_S3_CONFIG), masterPassword)
  localStorage.setItem(STORAGE_KEY, encrypted)
  localStorage.removeItem(LEGACY_STORAGE_KEY)
  masterPasswordInMemory = masterPassword
  unlockedConfig = { ...EMPTY_S3_CONFIG }
  lastActivityAt = Date.now()
  scheduleAutoLock()
  emitLockState("unlocked")
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

export function hasPendingImportTokenInUrl(): boolean {
  const params = new URLSearchParams(window.location.search)
  return Boolean(params.get("import"))
}

export function clearImportTokenFromUrl(): void {
  const url = new URL(window.location.href)
  if (!url.searchParams.has("import")) return
  url.searchParams.delete("import")
  window.history.replaceState(null, "", url.toString())
}

export async function createUrlImportToken(masterPassword: string, expiresInMinutes: number): Promise<string> {
  if (!masterPassword.trim()) {
    throw new Error("master_password_required")
  }
  if (!Number.isFinite(expiresInMinutes) || expiresInMinutes <= 0) {
    throw new Error("invalid_import_expiry")
  }
  const encryptedConfig = localStorage.getItem(STORAGE_KEY)
  if (!encryptedConfig) {
    throw new Error("encrypted_config_not_found")
  }
  const localEndpoint = localStorage.getItem(LOCAL_ENDPOINT_STORAGE_KEY) || ""
  const importData: UrlImportData = { encryptedConfig, localEndpoint }
  const cipher = await encryptText(JSON.stringify(importData), masterPassword)
  const payload: UrlImportPayload = {
    v: 1,
    exp: Date.now() + Math.floor(expiresInMinutes * 60 * 1000),
    cipher,
  }
  const plain = JSON.stringify(payload)
  return b64urlEncode(plain)
}

export async function importFromUrlToken(token: string, masterPassword: string): Promise<void> {
  if (!masterPassword.trim()) {
    throw new Error("master_password_required")
  }
  if (!token.trim()) {
    throw new Error("invalid_import_token")
  }
  let payload: UrlImportPayload
  try {
    payload = JSON.parse(b64urlDecode(token)) as UrlImportPayload
  } catch {
    throw new Error("invalid_import_token")
  }
  if (payload.v !== 1 || !payload.cipher || typeof payload.exp !== "number") {
    throw new Error("invalid_import_payload")
  }
  if (Date.now() > payload.exp) {
    throw new Error("import_token_expired")
  }
  let importData: UrlImportData
  try {
    const plain = await decryptText(payload.cipher, masterPassword)
    importData = JSON.parse(plain) as UrlImportData
  } catch {
    throw new Error("unlock_failed")
  }
  if (!importData.encryptedConfig) {
    throw new Error("invalid_import_payload")
  }
  localStorage.setItem(STORAGE_KEY, importData.encryptedConfig)
  localStorage.removeItem(LEGACY_STORAGE_KEY)
  if (typeof importData.localEndpoint === "string" && importData.localEndpoint.trim()) {
    localStorage.setItem(LOCAL_ENDPOINT_STORAGE_KEY, importData.localEndpoint)
  }
}

export function getMasterPasswordErrorMessage(error: unknown, fallback = "操作失败"): string {
  if (!(error instanceof Error)) return fallback
  switch (error.message) {
    case "master_password_required":
      return "请输入 Master Password"
    case "new_master_password_required":
      return "请输入新的 Master Password"
    case "master_password_mismatch":
      return "两次输入的 Master Password 不一致"
    case "unlock_failed":
      return "Master Password 不正确"
    case "encrypted_config_not_found":
      return "未找到可修改的加密配置"
    case "invalid_import_expiry":
      return "导入链接有效期设置不正确"
    case "invalid_import_token":
      return "导入链接格式无效"
    case "invalid_import_payload":
      return "导入链接内容无效"
    case "import_token_expired":
      return "导入链接已过期"
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
