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
import { Button } from '@newwork/nw-design-system'
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
  NAME_HINT,
  SPECIALTY_HINT,
  SYSTEM_PROMPT_MIN_LENGTH
} from './agentStandard'

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

const WORKFORCE_AUTONOMY_OPTIONS: Array<{ value: WorkforceAutonomyLevel; label: string }> = [
  { value: 'draft_only', label: 'Assistive — drafts and recommends, makes no system changes' },
  { value: 'approval_required', label: 'Approval Required — prepares actions, routes to a human first' },
  { value: 'auto_low_risk', label: 'Delegated — acts on low-risk steps, escalates exceptions' },
  { value: 'full_auto', label: 'Autonomous — runs end-to-end within validated boundaries' }
]

type CreateAgentStep = 'profile' | 'capabilities' | 'deployment' | 'passport' | 'activation'

const CREATE_STEP_DEFS: ReadonlyArray<{
  value: CreateAgentStep
  label: string
  icon: PhosphorIcon
  optional?: boolean
}> = [
  { value: 'profile', label: 'Profile', icon: TagIcon },
  { value: 'capabilities', label: 'Capabilities', icon: LightbulbIcon },
  { value: 'deployment', label: 'Deployment', icon: LightningIcon },
  { value: 'passport', label: 'Passport', icon: IdentificationCardIcon, optional: true },
  { value: 'activation', label: 'Activation', icon: CheckCircleIcon, optional: true }
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

  let submitLabel = 'Create agent'
  if (creating) submitLabel = 'Creating…'
  else if (isLoadingDefaults) submitLabel = 'Loading setup…'
  else if (deployWorkforce) submitLabel = 'Create agent or worker'

  let defaultsHint: ReactNode
  if (isLoadingDefaults) {
    defaultsHint = (
      <span className="gba:inline-flex gba:items-center gba:gap-1.5">
        <SpinnerGapIcon className="gba:h-3.5 gba:w-3.5 gba:animate-spin" />
        Loading workspace and model defaults…
      </span>
    )
  } else if (hasValidDefaults) {
    defaultsHint = (
      <span>
        Creating in <strong className="gba:text-foreground">{workspace?.name}</strong>.
      </span>
    )
  } else {
    defaultsHint = (
      <span className="gba:text-destructive">
        Could not find a valid workspace/model. Open Enterprise Agent Studio to configure defaults.
      </span>
    )
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
            <h1 className="gba:text-2xl gba:font-semibold gba:text-foreground">Create agent</h1>
            <p className="gba:text-base gba:text-muted-foreground">Define the agent once, then choose where it runs.</p>
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
                  Create setup
                </p>
                <p className="gba:mt-1 gba:text-sm gba:text-foreground">
                  {completedSteps} of {CREATE_STEP_DEFS.length} steps ready
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gba:mt-3 gba:w-full"
                onClick={() => setActiveStep(nextStep.value)}
                data-testid="create-agent-next-step"
              >
                Continue: {nextStep.label}
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
                        {step.label}
                      </span>
                      {step.optional && (
                        <span className="gba:mt-0.5 gba:block gba:text-[10px] gba:text-muted-foreground">
                          Optional until Worker deployment is selected
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
              Is this really an agent? If it&apos;s a single action like creating a chart, asset, or visualization,
              build a <strong>tool</strong>, not an agent. Agents own a domain and make judgments (e.g. &quot;HR
              Expert&quot;).
            </div>

            <div className="gba:mx-auto gba:max-w-3xl">
              {activeStep === 'profile' && (
                <CreateStepSection
                  step={1}
                  title="Profile"
                  description="Name the agent, describe its domain, and decide who can use it."
                  complete={profileComplete}
                >
                  <div>
                    <label
                      htmlFor="agent-display-name"
                      className="gba:mb-1 gba:block gba:text-base gba:font-medium gba:text-foreground"
                    >
                      Agent name
                    </label>
                    <input
                      id="agent-display-name"
                      value={form.displayName}
                      onChange={e => setForm(prev => ({ ...prev, displayName: e.target.value }))}
                      placeholder="e.g. Support Ticket Agent"
                      className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3.5 gba:py-2.5 gba:text-base gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                      data-testid="create-agent-name"
                    />
                    <p className="gba:mt-1 gba:text-[11px] gba:text-muted-foreground">{NAME_HINT}</p>
                    <p className="gba:mt-0.5 gba:text-[11px] gba:text-muted-foreground">
                      {slug ? (
                        <>
                          Stored as{' '}
                          <code className="gba:rounded gba:bg-muted gba:px-1 gba:py-0.5 gba:font-mono">{slug}</code> —
                          letters, digits and underscores only.
                        </>
                      ) : (
                        'Letters, digits, and spaces are fine — we automatically convert it to an identifier.'
                      )}
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="agent-specialty"
                      className="gba:mb-1 gba:block gba:text-base gba:font-medium gba:text-foreground"
                    >
                      Specialty
                    </label>
                    <input
                      id="agent-specialty"
                      value={form.specialty}
                      onChange={e => setForm(prev => ({ ...prev, specialty: e.target.value }))}
                      placeholder="e.g. Employee support, procurement, sales follow-ups"
                      className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3.5 gba:py-2.5 gba:text-base gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                      data-testid="create-agent-specialty"
                    />
                    <p className="gba:mt-1 gba:text-[11px] gba:text-muted-foreground">{SPECIALTY_HINT}</p>
                  </div>

                  <div>
                    <label
                      htmlFor="agent-description"
                      className="gba:mb-1 gba:block gba:text-base gba:font-medium gba:text-foreground"
                    >
                      Description
                    </label>
                    <p className="gba:mb-1.5 gba:text-xs gba:text-muted-foreground">
                      This is the single biggest factor in whether your agent gets picked for a task. Describe what it
                      does using the words people will actually type.
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
                      Example: <span className="gba:italic">{DESCRIPTION_EXAMPLE}</span>
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="create-agent-visibility"
                      className="gba:mb-1 gba:block gba:text-base gba:font-medium gba:text-foreground"
                    >
                      Visibility
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
                      <option value="workspace">Workspace — anyone in this workspace</option>
                      <option value="private">Private — only me</option>
                    </select>
                  </div>
                </CreateStepSection>
              )}

              {activeStep === 'capabilities' && (
                <CreateStepSection
                  step={2}
                  title="Capabilities"
                  description="Give the agent instructions and optional policies. Skills can be refined later in Studio."
                  complete={capabilitiesComplete}
                >
                  <div>
                    <div className="gba:mb-1 gba:flex gba:items-baseline gba:justify-between">
                      <label htmlFor="agent-instructions" className="gba:text-base gba:font-medium gba:text-foreground">
                        Instructions <span className="gba:font-normal gba:text-muted-foreground">(system prompt)</span>
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
                        Use template
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
                  title="Deployment"
                  description="Every agent can be configured in Studio. Add Worker deployment only when it needs governed runtime."
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
                          Activate as a Worker
                        </p>
                        <p className="gba:text-[11px] gba:text-muted-foreground">
                          Creates the same agent with a paused Worker deployment so Passport and Activation can be
                          completed before it runs.
                        </p>
                      </div>
                    </label>
                  </div>
                </CreateStepSection>
              )}

              {activeStep === 'passport' && (
                <CreateStepSection
                  step={4}
                  title="Passport"
                  description="Only needed when this agent should run as a governed Worker."
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
                          Role <span className="gba:text-destructive">*</span>
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
                          Department
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
                      Skip this step unless the agent needs Worker identity, ownership, governance, and runtime
                      controls.
                    </div>
                  )}
                </CreateStepSection>
              )}

              {activeStep === 'activation' && (
                <CreateStepSection
                  step={5}
                  title="Activation"
                  description="Choose the Worker runtime posture. New Workers start paused for review."
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
                          Autonomy
                        </label>
                        <select
                          id="create-agent-workforce-autonomy"
                          value={workforceAutonomy}
                          onChange={e => setWorkforceAutonomy(e.target.value as WorkforceAutonomyLevel)}
                          className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                          data-testid="create-agent-workforce-autonomy"
                        >
                          {WORKFORCE_AUTONOMY_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="gba:rounded-lg gba:border gba:border-amber-500/30 gba:bg-amber-500/5 gba:px-3 gba:py-3 gba:text-xs gba:text-amber-700">
                        The Worker deployment is created paused. Finish Passport and Activation in Studio before it
                        runs.
                      </div>
                    </div>
                  ) : (
                    <div className="gba:rounded-lg gba:border gba:border-dashed gba:border-border gba:bg-muted/20 gba:px-3 gba:py-3 gba:text-xs gba:text-muted-foreground">
                      No Worker runtime will be created. You can activate this agent as a Worker later from Studio.
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
          Need more configuration? Open Enterprise Agent Studio
          <ArrowSquareOutIcon className="gba:h-3.5 gba:w-3.5" />
        </button>
        <div className="gba:flex gba:items-center gba:gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} data-testid="create-agent-cancel">
            Cancel
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
  const items: Array<{ ok: boolean; label: string }> = [
    { ok: signals.meetsMinimum, label: `At least ${DESCRIPTION_MIN_LENGTH} characters` },
    { ok: signals.notJustName, label: 'More than just the name' },
    { ok: signals.isSpecific, label: 'Specific (uses real domain words)' }
  ]
  return (
    <div className="gba:mt-2 gba:space-y-1.5" data-testid="create-agent-description-checklist">
      {!signals.isValid && (
        <p className="gba:flex gba:items-center gba:gap-1.5 gba:text-[11px] gba:font-medium gba:text-destructive">
          <WarningCircleIcon className="gba:h-3.5 gba:w-3.5" />A real description is required — it&apos;s how this agent
          gets discovered and chosen.
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
  const items: Array<{ ok: boolean; label: string }> = [
    { ok: signals.hasIdentity, label: 'Declares identity ("You are …")' },
    { ok: signals.hasConstraints, label: 'States hard rules (MUST / NEVER / Refuse)' },
    { ok: signals.hasStructure, label: 'Has structure (capabilities, constraints, output)' },
    { ok: signals.isSubstantial, label: 'Substantial enough (not a one-liner)' }
  ]
  const tooShort = !signals.meetsMinimum

  return (
    <div className="gba:mt-2 gba:space-y-1.5" data-testid="create-agent-prompt-checklist">
      {tooShort && (
        <p className="gba:flex gba:items-center gba:gap-1.5 gba:text-[11px] gba:font-medium gba:text-destructive">
          <WarningCircleIcon className="gba:h-3.5 gba:w-3.5" />A real system prompt is required (at least{' '}
          {SYSTEM_PROMPT_MIN_LENGTH} characters). Use the template to start.
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
  return (
    <div>
      <div className="gba:mb-1 gba:flex gba:items-baseline gba:justify-between">
        <label className="gba:flex gba:items-center gba:gap-1.5 gba:text-base gba:font-medium gba:text-foreground">
          <ShieldCheckIcon className="gba:h-4 gba:w-4 gba:text-primary" weight="duotone" />
          Company policies
        </label>
        <span className="gba:text-[11px] gba:text-muted-foreground">
          {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Optional'}
        </span>
      </div>
      <div className="gba:overflow-hidden gba:rounded-lg gba:border gba:border-border gba:bg-background">
        <div className="gba:relative gba:border-b gba:border-border/60">
          <MagnifyingGlassIcon className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search EveryPages policies…"
            className="gba:w-full gba:bg-transparent gba:py-2 gba:pl-9 gba:pr-3 gba:text-xs gba:text-foreground gba:outline-none"
            data-testid="create-agent-policy-search"
          />
        </div>
        <div className="gba:max-h-44 gba:overflow-y-auto" data-testid="create-agent-policy-list">
          {isLoading && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-3 gba:text-xs gba:text-muted-foreground">
              <SpinnerGapIcon className="gba:h-3.5 gba:w-3.5 gba:animate-spin" />
              Loading policies…
            </div>
          )}
          {!isLoading && loadError && (
            <p className="gba:px-3 gba:py-3 gba:text-xs gba:text-destructive">
              Couldn&apos;t load policies. You can still create the agent and attach them later.
            </p>
          )}
          {!isLoading && !loadError && choices.length === 0 && (
            <p className="gba:px-3 gba:py-3 gba:text-xs gba:text-muted-foreground">
              {search ? 'No policies match your search.' : 'No company policies published yet.'}
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
