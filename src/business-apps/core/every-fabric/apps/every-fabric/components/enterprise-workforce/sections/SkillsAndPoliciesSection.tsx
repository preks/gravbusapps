// Skills & policies section.
//
// Beyond the lightweight chip editors, this section also resolves each
// assigned skill_id into a display row with the skill name, description,
// and the tool_refs the platform will attach to the agent at run time.
// Operators were previously left guessing why a Workforce agent had
// CRM tools available — now they can see "insurance-crm-workflow grants
// functions.search_crm_entity / functions.create_crm_entity / …"
// directly on the agent config screen, mirroring the Enterprise Agent
// Studio skill-detail view.

import { Button, useTranslation } from '@newwork/nw-design-system'
import { LightbulbIcon, SpinnerGapIcon, TrashIcon, WrenchIcon } from '@phosphor-icons/react'
import React, { useEffect, useMemo, useState } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { AgentPoliciesEditor } from '../../agents/AgentPoliciesEditor'
import type { WorkforceAgent, WorkforceAgentUpdateInput } from '../workforceTypes'
import { SectionShell } from './SectionShell'
import translations from '../../../_i18n'

interface SkillsAndPoliciesSectionProps {
  agent: WorkforceAgent
  accessToken: string
  isSaving: boolean
  onSave: (patch: WorkforceAgentUpdateInput) => Promise<void>
}

interface FormState {
  skillIds: string[]
  skillDraft: string
}

interface ResolvedSkill {
  skill_id: string
  name: string
  description: string
  tool_refs: string[]
}

function fromAgent(agent: WorkforceAgent): FormState {
  return {
    skillIds: [...(agent.skill_ids ?? [])],
    skillDraft: ''
  }
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  return a.every((v, i) => v === b[i])
}

interface ChipListProps {
  testId: string
  values: string[]
  draft: string
  placeholder: string
  onDraftChange: (next: string) => void
  onAdd: () => void
  onRemove: (value: string) => void
}

