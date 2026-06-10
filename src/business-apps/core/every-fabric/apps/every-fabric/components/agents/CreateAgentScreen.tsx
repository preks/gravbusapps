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
  CheckCircleIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  SpinnerGapIcon,
  WarningCircleIcon
} from '@phosphor-icons/react'
import { Button } from '@newwork/nw-design-system'
import type {
  AIModelODM,
  PromptManagerClient,
  WorkspaceODM
} from '@/common/network/ai/prompt-manager/PromptManagerClient'
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

export const CreateAgentScreen: React.FC<CreateAgentScreenProps> = ({ client, accessToken, onBack, onCreated }) => {
  const [form, setForm] = useState<FormState>(initialState)
  const [policySearch, setPolicySearch] = useState('')
  const [selectedPolicyIds, setSelectedPolicyIds] = useState<Set<string>>(new Set())
  const [workspace, setWorkspace] = useState<WorkspaceODM | null>(null)
  const [model, setModel] = useState<AIModelODM | null>(null)
  const [isLoadingDefaults, setIsLoadingDefaults] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
  const isValid =
    slug.length >= 1 && !!workspace?._id && !!model?._id && promptSignals.meetsMinimum && descriptionSignals.isValid

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

      await onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent. Please try again.')
    } finally {
      setCreating(false)
    }
  }, [client, form, slug, isValid, selectedPolicyIds, policies.choices, workspace, model, onCreated])

  const hasValidDefaults = Boolean(workspace?._id && model?._id)

  let submitLabel = 'Create agent'
  if (creating) submitLabel = 'Creating…'
  else if (isLoadingDefaults) submitLabel = 'Loading setup…'

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
            <p className="gba:text-base gba:text-muted-foreground">
              Give the agent a clear identity and a real system prompt, then assign skills so it can do work.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="gba:flex-1 gba:overflow-y-auto">
        <div className="gba:max-w-5xl gba:mx-auto gba:px-6 gba:lg:px-10 gba:py-8 gba:space-y-6">
          {error && (
            <div
              className="gba:rounded-lg gba:border gba:border-destructive/40 gba:bg-destructive/5 gba:px-3 gba:py-2 gba:text-sm gba:text-destructive"
              data-testid="create-agent-error"
            >
              {error}
            </div>
          )}

          <div className="gba:rounded-lg gba:border gba:border-border/60 gba:bg-muted/20 gba:px-3 gba:py-2 gba:text-xs gba:text-muted-foreground">
            {defaultsHint}
          </div>

          <div
            className="gba:rounded-lg gba:border gba:border-amber-500/30 gba:bg-amber-500/5 gba:px-3 gba:py-2 gba:text-xs gba:text-amber-700"
            data-testid="create-agent-tool-vs-agent-hint"
          >
            Is this really an agent? If it&apos;s a single action like creating a chart, asset, or visualization, build
            a <strong>tool</strong>, not an agent. Agents own a domain and make judgments (e.g. &quot;HR Expert&quot;).
          </div>

          <div className="gba:space-y-6">
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
                placeholder="e.g. Support Ticket Assistant"
                className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3.5 gba:py-2.5 gba:text-base gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                data-testid="create-agent-name"
              />
              <p className="gba:mt-1 gba:text-[11px] gba:text-muted-foreground">{NAME_HINT}</p>
              <p className="gba:mt-0.5 gba:text-[11px] gba:text-muted-foreground">
                {slug ? (
                  <>
                    Stored as <code className="gba:rounded gba:bg-muted gba:px-1 gba:py-0.5 gba:font-mono">{slug}</code>{' '}
                    — letters, digits and underscores only.
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
                This is the single biggest factor in whether your agent gets picked for a task. Describe what it does
                using the words people will actually type.
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
                onChange={e => setForm(prev => ({ ...prev, visibility: e.target.value as FormState['visibility'] }))}
                className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3.5 gba:py-2.5 gba:text-base gba:text-foreground"
                data-testid="create-agent-visibility"
              >
                <option value="workspace">Workspace — anyone in this workspace</option>
                <option value="private">Private — only me</option>
              </select>
            </div>
          </div>
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
          <button
            type="button"
            disabled={creating || !isValid}
            onClick={() => {
              handleCreate()
            }}
            className="gba:inline-flex gba:h-9 gba:items-center gba:justify-center gba:gap-1.5 gba:rounded-md gba:bg-primary gba:px-4 gba:text-sm gba:font-medium gba:text-primary-foreground gba:shadow-sm gba:transition-colors gba:hover:bg-primary/90 gba:disabled:cursor-not-allowed gba:disabled:opacity-50"
            data-testid="create-agent-submit"
          >
            {creating && <SpinnerGapIcon className="gba:h-3.5 gba:w-3.5 gba:animate-spin" />}
            {submitLabel}
          </button>
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
