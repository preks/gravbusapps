// Shared workforce config section stack used by the Workforce detail tab
// and the general-settings per-agent editor.

import React from 'react'
import { AutonomySection } from './sections/AutonomySection'
import { BudgetSection } from './sections/BudgetSection'
import { Customer360SurfaceSection } from './sections/Customer360SurfaceSection'
import { EscalationSection } from './sections/EscalationSection'
import { IdentitySection } from './sections/IdentitySection'
import { KnowledgeSection } from './sections/KnowledgeSection'
import { OrgchartRegistrationSection } from './sections/OrgchartRegistrationSection'
import { RoleOwnershipSection } from './sections/RoleOwnershipSection'
import { SkillsAndPoliciesSection } from './sections/SkillsAndPoliciesSection'
import { TriggersSection } from './sections/TriggersSection'
import { makeSwallowingSaver, wrapTriggerDelete, wrapTriggerUpdate } from './workforceConfigSectionHelpers'
import type {
  WorkforceAgent,
  WorkforceAgentUpdateInput,
  WorkforceTrigger,
  WorkforceTriggerCreateInput,
  WorkforceTriggerUpdateInput
} from './workforceTypes'

export type WorkforceIdentityMode = 'full' | 'role-only'

export interface WorkforceConfigSectionStackProps {
  agent: WorkforceAgent
  accessToken: string
  triggers: WorkforceTrigger[]
  savingSection: string | null
  pendingTriggerId: string | null
  saveSection: (section: string, patch: WorkforceAgentUpdateInput) => Promise<void>
  createTrigger: (body: WorkforceTriggerCreateInput) => Promise<void>
  updateTrigger: (triggerId: string, patch: WorkforceTriggerUpdateInput) => Promise<void>
  deleteTrigger: (triggerId: string) => Promise<void>
  identityMode: WorkforceIdentityMode
  showSkillsPolicies?: boolean
  className?: string
  'data-testid'?: string
}

export const WorkforceConfigSectionStack: React.FC<WorkforceConfigSectionStackProps> = ({
  agent,
  accessToken,
  triggers,
  savingSection,
  pendingTriggerId,
  saveSection,
  createTrigger,
  updateTrigger,
  deleteTrigger,
  identityMode,
  showSkillsPolicies = false,
  className,
  'data-testid': dataTestId
}) => {
  const makeSaver = makeSwallowingSaver(saveSection)

  return (
    <div className={className ?? 'gba:space-y-4'} data-testid={dataTestId}>
      {identityMode === 'full' ? (
        <IdentitySection agent={agent} isSaving={savingSection === 'identity'} onSave={makeSaver('identity')} />
      ) : (
        <RoleOwnershipSection agent={agent} isSaving={savingSection === 'identity'} onSave={makeSaver('identity')} />
      )}
      <AutonomySection agent={agent} isSaving={savingSection === 'autonomy'} onSave={makeSaver('autonomy')} />
      {showSkillsPolicies && (
        <SkillsAndPoliciesSection
          agent={agent}
          accessToken={accessToken}
          isSaving={savingSection === 'skills-policies'}
          onSave={makeSaver('skills-policies')}
        />
      )}
      <KnowledgeSection agent={agent} isSaving={savingSection === 'knowledge'} onSave={makeSaver('knowledge')} />
      <TriggersSection
        triggers={triggers}
        pendingTriggerId={pendingTriggerId}
        accessToken={accessToken}
        onCreate={createTrigger}
        onUpdate={wrapTriggerUpdate(updateTrigger)}
        onDelete={wrapTriggerDelete(deleteTrigger)}
      />
      <Customer360SurfaceSection
        agent={agent}
        isSaving={savingSection === 'customer-360-surface'}
        onSave={makeSaver('customer-360-surface')}
      />
      <OrgchartRegistrationSection
        agent={agent}
        accessToken={accessToken}
        isSaving={savingSection === 'orgchart'}
        onSave={makeSaver('orgchart')}
      />
      <EscalationSection agent={agent} isSaving={savingSection === 'escalation'} onSave={makeSaver('escalation')} />
      <BudgetSection agent={agent} isSaving={savingSection === 'budget'} onSave={makeSaver('budget')} />
    </div>
  )
}
