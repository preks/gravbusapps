import {
  SpreadsheetCollaborationManager,
  type CollaborationCallbacks
} from '../../services/SpreadsheetCollaborationManager'
import { UniverRemoteTransactionRunner } from '../../core/univerRemoteTransactionRunner'
import type { SpreadsheetRemoteTransactionPlan } from '../../core/spreadsheetRemoteTransaction'

export const defaultCollabTestCallbacks = (): CollaborationCallbacks => ({
  getActiveSheetId: () => 'sheet-1',
  getColumns: () => [],
  getLocalSheetData: () => [],
  getBackendRowIdForUiRowId: () => undefined,
  commitLocalSheetData: jest.fn(),
  commitSheetData: jest.fn(),
  applyRemoteCellUpdate: jest.fn(),
  onVersionUpdate: jest.fn(),
  scheduleSheetVersionRefreshFromApi: jest.fn(),
  scheduleRemoteStructuralResync: jest.fn()
})

/**
 * Wires real {@link UniverRemoteTransactionRunner} so HTTP/catch-up replay exercises the committed path.
 */
export function createManagerWithCommittedReplay(overrides: Partial<CollaborationCallbacks> = {}): {
  manager: SpreadsheetCollaborationManager
  applyRemoteCellUpdate: jest.Mock
  applyRemoteCellUpdatesBulk: jest.Mock
} {
  const applyRemoteCellUpdate = jest.fn()
  const applyRemoteCellUpdatesBulk = jest.fn()
  const runRemoteTransaction = (plan: Extract<SpreadsheetRemoteTransactionPlan, { ok: true }>) => {
    const runner = new UniverRemoteTransactionRunner({
      applyRemoteCellUpdate,
      applyRemoteCellUpdatesBulk,
      applyRemoteClearAllRange: overrides.applyRemoteClearAllRange,
      applyRemoteClearFormatRange: overrides.applyRemoteClearFormatRange,
      applyRemoteSpreadsheetFeatureOperation: overrides.applyRemoteSpreadsheetFeatureOperation,
      runWithRemoteApplyGuard: apply => apply()
    })
    return runner.run(plan)
  }

  const manager = new SpreadsheetCollaborationManager({
    ...defaultCollabTestCallbacks(),
    applyRemoteCellUpdate,
    applyRemoteCellUpdatesBulk,
    runRemoteTransaction,
    ...overrides
  })

  return { manager, applyRemoteCellUpdate, applyRemoteCellUpdatesBulk }
}
