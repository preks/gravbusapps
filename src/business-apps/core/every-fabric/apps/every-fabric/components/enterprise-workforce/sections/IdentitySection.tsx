// Identity section - the basics every operator needs to recognise the agent.
//
// Name (snake_case identifier) is immutable post-creation: it is what
// downstream tools and trigger configs reference. Display name, role,
// department, description and owner are all editable.

import React, { useEffect, useState } from 'react'
import { IdentificationCardIcon } from '@phosphor-icons/react'
import type { WorkforceAgent, WorkforceAgentUpdateInput } from '../workforceTypes'
import { RoleOwnershipFields } from './RoleOwnershipFields'
import { roleOwnershipDirty, roleOwnershipFromAgent, roleOwnershipToPatch } from './roleOwnershipForm'
import { SectionShell } from './SectionShell'

interface IdentitySectionProps {
  agent: WorkforceAgent
  isSaving: boolean
  onSave: (patch: WorkforceAgentUpdateInput) => Promise<void>
}

interface FormState {
  displayName: string
  description: string
  role: string
  department: string
  ownerUserId: string
}

function fromAgent(agent: WorkforceAgent): FormState {
  return {
    displayName: agent.display_name,
    description: agent.description,
    ...roleOwnershipFromAgent(agent)
  }
}

function isDirty(form: FormState, baseline: FormState): boolean {
  return (
    form.displayName !== baseline.displayName ||
    form.description !== baseline.description ||
    roleOwnershipDirty(form, baseline)
  )
}

export const IdentitySection: React.FC<IdentitySectionProps> = ({ agent, isSaving, onSave }) => {
  const baseline = fromAgent(agent)
  const [form, setForm] = useState<FormState>(baseline)

  useEffect(() => {
    setForm(fromAgent(agent))
  }, [agent])

  const dirty = isDirty(form, baseline)

  const handleSave = async () => {
    await onSave({
      display_name: form.displayName.trim(),
      description: form.description.trim(),
      ...roleOwnershipToPatch(form)
    })
  }

  return (
    <SectionShell
      id="identity"
      title="Identity"
      icon={IdentificationCardIcon}
      description="How this Worker is identified across its deployments."
      isDirty={dirty}
      isSaving={isSaving}
      onSave={() => void handleSave()}
      onReset={() => setForm(baseline)}
    >
      <div className="gba:grid gba:grid-cols-1 gba:gap-3 gba:sm:grid-cols-2">
        <div className="gba:sm:col-span-2">
          <label
            htmlFor="ws-identity-name"
            className="gba:mb-1 gba:block gba:text-xs gba:font-semibold gba:text-muted-foreground"
          >
            Identifier (read-only)
          </label>
          <input
            id="ws-identity-name"
            value={agent.name}
            readOnly
            className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-muted/40 gba:px-3 gba:py-2 gba:text-sm gba:text-muted-foreground"
            data-testid="workforce-identity-name"
          />
        </div>

        <div>
          <label
            htmlFor="ws-identity-display"
            className="gba:mb-1 gba:block gba:text-xs gba:font-semibold gba:text-foreground"
          >
            Display name
          </label>
          <input
            id="ws-identity-display"
            value={form.displayName}
            onChange={e => setForm(prev => ({ ...prev, displayName: e.target.value }))}
            className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
            data-testid="workforce-identity-display-name"
          />
        </div>

        <RoleOwnershipFields
          values={form}
          onChange={patch => setForm(prev => ({ ...prev, ...patch }))}
          fieldIds={{ role: 'ws-identity-role', department: 'ws-identity-department', owner: 'ws-identity-owner' }}
          testIds={{
            role: 'workforce-identity-role',
            department: 'workforce-identity-department',
            owner: 'workforce-identity-owner'
          }}
        />

        <div className="gba:sm:col-span-2">
          <label
            htmlFor="ws-identity-description"
            className="gba:mb-1 gba:block gba:text-xs gba:font-semibold gba:text-foreground"
          >
            Description
          </label>
          <textarea
            id="ws-identity-description"
            value={form.description}
            onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="gba:min-h-20 gba:w-full gba:resize-y gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
            data-testid="workforce-identity-description"
          />
        </div>
      </div>
    </SectionShell>
  )
}
