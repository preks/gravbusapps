// "Surface in Customer 360" section — opts the agent's inbound-email runs into
// the CRM Customer 360 Inbound tab. Backed by a tag on the agent record
// (CUSTOMER_360_INBOUND_TAG), saved through the standard agent update payload.

import React, { useEffect, useState } from 'react'
import { UsersThreeIcon } from '@phosphor-icons/react'
import {
  CUSTOMER_360_INBOUND_TAG,
  hasCustomer360InboundTag,
  toggleAgentTag,
  type WorkforceAgent,
  type WorkforceAgentUpdateInput
} from '../workforceTypes'
import { SectionShell } from './SectionShell'

interface Customer360SurfaceSectionProps {
  agent: WorkforceAgent
  isSaving: boolean
  onSave: (patch: WorkforceAgentUpdateInput) => Promise<void>
}

export const Customer360SurfaceSection: React.FC<Customer360SurfaceSectionProps> = ({ agent, isSaving, onSave }) => {
  const baseline = hasCustomer360InboundTag(agent)
  const [enabled, setEnabled] = useState(baseline)

  useEffect(() => {
    setEnabled(hasCustomer360InboundTag(agent))
  }, [agent])

  const dirty = enabled !== baseline

  return (
    <SectionShell
      id="customer-360-surface"
      title="Customer 360"
      icon={UsersThreeIcon}
      description="Surface this agent's inbound-email runs in the CRM Customer 360 Inbound tab, matched to the customer who wrote in."
      isDirty={dirty}
      isSaving={isSaving}
      onSave={() => void onSave({ tags: toggleAgentTag(agent.tags, CUSTOMER_360_INBOUND_TAG, enabled) })}
      onReset={() => setEnabled(baseline)}
    >
      <label
        className="gba:flex gba:cursor-pointer gba:items-start gba:gap-3 gba:rounded-lg gba:border gba:border-border gba:px-3 gba:py-2 gba:hover:border-foreground/20"
        data-testid="workforce-customer-360-surface-toggle"
      >
        <input
          type="checkbox"
          checked={enabled}
          onChange={event => setEnabled(event.target.checked)}
          className="gba:mt-0.5 gba:h-3.5 gba:w-3.5 gba:text-primary gba:focus:ring-primary"
        />
        <div className="gba:min-w-0 gba:flex-1">
          <p className="gba:text-xs gba:font-medium gba:text-foreground">Show inbound runs in Customer 360</p>
          <p className="gba:mt-0.5 gba:text-[11px] gba:text-muted-foreground">
            Inbound emails this agent handles appear in the Customer 360 Inbound stream. Leave off for agents whose mail
            should not show up in CRM.
          </p>
        </div>
      </label>
    </SectionShell>
  )
}
