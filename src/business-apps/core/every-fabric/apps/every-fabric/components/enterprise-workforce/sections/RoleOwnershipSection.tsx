// Workforce role / department / owner card (without display name or description).
//
// Department is not free text: it mirrors the org unit the agent is registered
// under in the orgchart (see the Orgchart identity card). Owner is shown as the
// accountable person's avatar + name + role, resolved from owner_user_id.

import React, { useEffect, useState } from 'react'
import { IdentificationBadgeIcon } from '@phosphor-icons/react'
import { useTranslation } from '@newwork/nw-design-system'
import type { WorkforceAgent, WorkforceAgentUpdateInput } from '../workforceTypes'
import { RoleOwnershipFields } from './RoleOwnershipFields'
import { OwnerDisplay } from './OwnerDisplay'
import { useOrgchartUnitName } from './useOrgchartUnits'
import { useOwnerEmployee } from '../../../hooks/useOwnerEmployee'
import translations from '../../../_i18n'
import {
  roleOwnershipDirty,
  roleOwnershipFromAgent,
  roleOwnershipToPatch,
  type RoleOwnershipValues
} from './roleOwnershipForm'
import { SectionShell } from './SectionShell'

interface RoleOwnershipSectionProps {
  agent: WorkforceAgent
  accessToken: string
  isSaving: boolean
  onSave: (patch: WorkforceAgentUpdateInput) => Promise<void>
}

export const RoleOwnershipSection: React.FC<RoleOwnershipSectionProps> = ({ agent, accessToken, isSaving, onSave }) => {
  const { t } = useTranslation(translations)
  const baseline = roleOwnershipFromAgent(agent)
  const [form, setForm] = useState<RoleOwnershipValues>(baseline)

  useEffect(() => {
    setForm(roleOwnershipFromAgent(agent))
  }, [agent])

  const dirty = roleOwnershipDirty(form, baseline)

  // Department is sourced from the orgchart org unit the agent is registered
  // under, not a free-text field. Fall back to any stored department label
  // while the unit name resolves or when the agent is not yet registered.
  const orgUnitId = agent.workforce_profile?.orgchart?.org_unit_id ?? null
  const orgUnitName = useOrgchartUnitName(accessToken, orgUnitId)
  const departmentText = orgUnitName ?? (form.department.trim() || '')

  const { owner, loading: ownerLoading } = useOwnerEmployee(accessToken, agent.workforce_profile.owner_user_id)

  const handleSave = async () => {
    await onSave(roleOwnershipToPatch(form))
  }

  const departmentSlot = (
    <div
      className="gba:flex gba:h-10 gba:items-center gba:rounded-lg gba:border gba:border-border gba:bg-muted/40 gba:px-3 gba:text-sm gba:text-foreground"
      data-testid="workforce-role-ownership-department"
    >
      {departmentText ? (
        <span className="gba:truncate">{departmentText}</span>
      ) : (
        <span className="gba:text-muted-foreground">{t('roleown-department-unassigned')}</span>
      )}
    </div>
  )

  const ownerSlot = (
    <OwnerDisplay
      owner={owner}
      loading={ownerLoading}
      ownerUserId={agent.workforce_profile.owner_user_id}
      emptyLabel={t('roleown-owner-unassigned')}
      data-testid="workforce-role-ownership-owner"
    />
  )

  return (
    <SectionShell
      id="role-ownership"
      title={t('roleown-section-title')}
      icon={IdentificationBadgeIcon}
      description={t('roleown-section-desc')}
      isDirty={dirty}
      isSaving={isSaving}
      onSave={() => void handleSave()}
      onReset={() => setForm(baseline)}
    >
      <div className="gba:grid gba:grid-cols-1 gba:gap-3 gba:sm:grid-cols-2">
        <RoleOwnershipFields
          values={form}
          onChange={patch => setForm(prev => ({ ...prev, ...patch }))}
          fieldIds={{ role: 'wf-role', department: 'wf-department', owner: 'wf-owner' }}
          testIds={{
            role: 'workforce-role-ownership-role',
            department: 'workforce-role-ownership-department',
            owner: 'workforce-role-ownership-owner'
          }}
          departmentSlot={departmentSlot}
          ownerSlot={ownerSlot}
        />
      </div>
    </SectionShell>
  )
}
