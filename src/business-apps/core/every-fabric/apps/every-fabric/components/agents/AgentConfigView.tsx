import React, { useEffect, useMemo, useState } from 'react'
import { Button } from '@newwork/nw-design-system'
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  IdentificationCardIcon,
  LightbulbIcon,
  LightningIcon,
  TagIcon,
  type Icon as PhosphorIcon
} from '@phosphor-icons/react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { PromptManagerClient } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { evaluateAgentCompliance, evaluateDescription, DESCRIPTION_MIN_LENGTH } from './agentStandard'
import type { DeploymentBadgeTone, FabricAgent } from './agentTypes'
import { agentDisplayLabel, deriveDeploymentBadges } from './agentTypes'
import { useWorkforceAgentConfig } from '../enterprise-workforce/useWorkforceAgentConfig'
import { AgentConfigActiveTab } from './AgentConfigActiveTab'
import { AgentAvatarPreview } from './agentConfigViewParts'

interface SkillOption {
  skill_id: string
  name: string
  description: string
  status: string
  is_active?: boolean
  tool_refs?: string[]
}

interface AgentConfigViewProps {
  agent: FabricAgent
  accessToken: string
  /** When true the agent also lives on the Workforce surface, so the
   *  workforce-only config cards (autonomy, triggers, escalation, budget,
   *  knowledge, role/ownership) are shown below the shared cards. */
  isWorkforceEnabled?: boolean
  onBack: () => void
  onSkillsSaved: (agentId: string, skillIds: string[]) => void
  /** Called after a Workforce deployment is added so the list can refresh. */
  onWorkforceDeployed?: () => void
  /** Deep-link into the Digital Workforce activity views for this Worker.
   *  When omitted, the "View live activity" affordance renders disabled. */
  onViewActivity?: (agentId: string) => void
  onAgentUpdated?: (
    agentId: string,
    updates: Partial<{
      name: string
      display_name: string
      description: string
      tags: string[]
      specialty: string
      avatar: string | null
    }>
  ) => void
}

type AgentConfigTab = 'profile' | 'capabilities' | 'deployment' | 'passport' | 'activation'

const TAB_DEFS: ReadonlyArray<{ value: AgentConfigTab; label: string; icon: PhosphorIcon }> = [
  { value: 'profile', label: 'Profile', icon: TagIcon },
  { value: 'capabilities', label: 'Capabilities', icon: LightbulbIcon },
  { value: 'deployment', label: 'Deployment', icon: LightningIcon },
  { value: 'passport', label: 'Passport', icon: IdentificationCardIcon },
  { value: 'activation', label: 'Activation', icon: CheckCircleIcon }
]

const HEADER_BADGE_CLASS: Record<DeploymentBadgeTone, string> = {
  enterprise: 'gba:bg-sky-100 gba:text-sky-700',
  workforce: 'gba:bg-indigo-100 gba:text-indigo-700',
  paused: 'gba:bg-amber-100 gba:text-amber-700',
  archived: 'gba:bg-muted gba:text-muted-foreground'
}

const formatAgentName = (name: string) => name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

const initialAgentLabel = (agent: FabricAgent) => agent.display_name?.trim() || formatAgentName(agent.name)

type AgentSkillsResponse = Awaited<ReturnType<PromptManagerClient['getAgentSkills']>>
type AgentDetailResponse = Awaited<ReturnType<PromptManagerClient['getAgentDetail']>>
type RuntimeSkill = Omit<SkillOption, 'status' | 'is_active'>
type SkillsPromiseResult = PromiseSettledResult<[AgentSkillsResponse, SkillOption[], RuntimeSkill[]]>

type SkillsComputation = { error: string } | { available: SkillOption[]; selectedIds: Set<string> }

interface DetailsComputation {
  /** False when the registry detail endpoint had nothing for this agent
   *  (e.g. a workforce-only record). Profile falls back to the agent props
   *  and the System Prompt editor shows a short note instead. */
  available: boolean
  systemPrompt: string | null
  name: string
  description: string
  tags: string
  specialty: string
}
type DetailsComputationResult = { error: string } | { detail: DetailsComputation }

