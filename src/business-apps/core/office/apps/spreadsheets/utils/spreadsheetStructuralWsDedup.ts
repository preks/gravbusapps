/** Skip redundant workbook-structure WS applies after the originating client already applied REST. */

export type StructuralWsDedupToken =
  | { kind: 'sheet_created'; sheetId: string; version: number; expiresAt: number }
  | { kind: 'sheet_renamed'; sheetId: string; version: number; name: string; expiresAt: number }
  | { kind: 'sheet_visibility'; sheetId: string; version: number; hidden: boolean; expiresAt: number }
  | { kind: 'sheet_deleted'; sheetId: string; expiresAt: number }

export type WorkbookStructureWsEvent = {
  type: 'sheet_created' | 'sheet_renamed' | 'sheet_updated' | 'sheet_deleted'
  sheetId?: string
  sheet?: Record<string, unknown>
}

function normalizeSheetHidden(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  return undefined
}

export function shouldSkipRedundantStructuralWsEvent(
  token: StructuralWsDedupToken | null | undefined,
  event: WorkbookStructureWsEvent,
  nowMs: number
): boolean {
  if (!token || nowMs > token.expiresAt) return false

  if (event.type === 'sheet_created' && token.kind === 'sheet_created') {
    const id = event.sheetId ?? (typeof event.sheet?.id === 'string' ? event.sheet.id : '')
    const ver = Number(event.sheet?.version ?? NaN)
    return id === token.sheetId && Number.isFinite(ver) && ver === token.version
  }

  if ((event.type === 'sheet_renamed' || event.type === 'sheet_updated') && token.kind === 'sheet_renamed') {
    const id = event.sheetId ?? (typeof event.sheet?.id === 'string' ? event.sheet.id : '')
    const ver = Number(event.sheet?.version ?? NaN)
    const name = typeof event.sheet?.name === 'string' ? event.sheet.name.trim() : ''
    return id === token.sheetId && Number.isFinite(ver) && ver === token.version && name === token.name
  }

  if (event.type === 'sheet_updated' && token.kind === 'sheet_visibility') {
    const id = event.sheetId ?? (typeof event.sheet?.id === 'string' ? event.sheet.id : '')
    const ver = Number(event.sheet?.version ?? NaN)
    const hidden = normalizeSheetHidden(event.sheet?.hidden)
    return id === token.sheetId && Number.isFinite(ver) && ver === token.version && hidden === token.hidden
  }

  if (event.type === 'sheet_deleted' && token.kind === 'sheet_deleted') {
    const id = event.sheetId ?? ''
    return Boolean(id) && id === token.sheetId
  }

  return false
}

export function structuralWsDedupTtlExpiry(nowMs: number, ttlMs = 15000): number {
  return nowMs + ttlMs
}
