/**
 * Utilities for Excel Collection AI Summary
 *
 * Extract copy app IDs from completed rows and structure data for the summary prompt.
 */

import type { SpreadsheetColumn } from '../types/spreadsheet'
import { extractUrl } from './linkUtils'

/** Row data: cells keyed by column name */
export type RowData = Record<string, unknown>

/** Result of extracting copy info from rows */
export interface CopyRowInfo {
  copyAppId: string
  recipientName: string
  avatar?: string
  rowIndex: number
}

/**
 * Extract appId from a _copy_link URL.
 * Format: https://origin/platform/spreadsheets?appId=xxx&view=viewer (prod) or /platform/apps/spreadsheet-apps (dev)
 * Or plain URL string. Also handles markdown [title](url) format.
 */
export function extractAppIdFromCopyLink(value: unknown): string | null {
  if (value === null || value === undefined) return null

  let url: string
  if (typeof value === 'string') {
    const parsed = extractUrl(value)
    url = parsed ?? value
  } else {
    return null
  }

  if (!url.trim()) return null

  try {
    const parsedUrl = new URL(url.startsWith('/') ? `https://placeholder${url}` : url)
    const appId = parsedUrl.searchParams.get('appId')
    return appId ? decodeURIComponent(appId) : null
  } catch {
    return null
  }
}

/**
 * Extract copy app IDs and recipient info from completed rows.
 * Filters rows where _workflow_status === 'Completed' and _copy_link is present.
 */
export function extractCopyAppIdsFromRows(rows: RowData[], columns: SpreadsheetColumn[]): CopyRowInfo[] {
  const copyLinkCol = columns.find(c => c.name === '_copy_link')
  const recipientCol = columns.find(c => c.name === '_recipient_name')
  const avatarCol = columns.find(c => c.name === '_recipient_avatar')
  const statusCol = columns.find(c => c.name === '_workflow_status')

  if (!copyLinkCol) return []

  const result: CopyRowInfo[] = []

  rows.forEach((row, index) => {
    if ((row as Record<string, unknown>)._is_executive_summary === true) return

    const status = statusCol ? row[statusCol.name] : undefined
    const statusStr = String(status ?? '').toLowerCase() === 'completed'
    if (!statusStr) return

    const copyLinkValue = row[copyLinkCol.name]
    const appId = extractAppIdFromCopyLink(copyLinkValue)
    if (!appId) return

    const recipientName = recipientCol ? String(row[recipientCol.name] ?? 'Unknown') : 'Unknown'

    const avatar = avatarCol ? (row[avatarCol.name] as string | undefined) : undefined
    const avatarStr = typeof avatar === 'string' && avatar.trim() ? avatar : undefined

    result.push({ copyAppId: appId, recipientName, avatar: avatarStr, rowIndex: index })
  })

  return result
}
