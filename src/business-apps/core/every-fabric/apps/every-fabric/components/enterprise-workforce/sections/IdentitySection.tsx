// Identity section - the basics every operator needs to recognise the agent.
//
// Name (snake_case identifier) is immutable post-creation: it is what
// downstream tools and trigger configs reference. Display name, role,
// department, description and owner are all editable.

import React, { useEffect, useState } from 'react'
import type { WorkforceAgent, WorkforceAgentUpdateInput } from '../workforceTypes'
import { SectionShell } from './SectionShell'

interface IdentitySectionProps {
  agent: WorkforceAgent
  isSaving: boolean
  onSave: (patch: WorkforceAgentUpdateInput) => Promise<void>
}

interface FormState {
  displayName: string
  role: string
  department: string
  ownerUserId: string
  description: string
}

function fromAgent(agent: WorkforceAgent): FormState {
  return {
    displayName: agent.display_name,
    role: agent.workforce_profile.role,
    department: agent.workforce_profile.department ?? '',
    ownerUserId: agent.workforce_profile.owner_user_id ?? '',
    description: agent.description
  }
}

function isDirty(form: FormState, baseline: FormState): boolean {
  return (
    form.displayName !== baseline.displayName ||
    form.role !== baseline.role ||
    form.department !== baseline.department ||
    form.ownerUserId !== baseline.ownerUserId ||
    form.description !== baseline.description
  )
}

export const IdentitySection: React.FC<IdentitySectionProps> = ({ agent, isSaving, onSave }) => {
  const baseline = fromAgent(agent)
  const [form, setForm] = useState<FormState>(baseline)

  // Reset the local draft when the upstream agent changes (e.g. after a save).
  useEffect(() => {
    setForm(fromAgent(agent))
  }, [agent])

  const dirty = isDirty(form, baseline)

  const handleSave = async () => {
    await onSave({
      display_name: form.displayName.trim(),
      role: form.role.trim(),
      department: form.department.trim() || null,
      owner_user_id: form.ownerUserId.trim() || null,
      description: form.description.trim()
    })
  }

  return (
    <SectionShell
      id="identity"
      title="Identity"
      description="How this AI employee appears across the workforce surface."
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

        <div>
          <label
            htmlFor="ws-identity-role"
            className="gba:mb-1 gba:block gba:text-xs gba:font-semibold gba:text-foreground"
          >
            Role
          </label>
          <input
            id="ws-identity-role"
            value={form.role}
            onChange={e => setForm(prev => ({ ...prev, role: e.target.value }))}
            className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
            data-testid="workforce-identity-role"
          />
        </div>

        <div>
          <label
            htmlFor="ws-identity-department"
            className="gba:mb-1 gba:block gba:text-xs gba:font-semibold gba:text-foreground"
          >
            Department
          </label>
          <input
            id="ws-identity-department"
            value={form.department}
            onChange={e => setForm(prev => ({ ...prev, department: e.target.value }))}
            className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
            data-testid="workforce-identity-department"
          />
        </div>

        <div>
          <label
            htmlFor="ws-identity-owner"
            className="gba:mb-1 gba:block gba:text-xs gba:font-semibold gba:text-foreground"
          >
            Owner user ID
          </label>
          <input
            id="ws-identity-owner"
            value={form.ownerUserId}
            onChange={e => setForm(prev => ({ ...prev, ownerUserId: e.target.value }))}
            placeholder="Person responsible for escalations"
            className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
            data-testid="workforce-identity-owner"
          />
        </div>

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
