import { SpreadsheetApiService } from '../services/SpreadsheetApiService'
import type { SpreadsheetReplayResponse } from './SpreadsheetCollaborationContract'

export async function fetchSpreadsheetSheetVersion(appId: string, sheetId: string): Promise<number> {
  const sheet = await SpreadsheetApiService.getSheet(appId, sheetId)
  return Number(sheet?.version ?? 0)
}

export async function fetchSpreadsheetSheetReplaySince(
  appId: string,
  sheetId: string,
  sinceVersion: number,
  trace?: {
    traceSessionId?: string
    sessionId?: string
    tabId?: string
  }
): Promise<SpreadsheetReplayResponse> {
  const raw = await SpreadsheetApiService.getSheetChangesSince(appId, sheetId, sinceVersion, trace)
  return {
    currentVersion: raw.currentVersion,
    requiresSnapshot: raw.requiresSnapshot,
    changes: raw.changes as unknown as SpreadsheetReplayResponse['changes']
  }
}
