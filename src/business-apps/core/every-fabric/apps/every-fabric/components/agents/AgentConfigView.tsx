import React, { useEffect, useMemo, useState } from 'react'
import { Button } from '@newwork/nw-design-system'
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  LightbulbIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SpinnerGapIcon,
  WarningCircleIcon,
  WrenchIcon,
  XCircleIcon,
  XIcon
} from '@phosphor-icons/react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { PromptManagerClient } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import {
  evaluateAgentCompliance,
  evaluateDescription,
  evaluateSystemPrompt,
  DESCRIPTION_EXAMPLE,
  DESCRIPTION_MIN_LENGTH,
  NAME_HINT,
  SPECIALTY_HINT,
  SYSTEM_PROMPT_MIN_LENGTH,
  type ComplianceLevel
} from './agentStandard'
import { AgentPoliciesEditor } from './AgentPoliciesEditor'
import { WorkforceConfigSections } from './WorkforceConfigSections'
import type { FabricAgent } from './agentTypes'

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
  onAgentUpdated?: (
    agentId: string,
    updates: { name: string; description: string; tags: string[]; specialty: string }
  ) => void
}

const formatAgentName = (name: string) => name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

type AgentSkillsResponse = Awaited<ReturnType<PromptManagerClient['getAgentSkills']>>
type AgentDetailResponse = Awaited<ReturnType<PromptManagerClient['getAgentDetail']>>
type RuntimeSkill = Omit<SkillOption, 'status' | 'is_active'>
type SkillsPromiseResult = PromiseSettledResult<[AgentSkillsResponse, SkillOption[], RuntimeSkill[]]>

type SkillsComputation = { error: string } | { available: SkillOption[]; selectedIds: Set<string> }

