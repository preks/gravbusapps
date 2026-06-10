// Scrollable body of the full-screen run detail. Thin wrapper around the tabbed
// layout (Overview, Actions & Records, Flows, Diagnostics) — all section markup
// now lives in the individual tab panels under `run-detail/tabs`.

import React from 'react'

import type { WorkforceRun, WorkforceRunTraceEvent } from '../workforceTypes'
import { RunDetailTabs } from './RunDetailTabs'

export interface RunDetailBodyProps {
  run: WorkforceRun
  accessToken: string
  trace: readonly WorkforceRunTraceEvent[]
  errorMessage?: string | null
  onRefreshRun?: () => Promise<void>
}

export const RunDetailBody: React.FC<RunDetailBodyProps> = ({
  run,
  accessToken,
  trace,
  errorMessage,
  onRefreshRun
}) => (
  <div className="gba:flex-1 gba:overflow-y-auto gba:bg-background">
    <div className="gba:mx-auto gba:max-w-5xl gba:px-6 gba:py-6">
      <RunDetailTabs
        run={run}
        accessToken={accessToken}
        trace={trace}
        errorMessage={errorMessage}
        onRefreshRun={onRefreshRun}
      />
    </div>
  </div>
)
