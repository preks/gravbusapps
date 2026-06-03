import type {
  SpreadsheetBulkRemoteApplyMeta,
  AuthoritativeGridReapplyTarget,
  SpreadsheetSessionDiffProjectionMode
} from '../core/SpreadsheetCollaborationContract'

export interface CommitLocalSheetDataOptions {
  persisted?: boolean
  syncGrid?: boolean
  sessionDiffProjectionMode?: SpreadsheetSessionDiffProjectionMode
  publishParent?: boolean
  peerAuthoritative?: boolean
  replaceSheetVersion?: number
  authoritativeGridRegion?: AuthoritativeGridReapplyTarget
  authoritativeApplyMeta?: SpreadsheetBulkRemoteApplyMeta | null
}
