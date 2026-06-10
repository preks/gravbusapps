// Workforce-only config cards inside the general-settings per-agent editor.
// Fetches via useWorkforceAgentConfig; section bodies live in WorkforceConfigSectionStack.

import React from 'react'
import { SpinnerGapIcon } from '@phosphor-icons/react'
import { WorkforceConfigSectionStack } from '../enterprise-workforce/WorkforceConfigSectionStack'
import { useWorkforceAgentConfig } from '../enterprise-workforce/useWorkforceAgentConfig'

interface WorkforceConfigSectionsProps {
  agentId: string
  accessToken: string
}

export const WorkforceConfigSections: React.FC<WorkforceConfigSectionsProps> = ({ agentId, accessToken }) => {
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
  } = useWorkforceAgentConfig({ accessToken, agentId })

  return (
    <section data-testid="agent-config-workforce">
      <h2 className="gba:text-base gba:font-semibold gba:text-foreground gba:mb-4">Workforce</h2>

      {error && (
        <div
          className="gba:rounded-lg gba:border gba:border-destructive/30 gba:bg-destructive/5 gba:p-3 gba:text-sm gba:text-destructive gba:mb-3"
          data-testid="agent-config-workforce-error"
        >
          {error}
        </div>
      )}

      {isLoading && !agent ? (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
          <SpinnerGapIcon className="gba:h-6 gba:w-6 gba:animate-spin gba:text-muted-foreground" />
        </div>
      ) : agent ? (
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
        />
      ) : (
        !error && (
          <p className="gba:text-sm gba:text-muted-foreground gba:py-4">No workforce configuration available.</p>
        )
      )}
    </section>
  )
}
