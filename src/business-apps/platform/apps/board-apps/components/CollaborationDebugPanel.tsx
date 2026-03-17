/**
 * CollaborationDebugPanel - visible debug overlay for collaboration diagnostics.
 * Shown when ?collabDebug=1 is in the URL. Helps diagnose why collaboration
 * (boards WS, RowPage Yjs) may not be working.
 */

import React, { useEffect, useState } from 'react'

export interface CollaborationDebugPanelProps {
  /** Boards namespace WebSocket connected */
  boardsConnected: boolean
  /** Live updates enabled for this board */
  liveEnabled: boolean
  /** Document service base URL (for WS) */
  docServiceUrl: string
  /** RowPage: collaboration socket connected */
  rowPageCollabConnected?: boolean
  /** RowPage: Yjs synced */
  rowPageYjsSynced?: boolean
  /** RowPage: note ID being edited */
  rowPageNoteId?: string | null
  /** Last sync/connection error (if any) */
  lastError?: string | null
}

function useCollabDebugEnabled(): boolean {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const check = () => {
      const params = new URLSearchParams(window.location.search)
      setEnabled(params.get('collabDebug') === '1')
    }
    check()
    window.addEventListener('popstate', check)
    return () => window.removeEventListener('popstate', check)
  }, [])
  return enabled
}

export const CollaborationDebugPanel: React.FC<CollaborationDebugPanelProps> = ({
  boardsConnected,
  liveEnabled,
  docServiceUrl,
  rowPageCollabConnected,
  rowPageYjsSynced,
  rowPageNoteId,
  lastError
}) => {
  const enabled = useCollabDebugEnabled()
  if (!enabled) return null

  const wsBase = docServiceUrl.replace(/\/api\/v1$/, '').replace(/\/$/, '')

  return (
    <div
      className="gba:fixed gba:bottom-2 gba:left-2 gba:z-[99999] gba:max-w-sm gba:rounded gba:border gba:border-border gba:bg-background gba:p-2 gba:text-xs gba:font-mono gba:shadow-lg"
      data-testid="collab-debug-panel"
    >
      <div className="gba:font-semibold gba:mb-1 gba:text-muted-foreground">Collab Debug (?collabDebug=1)</div>
      <div className="gba:space-y-0.5">
        <div>
          Boards WS:{' '}
          <span className={boardsConnected ? 'gba:text-success' : 'gba:text-destructive'}>
            {boardsConnected ? 'connected' : 'disconnected'}
          </span>
        </div>
        <div>
          Live enabled: <span className="gba:text-muted-foreground">{liveEnabled ? 'yes' : 'no'}</span>
        </div>
        <div className="gba:truncate" title={wsBase}>
          Doc URL: <span className="gba:text-muted-foreground">{wsBase}</span>
        </div>
        {rowPageNoteId != null && (
          <>
            <div>
              RowPage Collab:{' '}
              <span className={rowPageCollabConnected ? 'gba:text-success' : 'gba:text-destructive'}>
                {rowPageCollabConnected ? 'connected' : 'disconnected'}
              </span>
            </div>
            <div>
              RowPage Yjs:{' '}
              <span className={rowPageYjsSynced ? 'gba:text-success' : 'gba:text-muted-foreground'}>
                {rowPageYjsSynced ? 'synced' : 'not synced'}
              </span>
            </div>
            <div className="gba:truncate" title={rowPageNoteId}>
              Note: <span className="gba:text-muted-foreground">{rowPageNoteId || '—'}</span>
            </div>
          </>
        )}
        {lastError && (
          <div className="gba:mt-1 gba:text-destructive gba:break-all" title={lastError}>
            Error: {lastError}
          </div>
        )}
      </div>
    </div>
  )
}
