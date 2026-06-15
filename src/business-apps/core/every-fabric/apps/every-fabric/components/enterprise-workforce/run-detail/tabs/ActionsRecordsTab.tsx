// Actions & Records tab: the records the agent touched (CRM + flows). Flow rows
// are clickable and call `onOpenFlow`, which the parent uses to switch to the
// Flows tab with that workflow selected.

import { ListChecksIcon } from '@phosphor-icons/react'
import React from 'react'

import { RunEntityLinks } from '../../RunEntityLinks'
import type { WorkforceRun, WorkforceRunTraceEvent } from '../../workforceTypes'
import { resolveDomainActions } from '../runDetailFacts'
import { SectionTitle } from '../RunDetailSection'

export interface ActionsRecordsTabProps {
  run: WorkforceRun
  accessToken: string
  trace: readonly WorkforceRunTraceEvent[]
  onOpenFlow: (workflowId: string) => void
}

export const ActionsRecordsTab: React.FC<ActionsRecordsTabProps> = ({ run, accessToken, trace, onOpenFlow }) => {
  const domainActions = resolveDomainActions(run, trace)
  const hasContent = domainActions.length > 0 || Boolean(run.case_ref)

  return (
    <div className="gba:space-y-6">
      {hasContent ? (
        <RunEntityLinks
          actions={domainActions}
          caseRef={run.case_ref}
          accessToken={accessToken}
          onOpenFlow={onOpenFlow}
        />
      ) : (
        <section>
          <SectionTitle icon={ListChecksIcon}>Records & actions</SectionTitle>
          <p className="gba:text-xs gba:italic gba:text-muted-foreground" data-testid="actions-records-empty">
            This run did not touch any records.
          </p>
        </section>
      )}
    </div>
  )
}