interface DetailsComputation {
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

/** Resolve the editable detail fields, falling back to the values already on the agent. */
function computeDetailsResult(
  result: PromiseSettledResult<AgentDetailResponse>,
  agent: FabricAgent
): DetailsComputationResult {
  if (result.status !== 'fulfilled') {
    return { error: errorMessage(result.reason, 'Failed to load agent details') }
  }
  const detail = result.value
  return {
    detail: {
      systemPrompt: detail.system_prompt ?? null,
      name: detail.name ?? agent.name,
      description: detail.description ?? agent.description,
      tags: (detail.tags ?? agent.tags).join(', '),
      specialty: detail.specialty ?? agent.specialty ?? ''
    }
  }
}

const SaveButtonContent: React.FC<{ saving: boolean; saved: boolean; label: string }> = ({ saving, saved, label }) => {
  if (saving) {
    return (
      <>
        <SpinnerGapIcon className="gba:mr-1.5 gba:h-3.5 gba:w-3.5 gba:animate-spin" />
        Saving…
      </>
    )
  }
  if (saved) {
    return (
      <>
        <CheckCircleIcon className="gba:mr-1.5 gba:h-3.5 gba:w-3.5" weight="fill" />
        Saved
      </>
    )
  }
  return <>{label}</>
}

export const AgentConfigView: React.FC<AgentConfigViewProps> = ({
  agent,
  accessToken,
  isWorkforceEnabled = false,
  onBack,
  onSkillsSaved,
  onAgentUpdated
}) => {
  const client = usePromptManagerClient(accessToken)

  // Skills state
  const [availableSkills, setAvailableSkills] = useState<SkillOption[]>([])
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(new Set())
  const [skillsLoading, setSkillsLoading] = useState(true)
  const [skillsError, setSkillsError] = useState<string | null>(null)
  const [showSkillPicker, setShowSkillPicker] = useState(false)
  const [skillSearchQuery, setSkillSearchQuery] = useState('')

  // System prompt — editable; loaded from the detail endpoint.
  const [systemPrompt, setSystemPrompt] = useState<string | null>(null)
  const [savedSystemPrompt, setSavedSystemPrompt] = useState<string | null>(null)
  const [systemPromptSaving, setSystemPromptSaving] = useState(false)
  const [systemPromptSaved, setSystemPromptSaved] = useState(false)
  const [systemPromptError, setSystemPromptError] = useState<string | null>(null)
  const systemPromptDirty = (systemPrompt ?? '') !== (savedSystemPrompt ?? '')

  // Details state
  const [detailsName, setDetailsName] = useState(agent.name)
  const [detailsDescription, setDetailsDescription] = useState(agent.description)
  const [detailsTags, setDetailsTags] = useState(agent.tags.join(', '))
  const [detailsSpecialty, setDetailsSpecialty] = useState(agent.specialty ?? '')
  const [detailsLoading, setDetailsLoading] = useState(true)
  const [detailsSaving, setDetailsSaving] = useState(false)
  const [detailsSaved, setDetailsSaved] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [savedName, setSavedName] = useState(agent.name)
  const [savedDescription, setSavedDescription] = useState(agent.description)
  const [savedTags, setSavedTags] = useState(agent.tags.join(', '))
  const [savedSpecialty, setSavedSpecialty] = useState(agent.specialty ?? '')
  const detailsDirty =
    detailsName !== savedName ||
    detailsDescription !== savedDescription ||
    detailsTags !== savedTags ||
    detailsSpecialty !== savedSpecialty
  const descriptionSignals = evaluateDescription(detailsDescription, detailsName)

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

    const applyDetailsResult = (result: PromiseSettledResult<AgentDetailResponse>) => {
      const computed = computeDetailsResult(result, agent)
      if ('error' in computed) {
        setDetailsError(computed.error)
        return
      }
      const { systemPrompt: loadedPrompt, name, description, tags, specialty } = computed.detail
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

      // The registry detail endpoint is PromptODM-only and 404s for workforce
      // agents (they live in AutonomousAgentODM). Skip it for them and use the
      // name/description/tags already passed in; tools are surfaced via skills.
      if (isWorkforceEnabled) {
        const [skillsResult] = await Promise.allSettled([skillsPromise])
        if (cancelled) return
        applySkillsResult(skillsResult)
        setSkillsLoading(false)
        setDetailsLoading(false)
        return
      }

      const [skillsResult, detailResult] = await Promise.allSettled([skillsPromise, client.getAgentDetail(agent.id)])
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
  }, [client, agent.id, isWorkforceEnabled])

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
      await client.updateAgentDetails(agent.id, {
        name: detailsName,
        description: detailsDescription,
        tags,
        specialty
      })
      setSavedName(detailsName)
      setSavedDescription(detailsDescription)
      setSavedTags(detailsTags)
      setSavedSpecialty(detailsSpecialty)
      setDetailsSaved(true)
      onAgentUpdated?.(agent.id, { name: detailsName, description: detailsDescription, tags, specialty })
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : 'Failed to save details')
    } finally {
      setDetailsSaving(false)
    }
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid="agent-config-view">
      {/* Header */}
      <div className="gba:shrink-0 gba:px-6 gba:lg:px-10 gba:pt-6 gba:pb-4 gba:border-b gba:border-border/50">
        <div className="gba:flex gba:items-center gba:gap-3">
          <button
            type="button"
            onClick={onBack}
            className="gba:inline-flex gba:items-center gba:justify-center gba:h-8 gba:w-8 gba:rounded-lg gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
            data-testid="agent-config-back"
          >
            <ArrowLeftIcon className="gba:h-5 gba:w-5" />
          </button>
          <h1 className="gba:text-xl gba:font-semibold gba:text-foreground">{formatAgentName(agent.name)}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="gba:flex-1 gba:overflow-y-auto">
        <div className="gba:max-w-3xl gba:mx-auto gba:px-6 gba:lg:px-10 gba:py-8 gba:space-y-10">
          {/* Standard compliance — pushes authors toward a real prompt + skills + tools */}
          {!isWorkforceEnabled && !detailsLoading && !skillsLoading && <ComplianceBanner compliance={compliance} />}

          {/* Identity: Name, Description, Tags, Specialty — the fields that drive discovery/selection */}
          <section data-testid="agent-config-details">
            <h2 className="gba:text-base gba:font-semibold gba:text-foreground gba:mb-1">Identity</h2>
            <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">
              Name, description, and specialty are how this agent gets discovered and chosen for a task.
            </p>

            {detailsError && (
              <div className="gba:rounded-lg gba:border gba:border-destructive/30 gba:bg-destructive/5 gba:p-3 gba:text-sm gba:text-destructive gba:mb-3">
                {detailsError}
              </div>
            )}

            {detailsLoading ? (
              <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
                <SpinnerGapIcon className="gba:h-6 gba:w-6 gba:animate-spin gba:text-muted-foreground" />
              </div>
            ) : (
              <div className="gba:space-y-4">
                <div>
                  <label
                    htmlFor="details-name"
                    className="gba:block gba:text-sm gba:font-medium gba:text-foreground gba:mb-1"
                  >
                    Name
                  </label>
                  <input
                    id="details-name"
                    type="text"
                    value={detailsName}
                    onChange={e => setDetailsName(e.target.value)}
                    className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                    data-testid="details-name-input"
                  />
                  <p className="gba:mt-1 gba:text-[11px] gba:text-muted-foreground">{NAME_HINT}</p>
                </div>

                <div>
                  <label
                    htmlFor="details-description"
                    className="gba:block gba:text-sm gba:font-medium gba:text-foreground gba:mb-1"
                  >
                    Description
                  </label>
                  <p className="gba:mb-1.5 gba:text-[11px] gba:text-muted-foreground">
                    The single biggest factor in whether this agent gets picked. Describe what it does using the words
                    people will actually type.
                  </p>
                  <textarea
                    id="details-description"
                    value={detailsDescription}
                    onChange={e => setDetailsDescription(e.target.value)}
                    rows={3}
                    placeholder={DESCRIPTION_EXAMPLE}
                    className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:leading-relaxed gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring gba:resize-y"
                    data-testid="details-description-input"
                  />
                  <DescriptionSignals signals={descriptionSignals} />
                  <p className="gba:mt-1.5 gba:text-[11px] gba:text-muted-foreground">
                    Example: <span className="gba:italic">{DESCRIPTION_EXAMPLE}</span>
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="details-tags"
                    className="gba:block gba:text-sm gba:font-medium gba:text-foreground gba:mb-1"
                  >
                    Tags
                  </label>
                  <input
                    id="details-tags"
                    type="text"
                    value={detailsTags}
                    onChange={e => setDetailsTags(e.target.value)}
                    className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                    placeholder="Comma-separated, e.g. support, tickets, internal-ops"
                    data-testid="details-tags-input"
                  />
                </div>

                <div>
                  <label
                    htmlFor="details-specialty"
                    className="gba:block gba:text-sm gba:font-medium gba:text-foreground gba:mb-1"
                  >
                    Specialty
                  </label>
                  <input
                    id="details-specialty"
                    type="text"
                    value={detailsSpecialty}
                    onChange={e => setDetailsSpecialty(e.target.value)}
                    className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                    placeholder="e.g. Employee support, procurement"
                    data-testid="details-specialty-input"
                  />
                  <p className="gba:mt-1 gba:text-[11px] gba:text-muted-foreground">{SPECIALTY_HINT}</p>
                </div>

                <div className="gba:pt-2 gba:flex gba:items-center gba:justify-end gba:gap-2">
                  <Button
                    size="sm"
                    onClick={() => void handleSaveDetails()}
                    disabled={!detailsDirty || detailsSaving || !descriptionSignals.isValid}
                    data-testid="details-save"
                  >
                    <SaveButtonContent
                      saving={detailsSaving}
                      saved={detailsSaved && !detailsDirty}
                      label="Save Changes"
                    />
                  </Button>
                </div>
              </div>
            )}
          </section>

          {/* System Prompt Section (editable) — defines who the agent is */}
          {!isWorkforceEnabled && (
            <section data-testid="agent-config-system-prompt">
              <h2 className="gba:text-base gba:font-semibold gba:text-foreground gba:mb-1">System Prompt</h2>
              <p className="gba:text-sm gba:text-muted-foreground gba:mb-3">
                Define the agent&apos;s identity, capabilities, and hard constraints (MUST / NEVER). This is the single
                biggest driver of how the agent behaves.
              </p>
              {detailsLoading ? (
                <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
                  <SpinnerGapIcon className="gba:h-6 gba:w-6 gba:animate-spin gba:text-muted-foreground" />
                </div>
              ) : (
                <div className="gba:flex gba:flex-col gba:gap-2">
                  <textarea
                    value={systemPrompt ?? ''}
                    onChange={e => setSystemPrompt(e.target.value)}
                    rows={14}
                    spellCheck={false}
                    placeholder={
                      'You are <name>, an expert in <domain>. Your mission is to ...\n\n' +
                      'Capabilities:\n- ...\n\nConstraints:\n- IMPORTANT: You MUST ...\n- You NEVER ...\n\nOutput:\n- ...'
                    }
                    className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:p-4 gba:text-sm gba:text-foreground gba:font-mono gba:leading-relaxed gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                    data-testid="agent-config-system-prompt-input"
                  />

                  <SystemPromptSignals value={systemPrompt ?? ''} />

                  {systemPromptError && (
                    <div
                      className="gba:rounded-lg gba:border gba:border-destructive/30 gba:bg-destructive/5 gba:p-3 gba:text-sm gba:text-destructive"
                      data-testid="system-prompt-error"
                    >
                      {systemPromptError}
                    </div>
                  )}

                  <div className="gba:flex gba:items-center gba:justify-end gba:gap-2 gba:pt-1">
                    {systemPromptDirty && (
                      <button
                        type="button"
                        onClick={() => {
                          setSystemPrompt(savedSystemPrompt)
                          setSystemPromptError(null)
                        }}
                        disabled={systemPromptSaving}
                        className="gba:text-sm gba:text-muted-foreground gba:hover:text-foreground gba:disabled:opacity-50"
                        data-testid="system-prompt-reset"
                      >
                        Reset
                      </button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => void handleSaveSystemPrompt()}
                      disabled={!systemPromptDirty || systemPromptSaving}
                      data-testid="system-prompt-save"
                    >
                      <SaveButtonContent
                        saving={systemPromptSaving}
                        saved={systemPromptSaved && !systemPromptDirty}
                        label="Save System Prompt"
                      />
                    </Button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Skills Section */}
          <section data-testid="agent-config-skills">
            <h2 className="gba:text-base gba:font-semibold gba:text-foreground gba:mb-4">Skills</h2>

            {skillsError && (
              <div className="gba:rounded-lg gba:border gba:border-destructive/30 gba:bg-destructive/5 gba:p-3 gba:text-sm gba:text-destructive gba:mb-3">
                {skillsError}
              </div>
            )}

            {skillsLoading ? (
              <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
                <SpinnerGapIcon className="gba:h-6 gba:w-6 gba:animate-spin gba:text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Assigned skills */}
                {assignedSkills.length === 0 ? (
                  <p className="gba:text-sm gba:text-muted-foreground gba:py-4">No skills assigned.</p>
                ) : (
                  <div className="gba:space-y-2">
                    {assignedSkills.map(skill => (
                      <div
                        key={skill.skill_id}
                        className="gba:rounded-lg gba:border gba:border-primary gba:bg-primary/5 gba:p-3"
                        data-testid={`config-skill-${skill.skill_id}`}
                      >
                        <div className="gba:flex gba:items-center gba:gap-3">
                          <LightbulbIcon className="gba:h-3.5 gba:w-3.5 gba:text-amber-600 gba:shrink-0" />
                          <span className="gba:flex-1 gba:text-sm gba:font-medium gba:text-foreground gba:truncate">
                            {skill.name || skill.skill_id}
                          </span>
                          {skill.status === 'built_in' && (
                            <span className="gba:shrink-0 gba:rounded gba:bg-blue-100 gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-blue-800">
                              Built-in
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleSkill(skill.skill_id)}
                            className="gba:inline-flex gba:items-center gba:justify-center gba:h-6 gba:w-6 gba:rounded gba:text-muted-foreground gba:hover:text-destructive gba:hover:bg-destructive/10 gba:transition-colors"
                            data-testid={`config-skill-remove-${skill.skill_id}`}
                          >
                            <XIcon className="gba:h-3.5 gba:w-3.5" />
                          </button>
                        </div>
                        {skill.tool_refs && skill.tool_refs.length > 0 && (
                          <div className="gba:mt-2 gba:ml-6.5 gba:flex gba:flex-wrap gba:gap-1.5">
                            {skill.tool_refs.map(tool => (
                              <span
                                key={tool}
                                className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded gba:bg-muted/60 gba:px-2 gba:py-0.5 gba:text-xs gba:text-muted-foreground"
                              >
                                <WrenchIcon className="gba:h-3 gba:w-3" />
                                {tool}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Skill button / picker */}
                {!showSkillPicker ? (
                  <button
                    type="button"
                    onClick={() => setShowSkillPicker(true)}
                    className="gba:mt-3 gba:inline-flex gba:items-center gba:gap-1.5 gba:text-sm gba:font-medium gba:text-primary gba:hover:text-primary/80 gba:transition-colors"
                    data-testid="config-skill-add-button"
                  >
                    <PlusIcon className="gba:h-4 gba:w-4" />
                    Add Skill
                  </button>
                ) : (
                  <div className="gba:mt-3 gba:rounded-lg gba:border gba:border-border gba:p-3">
                    <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                      <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">Available skills</span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowSkillPicker(false)
                          setSkillSearchQuery('')
                        }}
                        className="gba:text-xs gba:font-medium gba:text-primary gba:hover:text-primary/80"
                        data-testid="config-skill-picker-done"
                      >
                        Done
                      </button>
                    </div>
                    <div className="gba:relative gba:mb-2">
                      <MagnifyingGlassIcon className="gba:absolute gba:left-2.5 gba:top-1/2 gba:-translate-y-1/2 gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
                      <input
                        type="text"
                        value={skillSearchQuery}
                        onChange={e => setSkillSearchQuery(e.target.value)}
                        placeholder="Search skills…"
                        className="gba:w-full gba:rounded-md gba:border gba:border-border gba:bg-background gba:pl-8 gba:pr-2.5 gba:py-1.5 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring placeholder:gba:text-muted-foreground/50"
                        data-testid="config-skill-search"
                      />
                    </div>
                    {unassignedSkills.length === 0 ? (
                      <p className="gba:text-xs gba:text-muted-foreground gba:py-2">
                        {skillSearchQuery.trim() ? 'No matching skills found.' : 'All skills are already assigned.'}
                      </p>
                    ) : (
                      <div className="gba:space-y-1.5">
                        {unassignedSkills.map(skill => (
                          <button
                            key={skill.skill_id}
                            type="button"
                            onClick={() => toggleSkill(skill.skill_id)}
                            className="gba:w-full gba:flex gba:items-center gba:gap-3 gba:rounded-lg gba:border gba:border-border gba:p-2.5 gba:text-left gba:hover:border-primary/50 gba:hover:bg-muted/30 gba:transition-colors"
                            data-testid={`config-skill-pick-${skill.skill_id}`}
                          >
                            <LightbulbIcon className="gba:h-3.5 gba:w-3.5 gba:text-amber-600 gba:shrink-0" />
                            <div className="gba:flex-1 gba:min-w-0">
                              <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">
                                {skill.name || skill.skill_id}
                              </span>
                              {skill.description && (
                                <p className="gba:text-xs gba:text-muted-foreground gba:line-clamp-1">
                                  {skill.description}
                                </p>
                              )}
                            </div>
                            {skill.status === 'built_in' && (
                              <span className="gba:shrink-0 gba:rounded gba:bg-blue-100 gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-blue-800">
                                Built-in
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </section>

          {/* Policies Section (agent-level intranet policy allow-list).
              Self-managed by AgentPoliciesEditor; renders nothing when the
              agent's ODM does not support per-agent policy_refs. */}
          <AgentPoliciesEditor agentId={agent.id} accessToken={accessToken} />

          {/* Workforce-only config (autonomy, triggers, escalation, budget,
              knowledge, role/ownership). Shown only for agents that also live
              on the Workforce surface; saves via the /workforce endpoints. */}
          {isWorkforceEnabled && <WorkforceConfigSections agentId={agent.id} accessToken={accessToken} />}
        </div>
      </div>
    </div>
  )
}

const LEVEL_STYLES: Record<ComplianceLevel, { wrap: string; title: string; text: string }> = {
  pass: {
    wrap: 'gba:border-emerald-500/30 gba:bg-emerald-500/5',
    title: 'Meets the Agent Authoring Standard',
    text: 'gba:text-emerald-700'
  },
  warn: {
    wrap: 'gba:border-amber-500/30 gba:bg-amber-500/5',
    title: 'Almost there — a few improvements recommended',
    text: 'gba:text-amber-700'
  },
  fail: {
    wrap: 'gba:border-destructive/30 gba:bg-destructive/5',
    title: 'This agent is incomplete and may not work',
    text: 'gba:text-destructive'
  }
}

const DescriptionSignals: React.FC<{ signals: ReturnType<typeof evaluateDescription> }> = ({ signals }) => {
  const chips: Array<{ ok: boolean; label: string }> = [
    { ok: signals.meetsMinimum, label: `At least ${DESCRIPTION_MIN_LENGTH} chars` },
    { ok: signals.notJustName, label: 'More than the name' },
    { ok: signals.isSpecific, label: 'Specific' }
  ]
  return (
    <div className="gba:mt-2 gba:space-y-1.5" data-testid="description-signals">
      {!signals.isValid && (
        <p className="gba:flex gba:items-center gba:gap-1.5 gba:text-[11px] gba:font-medium gba:text-destructive">
          <WarningCircleIcon className="gba:h-3.5 gba:w-3.5" />A real description is required — it&apos;s how this agent
          gets discovered and chosen.
        </p>
      )}
      <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
        <span className={`gba:text-xs ${signals.meetsMinimum ? 'gba:text-muted-foreground' : 'gba:text-amber-700'}`}>
          {signals.length} chars{signals.meetsMinimum ? '' : ` (min ${DESCRIPTION_MIN_LENGTH})`}
        </span>
        {chips.map(chip => (
          <span
            key={chip.label}
            className={`gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-medium ${
              chip.ok ? 'gba:bg-emerald-100 gba:text-emerald-700' : 'gba:bg-muted gba:text-muted-foreground'
            }`}
          >
            {chip.ok ? (
              <CheckCircleIcon className="gba:h-3 gba:w-3" weight="fill" />
            ) : (
              <WarningCircleIcon className="gba:h-3 gba:w-3" />
            )}
            {chip.label}
          </span>
        ))}
      </div>
    </div>
  )
}

const SystemPromptSignals: React.FC<{ value: string }> = ({ value }) => {
  const signals = evaluateSystemPrompt(value)
  const belowMin = signals.length < SYSTEM_PROMPT_MIN_LENGTH
  const chips: Array<{ ok: boolean; label: string }> = [
    { ok: signals.hasIdentity, label: 'Identity ("You are …")' },
    { ok: signals.hasConstraints, label: 'Constraints (MUST / NEVER)' },
    { ok: signals.isSubstantial, label: 'Enough detail' }
  ]
  return (
    <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2" data-testid="system-prompt-signals">
      <span className={`gba:text-xs ${belowMin ? 'gba:text-amber-700' : 'gba:text-muted-foreground'}`}>
        {signals.length} chars{belowMin ? ` (min ${SYSTEM_PROMPT_MIN_LENGTH})` : ''}
      </span>
      {chips.map(chip => (
        <span
          key={chip.label}
          className={`gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-medium ${
            chip.ok ? 'gba:bg-emerald-100 gba:text-emerald-700' : 'gba:bg-muted gba:text-muted-foreground'
          }`}
        >
          {chip.ok ? (
            <CheckCircleIcon className="gba:h-3 gba:w-3" weight="fill" />
          ) : (
            <WarningCircleIcon className="gba:h-3 gba:w-3" />
          )}
          {chip.label}
        </span>
      ))}
    </div>
  )
}

const CheckIcon: React.FC<{ level: ComplianceLevel }> = ({ level }) => {
  if (level === 'pass')
    return <CheckCircleIcon className="gba:h-4 gba:w-4 gba:text-emerald-600 gba:shrink-0" weight="fill" />
  if (level === 'warn') return <WarningCircleIcon className="gba:h-4 gba:w-4 gba:text-amber-600 gba:shrink-0" />
  return <XCircleIcon className="gba:h-4 gba:w-4 gba:text-destructive gba:shrink-0" />
}

const ComplianceBanner: React.FC<{ compliance: ReturnType<typeof evaluateAgentCompliance> }> = ({ compliance }) => {
  const style = LEVEL_STYLES[compliance.level]
  return (
    <section
      className={`gba:rounded-xl gba:border gba:p-4 ${style.wrap}`}
      data-testid="agent-config-compliance"
      data-level={compliance.level}
    >
      <div className="gba:mb-3 gba:flex gba:items-center gba:justify-between">
        <h2 className={`gba:text-sm gba:font-semibold ${style.text}`}>{style.title}</h2>
        <span className="gba:text-xs gba:text-muted-foreground">
          {compliance.passed}/{compliance.total} checks
        </span>
      </div>
      <ul className="gba:space-y-2">
        {compliance.checks.map(check => (
          <li key={check.id} className="gba:flex gba:items-start gba:gap-2">
            <CheckIcon level={check.level} />
            <div className="gba:min-w-0">
              <p className="gba:text-sm gba:font-medium gba:text-foreground">{check.label}</p>
              <p className="gba:text-xs gba:text-muted-foreground">{check.hint}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
