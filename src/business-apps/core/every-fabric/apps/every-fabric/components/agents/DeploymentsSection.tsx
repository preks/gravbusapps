// Deployments section for the unified agent config view.
//
// One agent record, two states. "Assistant" is the default reactive surface.
// Activating it as a "Worker" layers governed
// execution on the same agent — same id, skills, policies, and system prompt,
// plus a Passport (role, owner, autonomy, triggers, escalation, budget).
//
// This section lets an operator activate an existing agent as a Worker without
// creating a second record (calls POST /workforce/agents/{id}/deploy).

import React, { useMemo, useState } from 'react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import { BriefcaseIcon, ChatCircleIcon, CheckCircleIcon, SpinnerGapIcon } from '@phosphor-icons/react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { AgentDeployments } from './agentTypes'
import type { WorkforceAutonomyLevel } from '../enterprise-workforce/workforceTypes'
import translations from '../../_i18n'

interface DeploymentsSectionProps {
  agentId: string
  accessToken: string
  /** True when the agent already has a (live) Workforce deployment. */
  isWorkforceEnabled: boolean
  /** Derived deployment view, when available from the backend. */
  deployments?: AgentDeployments
  /** Called after a Workforce deployment is added so the parent can refresh. */
  onWorkforceDeployed?: () => void
  /** Hide the internal "Deployments" heading (e.g. when a tab already titles it). */
  hideHeading?: boolean
}

const AUTONOMY_KEYS: Array<{ value: WorkforceAutonomyLevel; labelKey: string }> = [
  { value: 'draft_only', labelKey: 'agents-autonomy-draft-only' },
  { value: 'approval_required', labelKey: 'agents-autonomy-approval-required' },
  { value: 'auto_low_risk', labelKey: 'agents-autonomy-auto-low-risk' },
  { value: 'full_auto', labelKey: 'agents-autonomy-full-auto' }
]