const errorMessage = (reason: unknown, fallback: string): string =>
  reason instanceof Error ? reason.message : fallback

/** Merge admin + runtime skill catalogs, keeping only active or already-assigned skills. */
function computeSkillsResult(result: SkillsPromiseResult): SkillsComputation {
  if (result.status !== 'fulfilled') {
    return { error: errorMessage(result.reason, 'Failed to load skills') }
  }
  const [agentSkills, adminSkills, runtimeSkills] = result.value
  const merged = new Map<string, SkillOption>()
  for (const skill of adminSkills) merged.set(skill.skill_id, skill)
  for (const skill of runtimeSkills) {
    const existing = merged.get(skill.skill_id)
    if (existing) {
      if (skill.tool_refs?.length) existing.tool_refs = skill.tool_refs
    } else {
      merged.set(skill.skill_id, { ...skill, status: 'built_in', is_active: true })
    }
  }
  const allSkills = [...merged.values()].sort((a, b) => a.skill_id.localeCompare(b.skill_id))
  const assignedIds = new Set(agentSkills.skills.map(s => s.skill_id))
  return {
    available: allSkills.filter(s => s.is_active === true || assignedIds.has(s.skill_id)),
    selectedIds: assignedIds
  }
}

/** Resolve the editable detail fields, falling back to the values already on the agent.
 *  ``detail`` is ``null`` when the (PromptODM-only) registry endpoint had nothing for
 *  this agent — we still render the Profile from the agent props, just without a prompt. */
function computeDetailsResult(
  result: PromiseSettledResult<AgentDetailResponse | null>,
  agent: FabricAgent
): DetailsComputationResult {
  if (result.status !== 'fulfilled') {
    return { error: errorMessage(result.reason, 'Failed to load agent details') }
  }
  const detail = result.value
  if (!detail) {
    return {
      detail: {
        available: false,
        systemPrompt: null,
        name: agentDisplayLabel(agent),
        description: agent.description,
        tags: agent.tags.join(', '),
        specialty: agent.specialty ?? ''
      }
    }
  }
  return {
    detail: {
      available: true,
      systemPrompt: detail.system_prompt ?? null,
      name: detail.display_name ?? detail.name ?? agentDisplayLabel(agent),
      description: detail.description ?? agent.description,
      tags: (detail.tags ?? agent.tags).join(', '),
      specialty: detail.specialty ?? agent.specialty ?? ''
    }
  }
}

