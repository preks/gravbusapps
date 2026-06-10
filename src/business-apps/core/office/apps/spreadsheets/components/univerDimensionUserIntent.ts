import type { MutableRefObject } from 'react'

export type SpreadsheetDimensionIntentKind = 'row' | 'column'

export type SpreadsheetDimensionUserIntent = {
  sheetId: string
  kind: SpreadsheetDimensionIntentKind
  markedAt: number
}

export const UNIVER_SET_ROW_AUTO_HEIGHT_COMMAND = 'sheet.command.set-row-is-auto-height'
export const UNIVER_SET_COL_AUTO_WIDTH_COMMAND = 'sheet.command.set-col-auto-width'
export const UNIVER_ROW_AUTO_HEIGHT_MUTATION = 'sheet.mutation.set-worksheet-row-auto-height'
export const UNIVER_COL_WIDTH_MUTATION = 'sheet.mutation.set-worksheet-col-width'

export const UNIVER_MANUAL_DIMENSION_COMMAND_IDS = new Set([
  'sheet.command.delta-row-height',
  'sheet.command.set-row-height',
  'sheet.command.delta-column-width',
  'sheet.command.set-column-width',
  'sheet.command.set-worksheet-col-width'
])

const DIMENSION_USER_INTENT_TTL_MS = 3_000

const COMMAND_KIND_BY_ID: Record<string, SpreadsheetDimensionIntentKind> = {
  [UNIVER_SET_ROW_AUTO_HEIGHT_COMMAND]: 'row',
  [UNIVER_SET_COL_AUTO_WIDTH_COMMAND]: 'column',
  [UNIVER_ROW_AUTO_HEIGHT_MUTATION]: 'row',
  [UNIVER_COL_WIDTH_MUTATION]: 'column',
  'sheet.command.delta-row-height': 'row',
  'sheet.command.set-row-height': 'row',
  'sheet.command.delta-column-width': 'column',
  'sheet.command.set-column-width': 'column',
  'sheet.command.set-worksheet-col-width': 'column'
}

function readDimensionUserIntent(
  ref: MutableRefObject<SpreadsheetDimensionUserIntent | null>,
  sheetId: string,
  kind: SpreadsheetDimensionIntentKind,
  now: number,
  consume: boolean
): SpreadsheetDimensionIntentKind | null {
  const pending = ref.current
  if (!pending || pending.sheetId !== sheetId || pending.kind !== kind) return null
  if (now - pending.markedAt > DIMENSION_USER_INTENT_TTL_MS) {
    ref.current = null
    return null
  }
  if (consume) {
    ref.current = null
  }
  return pending.kind
}

export function resolveDimensionIntentKindFromCommandId(commandId: string): SpreadsheetDimensionIntentKind | null {
  return COMMAND_KIND_BY_ID[commandId.toLowerCase()] ?? null
}

export function isAutoFitDimensionCommand(commandId: string): boolean {
  return commandId === UNIVER_SET_ROW_AUTO_HEIGHT_COMMAND || commandId === UNIVER_SET_COL_AUTO_WIDTH_COMMAND
}

export function isDimensionApplyMutation(commandId: string): boolean {
  return commandId === UNIVER_ROW_AUTO_HEIGHT_MUTATION || commandId === UNIVER_COL_WIDTH_MUTATION
}

export function isManualDimensionCommand(commandId: string): boolean {
  return UNIVER_MANUAL_DIMENSION_COMMAND_IDS.has(commandId)
}

export function markDimensionUserIntent(
  ref: MutableRefObject<SpreadsheetDimensionUserIntent | null>,
  sheetId: string,
  kind: SpreadsheetDimensionIntentKind,
  now = Date.now()
): void {
  if (!sheetId) return
  ref.current = { sheetId, kind, markedAt: now }
}

export function peekDimensionUserIntent(
  ref: MutableRefObject<SpreadsheetDimensionUserIntent | null>,
  sheetId: string,
  kind: SpreadsheetDimensionIntentKind,
  now = Date.now()
): SpreadsheetDimensionIntentKind | null {
  return readDimensionUserIntent(ref, sheetId, kind, now, false)
}

export function consumeDimensionUserIntent(
  ref: MutableRefObject<SpreadsheetDimensionUserIntent | null>,
  sheetId: string,
  kind: SpreadsheetDimensionIntentKind,
  now = Date.now()
): SpreadsheetDimensionIntentKind | null {
  return readDimensionUserIntent(ref, sheetId, kind, now, true)
}

export function clearDimensionUserIntent(
  ref: MutableRefObject<SpreadsheetDimensionUserIntent | null>,
  sheetId?: string
): void {
  const pending = ref.current
  if (!pending) return
  if (sheetId && pending.sheetId !== sheetId) return
  ref.current = null
}
