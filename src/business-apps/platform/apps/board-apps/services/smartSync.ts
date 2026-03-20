/**
 * Smart sync (upsert) for board rows.
 *
 * Matches incoming records to existing rows by entity ID (`data.id`).
 * - Existing match found → update row (only if data changed)
 * - No match → create new row
 * - Existing row has no match in incoming data → delete (stale)
 * - Rows without an entity ID (manually created) are left untouched
 */

import type { BoardRow } from '../types'

const BATCH = 5
const PAGE_LIMIT = 500

export interface SmartSyncResult {
  synced: number
  created: number
  updated: number
  deleted: number
}

interface BoardApi {
  getRows(
    boardId: string,
    sheetId: string,
    options?: { page?: number; limit?: number }
  ): Promise<{ items: BoardRow[]; total: number }>
  createRow(boardId: string, sheetId: string, data: Record<string, unknown>): Promise<BoardRow>
  updateRow(boardId: string, sheetId: string, rowId: string, data: Record<string, unknown>): Promise<BoardRow>
  deleteRow(boardId: string, sheetId: string, rowId: string): Promise<boolean>
}

async function fetchAllRows(api: BoardApi, boardId: string, sheetId: string): Promise<BoardRow[]> {
  const all: BoardRow[] = []
  let page = 1
  let hasMore = true
  while (hasMore) {
    const result = await api.getRows(boardId, sheetId, { page, limit: PAGE_LIMIT })
    all.push(...result.items)
    hasMore = result.items.length === PAGE_LIMIT
    page++
  }
  return all
}

function hasDataChanged(existing: Record<string, unknown>, incoming: Record<string, unknown>): boolean {
  for (const [key, value] of Object.entries(incoming)) {
    if (key === 'id') continue
    const existingVal = existing[key]
    if (String(existingVal ?? '') !== String(value ?? '')) return true
  }
  return false
}

export async function smartSyncRows(
  api: BoardApi,
  boardId: string,
  sheetId: string,
  incomingRecords: Record<string, unknown>[]
): Promise<SmartSyncResult> {
  const existing = await fetchAllRows(api, boardId, sheetId)

  const existingByEntityId = new Map<string, BoardRow>()
  for (const row of existing) {
    const entityId = String(row.data?.id ?? '')
    if (entityId) existingByEntityId.set(entityId, row)
  }

  const incomingIds = new Set<string>()
  const toCreate: Record<string, unknown>[] = []
  const toUpdate: { rowId: string; data: Record<string, unknown> }[] = []

  for (const record of incomingRecords) {
    const entityId = String(record.id ?? '')
    if (entityId) incomingIds.add(entityId)

    const matched = entityId ? existingByEntityId.get(entityId) : undefined
    if (matched) {
      if (hasDataChanged(matched.data, record)) {
        toUpdate.push({ rowId: matched.id, data: record })
      }
    } else {
      toCreate.push(record)
    }
  }

  const toDelete: string[] = []
  for (const [entityId, row] of existingByEntityId) {
    if (!incomingIds.has(entityId)) {
      toDelete.push(row.id)
    }
  }

  console.log(
    `[SmartSync] ${existing.length} existing, ${incomingRecords.length} incoming → ` +
      `${toUpdate.length} update, ${toCreate.length} create, ${toDelete.length} delete`
  )

  let updated = 0
  let created = 0
  let deleted = 0

  for (let i = 0; i < toUpdate.length; i += BATCH) {
    await Promise.all(
      toUpdate.slice(i, i + BATCH).map(({ rowId, data }) =>
        api
          .updateRow(boardId, sheetId, rowId, data)
          .then(() => {
            updated++
          })
          .catch(() => null)
      )
    )
  }

  for (let i = 0; i < toCreate.length; i += BATCH) {
    const results = await Promise.all(
      toCreate.slice(i, i + BATCH).map(rowData => api.createRow(boardId, sheetId, rowData).catch(() => null))
    )
    created += results.filter(Boolean).length
  }

  for (let i = 0; i < toDelete.length; i += BATCH) {
    await Promise.all(
      toDelete.slice(i, i + BATCH).map(rowId =>
        api.deleteRow(boardId, sheetId, rowId).then(ok => {
          if (ok) deleted++
        })
      )
    )
  }

  console.log(`[SmartSync] Done: updated=${updated}, created=${created}, deleted=${deleted}`)
  return { synced: updated + created, created, updated, deleted }
}