export const AgentConfigView: React.FC<AgentConfigViewProps> = ({
  agent,
  accessToken,
  isWorkforceEnabled = false,
  onBack,
  onSkillsSaved,
  onWorkforceDeployed,
  onViewActivity,
  onAgentUpdated
}) => {
  const client = usePromptManagerClient(accessToken)

  const [activeTab, setActiveTab] = useState<AgentConfigTab>('profile')

  // Becomes true the moment a Workforce deployment is added from this screen,
  // so the full Workforce configuration appears inline immediately — without
  // waiting for the parent list to reload and flip ``isWorkforceEnabled``.
  const [workforceJustDeployed, setWorkforceJustDeployed] = useState(false)
  const workforceConfigEnabled = isWorkforceEnabled || workforceJustDeployed

  const deploymentBadges = useMemo(
    () => deriveDeploymentBadges(agent).filter(badge => badge.tone !== 'enterprise'),
    [agent]
  )

  // One shared worker-config instance for the Passport + Activation tabs, so
  // switching tabs neither refetches nor loses unsaved edits in the other tab.
  // Passes ``null`` until the agent is a Worker so it does not fetch.
  const workforceConfig = useWorkforceAgentConfig({
    accessToken,
    agentId: workforceConfigEnabled ? agent.id : null
  })

  // Skills state
  const [availableSkills, setAvailableSkills] = useState<SkillOption[]>([])
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(new Set())
  const [skillsLoading, setSkillsLoading] = useState(true)
  const [skillsError, setSkillsError] = useState<string | null>(null)
  const [showSkillPicker, setShowSkillPicker] = useState(false)
  const [skillSearchQuery, setSkillSearchQuery] = useState('')

  // System prompt — editable; loaded from the detail endpoint.
  // ``detailAvailable`` is false for records the registry endpoint can't serve
  // (workforce-only), in which case we show a note instead of the editor.
  const [detailAvailable, setDetailAvailable] = useState(false)
  const [systemPrompt, setSystemPrompt] = useState<string | null>(null)
  const [savedSystemPrompt, setSavedSystemPrompt] = useState<string | null>(null)
  const [systemPromptSaving, setSystemPromptSaving] = useState(false)
  const [systemPromptSaved, setSystemPromptSaved] = useState(false)
  const [systemPromptError, setSystemPromptError] = useState<string | null>(null)
  const systemPromptDirty = (systemPrompt ?? '') !== (savedSystemPrompt ?? '')

  // Details state
  const [detailsName, setDetailsName] = useState(initialAgentLabel(agent))
  const [detailsDescription, setDetailsDescription] = useState(agent.description)
  const [detailsTags, setDetailsTags] = useState(agent.tags.join(', '))
  const [detailsSpecialty, setDetailsSpecialty] = useState(agent.specialty ?? '')
  const [detailsLoading, setDetailsLoading] = useState(true)
  const [detailsSaving, setDetailsSaving] = useState(false)
  const [detailsSaved, setDetailsSaved] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(agent.avatar ?? null)
  const [avatarGenerating, setAvatarGenerating] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [savedName, setSavedName] = useState(initialAgentLabel(agent))
  const [savedDescription, setSavedDescription] = useState(agent.description)
  const [savedTags, setSavedTags] = useState(agent.tags.join(', '))
  const [savedSpecialty, setSavedSpecialty] = useState(agent.specialty ?? '')
  const canGenerateAvatar = agent.source === 'prompt_odm'
  const detailsDirty =
    detailsName !== savedName ||
    detailsDescription !== savedDescription ||
    detailsTags !== savedTags ||
    detailsSpecialty !== savedSpecialty
  const descriptionSignals = evaluateDescription(detailsDescription, detailsName)

  useEffect(() => {
    setAvatarPreview(agent.avatar ?? null)
    setAvatarError(null)
  }, [agent.id, agent.avatar])

  // Load skills, policies, details and tools in parallel on mount
  useEffect(() => {
    let cancelled = false

    const applySkillsResult = (result: SkillsPromiseResult) => {
      const computed = computeSkillsResult(result)
      if ('error' in computed) {
        setSkillsError(computed.error)
        return
      }
      setAvailableSkills(computed.available)
      setSelectedSkillIds(computed.selectedIds)
    }

    const applyDetailsResult = (result: PromiseSettledResult<AgentDetailResponse | null>) => {
      const computed = computeDetailsResult(result, agent)
      if ('error' in computed) {
        setDetailsError(computed.error)
        return
      }
      const { available, systemPrompt: loadedPrompt, name, description, tags, specialty } = computed.detail
      setDetailAvailable(available)
      setSystemPrompt(loadedPrompt)
      setSavedSystemPrompt(loadedPrompt)
      setDetailsName(name)
      setDetailsDescription(description)
      setDetailsTags(tags)
      setDetailsSpecialty(specialty)
      setSavedName(name)
      setSavedDescription(description)
      setSavedTags(tags)
      setSavedSpecialty(specialty)
    }

    const load = async () => {
      setSkillsLoading(true)
      setSkillsError(null)
      setDetailsLoading(true)
      setDetailsError(null)

      const skillsPromise = Promise.all([
        client.getAgentSkills(agent.id),
        client.get<SkillOption[]>('/admin/skills/').catch(() => [] as SkillOption[]),
        client.get<Array<Omit<SkillOption, 'status' | 'is_active'>>>('/skills/manifest').catch(() => [])
      ])

      // The registry detail endpoint is PromptODM-only and 404s for some
      // workforce-only records. Tolerate that (``null``) so the Capabilities
      // tab is consistent for every agent — Profile falls back to the agent
      // props and the System Prompt editor shows a note when unavailable.
      const detailPromise = client.getAgentDetail(agent.id).catch(() => null)

      const [skillsResult, detailResult] = await Promise.allSettled([skillsPromise, detailPromise])
      if (cancelled) return
      applySkillsResult(skillsResult)
      setSkillsLoading(false)
      applyDetailsResult(detailResult)
      setDetailsLoading(false)
    }

    load().catch(err => setSkillsError(err instanceof Error ? err.message : 'Failed to load'))
    return () => {
      cancelled = true
    }
  }, [client, agent.id])

  const assignedSkills = useMemo(
    () => availableSkills.filter(s => selectedSkillIds.has(s.skill_id)),
    [availableSkills, selectedSkillIds]
  )
  const unassignedSkills = useMemo(() => {
    const unassigned = availableSkills.filter(s => !selectedSkillIds.has(s.skill_id))
    const q = skillSearchQuery.trim().toLowerCase()
    if (!q) return unassigned
    return unassigned.filter(
      s =>
        s.skill_id.toLowerCase().includes(q) ||
        s.name?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q)
    )
  }, [availableSkills, selectedSkillIds, skillSearchQuery])

  const compliance = useMemo(
    () =>
      evaluateAgentCompliance({
        systemPrompt,
        skillCount: assignedSkills.length,
        skillsWithoutTools: assignedSkills
          .filter(s => !(s.tool_refs && s.tool_refs.length > 0))
          .map(s => s.name || s.skill_id),
        toolsUnknown: skillsLoading
      }),
    [systemPrompt, assignedSkills, skillsLoading]
  )
  const setupSteps = useMemo(() => {
    const profileComplete = !detailsLoading && detailsName.trim().length > 0 && descriptionSignals.isValid
    const capabilitiesComplete = !detailsLoading && !skillsLoading && compliance.level !== 'fail'
    const deploymentComplete = true
    const passportComplete = workforceConfigEnabled
    const activationComplete = workforceConfigEnabled
    const completedByStep: Record<AgentConfigTab, boolean> = {
      profile: profileComplete,
      capabilities: capabilitiesComplete,
      deployment: deploymentComplete,
      passport: passportComplete,
      activation: activationComplete
    }
    const completed = TAB_DEFS.filter(step => completedByStep[step.value]).length
    const nextStep = TAB_DEFS.find(step => !completedByStep[step.value]) ?? TAB_DEFS[TAB_DEFS.length - 1]

    return { completedByStep, completed, total: TAB_DEFS.length, nextStep }
  }, [compliance.level, descriptionSignals.isValid, detailsLoading, detailsName, skillsLoading, workforceConfigEnabled])

  // Auto-clear the "Saved" confirmations after a short moment.
  useEffect(() => {
    if (!detailsSaved) return
    const t = setTimeout(() => setDetailsSaved(false), 2500)
    return () => clearTimeout(t)
  }, [detailsSaved])

  useEffect(() => {
    if (!systemPromptSaved) return
    const t = setTimeout(() => setSystemPromptSaved(false), 2500)
    return () => clearTimeout(t)
  }, [systemPromptSaved])

  const toggleSkill = (skillId: string) => {
    const next = new Set(selectedSkillIds)
    if (next.has(skillId)) next.delete(skillId)
    else next.add(skillId)
    setSelectedSkillIds(next)
    setSkillsError(null)
    const ids = Array.from(next)
    onSkillsSaved(agent.id, ids)
    client.setAgentSkills(agent.id, ids).catch(err => {
      setSkillsError(err instanceof Error ? err.message : 'Failed to persist skills')
    })
  }

  const handleSaveSystemPrompt = async () => {
    const next = (systemPrompt ?? '').trim()
    if (next.length < SYSTEM_PROMPT_MIN_LENGTH) {
      setSystemPromptError(
        `System prompt is too short — add at least ${SYSTEM_PROMPT_MIN_LENGTH} characters describing the agent's identity, capabilities, and constraints.`
      )
      return
    }
    setSystemPromptSaving(true)
    setSystemPromptError(null)
    try {
      await client.updateAgentDetails(agent.id, { system_prompt: next })
      setSystemPrompt(next)
      setSavedSystemPrompt(next)
      setSystemPromptSaved(true)
    } catch (err) {
      setSystemPromptError(err instanceof Error ? err.message : 'Failed to save system prompt')
    } finally {
      setSystemPromptSaving(false)
    }
  }

  const handleSaveDetails = async () => {
    if (!descriptionSignals.isValid) {
      setDetailsError(
        `Description is too thin — add at least ${DESCRIPTION_MIN_LENGTH} characters describing what the agent does. It is how the agent gets discovered and chosen.`
      )
      return
    }
    setDetailsSaving(true)
    setDetailsError(null)
    try {
      const tags = detailsTags
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
      const specialty = detailsSpecialty.trim()
      const response = await client.updateAgentDetails(agent.id, {
        name: detailsName,
        description: detailsDescription,
        tags,
        specialty
      })
      const nextSlug = response.name ?? agent.name
      const nextDisplayName = response.display_name ?? detailsName
      setSavedName(detailsName)
      setSavedDescription(detailsDescription)
      setSavedTags(detailsTags)
      setSavedSpecialty(detailsSpecialty)
      setDetailsSaved(true)
      onAgentUpdated?.(agent.id, {
        name: nextSlug,
        display_name: nextDisplayName,
        description: detailsDescription,
        tags,
        specialty
      })
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : 'Failed to save details')
    } finally {
      setDetailsSaving(false)
    }
  }

  const handleGenerateAvatar = async () => {
    setAvatarGenerating(true)
    setAvatarError(null)
    try {
      const response = await client.generateAgentAvatar(agent.id)
      setAvatarPreview(response.avatar)
      onAgentUpdated?.(agent.id, { avatar: response.avatar })
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Failed to generate avatar')
    } finally {
      setAvatarGenerating(false)
    }
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid="agent-config-view">
      {/* Header */}
      <div className="gba:shrink-0 gba:border-b gba:border-border/60 gba:px-6 gba:py-4 gba:lg:px-10">
        <div className="gba:flex gba:items-center gba:gap-3">
          <button
            type="button"
            onClick={onBack}
            className="gba:inline-flex gba:items-center gba:justify-center gba:h-8 gba:w-8 gba:rounded-lg gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
            data-testid="agent-config-back"
          >
            <ArrowLeftIcon className="gba:h-5 gba:w-5" />
          </button>
          <AgentAvatarPreview
            avatar={avatarPreview}
            label={agentDisplayLabel(agent)}
            className="gba:h-11 gba:w-11 gba:rounded-xl"
          />
          <h1 className="gba:text-xl gba:font-semibold gba:text-foreground">{agentDisplayLabel(agent)}</h1>
          {deploymentBadges.length > 0 && (
            <div className="gba:flex gba:items-center gba:gap-1.5">
              {deploymentBadges.map(badge => (
                <span
                  key={badge.key}
                  className={`gba:rounded-full gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-medium ${HEADER_BADGE_CLASS[badge.tone]}`}
                  data-testid={`agent-config-badge-${badge.key}`}
                >
                  {badge.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="gba:flex-1 gba:overflow-y-auto">
        <div className="gba:mx-auto gba:flex gba:max-w-7xl gba:flex-col gba:gap-6 gba:px-6 gba:py-6 gba:lg:flex-row gba:lg:px-10">
          <aside className="gba:w-full gba:shrink-0 gba:lg:sticky gba:lg:top-6 gba:lg:w-72 gba:lg:self-start">
            <div
              className="gba:rounded-xl gba:border gba:border-border gba:bg-card gba:p-4 gba:shadow-sm"
              data-testid="agent-config-progress"
            >
              <p className="gba:text-xs gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground">
                Studio setup
              </p>
              <p className="gba:mt-1 gba:text-sm gba:font-medium gba:text-foreground">
                {setupSteps.completed} of {setupSteps.total} steps complete
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gba:mt-3 gba:w-full"
                onClick={() => setActiveTab(setupSteps.nextStep.value)}
                data-testid="agent-config-next-step"
              >
                Continue: {setupSteps.nextStep.label}
              </Button>
            </div>

            <nav className="gba:mt-3 gba:space-y-2" data-testid="agent-config-tabs">
              {TAB_DEFS.map((tab, index) => {
                const TabIcon = tab.icon
                const complete = setupSteps.completedByStep[tab.value]
                const active = activeTab === tab.value
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.value)
                    }}
                    className={`gba:flex gba:w-full gba:items-center gba:gap-3 gba:rounded-lg gba:border gba:px-3 gba:py-2.5 gba:text-left gba:transition-colors ${
                      active
                        ? 'gba:border-primary gba:bg-primary/5 gba:text-foreground gba:shadow-sm'
                        : 'gba:border-border/70 gba:bg-card gba:text-muted-foreground gba:hover:border-border gba:hover:text-foreground'
                    }`}
                    data-testid={`agent-config-tab-${tab.value}`}
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
                        <TabIcon className="gba:h-4 gba:w-4" />
                        {tab.label}
                      </span>
                    </span>
                  </button>
                )
              })}
            </nav>
          </aside>

          <main className="gba:min-w-0 gba:flex-1">
            <div
              className="gba:mx-auto gba:max-w-3xl gba:rounded-xl gba:border gba:border-border/70 gba:bg-card gba:p-6 gba:shadow-sm"
              data-testid={`agent-config-tab-panel-${activeTab}`}
            >
              <AgentConfigActiveTab
                activeTab={activeTab}
                agent={agent}
                accessToken={accessToken}
                workforceConfigEnabled={workforceConfigEnabled}
                workforceConfig={workforceConfig}
                avatarPreview={avatarPreview}
                avatarGenerating={avatarGenerating}
                avatarError={avatarError}
                canGenerateAvatar={canGenerateAvatar}
                detailsName={detailsName}
                detailsDescription={detailsDescription}
                detailsTags={detailsTags}
                detailsSpecialty={detailsSpecialty}
                detailsLoading={detailsLoading}
                detailsSaving={detailsSaving}
                detailsSaved={detailsSaved}
                detailsDirty={detailsDirty}
                detailsError={detailsError}
                descriptionSignals={descriptionSignals}
                detailAvailable={detailAvailable}
                systemPrompt={systemPrompt}
                savedSystemPrompt={savedSystemPrompt}
                systemPromptError={systemPromptError}
                systemPromptDirty={systemPromptDirty}
                systemPromptSaving={systemPromptSaving}
                systemPromptSaved={systemPromptSaved}
                skillsLoading={skillsLoading}
                skillsError={skillsError}
                assignedSkills={assignedSkills}
                unassignedSkills={unassignedSkills}
                showSkillPicker={showSkillPicker}
                skillSearchQuery={skillSearchQuery}
                compliance={compliance}
                onViewActivity={onViewActivity}
                onWorkforceDeployed={onWorkforceDeployed}
                setActiveTab={setActiveTab}
                setDetailsName={setDetailsName}
                setDetailsDescription={setDetailsDescription}
                setDetailsTags={setDetailsTags}
                setDetailsSpecialty={setDetailsSpecialty}
                setSystemPrompt={setSystemPrompt}
                setSystemPromptError={setSystemPromptError}
                setShowSkillPicker={setShowSkillPicker}
                setSkillSearchQuery={setSkillSearchQuery}
                setWorkforceJustDeployed={setWorkforceJustDeployed}
                handleGenerateAvatar={handleGenerateAvatar}
                handleSaveDetails={handleSaveDetails}
                handleSaveSystemPrompt={handleSaveSystemPrompt}
                toggleSkill={toggleSkill}
              />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
