// Budget section - soft credit limits with explicit overrun behaviour.

import React, { useEffect, useState } from 'react'
import { CoinsIcon } from '@phosphor-icons/react'
import { useTranslation } from '@newwork/nw-design-system'
import type { WorkforceAgent, WorkforceAgentUpdateInput, WorkforceBudget } from '../workforceTypes'
import { SectionShell } from './SectionShell'
import translations from '../../../_i18n'

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

const OPTIONS: { value: OnExceeded; labelKey: string; hintKey: string }[] = [
  { value: 'pause', labelKey: 'budget-opt-pause-label', hintKey: 'budget-opt-pause-hint' },
  { value: 'escalate', labelKey: 'budget-opt-escalate-label', hintKey: 'budget-opt-escalate-hint' },
  { value: 'warn', labelKey: 'budget-opt-warn-label', hintKey: 'budget-opt-warn-hint' }
]

export const BudgetSection: React.FC<BudgetSectionProps> = ({ agent, isSaving, onSave }) => {
  const { t } = useTranslation(translations)
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
      title={t('budget-title')}
      icon={CoinsIcon}
      description={t('budget-description')}
      isDirty={dirty}
      isSaving={isSaving}
      onSave={() => void handleSave()}
      onReset={() => setForm(baseline)}
    >
      <div className="gba:grid gba:grid-cols-1 gba:gap-3 gba:sm:grid-cols-3">
        {(['dailyCreditLimit', 'weeklyCreditLimit', 'monthlyCreditLimit'] as const).map(field => {
          const labelKey =
            field === 'dailyCreditLimit'
              ? 'budget-daily'
              : field === 'weeklyCreditLimit'
                ? 'budget-weekly'
                : 'budget-monthly'
          const label = t(labelKey)
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
                placeholder={t('budget-no-limit')}
                className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                data-testid={`workforce-budget-${dt}`}
              />
            </div>
          )
        })}
      </div>

      <fieldset className="gba:mt-4 gba:space-y-2" role="radiogroup" aria-label={t('budget-aria-exceeded')}>
        <legend className="gba:mb-1 gba:text-xs gba:font-semibold gba:text-foreground">
          {t('budget-when-exceeded')}
        </legend>
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
                <p className="gba:text-xs gba:font-medium gba:text-foreground">{t(opt.labelKey)}</p>
                <p className="gba:mt-0.5 gba:text-[11px] gba:text-muted-foreground">{t(opt.hintKey)}</p>
              </div>
            </label>
          )
        })}
      </fieldset>
    </SectionShell>
  )
}
