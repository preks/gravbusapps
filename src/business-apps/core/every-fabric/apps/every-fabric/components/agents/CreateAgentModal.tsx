// Modal for creating a new agent on the Every Fabric agents screen.
//
// Mirrors the Enterprise Agent Studio create flow at a friendlier level:
// the user gives the agent a display name + specialty + instructions, and can
// optionally attach internal company policies (EveryPages POLICY entries) so
// the agent has the org's rulebook on hand at runtime. Heavier configuration
// (model, knowledge upload, advanced tools) lives in the full studio, linked
// from the modal footer.

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowSquareOutIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  SparkleIcon,
  SpinnerGapIcon,
  XIcon
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

const STUDIO_URL = '/platform/create/prompt-manager'

const POLICY_FIELDS: Array<keyof ContentEntry> = ['id', 'title', 'preview', 'contentGroup', 'updatedAt']

interface CreateAgentModalProps {
  open: boolean
  client: PromptManagerClient
  accessToken: string
  onClose: () => void
  onCreated: () => Promise<void> | void
}

interface FormState {
  displayName: string
  specialty: string
  description: string
  instructions: string
  visibility: 'workspace' | 'private'
}

const DEFAULT_INSTRUCTIONS_PLACEHOLDER =
  'You are {{name}}, a focused agent specialised in {{specialty}}. Use your assigned skills, tools, and policies before responding. Be concise, cite sources when relevant, and ask for clarification if the request is ambiguous.'

const initialState: FormState = {
  displayName: '',
  specialty: '',
  description: '',
  instructions: '',
  visibility: 'workspace'
}

