// Presentational worker-config cards for the Studio agent detail tabs.
//
// The data lives in a single useWorkforceAgentConfig instance owned by
// AgentConfigView, so the Passport and Activation tabs share one record and
// one set of triggers. This component just renders a filtered slice of the
// shared WorkforceConfigSectionStack (by `group`) plus its loading/error chrome.

import React from 'react'
import { SpinnerGapIcon } from '@phosphor-icons/react'
import { WorkforceConfigSectionStack } from '../enterprise-workforce/WorkforceConfigSectionStack'
import type { WorkforceConfigGroup } from '../enterprise-workforce/WorkforceConfigSectionStack'
import type { WorkforceAgentConfigState } from '../enterprise-workforce/useWorkforceAgentConfig'

interface AgentWorkerSectionsProps {
  accessToken: string
  /** Which slice of the worker config to render in this tab. */
  group: Exclude<WorkforceConfigGroup, 'all'>
  /** Shared config state, lifted to AgentConfigView so tabs share one record. */
  config: WorkforceAgentConfigState
  'data-testid'?: string
  /** Shown when the worker record loads but has no cards for this group. */
  emptyLabel?: string
}

export const AgentWorkerSections: React.FC<AgentWorkerSectionsProps> = ({
  accessToken,
  group,
  config,
  'data-testid': dataTestId,
  emptyLabel = 'No configuration available.'
}) => {
  const {
    agent,
    triggers,
    isLoading,
    error,
    savingSection,
    pendingTriggerId,
    saveSection,
    createTrigger,
    updateTrigger,
    deleteTrigger
  } = config

  let body: React.ReactNode
  if (isLoading && !agent) {
    body = (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
        <SpinnerGapIcon className="gba:h-6 gba:w-6 gba:animate-spin gba:text-muted-foreground" />
      </div>
    )
  } else if (agent) {
    body = (
      <WorkforceConfigSectionStack
        agent={agent}
        accessToken={accessToken}
        triggers={triggers}
        savingSection={savingSection}
        pendingTriggerId={pendingTriggerId}
        saveSection={saveSection}
        createTrigger={createTrigger}
        updateTrigger={updateTrigger}
        deleteTrigger={deleteTrigger}
        identityMode="role-only"
        group={group}
      />
    )
  } else if (error) {
    body = null
  } else {
    body = <p className="gba:text-sm gba:text-muted-foreground gba:py-4">{emptyLabel}</p>
  }

  return (
    <div data-testid={dataTestId ?? `agent-worker-sections-${group}`}>
      {error && (
        <div
          className="gba:rounded-lg gba:border gba:border-destructive/30 gba:bg-destructive/5 gba:p-3 gba:text-sm gba:text-destructive gba:mb-3"
          data-testid={`agent-worker-sections-${group}-error`}
        >
          {error}
        </div>
      )}
      {body}
    </div>
  )
}
