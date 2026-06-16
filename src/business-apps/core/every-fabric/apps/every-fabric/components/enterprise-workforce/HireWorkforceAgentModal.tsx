// Lightweight "hire" modal for the Workforce overview.
//
// Captures just enough to provision a workforce-surface agent:
//   - identifier (snake_case)
//   - display name + role + department
//   - description + base instructions
//   - autonomy level
//
// Triggers, escalation policy, budget and skills/policies attachment
// land in the dedicated configuration page (Phase 3). Until then
// the agent is created paused so a human reviews it before activation.

import { Button } from '@newwork/nw-design-system'
import { SparkleIcon, SpinnerGapIcon, XIcon } from '@phosphor-icons/react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type { PromptManagerClient } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import type { WorkforceAgent, WorkforceAutonomyLevel } from './workforceTypes'

export interface HireWorkforceAgentFormState {
  displayName: string
  role: string
  department: string
  description: string
  instructions: string
  autonomyLevel: WorkforceAutonomyLevel
}

type FormState = HireWorkforceAgentFormState

interface HireWorkforceAgentModalProps {
  open: boolean
  client: PromptManagerClient
  onClose: () => void
  onCreated: (agent: WorkforceAgent) => void
  /** Prefill the form (e.g. when hiring from the marketplace). */
  initialValues?: Partial<HireWorkforceAgentFormState>
  /** Tags applied to the created agent. Defaults to ['workforce']. */
  tags?: string[]
  /** Optional header overrides for marketplace-driven hires. */
  title?: string
  subtitle?: string
}

const INITIAL_STATE: FormState = {
  displayName: '',
  role: '',
  department: '',
  description: '',
  instructions: '',
  autonomyLevel: 'approval_required'
}

function buildInitialState(initialValues?: Partial<FormState>): FormState {
  return { ...INITIAL_STATE, ...initialValues }
}

interface AutonomyOption {
  value: WorkforceAutonomyLevel
  label: string
  hint: string
}

const AUTONOMY_OPTIONS: AutonomyOption[] = [
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
    hint: 'Runs end-to-end inside validated boundaries. Requires an escalation channel.'
  }
]

// Backend requires snake_case identifier (^[a-zA-Z0-9_]*$). We derive
// it from the display name so the user does not have to.
function slugifyAgentName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .slice(0, 100)
}

