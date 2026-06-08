import type { SpreadsheetSheet } from '../types'
import { resolveReconciledSheetId } from './reconcileTemporarySheetId'

export type SpreadsheetKnownSheetRoutingOutcome =
  | 'matched'
  | 'warned_and_submitted'
  | 'warned_and_dropped'
  | 'dropped_unknown_sheet'

export interface SpreadsheetKnownSheetRoutingDecision {
  targetSheetId: string
  canonicalActiveSheetId: string
  knownTargetSheet: boolean
  hasRoutingMismatch: boolean
  outcome: SpreadsheetKnownSheetRoutingOutcome
}

export function resolveSpreadsheetKnownSheetRouting(params: {
  producerSheetId: string
  reactActiveSheetId: string
  sheets: Pick<SpreadsheetSheet, 'id'>[]
  aliases: ReadonlyMap<string, string>
}): SpreadsheetKnownSheetRoutingDecision {
  const targetSheetId = resolveReconciledSheetId(params.producerSheetId, params.aliases)
  const canonicalActiveSheetId = resolveReconciledSheetId(params.reactActiveSheetId, params.aliases)
  const knownTargetSheet = params.sheets.some(
    sheet => resolveReconciledSheetId(sheet.id, params.aliases) === targetSheetId
  )
  const hasRoutingMismatch =
    params.reactActiveSheetId !== '' && canonicalActiveSheetId !== '' && canonicalActiveSheetId !== targetSheetId

  const outcome = !knownTargetSheet
    ? hasRoutingMismatch
      ? 'warned_and_dropped'
      : 'dropped_unknown_sheet'
    : hasRoutingMismatch
      ? 'warned_and_submitted'
      : 'matched'

  return {
    targetSheetId,
    canonicalActiveSheetId,
    knownTargetSheet,
    hasRoutingMismatch,
    outcome
  }
}
