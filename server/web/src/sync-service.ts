import { readLocalDb, writeLocalDb, type LocalDb } from "./local-db"
import { s3Store } from "./s3-storage"

function nowIso(): string {
  return new Date().toISOString()
}

export async function syncToS3(): Promise<{ message: string }> {
  const local = await readLocalDb()
  await s3Store.importAll({
    linkConfigs: local.linkConfigs,
    linkRecords: local.linkRecords,
    auditEvents: local.auditEvents,
  })
  await writeLocalDb({
    ...local,
    meta: {
      ...local.meta,
      lastSyncAt: nowIso(),
    },
  })
  return { message: "同步到 S3 成功（密文）" }
}

export async function syncFromS3(): Promise<{ message: string }> {
  const snapshot = await s3Store.exportAll()
  const current = await readLocalDb()
  const next: LocalDb = {
    version: 1,
    meta: {
      ...current.meta,
      updatedAt: nowIso(),
      lastSyncAt: nowIso(),
    },
    linkConfigs: snapshot.linkConfigs,
    linkRecords: snapshot.linkRecords,
    auditEvents: snapshot.auditEvents,
  }
  await writeLocalDb(next)
  return { message: "已从 S3 同步到本地（密文）" }
}
