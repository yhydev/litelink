export interface S3Config {
  endpoint: string
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  prefix: string
  passphrase: string
}

const STORAGE_KEY = "litelink.s3.config.v1"

export const EMPTY_S3_CONFIG: S3Config = {
  endpoint: "",
  region: "auto",
  bucket: "",
  accessKeyId: "",
  secretAccessKey: "",
  prefix: "",
  passphrase: "",
}

export function getS3Config(): S3Config {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { ...EMPTY_S3_CONFIG }
    }
    const parsed = JSON.parse(raw) as Partial<S3Config>
    return {
      endpoint: parsed.endpoint ?? "",
      region: parsed.region ?? "auto",
      bucket: parsed.bucket ?? "",
      accessKeyId: parsed.accessKeyId ?? "",
      secretAccessKey: parsed.secretAccessKey ?? "",
      prefix: parsed.prefix ?? "",
      passphrase: parsed.passphrase ?? "",
    }
  } catch {
    return { ...EMPTY_S3_CONFIG }
  }
}

export function setS3Config(config: S3Config): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
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
