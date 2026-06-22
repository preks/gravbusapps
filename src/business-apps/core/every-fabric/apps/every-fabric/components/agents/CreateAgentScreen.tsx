// Full-screen agent creation flow on the Every Fabric agents surface.
//
// Replaces the old CreateAgentModal with a prominent, roomy screen that is
// swapped in by AgentsScreen (like AgentConfigView). The user gives the agent a
// name + specialty + a real description + instructions (system prompt), and can
// optionally attach internal company policies. Heavier configuration lives in
// the full Enterprise Agent Studio, linked from the footer.

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  ArrowLeftIcon,
  ArrowSquareOutIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  IdentificationCardIcon,
  LightbulbIcon,
  LightningIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  SpinnerGapIcon,
  TagIcon,
  WarningCircleIcon,
  type Icon as PhosphorIcon
} from '@phosphor-icons/react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import type {
  AIModelODM,
  PromptManagerClient,
  WorkspaceODM
} from '@/common/network/ai/prompt-manager/PromptManagerClient'
import type { WorkforceAutonomyLevel } from '../enterprise-workforce/workforceTypes'
import { useContentEntries } from '@/common/data/content/hooks/useContentEntries'
import { ContentGroup, ContentRole } from '@/common/data/content/constants/contentConstants'
import type { ContentEntry } from '@/common/data/content/types/contentEntryTypes'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import {
  buildSystemPromptTemplate,
  evaluateDescription,
  evaluateSystemPrompt,
  DESCRIPTION_EXAMPLE,
  DESCRIPTION_MIN_LENGTH,
  SYSTEM_PROMPT_MIN_LENGTH
} from './agentStandard'
import translations from '../../_i18n'

const STUDIO_URL = '/platform/create/prompt-manager'

const POLICY_FIELDS: Array<keyof ContentEntry> = ['id', 'title', 'preview', 'contentGroup', 'updatedAt']

interface CreateAgentScreenProps {
  client: PromptManagerClient
  accessToken: string
  onBack: () => void
  onCreated: () => Promise<void> | void
}

interface FormState {
  displayName: string
  specialty: string
  description: string
  instructions: string
  visibility: 'workspace' | 'private'
}

const DEFAULT_INSTRUCTIONS_PLACEHOLDER = `You are <name>, an expert in <domain>. Your mission is to <one line>.

Capabilities:
- You handle requests by following your assigned skills and their tools.

Constraints:
- IMPORTANT: You MUST <hard rule>.
- You NEVER <forbidden action>.

Output:
- Be concise. IMPORTANT: <repeat the most critical rule>.`

const initialState: FormState = {
  displayName: '',
  specialty: '',
  description: '',
  instructions: '',
  visibility: 'workspace'
}

const WORKFORCE_AUTONOMY_KEYS: Array<{ value: WorkforceAutonomyLevel; key: string }> = [
  { value: 'draft_only', key: 'agents-autonomy-draft-only' },
  { value: 'approval_required', key: 'agents-autonomy-approval-required' },
  { value: 'auto_low_risk', key: 'agents-autonomy-auto-low-risk' },
  { value: 'full_auto', key: 'agents-autonomy-full-auto' }
]

type CreateAgentStep = 'profile' | 'capabilities' | 'deployment' | 'passport' | 'activation'

const CREATE_STEP_I18N: Record<CreateAgentStep, string> = {
  profile: 'agents-create-step-profile',
  capabilities: 'agents-create-step-capabilities',
  deployment: 'agents-create-step-deployment',
  passport: 'agents-create-step-passport',
  activation: 'agents-create-step-activation'
}

const CREATE_STEP_DEFS: ReadonlyArray<{
  value: CreateAgentStep
  icon: PhosphorIcon
  optional?: boolean
}> = [
  { value: 'profile', icon: TagIcon },
  { value: 'capabilities', icon: LightbulbIcon },
  { value: 'deployment', icon: LightningIcon },
  { value: 'passport', icon: IdentificationCardIcon, optional: true },
  { value: 'activation', icon: CheckCircleIcon, optional: true }
]

/**
 * Convert a free-text display name into the snake_case identifier the
 * prompt-manager backend requires (`^[a-zA-Z0-9_]*$`).
 */
function slugifyAgentName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .slice(0, 100)
}

function buildSystemPrompt(form: FormState): string {
  return form.instructions.trim()
}

interface PolicyChoice {
  id: string
  title: string
  preview?: string
}

