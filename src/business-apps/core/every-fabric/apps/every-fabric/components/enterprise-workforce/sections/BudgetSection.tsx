// Budget section - soft credit limits with explicit overrun behaviour.

import React, { useEffect, useState } from 'react'
import type { WorkforceAgent, WorkforceAgentUpdateInput, WorkforceBudget } from '../workforceTypes'
import { SectionShell } from './SectionShell'

interface BudgetSectionProps {
  agent: WorkforceAgent
  isSaving: boolean
  onSave: (patch: WorkforceAgentUpdateInput) => Promise<void>
}

type OnExceeded = WorkforceBudget['on_exceeded']

interface FormState {
  dailyCreditLimit: string
  weeklyCreditLimit: string
  monthlyCreditLimit: string
  onExceeded: OnExceeded
}

function fromAgent(agent: WorkforceAgent): FormState {
  const budget = agent.workforce_profile.budget
  return {
    dailyCreditLimit: budget.daily_credit_limit?.toString() ?? '',
    weeklyCreditLimit: budget.weekly_credit_limit?.toString() ?? '',
    monthlyCreditLimit: budget.monthly_credit_limit?.toString() ?? '',
    onExceeded: budget.on_exceeded
  }
}

function parseLimit(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  if (Number.isNaN(parsed) || parsed < 0) return null
  return Math.floor(parsed)
}

const OPTIONS: { value: OnExceeded; label: string; hint: string }[] = [
  { value: 'pause', label: 'Pause', hint: 'Block new runs once the budget is exhausted.' },
  { value: 'escalate', label: 'Escalate', hint: 'Route the next run to the human owner instead.' },
  { value: 'warn', label: 'Warn only', hint: 'Log a warning but keep running.' }
]

export const BudgetSection: React.FC<BudgetSectionProps> = ({ agent, isSaving, onSave }) => {
  const baseline = fromAgent(agent)
  const [form, setForm] = useState<FormState>(baseline)

  useEffect(() => {
    setForm(fromAgent(agent))
  }, [agent])

  const dirty =
    form.dailyCreditLimit !== baseline.dailyCreditLimit ||
    form.weeklyCreditLimit !== baseline.weeklyCreditLimit ||
    form.monthlyCreditLimit !== baseline.monthlyCreditLimit ||
    form.onExceeded !== baseline.onExceeded

  const handleSave = () =>
    onSave({
      budget: {
        daily_credit_limit: parseLimit(form.dailyCreditLimit),
        weekly_credit_limit: parseLimit(form.weeklyCreditLimit),
        monthly_credit_limit: parseLimit(form.monthlyCreditLimit),
        on_exceeded: form.onExceeded
      }
    })

  return (
    <SectionShell
      id="budget"
      title="Budget"
      description="Soft credit limits enforced at run time. 1 credit = 1,000 total tokens."
      isDirty={dirty}
      isSaving={isSaving}
      onSave={() => void handleSave()}
      onReset={() => setForm(baseline)}
    >
      <div className="gba:grid gba:grid-cols-1 gba:gap-3 gba:sm:grid-cols-3">
        {(['dailyCreditLimit', 'weeklyCreditLimit', 'monthlyCreditLimit'] as const).map(field => {
          const label =
            field === 'dailyCreditLimit'
              ? 'Daily credits'
              : field === 'weeklyCreditLimit'
                ? 'Weekly credits'
                : 'Monthly credits'
          const dt = field.replace('CreditLimit', '')
          return (
            <div key={field}>
              <label
                htmlFor={`ws-budget-${dt}`}
                className="gba:mb-1 gba:block gba:text-xs gba:font-semibold gba:text-foreground"
              >
                {label}
              </label>
              <input
                id={`ws-budget-${dt}`}
                type="number"
                min={0}
                value={form[field]}
                onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                placeholder="No limit"
                className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                data-testid={`workforce-budget-${dt}`}
              />
            </div>
          )
        })}
      </div>

      <fieldset className="gba:mt-4 gba:space-y-2" role="radiogroup" aria-label="Behaviour when budget exceeded">
        <legend className="gba:mb-1 gba:text-xs gba:font-semibold gba:text-foreground">When exceeded</legend>
        {OPTIONS.map(opt => {
          const checked = form.onExceeded === opt.value
          return (
            <label
              key={opt.value}
              className={`gba:flex gba:cursor-pointer gba:items-start gba:gap-3 gba:rounded-lg gba:border gba:px-3 gba:py-2 gba:transition-colors ${
                checked ? 'gba:border-foreground/30 gba:bg-muted/40' : 'gba:border-border'
              }`}
              data-testid={`workforce-budget-on-exceeded-${opt.value}`}
            >
              <input
                type="radio"
                name="workforce-budget-on-exceeded"
                value={opt.value}
                checked={checked}
                onChange={() => setForm(prev => ({ ...prev, onExceeded: opt.value }))}
                className="gba:mt-0.5 gba:h-3.5 gba:w-3.5"
              />
              <div>
                <p className="gba:text-xs gba:font-medium gba:text-foreground">{opt.label}</p>
                <p className="gba:mt-0.5 gba:text-[11px] gba:text-muted-foreground">{opt.hint}</p>
              </div>
            </label>
          )
        })}
      </fieldset>
    </SectionShell>
  )
}
