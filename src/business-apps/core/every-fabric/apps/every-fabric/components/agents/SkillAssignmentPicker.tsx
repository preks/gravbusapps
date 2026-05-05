// Skill assignment picker — multi-select approved skills for an agent.

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@newwork/nw-design-system'
import { CheckIcon, LightbulbIcon, SpinnerGapIcon, XIcon } from '@phosphor-icons/react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { FabricAgent } from './agentTypes'

interface SkillOption {
  skill_id: string
  name: string
  description: string
  status: string
  is_active?: boolean
  category?: string | null
  tool_refs?: string[]
}

interface SkillAssignmentPickerProps {
  agent: FabricAgent
  accessToken: string
  onClose: () => void
  onSaved: (updatedSkillIds: string[]) => void
}

export const SkillAssignmentPicker: React.FC<SkillAssignmentPickerProps> = ({
  agent,
  accessToken,
  onClose,
  onSaved
}) => {
  const client = usePromptManagerClient(accessToken)
  const [availableSkills, setAvailableSkills] = useState<SkillOption[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [agentSkills, adminSkills, runtimeSkills] = await Promise.all([
        client.getAgentSkills(agent.id),
        client.get<SkillOption[]>('/admin/skills/').catch(() => [] as SkillOption[]),
        client
          .get<Array<Omit<SkillOption, 'status' | 'is_active'> & { tool_refs?: string[] }>>('/skills/manifest')
          .catch(() => [])
      ])
      const merged = new Map<string, SkillOption>()
      for (const skill of adminSkills) {
        merged.set(skill.skill_id, skill)
      }
      for (const skill of runtimeSkills) {
        if (!merged.has(skill.skill_id)) {
          merged.set(skill.skill_id, { ...skill, status: 'built_in', is_active: true })
        }
      }
      const allSkills = [...merged.values()].sort((a, b) => a.skill_id.localeCompare(b.skill_id))
      setAvailableSkills(
        Array.isArray(allSkills)
          ? allSkills.filter(
              skill => skill.is_active === true || agentSkills.skills.some(s => s.skill_id === skill.skill_id)
            )
          : []
      )
      setSelectedIds(new Set(agentSkills.skills.map(s => s.skill_id)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load skill data')
    } finally {
      setIsLoading(false)
    }
  }, [client, agent.id])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const toggleSkill = (skillId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(skillId)) {
        next.delete(skillId)
      } else {
        next.add(skillId)
      }
      return next
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    try {
      const ids = Array.from(selectedIds)
      await client.setAgentSkills(agent.id, ids)
      onSaved(ids)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save skill assignments')
    } finally {
      setIsSaving(false)
    }
  }

  const formatAgentName = (name: string) => name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  return (
    <div
      className="gba:fixed gba:inset-0 gba:z-50 gba:flex gba:items-center gba:justify-center gba:bg-black/40"
      data-testid="skill-picker-overlay"
    >
      <div className="gba:w-full gba:max-w-lg gba:max-h-[80vh] gba:flex gba:flex-col gba:rounded-xl gba:border gba:border-border gba:bg-card gba:shadow-2xl">
        {/* Header */}
        <div className="gba:flex gba:items-center gba:justify-between gba:px-5 gba:py-4 gba:border-b gba:border-border">
          <div>
            <h2 className="gba:text-base gba:font-semibold gba:text-foreground">Assign Skills</h2>
            <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">{formatAgentName(agent.name)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="gba:inline-flex gba:items-center gba:justify-center gba:h-7 gba:w-7 gba:rounded-md gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted gba:transition-colors"
            data-testid="skill-picker-close"
          >
            <XIcon className="gba:h-4 gba:w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:p-5">
          {isLoading && (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
              <SpinnerGapIcon className="gba:h-6 gba:w-6 gba:animate-spin gba:text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="gba:rounded-lg gba:border gba:border-destructive/30 gba:bg-destructive/5 gba:p-3 gba:text-sm gba:text-destructive gba:mb-3">
              {error}
            </div>
          )}

          {!isLoading && availableSkills.length === 0 && (
            <p className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-8">
              No enabled skills available. Create a skill and enable it first.
            </p>
          )}

          {!isLoading && availableSkills.length > 0 && (
            <div className="gba:space-y-2">
              {availableSkills.map(skill => {
                const isSelected = selectedIds.has(skill.skill_id)
                return (
                  <button
                    key={skill.skill_id}
                    type="button"
                    onClick={() => toggleSkill(skill.skill_id)}
                    className={`gba:w-full gba:flex gba:items-start gba:gap-3 gba:rounded-lg gba:border gba:p-3 gba:text-left gba:transition-colors ${
                      isSelected
                        ? 'gba:border-primary gba:bg-primary/5'
                        : 'gba:border-border gba:hover:border-primary/50 gba:hover:bg-muted/30'
                    }`}
                    data-testid={`skill-option-${skill.skill_id}`}
                  >
                    <div
                      className={`gba:flex gba:h-5 gba:w-5 gba:shrink-0 gba:items-center gba:justify-center gba:rounded gba:border gba:mt-0.5 ${
                        isSelected
                          ? 'gba:border-primary gba:bg-primary gba:text-primary-foreground'
                          : 'gba:border-border'
                      }`}
                    >
                      {isSelected && <CheckIcon className="gba:h-3 gba:w-3" />}
                    </div>
                    <div className="gba:flex-1 gba:min-w-0">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <LightbulbIcon className="gba:h-3.5 gba:w-3.5 gba:text-amber-600 gba:shrink-0" />
                        <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">
                          {skill.name || skill.skill_id}
                        </span>
                        {skill.status === 'built_in' && (
                          <span className="gba:shrink-0 gba:rounded gba:bg-blue-100 gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-blue-800">
                            Built-in
                          </span>
                        )}
                      </div>
                      {skill.description && (
                        <p className="gba:mt-0.5 gba:text-xs gba:text-muted-foreground gba:line-clamp-2">
                          {skill.description}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="gba:flex gba:items-center gba:justify-between gba:px-5 gba:py-4 gba:border-t gba:border-border">
          <p className="gba:text-xs gba:text-muted-foreground">
            {selectedIds.size} skill{selectedIds.size !== 1 ? 's' : ''} selected
          </p>
          <div className="gba:flex gba:items-center gba:gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? <SpinnerGapIcon className="gba:mr-1.5 gba:h-3.5 gba:w-3.5 gba:animate-spin" /> : null}
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