const usePolicies = (accessToken: string, search: string, enabled: boolean) => {
  const params = useMemo(
    () => ({
      role: ContentRole.ROOT,
      contentGroups: [ContentGroup.POLICY],
      search,
      limit: 50,
      offset: 0,
      sortBy: 'updatedAt' as const,
      sortOrder: 'DESC' as const
    }),
    [search]
  )
  const options = useMemo(() => ({ fields: POLICY_FIELDS, relationLimit: 0 }), [])
  const result = useContentEntries(enabled ? params : {}, accessToken, options)
  const choices: PolicyChoice[] = useMemo(
    () =>
      (result.entries ?? []).map(entry => ({
        id: String(entry.id),
        title: entry.title || 'Untitled policy',
        preview: typeof entry.preview === 'string' ? entry.preview : undefined
      })),
    [result.entries]
  )
  return { choices, isLoading: result.isLoading, error: result.error }
}

interface CreateStepSectionProps {
  step: number
  title: string
  description: string
  complete?: boolean
  optional?: boolean
  children: ReactNode
}

const CreateStepSection: React.FC<CreateStepSectionProps> = ({
  step,
  title,
  description,
  complete = false,
  optional = false,
  children
}) => (
  <section
    className="gba:rounded-xl gba:border gba:border-border gba:bg-card gba:p-4 gba:shadow-sm"
    data-testid={`create-agent-step-panel-${step}`}
  >
    <div className="gba:mb-4 gba:flex gba:items-start gba:gap-3">
      <span
        className={`gba:flex gba:h-7 gba:w-7 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-full gba:text-xs gba:font-semibold ${
          complete ? 'gba:bg-emerald-100 gba:text-emerald-700' : 'gba:bg-muted gba:text-muted-foreground'
        }`}
      >
        {complete ? <CheckCircleIcon className="gba:h-4 gba:w-4" weight="fill" /> : step}
      </span>
      <div className="gba:min-w-0 gba:flex-1">
        <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
          <h2 className="gba:text-base gba:font-semibold gba:text-foreground">{title}</h2>
          {optional && (
            <span className="gba:rounded-full gba:bg-muted gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-medium gba:text-muted-foreground">
              Optional
            </span>
          )}
        </div>
        <p className="gba:mt-1 gba:text-xs gba:text-muted-foreground">{description}</p>
      </div>
    </div>
    <div className="gba:space-y-4">{children}</div>
  </section>
)