export const HireWorkforceAgentModal: React.FC<HireWorkforceAgentModalProps> = ({
  open,
  client,
  onClose,
  onCreated,
  initialValues,
  tags,
  title,
  subtitle
}) => {
  const [form, setForm] = useState<FormState>(() => buildInitialState(initialValues))
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Seed the form whenever the modal opens so marketplace prefills apply and
  // stale state from a previous open is cleared.
  useEffect(() => {
    if (open) {
      setForm(buildInitialState(initialValues))
      setError(null)
    } else {
      setForm(INITIAL_STATE)
      setError(null)
    }
  }, [open])

  const slug = useMemo(() => slugifyAgentName(form.displayName), [form.displayName])
  const isValid = slug.length >= 1 && form.role.trim().length > 0

  const handleSubmit = useCallback(async () => {
    if (!isValid) return
    setCreating(true)
    setError(null)
    try {
      const created = await client.createWorkforceAgent({
        name: slug,
        display_name: form.displayName.trim(),
        description: form.description.trim() || `Workforce agent specialised in ${form.role.trim()}`,
        domain: form.role.trim() || 'workforce',
        role: form.role.trim(),
        department: form.department.trim() || null,
        autonomy_level: form.autonomyLevel,
        instructions: form.instructions.trim(),
        tags: tags ?? ['workforce']
      })
      onCreated(created)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to hire workforce agent.')
    } finally {
      setCreating(false)
    }
  }, [client, form, slug, isValid, onCreated, onClose, tags])

  if (!open) return null

  return (
    <div
      className="gba:fixed gba:inset-0 gba:z-[60] gba:flex gba:items-center gba:justify-center gba:bg-background/70 gba:p-4 gba:backdrop-blur-sm"
      data-testid="hire-workforce-agent-modal"
    >
      <div className="gba:flex gba:max-h-[90vh] gba:w-full gba:max-w-xl gba:flex-col gba:overflow-hidden gba:rounded-2xl gba:border gba:border-border gba:bg-background gba:shadow-2xl">
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-3 gba:border-b gba:border-border/60 gba:px-5 gba:py-4">
          <div className="gba:flex gba:items-start gba:gap-3">
            <div className="gba:mt-0.5 gba:flex gba:h-9 gba:w-9 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-xl gba:bg-primary/10 gba:text-primary">
              <SparkleIcon className="gba:h-5 gba:w-5" weight="duotone" />
            </div>
            <div>
              <h2 className="gba:text-base gba:font-semibold gba:text-foreground">{title ?? 'Activate a Worker'}</h2>
              <p className="gba:text-xs gba:text-muted-foreground">
                {subtitle ??
                  'Activate a proactive Worker. You can wire up triggers, skills, escalation and budget in the next step.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="gba:inline-flex gba:h-8 gba:w-8 gba:items-center gba:justify-center gba:rounded-lg gba:text-muted-foreground gba:hover:bg-muted/60 gba:hover:text-foreground"
            aria-label="Close"
            data-testid="hire-workforce-close"
          >
            <XIcon className="gba:h-4 gba:w-4" />
          </button>
        </div>

        <div className="gba:flex-1 gba:overflow-y-auto gba:px-5 gba:py-4">
          {error && (
            <div
              className="gba:mb-4 gba:rounded-lg gba:border gba:border-destructive/40 gba:bg-destructive/5 gba:px-3 gba:py-2 gba:text-xs gba:text-destructive"
              data-testid="hire-workforce-error"
              role="alert"
            >
              {error}
            </div>
          )}

          <div className="gba:space-y-4">
            <div>
              <label
                htmlFor="hire-workforce-name"
                className="gba:mb-1 gba:block gba:text-xs gba:font-semibold gba:text-foreground"
              >
                Display name
              </label>
              <input
                id="hire-workforce-name"
                value={form.displayName}
                onChange={e => setForm(prev => ({ ...prev, displayName: e.target.value }))}
                placeholder="e.g. Claims Triage Specialist"
                className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                data-testid="hire-workforce-name"
              />
              <p className="gba:mt-1 gba:text-[11px] gba:text-muted-foreground">
                {slug ? (
                  <>
                    Stored as <code className="gba:rounded gba:bg-muted gba:px-1 gba:py-0.5 gba:font-mono">{slug}</code>
                  </>
                ) : (
                  'Letters, digits and spaces are fine — we will convert this to an identifier.'
                )}
              </p>
            </div>

            <div className="gba:grid gba:grid-cols-1 gba:gap-3 gba:sm:grid-cols-2">
              <div>
                <label
                  htmlFor="hire-workforce-role"
                  className="gba:mb-1 gba:block gba:text-xs gba:font-semibold gba:text-foreground"
                >
                  Role
                </label>
                <input
                  id="hire-workforce-role"
                  value={form.role}
                  onChange={e => setForm(prev => ({ ...prev, role: e.target.value }))}
                  placeholder="e.g. Claims agent"
                  className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                  data-testid="hire-workforce-role"
                />
              </div>
              <div>
                <label
                  htmlFor="hire-workforce-department"
                  className="gba:mb-1 gba:block gba:text-xs gba:font-semibold gba:text-foreground"
                >
                  Department
                </label>
                <input
                  id="hire-workforce-department"
                  value={form.department}
                  onChange={e => setForm(prev => ({ ...prev, department: e.target.value }))}
                  placeholder="e.g. Insurance Ops"
                  className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                  data-testid="hire-workforce-department"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="hire-workforce-description"
                className="gba:mb-1 gba:block gba:text-xs gba:font-semibold gba:text-foreground"
              >
                Short description
              </label>
              <input
                id="hire-workforce-description"
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="One sentence the team will see on the workforce card"
                className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                data-testid="hire-workforce-description"
              />
            </div>

            <div>
              <label
                htmlFor="hire-workforce-instructions"
                className="gba:mb-1 gba:block gba:text-xs gba:font-semibold gba:text-foreground"
              >
                Instructions
                <span className="gba:ml-1 gba:font-normal gba:text-muted-foreground">(optional)</span>
              </label>
              <textarea
                id="hire-workforce-instructions"
                value={form.instructions}
                onChange={e => setForm(prev => ({ ...prev, instructions: e.target.value }))}
                placeholder="How should this agent behave? E.g. Always check the policy library before replying. Escalate to a human if confidence < 0.7."
                rows={4}
                className="gba:min-h-24 gba:w-full gba:resize-y gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:leading-relaxed gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                data-testid="hire-workforce-instructions"
              />
            </div>

            <fieldset>
              <legend className="gba:mb-2 gba:text-xs gba:font-semibold gba:text-foreground">Autonomy</legend>
              <div className="gba:space-y-2" role="radiogroup" aria-label="Autonomy level">
                {AUTONOMY_OPTIONS.map(option => {
                  const checked = form.autonomyLevel === option.value
                  return (
                    <label
                      key={option.value}
                      className={`gba:flex gba:cursor-pointer gba:items-start gba:gap-3 gba:rounded-lg gba:border gba:px-3 gba:py-2 gba:transition-colors ${
                        checked
                          ? 'gba:border-foreground/30 gba:bg-muted/40'
                          : 'gba:border-border gba:hover:border-foreground/20'
                      }`}
                      data-testid={`hire-workforce-autonomy-${option.value}`}
                    >
                      <input
                        type="radio"
                        name="autonomy"
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
              </div>
            </fieldset>
          </div>
        </div>

        <div className="gba:flex gba:items-center gba:justify-end gba:gap-2 gba:border-t gba:border-border/60 gba:bg-muted/20 gba:px-5 gba:py-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <button
            type="button"
            disabled={creating || !isValid}
            onClick={() => void handleSubmit()}
            className="gba:inline-flex gba:h-9 gba:items-center gba:justify-center gba:gap-1.5 gba:rounded-md gba:bg-primary gba:px-4 gba:text-sm gba:font-medium gba:text-primary-foreground gba:shadow-sm gba:transition-colors gba:hover:bg-primary/90 gba:disabled:cursor-not-allowed gba:disabled:opacity-50"
            data-testid="hire-workforce-submit"
          >
            {creating && <SpinnerGapIcon className="gba:h-3.5 gba:w-3.5 gba:animate-spin" />}
            {creating ? 'Hiring…' : 'Hire agent'}
          </button>
        </div>
      </div>
    </div>
  )
}
