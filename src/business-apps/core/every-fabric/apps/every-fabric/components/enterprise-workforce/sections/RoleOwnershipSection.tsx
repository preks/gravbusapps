// Workforce role / department / owner card (without display name or description).

import React, { useEffect, useState } from 'react'
import type { WorkforceAgent, WorkforceAgentUpdateInput } from '../workforceTypes'
import { RoleOwnershipFields } from './RoleOwnershipFields'
import {
  roleOwnershipDirty,
  roleOwnershipFromAgent,
  roleOwnershipToPatch,
  type RoleOwnershipValues
} from './roleOwnershipForm'
import { SectionShell } from './SectionShell'

interface RoleOwnershipSectionProps {
  agent: WorkforceAgent
  isSaving: boolean
  onSave: (patch: WorkforceAgentUpdateInput) => Promise<void>
}

export const RoleOwnershipSection: React.FC<RoleOwnershipSectionProps> = ({ agent, isSaving, onSave }) => {
  const baseline = roleOwnershipFromAgent(agent)
  const [form, setForm] = useState<RoleOwnershipValues>(baseline)

  useEffect(() => {
    setForm(roleOwnershipFromAgent(agent))
  }, [agent])

  const dirty = roleOwnershipDirty(form, baseline)

  const handleSave = async () => {
    await onSave(roleOwnershipToPatch(form))
  }

  return (
    <SectionShell
      id="role-ownership"
      title="Role & ownership"
      description="Workforce role, department, and the person accountable for this agent."
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
        />
      </div>
    </SectionShell>
  )
}