export const CreateAgentScreen: React.FC<CreateAgentScreenProps> = ({ client, accessToken, onBack, onCreated }) => {
  const { t } = useTranslation(translations)
  const [form, setForm] = useState<FormState>(initialState)
  const [policySearch, setPolicySearch] = useState('')
  const [selectedPolicyIds, setSelectedPolicyIds] = useState<Set<string>>(new Set())
  const [workspace, setWorkspace] = useState<WorkspaceODM | null>(null)
  const [model, setModel] = useState<AIModelODM | null>(null)
  const [isLoadingDefaults, setIsLoadingDefaults] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeStep, setActiveStep] = useState<CreateAgentStep>('profile')

  // Optional Workforce deployment, chosen at creation time. When enabled, the
  // agent is created and then immediately given a (paused) Workforce deployment
  // on the same record — one agent, two deployments.
  const [deployWorkforce, setDeployWorkforce] = useState(false)
  const [workforceRole, setWorkforceRole] = useState('')
  const [workforceDepartment, setWorkforceDepartment] = useState('')
  const [workforceAutonomy, setWorkforceAutonomy] = useState<WorkforceAutonomyLevel>('approval_required')

  const policies = usePolicies(accessToken, policySearch, true)

  useEffect(() => {
    let mounted = true
    setIsLoadingDefaults(true)
    setError(null)
    ;(async () => {
      try {
        const [workspacesPage, modelsPage] = await Promise.all([
          client.getWorkspaces({ limit: 100, offset: 0, returnTotalRecords: false }),
          client.getAiModels({ limit: 100, offset: 0, returnTotalRecords: false })
        ])
        if (!mounted) return

        const defaultWorkspace =
          workspacesPage.data.find(row => row.default && row._id) ?? workspacesPage.data.find(row => row._id)
        const defaultModel = modelsPage.data.find(row => row._id)
        setWorkspace(defaultWorkspace ?? null)
        setModel(defaultModel ?? null)
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load workspace/model defaults.')
        }
      } finally {
        if (mounted) setIsLoadingDefaults(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [client])

  const slug = useMemo(() => slugifyAgentName(form.displayName), [form.displayName])
  const promptSignals = useMemo(() => evaluateSystemPrompt(form.instructions), [form.instructions])
  const descriptionSignals = useMemo(
    () => evaluateDescription(form.description, form.displayName),
    [form.description, form.displayName]
  )
  const workforceValid = !deployWorkforce || workforceRole.trim().length > 0
  const isValid =
    slug.length >= 1 &&
    !!workspace?._id &&
    !!model?._id &&
    promptSignals.meetsMinimum &&
    descriptionSignals.isValid &&
    workforceValid

  const togglePolicy = useCallback((id: string) => {
    setSelectedPolicyIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleCreate = useCallback(async () => {
    if (!isValid || !workspace?._id || !model?._id) return
    setCreating(true)
    setError(null)
    try {
      const created = await client.createPrompt({
        name: slug,
        description: form.description.trim() || `Agent specialised in ${form.specialty || form.displayName}`,
        type: 'chat',
        systemContent: buildSystemPrompt(form),
        userContent: '{{input}}',
        tools: [],
        toolPolicies: {},
        modelId: model._id,
        workspaceId: workspace._id,
        agentType: 'general',
        specialty: form.specialty.trim() || form.displayName,
        responseStyle: 'conversational',
        avatar: '',
        color: '',
        isPublic: false,
        tags: ['enterprise-ai', 'agent'],
        agentKind: 'task_expert',
        skillIds: [],
        skillBindings: [],
        visibility: form.visibility,
        runtimeMode: 'deep_agent'
      })

      const promptId = (created as { _id?: string; id?: string })._id ?? (created as { id?: string }).id
      if (promptId && selectedPolicyIds.size > 0) {
        await Promise.allSettled(
          [...selectedPolicyIds].map(policyId => {
            const choice = policies.choices.find(c => c.id === policyId)
            return client.addKnowledgeSourceContent(
              promptId,
              policyId,
              choice?.title ?? policyId,
              choice?.preview?.slice(0, 200)
            )
          })
        )
      }

      // Optional second deployment: add a paused Workforce deployment to the
      // same agent record. Created paused so the operator reviews triggers and
      // budget before it can auto-fire.
      if (promptId && deployWorkforce) {
        await client.deployWorkforce(promptId, {
          role: workforceRole.trim(),
          department: workforceDepartment.trim() || null,
          autonomy_level: workforceAutonomy,
          instructions: ''
        })
        await client.generateAgentAvatar(promptId).catch(() => null)
      }

      await onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent. Please try again.')
    } finally {
      setCreating(false)
    }
  }, [
    client,
    form,
    slug,
    isValid,
    selectedPolicyIds,
    policies.choices,
    workspace,
    model,
    onCreated,
    deployWorkforce,
    workforceRole,
    workforceDepartment,
    workforceAutonomy
  ])

  const hasValidDefaults = Boolean(workspace?._id && model?._id)

  let submitLabel = t('agents-create-submit')
  if (creating) submitLabel = t('agents-create-submitting')
  else if (isLoadingDefaults) submitLabel = t('agents-create-loading-setup')
  else if (deployWorkforce) submitLabel = t('agents-create-submit-worker')

  let defaultsHint: ReactNode
  if (isLoadingDefaults) {
    defaultsHint = (
      <span className="gba:inline-flex gba:items-center gba:gap-1.5">
        <SpinnerGapIcon className="gba:h-3.5 gba:w-3.5 gba:animate-spin" />
        {t('agents-create-loading-defaults')}
      </span>
    )
  } else if (hasValidDefaults) {
    defaultsHint = <span>{t('agents-create-creating-in', { workspace: workspace?.name ?? '' })}</span>
  } else {
    defaultsHint = <span className="gba:text-destructive">{t('agents-create-no-defaults')}</span>
  }

  const profileComplete = slug.length >= 1 && descriptionSignals.isValid
  const capabilitiesComplete = promptSignals.meetsMinimum
  const deploymentComplete = deployWorkforce
  const passportComplete = deployWorkforce && workforceRole.trim().length > 0
  const activationComplete = deployWorkforce && workforceValid
  const completedByStep: Record<CreateAgentStep, boolean> = {
    profile: profileComplete,
    capabilities: capabilitiesComplete,
    deployment: deploymentComplete,
    passport: passportComplete,
    activation: activationComplete
  }
  const completedSteps = CREATE_STEP_DEFS.filter(step => completedByStep[step.value]).length
  const nextStep =
    CREATE_STEP_DEFS.find(step => !completedByStep[step.value]) ?? CREATE_STEP_DEFS[CREATE_STEP_DEFS.length - 1]

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid="create-agent-screen">
      {/* Header */}
      <div className="gba:shrink-0 gba:px-6 gba:lg:px-10 gba:pt-6 gba:pb-4 gba:border-b gba:border-border/50">
        <div className="gba:flex gba:items-center gba:gap-3">
          <button
            type="button"
            onClick={onBack}
            className="gba:inline-flex gba:items-center gba:justify-center gba:h-8 gba:w-8 gba:rounded-lg gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
            data-testid="create-agent-back"
          >
            <ArrowLeftIcon className="gba:h-5 gba:w-5" />
          </button>
          <div>
            <h1 className="gba:text-2xl gba:font-semibold gba:text-foreground">{t('agents-create-title')}</h1>
            <p className="gba:text-base gba:text-muted-foreground">{t('agents-create-subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="gba:flex-1 gba:overflow-y-auto">
        <div className="gba:mx-auto gba:flex gba:max-w-7xl gba:flex-col gba:gap-6 gba:px-6 gba:py-6 gba:lg:flex-row gba:lg:px-10">
          <aside className="gba:w-full gba:shrink-0 gba:lg:sticky gba:lg:top-6 gba:lg:w-72 gba:lg:self-start">
            <div
              className="gba:rounded-xl gba:border gba:border-border gba:bg-card gba:p-4 gba:shadow-sm"
              data-testid="create-agent-setup-progress"
            >
              <div>
                <p className="gba:text-xs gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground">
                  {t('agents-create-setup-title')}
                </p>
                <p className="gba:mt-1 gba:text-sm gba:text-foreground">
                  {t('agents-create-steps-ready', { completed: completedSteps, total: CREATE_STEP_DEFS.length })}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gba:mt-3 gba:w-full"
                onClick={() => setActiveStep(nextStep.value)}
                data-testid="create-agent-next-step"
              >
                {t('agents-create-continue', { step: t(CREATE_STEP_I18N[nextStep.value]) })}
              </Button>
            </div>

            <nav className="gba:mt-3 gba:space-y-2" data-testid="create-agent-tabs">
              {CREATE_STEP_DEFS.map((step, index) => {
                const StepIcon = step.icon
                const complete = completedByStep[step.value]
                const active = activeStep === step.value
                return (
                  <button
                    key={step.value}
                    type="button"
                    onClick={() => setActiveStep(step.value)}
                    className={`gba:flex gba:w-full gba:items-center gba:gap-3 gba:rounded-lg gba:border gba:px-3 gba:py-2.5 gba:text-left gba:transition-colors ${
                      active
                        ? 'gba:border-primary gba:bg-primary/5 gba:text-foreground gba:shadow-sm'
                        : 'gba:border-border/70 gba:bg-card gba:text-muted-foreground gba:hover:border-border gba:hover:text-foreground'
                    }`}
                    data-testid={`create-agent-step-${index + 1}`}
                  >
                    <span
                      className={`gba:flex gba:h-6 gba:w-6 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-full gba:text-[11px] gba:font-semibold ${
                        complete ? 'gba:bg-emerald-100 gba:text-emerald-700' : 'gba:bg-muted gba:text-muted-foreground'
                      }`}
                    >
                      {complete ? <CheckCircleIcon className="gba:h-3.5 gba:w-3.5" weight="fill" /> : index + 1}
                    </span>
                    <span className="gba:min-w-0 gba:flex-1">
                      <span className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:font-semibold">
                        <StepIcon className="gba:h-4 gba:w-4" />
                        {t(CREATE_STEP_I18N[step.value])}
                      </span>
                      {step.optional && (
                        <span className="gba:mt-0.5 gba:block gba:text-[10px] gba:text-muted-foreground">
                          {t('agents-create-optional-worker')}
                        </span>
                      )}
                    </span>
                  </button>
                )
              })}
            </nav>

            <div className="gba:mt-3 gba:rounded-lg gba:border gba:border-border/60 gba:bg-muted/20 gba:px-3 gba:py-2 gba:text-xs gba:text-muted-foreground">
              {defaultsHint}
            </div>
          </aside>

          <main className="gba:min-w-0 gba:flex-1">
            {error && (
              <div
                className="gba:mb-4 gba:rounded-lg gba:border gba:border-destructive/40 gba:bg-destructive/5 gba:px-3 gba:py-2 gba:text-sm gba:text-destructive"
                data-testid="create-agent-error"
              >
                {error}
              </div>
            )}

            <div
              className="gba:mb-4 gba:rounded-lg gba:border gba:border-amber-500/30 gba:bg-amber-500/5 gba:px-3 gba:py-2 gba:text-xs gba:text-amber-700"
              data-testid="create-agent-tool-vs-agent-hint"
            >
              {t('agents-create-tool-hint')}
            </div>

            <div className="gba:mx-auto gba:max-w-3xl">
              {activeStep === 'profile' && (
                <CreateStepSection
                  step={1}
                  title={t('agents-create-step-profile')}
                  description={t('agents-create-profile-desc')}
                  complete={profileComplete}
                >
                  <div>
                    <label
                      htmlFor="agent-display-name"
                      className="gba:mb-1 gba:block gba:text-base gba:font-medium gba:text-foreground"
                    >
                      {t('agents-create-field-name')}
                    </label>
                    <input
                      id="agent-display-name"
                      value={form.displayName}
                      onChange={e => setForm(prev => ({ ...prev, displayName: e.target.value }))}
                      placeholder="e.g. Support Ticket Agent"
                      className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3.5 gba:py-2.5 gba:text-base gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                      data-testid="create-agent-name"
                    />
                    <p className="gba:mt-1 gba:text-[11px] gba:text-muted-foreground">{t('agents-create-name-hint')}</p>
                    <p className="gba:mt-0.5 gba:text-[11px] gba:text-muted-foreground">
                      {slug ? (
                        <>
                          {t('agents-create-stored-as')}{' '}
                          <code className="gba:rounded gba:bg-muted gba:px-1 gba:py-0.5 gba:font-mono">{slug}</code> —{' '}
                          {t('agents-create-identifier-hint')}
                        </>
                      ) : (
                        t('agents-create-identifier-auto')
                      )}
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="agent-specialty"
                      className="gba:mb-1 gba:block gba:text-base gba:font-medium gba:text-foreground"
                    >
                      {t('agents-create-field-specialty')}
                    </label>
                    <input
                      id="agent-specialty"
                      value={form.specialty}
                      onChange={e => setForm(prev => ({ ...prev, specialty: e.target.value }))}
                      placeholder="e.g. Employee support, procurement, sales follow-ups"
                      className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3.5 gba:py-2.5 gba:text-base gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                      data-testid="create-agent-specialty"
                    />
                    <p className="gba:mt-1 gba:text-[11px] gba:text-muted-foreground">
                      {t('agents-create-specialty-hint')}
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="agent-description"
                      className="gba:mb-1 gba:block gba:text-base gba:font-medium gba:text-foreground"
                    >
                      {t('agents-create-field-description')}
                    </label>
                    <p className="gba:mb-1.5 gba:text-xs gba:text-muted-foreground">
                      {t('agents-create-description-helper')}
                    </p>
                    <textarea
                      id="agent-description"
                      value={form.description}
                      onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      placeholder={DESCRIPTION_EXAMPLE}
                      className="gba:w-full gba:resize-y gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3.5 gba:py-2.5 gba:text-base gba:leading-relaxed gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                      data-testid="create-agent-description"
                    />
                    <DescriptionChecklist signals={descriptionSignals} />
                    <p className="gba:mt-1.5 gba:text-[11px] gba:text-muted-foreground">
                      {t('agents-create-description-example-label')}{' '}
                      <span className="gba:italic">{DESCRIPTION_EXAMPLE}</span>
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="create-agent-visibility"
                      className="gba:mb-1 gba:block gba:text-base gba:font-medium gba:text-foreground"
                    >
                      {t('agents-create-field-visibility')}
                    </label>
                    <select
                      id="create-agent-visibility"
                      value={form.visibility}
                      onChange={e =>
                        setForm(prev => ({ ...prev, visibility: e.target.value as FormState['visibility'] }))
                      }
                      className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3.5 gba:py-2.5 gba:text-base gba:text-foreground"
                      data-testid="create-agent-visibility"
                    >
                      <option value="workspace">{t('agents-create-visibility-workspace')}</option>
                      <option value="private">{t('agents-create-visibility-private')}</option>
                    </select>
                  </div>
                </CreateStepSection>
              )}

              {activeStep === 'capabilities' && (
                <CreateStepSection
                  step={2}
                  title={t('agents-create-step-capabilities')}
                  description={t('agents-create-capabilities-desc')}
                  complete={capabilitiesComplete}
                >
                  <div>
                    <div className="gba:mb-1 gba:flex gba:items-baseline gba:justify-between">
                      <label htmlFor="agent-instructions" className="gba:text-base gba:font-medium gba:text-foreground">
                        {t('agents-create-field-instructions')}{' '}
                        <span className="gba:font-normal gba:text-muted-foreground">
                          {t('agents-create-field-instructions-system')}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setForm(prev => ({
                            ...prev,
                            instructions: buildSystemPromptTemplate(prev.displayName, prev.specialty)
                          }))
                        }
                        className="gba:text-[11px] gba:font-medium gba:text-primary gba:hover:text-primary/80"
                        data-testid="create-agent-instructions-template"
                      >
                        {t('agents-create-use-template')}
                      </button>
                    </div>
                    <textarea
                      id="agent-instructions"
                      value={form.instructions}
                      onChange={e => setForm(prev => ({ ...prev, instructions: e.target.value }))}
                      placeholder={DEFAULT_INSTRUCTIONS_PLACEHOLDER}
                      rows={14}
                      className="gba:min-h-64 gba:w-full gba:resize-y gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3.5 gba:py-2.5 gba:text-base gba:leading-relaxed gba:text-foreground gba:font-mono gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                      data-testid="create-agent-instructions"
                    />
                    <SystemPromptChecklist signals={promptSignals} />
                  </div>

                  <PolicySelector
                    choices={policies.choices}
                    isLoading={policies.isLoading}
                    loadError={policies.error}
                    search={policySearch}
                    onSearchChange={setPolicySearch}
                    selectedIds={selectedPolicyIds}
                    onToggle={togglePolicy}
                  />
                </CreateStepSection>
              )}

              {activeStep === 'deployment' && (
                <CreateStepSection
                  step={3}
                  title={t('agents-create-step-deployment')}
                  description={t('agents-create-deployment-desc')}
                  complete={deploymentComplete}
                >
                  <div data-testid="create-agent-deployments">
                    <label
                      className="gba:flex gba:cursor-pointer gba:items-start gba:gap-2.5 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2.5"
                      data-testid="create-agent-workforce-toggle"
                      aria-labelledby="create-agent-workforce-label"
                    >
                      <input
                        type="checkbox"
                        checked={deployWorkforce}
                        onChange={e => setDeployWorkforce(e.target.checked)}
                        className="gba:mt-0.5 gba:h-4 gba:w-4 gba:rounded gba:border-border gba:text-primary gba:focus:ring-primary"
                        data-testid="create-agent-workforce-checkbox"
                      />
                      <div className="gba:min-w-0 gba:flex-1">
                        <p
                          id="create-agent-workforce-label"
                          className="gba:flex gba:items-center gba:gap-1.5 gba:text-sm gba:font-medium gba:text-foreground"
                        >
                          <BriefcaseIcon className="gba:h-4 gba:w-4 gba:text-indigo-600" weight="duotone" />
                          {t('agents-create-workforce-toggle')}
                        </p>
                        <p className="gba:text-[11px] gba:text-muted-foreground">
                          {t('agents-create-workforce-toggle-desc')}
                        </p>
                      </div>
                    </label>
                  </div>
                </CreateStepSection>
              )}

              {activeStep === 'passport' && (
                <CreateStepSection
                  step={4}
                  title={t('agents-create-step-passport')}
                  description={t('agents-create-passport-desc')}
                  complete={passportComplete}
                  optional
                >
                  {deployWorkforce ? (
                    <div className="gba:space-y-3">
                      <div>
                        <label
                          htmlFor="create-agent-workforce-role"
                          className="gba:mb-1 gba:block gba:text-xs gba:font-medium gba:text-foreground"
                        >
                          {t('agents-create-field-role')} <span className="gba:text-destructive">*</span>
                        </label>
                        <input
                          id="create-agent-workforce-role"
                          value={workforceRole}
                          onChange={e => setWorkforceRole(e.target.value)}
                          placeholder="e.g. Customer Care Agent"
                          className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                          data-testid="create-agent-workforce-role"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="create-agent-workforce-department"
                          className="gba:mb-1 gba:block gba:text-xs gba:font-medium gba:text-foreground"
                        >
                          {t('agents-create-field-department')}
                        </label>
                        <input
                          id="create-agent-workforce-department"
                          value={workforceDepartment}
                          onChange={e => setWorkforceDepartment(e.target.value)}
                          placeholder="e.g. Support"
                          className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                          data-testid="create-agent-workforce-department"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="gba:rounded-lg gba:border gba:border-dashed gba:border-border gba:bg-muted/20 gba:px-3 gba:py-3 gba:text-xs gba:text-muted-foreground">
                      {t('agents-create-passport-skip')}
                    </div>
                  )}
                </CreateStepSection>
              )}

              {activeStep === 'activation' && (
                <CreateStepSection
                  step={5}
                  title={t('agents-create-step-activation')}
                  description={t('agents-create-activation-desc')}
                  complete={activationComplete}
                  optional
                >
                  {deployWorkforce ? (
                    <div className="gba:space-y-3">
                      <div>
                        <label
                          htmlFor="create-agent-workforce-autonomy"
                          className="gba:mb-1 gba:block gba:text-xs gba:font-medium gba:text-foreground"
                        >
                          {t('agents-create-field-autonomy')}
                        </label>
                        <select
                          id="create-agent-workforce-autonomy"
                          value={workforceAutonomy}
                          onChange={e => setWorkforceAutonomy(e.target.value as WorkforceAutonomyLevel)}
                          className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                          data-testid="create-agent-workforce-autonomy"
                        >
                          {WORKFORCE_AUTONOMY_KEYS.map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {t(opt.key)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="gba:rounded-lg gba:border gba:border-amber-500/30 gba:bg-amber-500/5 gba:px-3 gba:py-3 gba:text-xs gba:text-amber-700">
                        {t('agents-create-activation-paused')}
                      </div>
                    </div>
                  ) : (
                    <div className="gba:rounded-lg gba:border gba:border-dashed gba:border-border gba:bg-muted/20 gba:px-3 gba:py-3 gba:text-xs gba:text-muted-foreground">
                      {t('agents-create-activation-no-worker')}
                    </div>
                  )}
                </CreateStepSection>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Footer */}
      <div className="gba:shrink-0 gba:flex gba:items-center gba:justify-between gba:gap-3 gba:border-t gba:border-border/60 gba:bg-muted/20 gba:px-6 gba:lg:px-10 gba:py-3">
        <button
          type="button"
          onClick={() => navigateTo(buildPlatformUrl(STUDIO_URL))}
          className="gba:inline-flex gba:items-center gba:gap-1.5 gba:text-xs gba:font-medium gba:text-muted-foreground gba:hover:text-foreground"
          data-testid="create-agent-open-studio"
        >
          {t('agents-create-open-studio')}
          <ArrowSquareOutIcon className="gba:h-3.5 gba:w-3.5" />
        </button>
        <div className="gba:flex gba:items-center gba:gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} data-testid="create-agent-cancel">
            {t('agents-cancel-label')}
          </Button>
          <Button
            type="button"
            disabled={creating || !isValid}
            onClick={() => {
              handleCreate()
            }}
            data-testid="create-agent-submit"
          >
            {creating && <SpinnerGapIcon className="gba:h-3.5 gba:w-3.5 gba:animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

const DescriptionChecklist: React.FC<{ signals: ReturnType<typeof evaluateDescription> }> = ({ signals }) => {
  const { t } = useTranslation(translations)
  const items: Array<{ ok: boolean; label: string }> = [
    { ok: signals.meetsMinimum, label: t('agents-create-description-check-min', { min: DESCRIPTION_MIN_LENGTH }) },
    { ok: signals.notJustName, label: t('agents-create-description-check-not-name') },
    { ok: signals.isSpecific, label: t('agents-create-description-check-specific') }
  ]
  return (
    <div className="gba:mt-2 gba:space-y-1.5" data-testid="create-agent-description-checklist">
      {!signals.isValid && (
        <p className="gba:flex gba:items-center gba:gap-1.5 gba:text-[11px] gba:font-medium gba:text-destructive">
          <WarningCircleIcon className="gba:h-3.5 gba:w-3.5" />
          {t('agents-create-description-required')}
        </p>
      )}
      <ul className="gba:grid gba:grid-cols-1 gba:gap-1 sm:gba:grid-cols-3">
        {items.map(item => (
          <li
            key={item.label}
            className={`gba:flex gba:items-center gba:gap-1.5 gba:text-[11px] ${
              item.ok ? 'gba:text-foreground' : 'gba:text-muted-foreground'
            }`}
          >
            {item.ok ? (
              <CheckCircleIcon className="gba:h-3.5 gba:w-3.5 gba:text-emerald-600" weight="fill" />
            ) : (
              <WarningCircleIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground/60" />
            )}
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

const SystemPromptChecklist: React.FC<{ signals: ReturnType<typeof evaluateSystemPrompt> }> = ({ signals }) => {
  const { t } = useTranslation(translations)
  const items: Array<{ ok: boolean; label: string }> = [
    { ok: signals.hasIdentity, label: t('agents-create-prompt-check-identity') },
    { ok: signals.hasConstraints, label: t('agents-create-prompt-check-constraints') },
    { ok: signals.hasStructure, label: t('agents-create-prompt-check-structure') },
    { ok: signals.isSubstantial, label: t('agents-create-prompt-check-substantial') }
  ]
  const tooShort = !signals.meetsMinimum

  return (
    <div className="gba:mt-2 gba:space-y-1.5" data-testid="create-agent-prompt-checklist">
      {tooShort && (
        <p className="gba:flex gba:items-center gba:gap-1.5 gba:text-[11px] gba:font-medium gba:text-destructive">
          <WarningCircleIcon className="gba:h-3.5 gba:w-3.5" />
          {t('agents-create-prompt-required', { min: SYSTEM_PROMPT_MIN_LENGTH })}
        </p>
      )}
      <ul className="gba:grid gba:grid-cols-1 gba:gap-1 sm:gba:grid-cols-2">
        {items.map(item => (
          <li
            key={item.label}
            className={`gba:flex gba:items-center gba:gap-1.5 gba:text-[11px] ${
              item.ok ? 'gba:text-foreground' : 'gba:text-muted-foreground'
            }`}
          >
            {item.ok ? (
              <CheckCircleIcon className="gba:h-3.5 gba:w-3.5 gba:text-emerald-600" weight="fill" />
            ) : (
              <WarningCircleIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground/60" />
            )}
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

interface PolicySelectorProps {
  choices: PolicyChoice[]
  isLoading: boolean
  loadError: Error | null
  search: string
  onSearchChange: (value: string) => void
  selectedIds: Set<string>
  onToggle: (id: string) => void
}

const PolicySelector: React.FC<PolicySelectorProps> = ({
  choices,
  isLoading,
  loadError,
  search,
  onSearchChange,
  selectedIds,
  onToggle
}) => {
  const { t } = useTranslation(translations)
  return (
    <div>
      <div className="gba:mb-1 gba:flex gba:items-baseline gba:justify-between">
        <label className="gba:flex gba:items-center gba:gap-1.5 gba:text-base gba:font-medium gba:text-foreground">
          <ShieldCheckIcon className="gba:h-4 gba:w-4 gba:text-primary" weight="duotone" />
          {t('agents-create-policies-title')}
        </label>
        <span className="gba:text-[11px] gba:text-muted-foreground">
          {selectedIds.size > 0
            ? t('agents-create-policies-selected', { count: selectedIds.size })
            : t('agents-create-policies-optional')}
        </span>
      </div>
      <div className="gba:overflow-hidden gba:rounded-lg gba:border gba:border-border gba:bg-background">
        <div className="gba:relative gba:border-b gba:border-border/60">
          <MagnifyingGlassIcon className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={t('agents-create-policies-search')}
            className="gba:w-full gba:bg-transparent gba:py-2 gba:pl-9 gba:pr-3 gba:text-xs gba:text-foreground gba:outline-none"
            data-testid="create-agent-policy-search"
          />
        </div>
        <div className="gba:max-h-44 gba:overflow-y-auto" data-testid="create-agent-policy-list">
          {isLoading && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-3 gba:text-xs gba:text-muted-foreground">
              <SpinnerGapIcon className="gba:h-3.5 gba:w-3.5 gba:animate-spin" />
              {t('agents-create-policies-loading')}
            </div>
          )}
          {!isLoading && loadError && (
            <p className="gba:px-3 gba:py-3 gba:text-xs gba:text-destructive">
              {t('agents-create-policies-load-error')}
            </p>
          )}
          {!isLoading && !loadError && choices.length === 0 && (
            <p className="gba:px-3 gba:py-3 gba:text-xs gba:text-muted-foreground">
              {search ? t('agents-create-policies-empty-search') : t('agents-create-policies-empty')}
            </p>
          )}
          {!isLoading &&
            !loadError &&
            choices.map(choice => {
              const checked = selectedIds.has(choice.id)
              return (
                <label
                  key={choice.id}
                  className={`gba:flex gba:cursor-pointer gba:items-start gba:gap-2.5 gba:px-3 gba:py-2 gba:hover:bg-muted/40 gba:transition-colors ${
                    checked ? 'gba:bg-primary/5' : ''
                  }`}
                  data-testid={`create-agent-policy-${choice.id}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(choice.id)}
                    className="gba:mt-0.5 gba:h-3.5 gba:w-3.5 gba:rounded gba:border-border gba:text-primary gba:focus:ring-primary"
                  />
                  <div className="gba:min-w-0 gba:flex-1">
                    <p className="gba:truncate gba:text-xs gba:font-medium gba:text-foreground">{choice.title}</p>
                    {choice.preview && (
                      <p className="gba:mt-0.5 gba:line-clamp-1 gba:text-[11px] gba:text-muted-foreground">
                        {choice.preview}
                      </p>
                    )}
                  </div>
                </label>
              )
            })}
        </div>
      </div>
    </div>
  )
}
