// Autonomy section - how much the agent may decide on its own + custom instructions.

import React, { useEffect, useState } from 'react'
import { GaugeIcon } from '@phosphor-icons/react'
import type { WorkforceAgent, WorkforceAgentUpdateInput, WorkforceAutonomyLevel } from '../workforceTypes'
import { SectionShell } from './SectionShell'

interface AutonomySectionProps {
  agent: WorkforceAgent
  isSaving: boolean
  onSave: (patch: WorkforceAgentUpdateInput) => Promise<void>
}

interface FormState {
  autonomyLevel: WorkforceAutonomyLevel
  instructions: string
}

function fromAgent(agent: WorkforceAgent): FormState {
  return {
    autonomyLevel: agent.workforce_profile.autonomy_level,
    instructions: agent.workforce_profile.instructions ?? ''
  }
}

interface AutonomyOption {
  value: WorkforceAutonomyLevel
  label: string
  hint: string
}

const OPTIONS: AutonomyOption[] = [
  {
    value: 'draft_only',
    label: 'Assistive',
    hint: 'Searches, summarizes, classifies, and drafts. Makes no system changes.'
  },
  {
    value: 'approval_required',
    label: 'Approval Required',
    hint: 'Prepares actions and routes them to a human before execution.'
  },
  {
    value: 'auto_low_risk',
    label: 'Delegated',
    hint: 'Executes low-risk actions within thresholds and escalates exceptions.'
  },
  {
    value: 'full_auto',
    label: 'Autonomous',
    hint: 'Runs end-to-end inside validated boundaries. Requires at least one escalation channel.'
  }
]

export const AutonomySection: React.FC<AutonomySectionProps> = ({ agent, isSaving, onSave }) => {
  const baseline = fromAgent(agent)
  const [form, setForm] = useState<FormState>(baseline)

  useEffect(() => {
    setForm(fromAgent(agent))
  }, [agent])

  const dirty = form.autonomyLevel !== baseline.autonomyLevel || form.instructions !== baseline.instructions

  return (
    <SectionShell
      id="autonomy"
      title="Autonomy"
      icon={GaugeIcon}
      description="How much the agent may decide on its own + the custom system instructions it follows."
      isDirty={dirty}
      isSaving={isSaving}
      onSave={() =>
        void onSave({
          autonomy_level: form.autonomyLevel,
          instructions: form.instructions
        })
      }
      onReset={() => setForm(baseline)}
    >
      <fieldset className="gba:space-y-2" role="radiogroup" aria-label="Autonomy level">
        {OPTIONS.map(option => {
          const checked = form.autonomyLevel === option.value
          return (
            <label
              key={option.value}
              className={`gba:flex gba:cursor-pointer gba:items-start gba:gap-3 gba:rounded-lg gba:border gba:px-3 gba:py-2 gba:transition-colors ${
                checked
                  ? 'gba:border-foreground/30 gba:bg-muted/40'
                  : 'gba:border-border gba:hover:border-foreground/20'
              }`}
              data-testid={`workforce-autonomy-${option.value}`}
            >
              <input
                type="radio"
                name="workforce-autonomy"
                value={option.value}
                checked={checked}
                onChange={() => setForm(prev => ({ ...prev, autonomyLevel: option.value }))}
                className="gba:mt-0.5 gba:h-3.5 gba:w-3.5 gba:text-primary gba:focus:ring-primary"
              />
              <div className="gba:min-w-0 gba:flex-1">
                <p className="gba:text-xs gba:font-medium gba:text-foreground">{option.label}</p>
                <p className="gba:mt-0.5 gba:text-[11px] gba:text-muted-foreground">{option.hint}</p>
              </div>
            </label>
          )
        })}
      </fieldset>

      <div className="gba:mt-4">
        <label
          htmlFor="ws-autonomy-instructions"
          className="gba:mb-1 gba:block gba:text-xs gba:font-semibold gba:text-foreground"
        >
          Instructions
          <span className="gba:ml-1 gba:font-normal gba:text-muted-foreground">(appended to system prompt)</span>
        </label>
        <textarea
          id="ws-autonomy-instructions"
          value={form.instructions}
          onChange={e => setForm(prev => ({ ...prev, instructions: e.target.value }))}
          rows={5}
          className="gba:min-h-24 gba:w-full gba:resize-y gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:leading-relaxed gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
          data-testid="workforce-autonomy-instructions"
        />
      </div>
    </SectionShell>
  )
}
