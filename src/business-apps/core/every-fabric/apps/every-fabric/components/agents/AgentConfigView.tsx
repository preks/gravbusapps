import { useEffect, useMemo, useState } from 'react'
import { Button } from '@newwork/nw-design-system'
import {
  ArrowLeftIcon,
  LightbulbIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SpinnerGapIcon,
  WrenchIcon,
  XIcon
} from '@phosphor-icons/react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { getSourceDisplay } from './agentSourceUtils'
import { AgentPoliciesEditor } from './AgentPoliciesEditor'
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
  onBack: () => void
  onSkillsSaved: (agentId: string, skillIds: string[]) => void
  onAgentUpdated?: (agentId: string, updates: { name: string; description: string; tags: string[] }) => void
}

const formatAgentName = (name: string) => name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

export const AgentConfigView: React.FC<AgentConfigViewProps> = ({
  agent,
  accessToken,
  onBack,
  onSkillsSaved,
  onAgentUpdated
}) => {
  const client = usePromptManagerClient(accessToken)
  const sourceDisplay = getSourceDisplay(agent.source)

  // Skills state
  const [availableSkills, setAvailableSkills] = useState<SkillOption[]>([])
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(new Set())
  const [skillsLoading, setSkillsLoading] = useState(true)
  const [skillsError, setSkillsError] = useState<string | null>(null)
  const [showSkillPicker, setShowSkillPicker] = useState(false)
  const [skillSearchQuery, setSkillSearchQuery] = useState('')

  // Tools state (read-only, from detail endpoint)
  const [tools, setTools] = useState<string[]>([])

  // Details state
  const [detailsName, setDetailsName] = useState(agent.name)
  const [detailsDescription, setDetailsDescription] = useState(agent.description)
  const [detailsTags, setDetailsTags] = useState(agent.tags.join(', '))
  const [detailsLoading, setDetailsLoading] = useState(true)
  const [detailsSaving, setDetailsSaving] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [savedName, setSavedName] = useState(agent.name)
  const [savedDescription, setSavedDescription] = useState(agent.description)
  const [savedTags, setSavedTags] = useState(agent.tags.join(', '))
  const detailsDirty = detailsName !== savedName || detailsDescription !== savedDescription || detailsTags !== savedTags

  // Load skills, policies, details and tools in parallel on mount
  useEffect(() => {
    let cancelled = false

    const applySkillsResult = (
      result: PromiseSettledResult<
        [
          Awaited<ReturnType<typeof client.getAgentSkills>>,
          SkillOption[],
          Array<Omit<SkillOption, 'status' | 'is_active'>>
        ]
      >
    ) => {
      if (result.status !== 'fulfilled') {
        setSkillsError(result.reason instanceof Error ? result.reason.message : 'Failed to load skills')
        return
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
      setAvailableSkills(
        allSkills.filter(s => s.is_active === true || agentSkills.skills.some(a => a.skill_id === s.skill_id))
      )
      setSelectedSkillIds(new Set(agentSkills.skills.map(s => s.skill_id)))
    }

    const applyDetailsResult = (result: PromiseSettledResult<Awaited<ReturnType<typeof client.getAgentDetail>>>) => {
      if (result.status !== 'fulfilled') {
        setDetailsError(result.reason instanceof Error ? result.reason.message : 'Failed to load agent details')
        return
      }
      const detail = result.value
      setTools(detail.tools ?? [])
      const loadedName = detail.name ?? agent.name
      const loadedDesc = detail.description ?? agent.description
      const loadedTags = (detail.tags ?? agent.tags).join(', ')
      setDetailsName(loadedName)
      setDetailsDescription(loadedDesc)
      setDetailsTags(loadedTags)
      setSavedName(loadedName)
      setSavedDescription(loadedDesc)
      setSavedTags(loadedTags)
    }

    const load = async () => {
      setSkillsLoading(true)
      setSkillsError(null)
      setDetailsLoading(true)
      setDetailsError(null)
      const [skillsResult, detailResult] = await Promise.allSettled([
        Promise.all([
          client.getAgentSkills(agent.id),
          client.get<SkillOption[]>('/admin/skills/').catch(() => [] as SkillOption[]),
          client.get<Array<Omit<SkillOption, 'status' | 'is_active'>>>('/skills/manifest').catch(() => [])
        ]),
        client.getAgentDetail(agent.id)
      ])
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

  const handleSaveDetails = async () => {
    setDetailsSaving(true)
    setDetailsError(null)
    try {
      const tags = detailsTags
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
      await client.updateAgentDetails(agent.id, {
        name: detailsName,
        description: detailsDescription,
        tags
      })
      setSavedName(detailsName)
      setSavedDescription(detailsDescription)
      setSavedTags(detailsTags)
      onAgentUpdated?.(agent.id, { name: detailsName, description: detailsDescription, tags })
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
          <div className="gba:flex gba:items-center gba:gap-2">
            <h1 className="gba:text-xl gba:font-semibold gba:text-foreground">{formatAgentName(agent.name)}</h1>
            <span
              className={`gba:rounded-full gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-medium ${sourceDisplay.badgeClass}`}
            >
              {sourceDisplay.label}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="gba:flex-1 gba:overflow-y-auto">
        <div className="gba:max-w-3xl gba:mx-auto gba:px-6 gba:lg:px-10 gba:py-8 gba:space-y-10">
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

          {/* Tools Section (read-only) */}
          <section data-testid="agent-config-tools">
            <h2 className="gba:text-base gba:font-semibold gba:text-foreground gba:mb-4">Tools</h2>
            {detailsLoading ? (
              <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
                <SpinnerGapIcon className="gba:h-6 gba:w-6 gba:animate-spin gba:text-muted-foreground" />
              </div>
            ) : tools.length === 0 ? (
              <p className="gba:text-sm gba:text-muted-foreground gba:py-4">No tools assigned.</p>
            ) : (
              <div className="gba:flex gba:flex-wrap gba:gap-2">
                {tools.map(tool => (
                  <span
                    key={tool}
                    className="gba:inline-flex gba:items-center gba:gap-1.5 gba:rounded-lg gba:border gba:border-border gba:bg-muted/40 gba:px-3 gba:py-1.5 gba:text-sm gba:text-foreground"
                  >
                    <WrenchIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
                    {tool}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Details Section */}
          <section data-testid="agent-config-details">
            <h2 className="gba:text-base gba:font-semibold gba:text-foreground gba:mb-4">Details</h2>

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
                  <label className="gba:block gba:text-sm gba:font-medium gba:text-foreground gba:mb-1">Name</label>
                  <input
                    type="text"
                    value={detailsName}
                    onChange={e => setDetailsName(e.target.value)}
                    className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                    data-testid="details-name-input"
                  />
                </div>

                <div>
                  <label
                    htmlFor="details-description"
                    className="gba:block gba:text-sm gba:font-medium gba:text-foreground gba:mb-1"
                  >
                    Description
                  </label>
                  <textarea
                    id="details-description"
                    value={detailsDescription}
                    onChange={e => setDetailsDescription(e.target.value)}
                    rows={3}
                    className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring gba:resize-none"
                    data-testid="details-description-input"
                  />
                </div>

                <div>
                  <label className="gba:block gba:text-sm gba:font-medium gba:text-foreground gba:mb-1">Tags</label>
                  <input
                    type="text"
                    value={detailsTags}
                    onChange={e => setDetailsTags(e.target.value)}
                    className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                    placeholder="Comma-separated, e.g. finance, analytics, reporting"
                    data-testid="details-tags-input"
                  />
                </div>

                <div className="gba:pt-2 gba:flex gba:justify-end">
                  <Button size="sm" onClick={() => void handleSaveDetails()} disabled={!detailsDirty || detailsSaving}>
                    {detailsSaving && <SpinnerGapIcon className="gba:mr-1.5 gba:h-3.5 gba:w-3.5 gba:animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
