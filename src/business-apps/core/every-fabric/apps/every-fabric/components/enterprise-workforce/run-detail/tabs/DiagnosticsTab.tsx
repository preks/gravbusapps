// Diagnostics tab: applied policies, the (coalesced) trace, the audit
// backtrace, and the run cost. Moved verbatim from the original RunDetailBody.

import { CoinsIcon, TreeStructureIcon } from '@phosphor-icons/react'
import React from 'react'

import { GroupedTraceTimeline } from '../../agent-detail/trace/GroupedTraceTimeline'
import { PolicyUsedChips } from '../../PolicyUsedChips'
import { RunAuditTimeline } from '../../RunAuditTimeline'
import { readTotalTokens, runCredits } from '../../runDisplay'
import type { WorkforceRun, WorkforceRunTraceEvent } from '../../workforceTypes'
import { SectionTitle } from '../RunDetailSection'

export interface DiagnosticsTabProps {
  run: WorkforceRun
  accessToken: string
  trace: readonly WorkforceRunTraceEvent[]
}

export const DiagnosticsTab: React.FC<DiagnosticsTabProps> = ({ run, accessToken, trace }) => {
  const totalTokens = readTotalTokens(run)
  const credits = runCredits(run)

  return (
    <div className="gba:space-y-6">
      <PolicyUsedChips trace={trace} />

      <section data-testid="run-detail-trace">
        <SectionTitle icon={TreeStructureIcon}>Trace</SectionTitle>
        <GroupedTraceTimeline trace={trace} />
      </section>

      {accessToken && <RunAuditTimeline sessionId={run.session_id} accessToken={accessToken} />}

      <section>
        <SectionTitle icon={CoinsIcon}>Cost</SectionTitle>
        <div className="gba:flex gba:items-center gba:gap-3 gba:rounded-lg gba:border gba:border-border/60 gba:bg-card gba:p-3 gba:text-xs gba:text-foreground">
          <CoinsIcon className="gba:h-4 gba:w-4 gba:text-primary" />
          <div>
            <div className="gba:font-semibold">{credits} Newwork credits</div>
            <div className="gba:text-[11px] gba:text-muted-foreground">{totalTokens.toLocaleString()} total tokens</div>
          </div>
        </div>
      </section>
    </div>
  )
}
