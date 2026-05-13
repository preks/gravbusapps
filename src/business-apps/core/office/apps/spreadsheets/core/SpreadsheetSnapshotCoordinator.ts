export type SpreadsheetSnapshotLifecycleOrigin = 'cell' | 'workbook'

export type SpreadsheetSnapshotLifecycleEvent =
  | { phase: 'checkpoint_scheduled'; origin: SpreadsheetSnapshotLifecycleOrigin }
  | { phase: 'checkpoint_settled'; ok: boolean; origin: SpreadsheetSnapshotLifecycleOrigin }

export interface SpreadsheetWorkbookSnapshotRecord {
  appId: string
  version: number
  updatedAt: string | null
  snapshot: Record<string, unknown> | null
}

export interface SpreadsheetSnapshotSaveRequest {
  appId: string
  version: number
  snapshot: Record<string, unknown>
  keepalive?: boolean
}

export interface SpreadsheetSnapshotSaveResult {
  appId: string
  version: number
  saved: boolean
}

export interface SpreadsheetCheckpointDescriptor {
  description: string
  activeSheetId: string
  flushPendingWrites?: boolean
}

export interface SpreadsheetSnapshotCoordinator {
  loadWorkbookSnapshot(appId: string): Promise<SpreadsheetWorkbookSnapshotRecord>
  saveWorkbookSnapshot(request: SpreadsheetSnapshotSaveRequest): Promise<SpreadsheetSnapshotSaveResult>
  createCheckpointWithFlush(description: string): Promise<unknown | null>
  notifyLifecycle?(event: SpreadsheetSnapshotLifecycleEvent): void
}