const ChipList: React.FC<ChipListProps> = ({ testId, values, draft, placeholder, onDraftChange, onAdd, onRemove }) => {
  const { t } = useTranslation(translations)
  return (
    <div>
      <div className="gba:flex gba:gap-2">
        <input
          value={draft}
          onChange={e => onDraftChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onAdd()
            }
          }}
          placeholder={placeholder}
          className="gba:h-9 gba:flex-1 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
          data-testid={`${testId}-input`}
        />
        <Button size="sm" variant="outline" onClick={onAdd} data-testid={`${testId}-add`}>
          {t('action-add')}
        </Button>
      </div>
      <ul className="gba:mt-2 gba:flex gba:flex-wrap gba:gap-1.5" data-testid={`${testId}-list`}>
        {values.map(value => (
          <li
            key={value}
            className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:bg-muted gba:px-2 gba:py-0.5 gba:text-[11px] gba:text-foreground"
          >
            <span>{value}</span>
            <button
              type="button"
              onClick={() => onRemove(value)}
              aria-label={t('action-remove', { value })}
              className="gba:text-muted-foreground gba:hover:text-destructive"
              data-testid={`${testId}-remove-${value}`}
            >
              <TrashIcon className="gba:h-3 gba:w-3" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

interface AssignedSkillsDetailProps {
  skillIds: string[]
  resolved: Map<string, ResolvedSkill>
  isLoading: boolean
}

const AssignedSkillsDetail: React.FC<AssignedSkillsDetailProps> = ({ skillIds, resolved, isLoading }) => {
  const { t } = useTranslation(translations)
  if (skillIds.length === 0) return null
  return (
    <div className="gba:mt-3 gba:space-y-2" data-testid="workforce-skill-details">
      {isLoading && (
        <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-[11px] gba:text-muted-foreground">
          <SpinnerGapIcon className="gba:h-3 gba:w-3 gba:animate-spin" />
          <span>{t('skills-resolving')}</span>
        </div>
      )}
      {skillIds.map(skillId => {
        const detail = resolved.get(skillId)
        return (
          <div
            key={skillId}
            className="gba:rounded-lg gba:border gba:border-border gba:bg-card gba:px-3 gba:py-2"
            data-testid={`workforce-skill-detail-${skillId}`}
          >
            <div className="gba:flex gba:items-start gba:gap-2">
              <LightbulbIcon className="gba:mt-0.5 gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
              <div className="gba:flex-1">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <span className="gba:text-xs gba:font-semibold gba:text-foreground">{detail?.name || skillId}</span>
                  {detail?.name && detail.name !== skillId && (
                    <span className="gba:text-[11px] gba:text-muted-foreground">{skillId}</span>
                  )}
                </div>
                {detail?.description && (
                  <p className="gba:mt-0.5 gba:line-clamp-2 gba:text-[11px] gba:text-muted-foreground">
                    {detail.description}
                  </p>
                )}
                {detail?.tool_refs && detail.tool_refs.length > 0 ? (
                  <div className="gba:mt-1.5">
                    <div className="gba:mb-1 gba:flex gba:items-center gba:gap-1 gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground">
                      <WrenchIcon className="gba:h-3 gba:w-3" />
                      <span>{t('skills-attached-tools')}</span>
                    </div>
                    <ul className="gba:flex gba:flex-wrap gba:gap-1" data-testid={`workforce-skill-tools-${skillId}`}>
                      {detail.tool_refs.map(ref => (
                        <li
                          key={ref}
                          className="gba:rounded-full gba:bg-muted gba:px-2 gba:py-0.5 gba:font-mono gba:text-[10px] gba:text-foreground"
                        >
                          {ref}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  !isLoading && (
                    <p className="gba:mt-1 gba:text-[10px] gba:text-muted-foreground">{t('skills-no-tools')}</p>
                  )
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export const SkillsAndPoliciesSection: React.FC<SkillsAndPoliciesSectionProps> = ({
  agent,
  accessToken,
  isSaving,
  onSave
}) => {
  const { t } = useTranslation(translations)
  const baseline = fromAgent(agent)
  const [form, setForm] = useState<FormState>(baseline)
  const [resolvedSkills, setResolvedSkills] = useState<Map<string, ResolvedSkill>>(new Map())
  const [isResolving, setIsResolving] = useState(false)
  const client = usePromptManagerClient(accessToken)

  useEffect(() => {
    setForm(fromAgent(agent))
  }, [agent])

  useEffect(() => {
    let cancelled = false
    const ids = agent.skill_ids ?? []
    if (ids.length === 0) {
      setResolvedSkills(new Map())
      return
    }
    setIsResolving(true)
    void (async () => {
      try {
        // Combine the agent-scoped catalog (carries display name + description)
        // with the runtime manifest (carries tool_refs). Either endpoint can
        // 404/500 on a fresh deployment — fall back gracefully so the agent
        // config screen never breaks because of a missing skill row.
        const [agentSkillsRes, manifestRes] = await Promise.all([
          client.getAgentSkills(agent.agent_id).catch(() => ({
            skills: [] as Array<{ skill_id: string; name: string; description: string }>,
            skill_bindings: undefined
          })),
          client
            .get<
              Array<{ skill_id: string; name?: string; description?: string; tool_refs?: string[] }>
            >('/skills/manifest')
            .catch(() => [] as Array<{ skill_id: string; tool_refs?: string[] }>)
        ])
        if (cancelled) return
        const next = new Map<string, ResolvedSkill>()
        for (const id of ids) {
          const fromManifest = manifestRes.find(s => s.skill_id === id)
          const fromAgentCatalog = agentSkillsRes.skills.find(s => s.skill_id === id)
          next.set(id, {
            skill_id: id,
            name: fromAgentCatalog?.name || fromManifest?.name || id,
            description: fromAgentCatalog?.description || fromManifest?.description || '',
            tool_refs: Array.isArray(fromManifest?.tool_refs) ? fromManifest!.tool_refs! : []
          })
        }
        setResolvedSkills(next)
      } finally {
        if (!cancelled) setIsResolving(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [agent.agent_id, agent.skill_ids, client])

  const dirty = !arraysEqual(form.skillIds, baseline.skillIds)

  const addSkill = () => {
    const trimmed = form.skillDraft.trim()
    if (!trimmed || form.skillIds.includes(trimmed)) return
    setForm(prev => ({ ...prev, skillIds: [...prev.skillIds, trimmed], skillDraft: '' }))
  }
  const removeSkill = (value: string) =>
    setForm(prev => ({ ...prev, skillIds: prev.skillIds.filter(s => s !== value) }))

  const assignedSkillIds = useMemo(() => form.skillIds, [form.skillIds])

  return (
    <SectionShell
      id="skills-policies"
      title={t('skills-section-title')}
      icon={LightbulbIcon}
      description={t('skills-section-desc')}
      isDirty={dirty}
      isSaving={isSaving}
      onSave={() =>
        void onSave({
          skill_ids: form.skillIds
        })
      }
      onReset={() => setForm(baseline)}
    >
      <div className="gba:space-y-4">
        <div>
          <p className="gba:mb-1 gba:text-xs gba:font-semibold gba:text-foreground">{t('skills-label')}</p>
          <ChipList
            testId="workforce-skills"
            values={form.skillIds}
            draft={form.skillDraft}
            placeholder={t('skills-skill-id-placeholder')}
            onDraftChange={next => setForm(prev => ({ ...prev, skillDraft: next }))}
            onAdd={addSkill}
            onRemove={removeSkill}
          />
          <AssignedSkillsDetail skillIds={assignedSkillIds} resolved={resolvedSkills} isLoading={isResolving} />
        </div>
        {/* Policies attach real intranet (EveryPages) policies via the picker
            and persist immediately through the registry endpoint — independent
            of the Skills save button above. */}
        <AgentPoliciesEditor
          agentId={agent.agent_id}
          accessToken={accessToken}
          description={t('skills-policies-desc')}
          testId="workforce-policies-editor"
          chipTestIdPrefix="workforce-policy"
          addButtonTestId="workforce-policy-add-button"
        />
      </div>
    </SectionShell>
  )
}