export const DeploymentsSection: React.FC<DeploymentsSectionProps> = ({
  agentId,
  accessToken,
  isWorkforceEnabled,
  deployments,
  onWorkforceDeployed,
  hideHeading = false
}) => {
  const { t } = useTranslation(translations)
  const client = usePromptManagerClient(accessToken)
  const autonomyOptions = useMemo(() => AUTONOMY_KEYS.map(opt => ({ value: opt.value, label: t(opt.labelKey) })), [t])

  const [formOpen, setFormOpen] = useState(false)
  const [role, setRole] = useState('')
  const [department, setDepartment] = useState('')
  const [autonomy, setAutonomy] = useState<WorkforceAutonomyLevel>('approval_required')
  const [instructions, setInstructions] = useState('')
  const [deploying, setDeploying] = useState(false)
  const [deployed, setDeployed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const workforceStatus = deployments?.workforce.status ?? (isWorkforceEnabled ? 'active' : null)
  const enterpriseEnabled = deployments?.enterprise.enabled ?? true
  const showWorkforceLive = isWorkforceEnabled || workforceStatus === 'active' || workforceStatus === 'paused'

  const handleDeploy = async () => {
    if (!role.trim()) {
      setError(t('agents-deploy-error-role-required'))
      return
    }
    setDeploying(true)
    setError(null)
    try {
      await client.deployWorkforce(agentId, {
        role: role.trim(),
        department: department.trim() || null,
        autonomy_level: autonomy,
        instructions: instructions.trim()
      })
      setDeployed(true)
      setFormOpen(false)
      onWorkforceDeployed?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('agents-deploy-error-failed'))
    } finally {
      setDeploying(false)
    }
  }

  return (
    <section data-testid="agent-config-deployments">
      {!hideHeading && (
        <>
          <h2 className="gba:text-base gba:font-semibold gba:text-foreground gba:mb-1">
            {t('agents-deployments-title')}
          </h2>
          <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">{t('agents-deployments-description')}</p>
        </>
      )}

      <div className="gba:space-y-3">
        {/* Enterprise deployment (always present) */}
        <div
          className="gba:flex gba:items-center gba:gap-3 gba:rounded-lg gba:border gba:border-border gba:bg-card gba:p-3"
          data-testid="deployment-enterprise"
        >
          <ChatCircleIcon className="gba:h-5 gba:w-5 gba:shrink-0 gba:text-sky-600" weight="duotone" />
          <div className="gba:flex-1 gba:min-w-0">
            <p className="gba:text-sm gba:font-medium gba:text-foreground">{t('agents-deploy-assistant-title')}</p>
            <p className="gba:text-xs gba:text-muted-foreground">Available for people to ask questions and get help.</p>
          </div>
          <span className="gba:shrink-0 gba:rounded-full gba:bg-sky-100 gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-medium gba:text-sky-700">
            {enterpriseEnabled ? t('agents-deploy-assistant-status') : t('agents-deploy-worker-status-off')}
          </span>
        </div>

        {/* Workforce deployment */}
        <div
          className="gba:rounded-lg gba:border gba:border-border gba:bg-card gba:p-3"
          data-testid="deployment-workforce"
        >
          <div className="gba:flex gba:items-center gba:gap-3">
            <BriefcaseIcon className="gba:h-5 gba:w-5 gba:shrink-0 gba:text-indigo-600" weight="duotone" />
            <div className="gba:flex-1 gba:min-w-0">
              <p className="gba:text-sm gba:font-medium gba:text-foreground">{t('agents-deploy-worker-title')}</p>
              <p className="gba:text-xs gba:text-muted-foreground">
                Runs as a governed Worker with a role, autonomy level, triggers, and budget.
              </p>
            </div>
            {showWorkforceLive ? (
              <span
                className={`gba:shrink-0 gba:rounded-full gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-medium ${
                  workforceStatus === 'paused'
                    ? 'gba:bg-amber-100 gba:text-amber-700'
                    : 'gba:bg-indigo-100 gba:text-indigo-700'
                }`}
                data-testid="deployment-workforce-status"
              >
                {workforceStatus === 'paused'
                  ? t('agents-deploy-worker-status-paused')
                  : t('agents-deploy-worker-status-active')}
              </span>
            ) : (
              !formOpen && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFormOpen(true)}
                  data-testid="add-workforce-deployment"
                >
                  {t('agents-deploy-activate-button')}
                </Button>
              )
            )}
          </div>

          {showWorkforceLive && (
            <p className="gba:mt-2 gba:text-xs gba:text-muted-foreground">
              Configure the Passport, autonomy, triggers, escalation, and budget below.
            </p>
          )}

          {deployed && !showWorkforceLive && (
            <p
              className="gba:mt-2 gba:inline-flex gba:items-center gba:gap-1.5 gba:text-xs gba:font-medium gba:text-emerald-700"
              data-testid="deployment-workforce-deployed"
            >
              <CheckCircleIcon className="gba:h-3.5 gba:w-3.5" weight="fill" />
              {t('agents-deploy-success-note')}
            </p>
          )}

          {formOpen && !showWorkforceLive && (
            <div className="gba:mt-3 gba:space-y-3 gba:border-t gba:border-border/60 gba:pt-3">
              {error && (
                <div className="gba:rounded-lg gba:border gba:border-destructive/30 gba:bg-destructive/5 gba:p-2.5 gba:text-xs gba:text-destructive">
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="wf-role" className="gba:block gba:text-xs gba:font-medium gba:text-foreground gba:mb-1">
                  Role <span className="gba:text-destructive">*</span>
                </label>
                <input
                  id="wf-role"
                  type="text"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  placeholder="e.g. Customer Care Agent"
                  className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                  data-testid="wf-role-input"
                />
              </div>
              <div>
                <label
                  htmlFor="wf-department"
                  className="gba:block gba:text-xs gba:font-medium gba:text-foreground gba:mb-1"
                >
                  Department
                </label>
                <input
                  id="wf-department"
                  type="text"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  placeholder="e.g. Support"
                  className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                  data-testid="wf-department-input"
                />
              </div>
              <div>
                <label
                  htmlFor="wf-autonomy"
                  className="gba:block gba:text-xs gba:font-medium gba:text-foreground gba:mb-1"
                >
                  Autonomy
                </label>
                <select
                  id="wf-autonomy"
                  value={autonomy}
                  onChange={e => setAutonomy(e.target.value as WorkforceAutonomyLevel)}
                  className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                  data-testid="wf-autonomy-select"
                >
                  {autonomyOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="wf-instructions"
                  className="gba:block gba:text-xs gba:font-medium gba:text-foreground gba:mb-1"
                >
                  Operating instructions <span className="gba:text-muted-foreground">(optional)</span>
                </label>
                <textarea
                  id="wf-instructions"
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  rows={3}
                  placeholder="How this agent should behave as a Worker (escalation rules, tone, limits)."
                  className="gba:w-full gba:resize-y gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                  data-testid="wf-instructions-input"
                />
                <p className="gba:mt-1 gba:text-[11px] gba:text-muted-foreground">
                  The agent keeps its existing system prompt; these instructions add Worker-specific operating rules.
                </p>
              </div>
              <div className="gba:flex gba:items-center gba:justify-end gba:gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFormOpen(false)
                    setError(null)
                  }}
                  disabled={deploying}
                  data-testid="wf-deploy-cancel"
                >
                  {t('agents-cancel-label')}
                </Button>
                <Button
                  size="sm"
                  onClick={() => void handleDeploy()}
                  disabled={deploying}
                  data-testid="wf-deploy-submit"
                >
                  {deploying ? (
                    <>
                      <SpinnerGapIcon className="gba:mr-1.5 gba:h-3.5 gba:w-3.5 gba:animate-spin" />
                      {t('agents-deploy-activating')}
                    </>
                  ) : (
                    t('agents-deploy-activate-button')
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
