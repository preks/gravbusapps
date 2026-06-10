// Knowledge section - typed references to policies, contracts, sources.

import { Button } from '@newwork/nw-design-system'
import { ArrowSquareOutIcon, TrashIcon } from '@phosphor-icons/react'
import React, { useEffect, useState } from 'react'
import { buildPolicyDetailUrl, isPolicyUuid } from '../policyLink'
import type { WorkforceAgent, WorkforceAgentUpdateInput, WorkforceKnowledgeRef } from '../workforceTypes'
import { SectionShell } from './SectionShell'

interface KnowledgeSectionProps {
  agent: WorkforceAgent
  isSaving: boolean
  onSave: (patch: WorkforceAgentUpdateInput) => Promise<void>
}

type KnowledgeSource = WorkforceKnowledgeRef['source']

interface FormState {
  refs: WorkforceKnowledgeRef[]
  draftSource: KnowledgeSource
  draftRefId: string
  draftTitle: string
}

const SOURCE_LABELS: Record<KnowledgeSource, string> = {
  policy: 'Policy',
  contract: 'Contract',
  knowledge_source: 'Knowledge source',
  skill: 'Skill',
  url: 'URL'
}

function fromAgent(agent: WorkforceAgent): FormState {
  return {
    refs: [...agent.workforce_profile.knowledge_refs],
    draftSource: 'policy',
    draftRefId: '',
    draftTitle: ''
  }
}

function refsEqual(a: WorkforceKnowledgeRef[], b: WorkforceKnowledgeRef[]): boolean {
  if (a.length !== b.length) return false
  return a.every((ref, i) => {
    const other = b[i]
    return (
      ref.source === other.source &&
      ref.ref_id === other.ref_id &&
      (ref.title ?? '') === (other.title ?? '') &&
      (ref.description ?? '') === (other.description ?? '')
    )
  })
}

export const KnowledgeSection: React.FC<KnowledgeSectionProps> = ({ agent, isSaving, onSave }) => {
  const baseline = fromAgent(agent)
  const [form, setForm] = useState<FormState>(baseline)

  useEffect(() => {
    setForm(fromAgent(agent))
  }, [agent])

  const dirty = !refsEqual(form.refs, baseline.refs)

  const handleAdd = () => {
    const trimmedId = form.draftRefId.trim()
    if (!trimmedId) return
    const trimmedTitle = form.draftTitle.trim()
    const exists = form.refs.some(r => r.source === form.draftSource && r.ref_id === trimmedId)
    if (exists) return
    const next: WorkforceKnowledgeRef = {
      source: form.draftSource,
      ref_id: trimmedId,
      title: trimmedTitle || null
    }
    setForm(prev => ({ ...prev, refs: [...prev.refs, next], draftRefId: '', draftTitle: '' }))
  }

  const handleRemove = (ref: WorkforceKnowledgeRef) => {
    setForm(prev => ({
      ...prev,
      refs: prev.refs.filter(r => !(r.source === ref.source && r.ref_id === ref.ref_id))
    }))
  }

  return (
    <SectionShell
      id="knowledge"
      title="Knowledge"
      description="Policies, contracts, and other references the agent may read while working."
      isDirty={dirty}
      isSaving={isSaving}
      onSave={() => void onSave({ knowledge_refs: form.refs })}
      onReset={() => setForm(baseline)}
    >
      <div className="gba:grid gba:grid-cols-1 gba:gap-2 gba:sm:grid-cols-12">
        <select
          aria-label="Knowledge source type"
          value={form.draftSource}
          onChange={e => setForm(prev => ({ ...prev, draftSource: e.target.value as KnowledgeSource }))}
          className="gba:h-9 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-2 gba:text-xs gba:text-foreground gba:sm:col-span-3"
          data-testid="workforce-knowledge-source"
        >
          {(Object.keys(SOURCE_LABELS) as KnowledgeSource[]).map(source => (
            <option key={source} value={source}>
              {SOURCE_LABELS[source]}
            </option>
          ))}
        </select>
        <input
          value={form.draftRefId}
          onChange={e => setForm(prev => ({ ...prev, draftRefId: e.target.value }))}
          placeholder="Reference ID or URL"
          className="gba:h-9 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring gba:sm:col-span-4"
          data-testid="workforce-knowledge-ref-id"
        />
        <input
          value={form.draftTitle}
          onChange={e => setForm(prev => ({ ...prev, draftTitle: e.target.value }))}
          placeholder="Optional title"
          className="gba:h-9 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring gba:sm:col-span-4"
          data-testid="workforce-knowledge-title"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={handleAdd}
          className="gba:sm:col-span-1"
          data-testid="workforce-knowledge-add"
        >
          Add
        </Button>
      </div>

      <ul className="gba:mt-3 gba:space-y-1.5" data-testid="workforce-knowledge-list">
        {form.refs.length === 0 ? (
          <li className="gba:text-[11px] gba:italic gba:text-muted-foreground">No knowledge references yet.</li>
        ) : (
          form.refs.map(ref => (
            <li
              key={`${ref.source}:${ref.ref_id}`}
              className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:rounded-lg gba:border gba:border-border gba:bg-muted/30 gba:px-3 gba:py-1.5"
            >
              <div className="gba:min-w-0">
                {ref.source === 'policy' && isPolicyUuid(ref.ref_id) ? (
                  <a
                    href={buildPolicyDetailUrl(ref.ref_id)}
                    target="_blank"
                    rel="noreferrer"
                    className="gba:inline-flex gba:items-center gba:gap-1 gba:truncate gba:text-xs gba:font-medium gba:text-foreground gba:hover:underline"
                    title={`Open policy in a new tab (ID: ${ref.ref_id})`}
                  >
                    <span className="gba:truncate">{ref.title || ref.ref_id}</span>
                    <ArrowSquareOutIcon className="gba:h-3 gba:w-3 gba:shrink-0 gba:text-muted-foreground" />
                  </a>
                ) : (
                  <p className="gba:truncate gba:text-xs gba:font-medium gba:text-foreground">
                    {ref.title || ref.ref_id}
                  </p>
                )}
                <p className="gba:truncate gba:text-[10px] gba:text-muted-foreground">
                  {SOURCE_LABELS[ref.source]} · {ref.ref_id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(ref)}
                aria-label={`Remove ${ref.ref_id}`}
                className="gba:text-muted-foreground gba:hover:text-destructive"
                data-testid={`workforce-knowledge-remove-${ref.source}-${ref.ref_id}`}
              >
                <TrashIcon className="gba:h-3.5 gba:w-3.5" />
              </button>
            </li>
          ))
        )}
      </ul>
    </SectionShell>
  )
}
