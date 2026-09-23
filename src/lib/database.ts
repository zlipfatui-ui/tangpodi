import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { FinanceData } from './finance'
import { addDefaultTheme } from './data'

interface TangPhorDeeDB extends DBSchema {
  state: {
    key: 'finance'
    value: FinanceData
  }
}

let database: Promise<IDBPDatabase<TangPhorDeeDB>> | undefined

function getDatabase(): Promise<IDBPDatabase<TangPhorDeeDB>> {
  database ??= openDB<TangPhorDeeDB>('tang-phor-dee', 1, {
    upgrade(db) {
      db.createObjectStore('state')
    },
  })
  return database
}

export async function loadFinanceData(): Promise<FinanceData | undefined> {
  const db = await getDatabase()
  const data = await db.get('state', 'finance')
  if (!data) return undefined
  const normalized = addDefaultTheme(data)
  if (normalized !== data) await db.put('state', normalized, 'finance')
  return normalized
}

export async function saveFinanceData(data: FinanceData): Promise<void> {
  const db = await getDatabase()
  await db.put('state', data, 'finance')
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  return navigator.storage.persist()
}
