// Skill assignment picker — multi-select approved skills with optional version pinning.

import React, { useCallback, useEffect, useState } from 'react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import { CheckIcon, LightbulbIcon, SpinnerGapIcon, XIcon } from '@phosphor-icons/react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { SkillBinding } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import type { FabricAgent } from './agentTypes'
import translations from '../../_i18n'

interface SkillOption {
  skill_id: string
  name: string
  description: string
  status: string
  is_active?: boolean
  category?: string | null
  tool_refs?: string[]
  version?: number
  published_version?: number | null
  published_versions?: number[]
}

type BindingState = {
  follow_latest: boolean
  version: number | null
}

interface SkillAssignmentPickerProps {
  agent: FabricAgent
  accessToken: string
  onClose: () => void
  onSaved: (updatedSkillIds: string[]) => void
}

const defaultBinding = (): BindingState => ({ follow_latest: true, version: null })

const versionOptions = (skill: SkillOption): number[] => {
  const published = skill.published_versions?.length
    ? skill.published_versions
    : skill.published_version != null
      ? [skill.published_version]
      : []
  return Array.from(new Set(published)).sort((a, b) => a - b)
}

export const SkillAssignmentPicker: React.FC<SkillAssignmentPickerProps> = ({
  agent,
  accessToken,
  onClose,
  onSaved
}) => {
  const { t } = useTranslation(translations)
  const client = usePromptManagerClient(accessToken)
  const [availableSkills, setAvailableSkills] = useState<SkillOption[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bindings, setBindings] = useState<Map<string, BindingState>>(new Map())
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
          .get<
            Array<
              Omit<SkillOption, 'status' | 'is_active'> & {
                tool_refs?: string[]
                version?: number
                published_version?: number | null
              }
            >
          >('/skills/manifest')
          .catch(() => [])
      ])
      const merged = new Map<string, SkillOption>()
      for (const skill of adminSkills) {
        merged.set(skill.skill_id, skill)
      }
      for (const skill of runtimeSkills) {
        if (!merged.has(skill.skill_id)) {
          merged.set(skill.skill_id, { ...skill, status: 'built_in', is_active: true })
        } else {
          const existing = merged.get(skill.skill_id)!
          merged.set(skill.skill_id, {
            ...existing,
            version: skill.version ?? existing.version,
            published_version: skill.published_version ?? existing.published_version
          })
        }
      }
      const visibleSkills = Array.isArray([...merged.values()])
        ? [...merged.values()]
            .filter(skill => skill.is_active === true || agentSkills.skills.some(s => s.skill_id === skill.skill_id))
            .sort((a, b) => a.skill_id.localeCompare(b.skill_id))
        : []
      const skillsWithVersions = await Promise.all(
        visibleSkills.map(async skill => {
          const versions = await client
            .get<
              Array<{ version: number; is_published?: boolean; is_published_pointer?: boolean }>
            >(`/admin/skills/${encodeURIComponent(skill.skill_id)}/versions`)
            .catch(() => [])
          const publishedVersions = versions
            .filter(row => row.is_published || row.is_published_pointer)
            .map(row => row.version)
          if (publishedVersions.length === 0 && skill.published_version != null) {
            publishedVersions.push(skill.published_version)
          }
          return { ...skill, published_versions: Array.from(new Set(publishedVersions)).sort((a, b) => a - b) }
        })
      )
      setAvailableSkills(skillsWithVersions)

      const nextBindings = new Map<string, BindingState>()
      const rows = (agentSkills.skill_bindings?.length ? agentSkills.skill_bindings : agentSkills.skills).filter(
        row => row.enabled !== false
      )
      for (const row of rows) {
        nextBindings.set(row.skill_id, {
          follow_latest: row.follow_latest !== false,
          version: row.version ?? null
        })
      }
      setBindings(nextBindings)
      setSelectedIds(new Set(rows.map(row => row.skill_id)))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('agents-skill-picker-error-load'))
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
        setBindings(b => {
          const copy = new Map(b)
          copy.delete(skillId)
          return copy
        })
      } else {
        next.add(skillId)
        setBindings(b => {
          const copy = new Map(b)
          if (!copy.has(skillId)) copy.set(skillId, defaultBinding())
          return copy
        })
      }
      return next
    })
  }

  const setBindingMode = (skillId: string, mode: 'latest' | number) => {
    setBindings(prev => {
      const copy = new Map(prev)
      if (mode === 'latest') {
        copy.set(skillId, { follow_latest: true, version: null })
      } else {
        copy.set(skillId, { follow_latest: false, version: mode })
      }
      return copy
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    try {
      const payload: SkillBinding[] = Array.from(selectedIds).map(skillId => {
        const state = bindings.get(skillId) ?? defaultBinding()
        const skill = availableSkills.find(row => row.skill_id === skillId)
        const publishedVersions = skill ? versionOptions(skill) : []
        if (!state.follow_latest && (state.version == null || !publishedVersions.includes(state.version))) {
          throw new Error(t('agents-skill-picker-error-pin', { skillId }))
        }
        return {
          skill_id: skillId,
          follow_latest: state.follow_latest,
          version: state.follow_latest ? null : state.version,
          enabled: true
        }
      })
      await client.setAgentSkills(agent.id, payload)
      onSaved(Array.from(selectedIds))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('agents-skill-picker-error-save'))
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
        <div className="gba:flex gba:items-center gba:justify-between gba:px-5 gba:py-4 gba:border-b gba:border-border">
          <div>
            <h2 className="gba:text-base gba:font-semibold gba:text-foreground">{t('agents-skill-picker-title')}</h2>
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
              {t('agents-skill-picker-empty')}
            </p>
          )}

          {!isLoading && availableSkills.length > 0 && (
            <div className="gba:space-y-2">
              {availableSkills.map(skill => {
                const isSelected = selectedIds.has(skill.skill_id)
                const binding = bindings.get(skill.skill_id) ?? defaultBinding()
                const pinOptions = versionOptions(skill)
                const pinnedVersionUnavailable =
                  !binding.follow_latest && binding.version != null && !pinOptions.includes(binding.version)
                const selectValue = binding.follow_latest
                  ? 'latest'
                  : pinnedVersionUnavailable
                    ? 'unavailable'
                    : String(binding.version ?? '')
                return (
                  <div
                    key={skill.skill_id}
                    className={`gba:w-full gba:rounded-lg gba:border gba:p-3 gba:transition-colors ${
                      isSelected
                        ? 'gba:border-primary gba:bg-primary/5'
                        : 'gba:border-border gba:hover:border-primary/50 gba:hover:bg-muted/30'
                    }`}
                    data-testid={`skill-option-${skill.skill_id}`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSkill(skill.skill_id)}
                      className="gba:w-full gba:flex gba:items-start gba:gap-3 gba:text-left"
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
                        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
                          <LightbulbIcon className="gba:h-3.5 gba:w-3.5 gba:text-amber-600 gba:shrink-0" />
                          <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">
                            {skill.name || skill.skill_id}
                          </span>
                          {skill.published_version != null && (
                            <span className="gba:text-[10px] gba:text-muted-foreground">
                              {t('agents-skill-picker-pub-version', { version: skill.published_version })}
                            </span>
                          )}
                          {skill.status === 'built_in' && (
                            <span className="gba:shrink-0 gba:rounded gba:bg-blue-100 gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-blue-800">
                              {t('agents-skill-picker-builtin')}
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
                    {isSelected && (
                      <div
                        className="gba:mt-2 gba:pl-8 gba:flex gba:items-center gba:gap-2"
                        onClick={e => e.stopPropagation()}
                      >
                        <label
                          htmlFor={`skill-version-${skill.skill_id}`}
                          className="gba:text-[11px] gba:text-muted-foreground gba:shrink-0"
                        >
                          {t('agents-skill-picker-runtime-version')}
                        </label>
                        <select
                          id={`skill-version-${skill.skill_id}`}
                          data-testid={`skill-version-select-${skill.skill_id}`}
                          className="gba:flex-1 gba:rounded-md gba:border gba:border-border gba:bg-background gba:px-2 gba:py-1 gba:text-xs"
                          value={selectValue}
                          onChange={e => {
                            const v = e.target.value
                            setBindingMode(skill.skill_id, v === 'latest' ? 'latest' : Number(v))
                          }}
                        >
                          <option value="latest">
                            {t('agents-skill-picker-latest-published')}
                            {skill.published_version != null ? ` (v${skill.published_version})` : ''}
                          </option>
                          {pinnedVersionUnavailable && binding.version != null && (
                            <option value="unavailable" disabled>
                              {t('agents-skill-picker-pin-unavailable', { version: binding.version })}
                            </option>
                          )}
                          {pinOptions.map(v => (
                            <option key={v} value={String(v)}>
                              {t('agents-skill-picker-pin', { version: v })}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="gba:flex gba:items-center gba:justify-between gba:px-5 gba:py-4 gba:border-t gba:border-border">
          <p className="gba:text-xs gba:text-muted-foreground">
            {t('agents-skill-picker-selected-count', { count: selectedIds.size })}
          </p>
          <div className="gba:flex gba:items-center gba:gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              {t('agents-cancel-label')}
            </Button>
            <Button size="sm" onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? <SpinnerGapIcon className="gba:mr-1.5 gba:h-3.5 gba:w-3.5 gba:animate-spin" /> : null}
              {t('agents-skill-picker-save')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
