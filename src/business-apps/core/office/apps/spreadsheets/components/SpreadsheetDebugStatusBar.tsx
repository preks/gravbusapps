interface SnapshotDebugInfo {
  lastSuccessAt: number | null
  lastFailAt: number | null
  successCount: number
  failCount: number
}

interface SocketDebugInfo {
  connectCount: number
  disconnectCount: number
  reconnectCount: number
  lastDisconnectReason: string
  transport: string
  socketId: string
  connectErrorCount: number
}

type CollaborationHealth = 'connected' | 'failed' | 'reconnecting'

export interface SpreadsheetDebugStatusBarProps {
  testId: string
  snapshotDebugInfo: SnapshotDebugInfo
  snapshotConflicts: number
  snapshotAttempts: number
  socketDebugInfo: SocketDebugInfo
  collaborationHealth: CollaborationHealth
  isPersistSaving: boolean
  hasLocalDirty: boolean
  lastPersistedAt: string | number | Date | null
  persistError: string | null
  isVersionSaving: boolean
  hasUnsavedChanges: boolean
  canEdit: boolean
  participantCount: number
}

export function SpreadsheetDebugStatusBar({
  testId,
  snapshotDebugInfo,
  snapshotConflicts,
  snapshotAttempts,
  socketDebugInfo,
  collaborationHealth,
  isPersistSaving,
  hasLocalDirty,
  lastPersistedAt,
  persistError,
  isVersionSaving,
  hasUnsavedChanges,
  canEdit,
  participantCount
}: SpreadsheetDebugStatusBarProps) {
  return (
    <div
      className="gba:fixed gba:bottom-0 gba:left-0 gba:right-0 gba:z-50 gba:flex gba:flex-col gba:gap-0 gba:bg-zinc-900 gba:px-3 gba:py-1 gba:text-[11px] gba:font-mono gba:text-zinc-300"
      data-testid={`${testId}-snapshot-debug-bar`}
    >
      <div className="gba:flex gba:items-center gba:gap-4">
        <span className="gba:font-semibold gba:text-amber-400">Snapshot</span>
        <span>
          OK: <span className="gba:text-emerald-400">{snapshotDebugInfo.successCount}</span>
        </span>
        <span>
          FAIL:{' '}
          <span className={snapshotDebugInfo.failCount > 0 ? 'gba:text-red-400' : 'gba:text-zinc-500'}>
            {snapshotDebugInfo.failCount}
          </span>
        </span>
        <span>
          Last OK:{' '}
          {snapshotDebugInfo.lastSuccessAt ? new Date(snapshotDebugInfo.lastSuccessAt).toLocaleTimeString() : '—'}
        </span>
        <span>
          Last FAIL: {snapshotDebugInfo.lastFailAt ? new Date(snapshotDebugInfo.lastFailAt).toLocaleTimeString() : '—'}
        </span>
        <span className="gba:text-zinc-600">|</span>
        <span>Conflicts: {snapshotConflicts}</span>
        <span>Attempts: {snapshotAttempts}</span>
      </div>

      <div className="gba:flex gba:items-center gba:gap-4">
        <span className="gba:font-semibold gba:text-blue-400">Socket.IO</span>
        <span>
          Status:{' '}
          <span
            className={
              collaborationHealth === 'connected'
                ? 'gba:text-emerald-400'
                : collaborationHealth === 'failed'
                  ? 'gba:text-red-400'
                  : 'gba:text-yellow-400'
            }
          >
            {collaborationHealth === 'connected'
              ? 'Connected'
              : collaborationHealth === 'failed'
                ? 'Failed'
                : 'Reconnecting'}
          </span>
        </span>
        <span>Transport: {socketDebugInfo.transport || '—'}</span>
        <span>ID: {socketDebugInfo.socketId || '—'}</span>
        <span className="gba:text-zinc-600">|</span>
        <span>
          Connects: <span className="gba:text-emerald-400">{socketDebugInfo.connectCount}</span>
        </span>
        <span>
          Disconnects:{' '}
          <span className={socketDebugInfo.disconnectCount > 0 ? 'gba:text-yellow-400' : 'gba:text-zinc-500'}>
            {socketDebugInfo.disconnectCount}
          </span>
        </span>
        <span>
          Reconnects:{' '}
          <span className={socketDebugInfo.reconnectCount > 0 ? 'gba:text-yellow-400' : 'gba:text-zinc-500'}>
            {socketDebugInfo.reconnectCount}
          </span>
        </span>
        <span>
          Errors:{' '}
          <span className={socketDebugInfo.connectErrorCount > 0 ? 'gba:text-red-400' : 'gba:text-zinc-500'}>
            {socketDebugInfo.connectErrorCount}
          </span>
        </span>
        {socketDebugInfo.lastDisconnectReason && <span>Last DC: {socketDebugInfo.lastDisconnectReason}</span>}
      </div>

      <div className="gba:flex gba:items-center gba:gap-4">
        <span className="gba:font-semibold gba:text-purple-400">Persist</span>
        <span>
          Saving:{' '}
          <span className={isPersistSaving ? 'gba:text-yellow-400' : 'gba:text-zinc-500'}>
            {isPersistSaving ? 'Yes' : 'No'}
          </span>
        </span>
        <span>
          Dirty:{' '}
          <span className={hasLocalDirty ? 'gba:text-yellow-400' : 'gba:text-zinc-500'}>
            {hasLocalDirty ? 'Yes' : 'No'}
          </span>
        </span>
        <span>Last Save: {lastPersistedAt ? new Date(lastPersistedAt).toLocaleTimeString() : '—'}</span>
        {persistError && <span className="gba:text-red-400">Err: {persistError}</span>}
        <span className="gba:text-zinc-600">|</span>
        <span className="gba:font-semibold gba:text-teal-400">Version</span>
        <span>
          Saving:{' '}
          <span className={isVersionSaving ? 'gba:text-yellow-400' : 'gba:text-zinc-500'}>
            {isVersionSaving ? 'Yes' : 'No'}
          </span>
        </span>
        <span>
          Unsaved:{' '}
          <span className={hasUnsavedChanges ? 'gba:text-yellow-400' : 'gba:text-zinc-500'}>
            {hasUnsavedChanges ? 'Yes' : 'No'}
          </span>
        </span>
        <span className="gba:text-zinc-600">|</span>
        <span className="gba:font-semibold gba:text-orange-400">Lock</span>
        <span>
          canEdit:{' '}
          <span className={canEdit ? 'gba:text-emerald-400' : 'gba:text-red-400'}>{canEdit ? 'Yes' : 'No'}</span>
        </span>
        <span>Participants: {participantCount}</span>
      </div>
    </div>
  )
}
