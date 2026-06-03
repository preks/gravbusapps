// Phase A: Config tab inside the Workforce Agent detail screen.

import React from 'react'
import { WorkforceConfigSectionStack } from '../../WorkforceConfigSectionStack'
import type {
  WorkforceAgent,
  WorkforceAgentUpdateInput,
  WorkforceTrigger,
  WorkforceTriggerCreateInput,
  WorkforceTriggerUpdateInput
} from '../../workforceTypes'

export interface AgentConfigTabProps {
  agent: WorkforceAgent
  accessToken: string
  triggers: WorkforceTrigger[]
  savingSection: string | null
  pendingTriggerId: string | null
  saveSection: (section: string, patch: WorkforceAgentUpdateInput) => Promise<void>
  createTrigger: (body: WorkforceTriggerCreateInput) => Promise<WorkforceTrigger>
  updateTrigger: (triggerId: string, patch: WorkforceTriggerUpdateInput) => Promise<WorkforceTrigger>
  deleteTrigger: (triggerId: string) => Promise<void>
}

export const AgentConfigTab: React.FC<AgentConfigTabProps> = ({
  agent,
  accessToken,
  triggers,
  savingSection,
  pendingTriggerId,
  saveSection,
  createTrigger,
  updateTrigger,
  deleteTrigger
}) => (
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
    identityMode="full"
    showSkillsPolicies
    data-testid="workforce-config-tab"
  />
)