/**
 * Convert a free-text display name into the snake_case identifier the
 * prompt-manager backend requires (`^[a-zA-Z0-9_]*$`). We keep the original
 * casing on a best-effort basis so the agent card label still reads naturally
 * after the AgentCard's underscore→space transform.
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
  const baseName = form.displayName.trim() || 'this agent'
  const specialty = form.specialty.trim() || 'general workplace tasks'
  if (form.instructions.trim()) return form.instructions.trim()
  return `You are ${baseName}, a focused agent specialised in ${specialty}. Use your assigned skills, tools, and policies before responding. Be concise, cite sources when relevant, and ask for clarification if the request is ambiguous.`
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

export const CreateAgentModal: React.FC<CreateAgentModalProps> = ({
  open,
  client,
  accessToken,
  onClose,
  onCreated
}) => {
  const [form, setForm] = useState<FormState>(initialState)
  const [policySearch, setPolicySearch] = useState('')
  const [selectedPolicyIds, setSelectedPolicyIds] = useState<Set<string>>(new Set())
  const [workspace, setWorkspace] = useState<WorkspaceODM | null>(null)
  const [model, setModel] = useState<AIModelODM | null>(null)
  const [isLoadingDefaults, setIsLoadingDefaults] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const policies = usePolicies(accessToken, policySearch, open)

  useEffect(() => {
    if (!open) {
      setForm(initialState)
      setPolicySearch('')
      setSelectedPolicyIds(new Set())
      setWorkspace(null)
      setModel(null)
      setError(null)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
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
  }, [client, open])

  const slug = useMemo(() => slugifyAgentName(form.displayName), [form.displayName])
  const isValid = slug.length >= 1 && !!workspace?._id && !!model?._id

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
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent. Please try again.')
    } finally {
      setCreating(false)
    }
  }, [client, form, slug, isValid, selectedPolicyIds, policies.choices, workspace, model, onCreated, onClose])

  if (!open) return null

  return (
    <div
      className="gba:fixed gba:inset-0 gba:z-[60] gba:flex gba:items-center gba:justify-center gba:bg-background/70 gba:p-4 gba:backdrop-blur-sm"
      data-testid="create-agent-modal"
    >
      <div className="gba:flex gba:max-h-[90vh] gba:w-full gba:max-w-xl gba:flex-col gba:overflow-hidden gba:rounded-2xl gba:border gba:border-border gba:bg-background gba:shadow-2xl">
        {/* Header */}
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-3 gba:border-b gba:border-border/60 gba:px-5 gba:py-4">
          <div className="gba:flex gba:items-start gba:gap-3">
            <div className="gba:mt-0.5 gba:flex gba:h-9 gba:w-9 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-xl gba:bg-primary/10 gba:text-primary">
              <SparkleIcon className="gba:h-5 gba:w-5" weight="duotone" />
            </div>
            <div>
              <h2 className="gba:text-base gba:font-semibold gba:text-foreground">Create agent</h2>
              <p className="gba:text-xs gba:text-muted-foreground">
                Give your agent a name, instructions, and optional company policies. You can attach skills and tools
                after saving.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="gba:inline-flex gba:h-8 gba:w-8 gba:items-center gba:justify-center gba:rounded-lg gba:text-muted-foreground gba:hover:bg-muted/60 gba:hover:text-foreground"
            aria-label="Close"
            data-testid="create-agent-close"
          >
            <XIcon className="gba:h-4 gba:w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:px-5 gba:py-4">
          {error && (
            <div
              className="gba:mb-4 gba:rounded-lg gba:border gba:border-destructive/40 gba:bg-destructive/5 gba:px-3 gba:py-2 gba:text-xs gba:text-destructive"
              data-testid="create-agent-error"
            >
              {error}
            </div>
          )}
          <div className="gba:mb-4 gba:rounded-lg gba:border gba:border-border/60 gba:bg-muted/20 gba:px-3 gba:py-2 gba:text-[11px] gba:text-muted-foreground">
            {isLoadingDefaults ? (
              <span className="gba:inline-flex gba:items-center gba:gap-1.5">
                <SpinnerGapIcon className="gba:h-3.5 gba:w-3.5 gba:animate-spin" />
                Loading workspace and model defaults…
              </span>
            ) : workspace?._id && model?._id ? (
              <span>
                Creating in <strong className="gba:text-foreground">{workspace.name}</strong>.
              </span>
            ) : (
              <span className="gba:text-destructive">
                Could not find a valid workspace/model. Open Enterprise Agent Studio to configure defaults.
              </span>
            )}
          </div>

          <div className="gba:space-y-4">
            <div>
              <label
                htmlFor="agent-display-name"
                className="gba:mb-1 gba:block gba:text-xs gba:font-semibold gba:text-foreground"
              >
                Agent name
              </label>
              <input
                id="agent-display-name"
                value={form.displayName}
                onChange={e => setForm(prev => ({ ...prev, displayName: e.target.value }))}
                placeholder="e.g. Document Writer"
                className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                data-testid="create-agent-name"
              />
              <p className="gba:mt-1 gba:text-[11px] gba:text-muted-foreground">
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
                className="gba:mb-1 gba:block gba:text-xs gba:font-semibold gba:text-foreground"
              >
                Specialty
              </label>
              <input
                id="agent-specialty"
                value={form.specialty}
                onChange={e => setForm(prev => ({ ...prev, specialty: e.target.value }))}
                placeholder="e.g. Marketing operations, internal documentation, sales follow-ups"
                className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                data-testid="create-agent-specialty"
              />
            </div>

            <div>
              <label
                htmlFor="agent-description"
                className="gba:mb-1 gba:block gba:text-xs gba:font-semibold gba:text-foreground"
              >
                Short description
              </label>
              <input
                id="agent-description"
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="One sentence the team will see in the agent catalog"
                className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                data-testid="create-agent-description"
              />
            </div>

            <div>
              <div className="gba:mb-1 gba:flex gba:items-baseline gba:justify-between">
                <label htmlFor="agent-instructions" className="gba:text-xs gba:font-semibold gba:text-foreground">
                  Instructions <span className="gba:font-normal gba:text-muted-foreground">(system prompt)</span>
                </label>
                <span className="gba:text-[11px] gba:text-muted-foreground/70">
                  Tells the agent how to behave during a session
                </span>
              </div>
              <textarea
                id="agent-instructions"
                value={form.instructions}
                onChange={e => setForm(prev => ({ ...prev, instructions: e.target.value }))}
                placeholder={DEFAULT_INSTRUCTIONS_PLACEHOLDER}
                rows={5}
                className="gba:min-h-28 gba:w-full gba:resize-y gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:leading-relaxed gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                data-testid="create-agent-instructions"
              />
              <p className="gba:mt-1 gba:text-[11px] gba:text-muted-foreground">
                Leave empty to use a sensible default based on the name and specialty.
              </p>
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

            <div className="gba:grid gba:grid-cols-1 gba:gap-3">
              <label className="gba:text-xs gba:text-muted-foreground">
                Visibility
                <select
                  value={form.visibility}
                  onChange={e => setForm(prev => ({ ...prev, visibility: e.target.value as FormState['visibility'] }))}
                  className="gba:mt-1 gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground"
                  data-testid="create-agent-visibility"
                >
                  <option value="workspace">Workspace — anyone in this workspace</option>
                  <option value="private">Private — only me</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:border-t gba:border-border/60 gba:bg-muted/20 gba:px-5 gba:py-3">
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
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <button
              type="button"
              disabled={creating || !isValid}
              onClick={() => void handleCreate()}
              className="gba:inline-flex gba:h-9 gba:items-center gba:justify-center gba:gap-1.5 gba:rounded-md gba:bg-primary gba:px-4 gba:text-sm gba:font-medium gba:text-primary-foreground gba:shadow-sm gba:transition-colors gba:hover:bg-primary/90 gba:disabled:cursor-not-allowed gba:disabled:opacity-50"
              data-testid="create-agent-submit"
            >
              {creating && <SpinnerGapIcon className="gba:h-3.5 gba:w-3.5 gba:animate-spin" />}
              {creating ? 'Creating…' : isLoadingDefaults ? 'Loading setup…' : 'Create agent'}
            </button>
          </div>
        </div>
      </div>
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
        <label className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:font-semibold gba:text-foreground">
          <ShieldCheckIcon className="gba:h-3.5 gba:w-3.5 gba:text-primary" weight="duotone" />
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
      <p className="gba:mt-1 gba:text-[11px] gba:text-muted-foreground">
        Pulled from EveryPages. The agent will reference these as authoritative sources during reasoning.
      </p>
    </div>
  )
}
