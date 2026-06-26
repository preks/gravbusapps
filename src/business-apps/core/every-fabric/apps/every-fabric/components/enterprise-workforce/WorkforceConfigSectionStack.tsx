// Shared workforce config section stack used by the Workforce detail tab
// and the general-settings per-agent editor.

import React from 'react'
import { AutonomySection } from './sections/AutonomySection'
import { BudgetSection } from './sections/BudgetSection'
import { ConnectionsSection } from './sections/ConnectionsSection'
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

/**
 * Which subset of the worker config cards to render.
 * - `passport`: identity/accountability cards (role + ownership, orgchart, escalation, budget)
 * - `activation`: runtime cards (autonomy, knowledge, triggers, customer 360)
 * - `all`: every card in the legacy single-scroll order (Workforce detail Config tab)
 */
export type WorkforceConfigGroup = 'passport' | 'activation' | 'all'

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
  onTestWebhook?: (triggerId: string) => void
  identityMode: WorkforceIdentityMode
  showSkillsPolicies?: boolean
  group?: WorkforceConfigGroup
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
  onTestWebhook,
  identityMode,
  showSkillsPolicies = false,
  group = 'all',
  className,
  'data-testid': dataTestId
}) => {
  const makeSaver = makeSwallowingSaver(saveSection)
  const inPassport = group === 'all' || group === 'passport'
  const inActivation = group === 'all' || group === 'activation'

  return (
    <div className={className ?? 'gba:space-y-4'} data-testid={dataTestId}>
      {inPassport &&
        (identityMode === 'full' ? (
          <IdentitySection agent={agent} isSaving={savingSection === 'identity'} onSave={makeSaver('identity')} />
        ) : (
          <RoleOwnershipSection
            agent={agent}
            accessToken={accessToken}
            isSaving={savingSection === 'identity'}
            onSave={makeSaver('identity')}
          />
        ))}
      {inActivation && (
        <AutonomySection agent={agent} isSaving={savingSection === 'autonomy'} onSave={makeSaver('autonomy')} />
      )}
      {inPassport && showSkillsPolicies && (
        <SkillsAndPoliciesSection
          agent={agent}
          accessToken={accessToken}
          isSaving={savingSection === 'skills-policies'}
          onSave={makeSaver('skills-policies')}
        />
      )}
      {inActivation && (
        <KnowledgeSection agent={agent} isSaving={savingSection === 'knowledge'} onSave={makeSaver('knowledge')} />
      )}
      {inActivation && (
        <ConnectionsSection
          agent={agent}
          accessToken={accessToken}
          isSaving={savingSection === 'connections'}
          onSave={makeSaver('connections')}
        />
      )}
      {inActivation && (
        <TriggersSection
          triggers={triggers}
          pendingTriggerId={pendingTriggerId}
          accessToken={accessToken}
          onTestWebhook={onTestWebhook}
          onCreate={createTrigger}
          onUpdate={wrapTriggerUpdate(updateTrigger)}
          onDelete={wrapTriggerDelete(deleteTrigger)}
        />
      )}
      {inActivation && (
        <Customer360SurfaceSection
          agent={agent}
          isSaving={savingSection === 'customer-360-surface'}
          onSave={makeSaver('customer-360-surface')}
        />
      )}
      {inPassport && (
        <OrgchartRegistrationSection
          agent={agent}
          accessToken={accessToken}
          isSaving={savingSection === 'orgchart'}
          onSave={makeSaver('orgchart')}
        />
      )}
      {inPassport && (
        <EscalationSection agent={agent} isSaving={savingSection === 'escalation'} onSave={makeSaver('escalation')} />
      )}
      {inPassport && <BudgetSection agent={agent} isSaving={savingSection === 'budget'} onSave={makeSaver('budget')} />}
    </div>
  )
}
