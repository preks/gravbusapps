// Phase A: Config tab inside the Workforce Agent detail screen.
//
// This is the existing Identity / Autonomy / Skills / Knowledge /
// Triggers / Escalation / Budget section stack, lifted out of
// `WorkforceAgentConfigView` so it can render under any shell (the
// legacy config view and the new tabbed detail screen) without
// behaviour changes.
//
// Owns no fetching or save state — the parent passes everything in.

import React from 'react'
import { AutonomySection } from '../../sections/AutonomySection'
import { BudgetSection } from '../../sections/BudgetSection'
import { EscalationSection } from '../../sections/EscalationSection'
import { IdentitySection } from '../../sections/IdentitySection'
import { KnowledgeSection } from '../../sections/KnowledgeSection'
import { SkillsAndPoliciesSection } from '../../sections/SkillsAndPoliciesSection'
import { TriggersSection } from '../../sections/TriggersSection'
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
}) => {
  // Swallow rejections at the section boundary so a single failing save
  // does not surface as an unhandled-promise warning. The parent already
  // captures the failure into its visible error banner via the hook.
  const makeSaver = (section: string) => async (patch: WorkforceAgentUpdateInput) => {
    try {
      await saveSection(section, patch)
    } catch {
      // intentionally swallowed — handled upstream
    }
  }

  return (
    <div className="gba:space-y-4" data-testid="workforce-config-tab">
      <IdentitySection agent={agent} isSaving={savingSection === 'identity'} onSave={makeSaver('identity')} />
      <AutonomySection agent={agent} isSaving={savingSection === 'autonomy'} onSave={makeSaver('autonomy')} />
      <SkillsAndPoliciesSection
        agent={agent}
        accessToken={accessToken}
        isSaving={savingSection === 'skills-policies'}
        onSave={makeSaver('skills-policies')}
      />
      <KnowledgeSection agent={agent} isSaving={savingSection === 'knowledge'} onSave={makeSaver('knowledge')} />
      <TriggersSection
        triggers={triggers}
        pendingTriggerId={pendingTriggerId}
        accessToken={accessToken}
        onCreate={createTrigger}
        onUpdate={async (id, patch) => {
          try {
            await updateTrigger(id, patch)
          } catch {
            // captured by hook error state
          }
        }}
        onDelete={async id => {
          try {
            await deleteTrigger(id)
          } catch {
            // captured by hook error state
          }
        }}
      />
      <EscalationSection agent={agent} isSaving={savingSection === 'escalation'} onSave={makeSaver('escalation')} />
      <BudgetSection agent={agent} isSaving={savingSection === 'budget'} onSave={makeSaver('budget')} />
    </div>
  )
}
