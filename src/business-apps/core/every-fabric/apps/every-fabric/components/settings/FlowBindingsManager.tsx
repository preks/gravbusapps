// Editable entry point for flow → companion-tool bindings, shown on the Tools
// page. The schema-derived base is generated in prompt-manager; here a human
// can override one flow's companions (change necessity, remove, add, reset, or
// clear) when they spot a wrong association — no code deploy required. Edits
// persist via PUT /api/v2/flow-bindings/{flow}. This is intentionally NOT on
// the add-tools-to-skill surface (read-only hints live there).

import React, { useCallback, useEffect, useState } from 'react'
import { CaretRight, ArrowCounterClockwise, Trash, PlusCircle } from '@phosphor-icons/react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import type {
  PromptManagerClient,
  FlowBindingEntry,
  RelatedToolRef
} from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { ToolCompanions } from '../skills/ToolCompanions'
import translations from '../../_i18n'

const NECESSITIES: RelatedToolRef['necessity'][] = ['required', 'recommended', 'conditional']

const NECESSITY_LABEL_KEYS: Record<RelatedToolRef['necessity'], string> = {
  required: 'settings-necessity-required',
  recommended: 'settings-necessity-recommended',
  conditional: 'settings-necessity-conditional'
}

interface FlowBindingsManagerProps {
  client: PromptManagerClient
  onOpenTool: (toolRef: string) => void
  resolveLabel: (toolRef: string) => string | undefined
}

const ADDABLE_COMPANIONS = [
  'flowbot.get_possible_values_for_catalog_ref',
  'flowbot.run_internal_search',
  'flowbot.read_entity_by_id'
]

const relationFor = (ref: string): RelatedToolRef['relation'] =>
  ref.includes('catalog') ? 'catalog_lookup' : 'entity_lookup'

export const FlowBindingsManager: React.FC<FlowBindingsManagerProps> = ({ client, onOpenTool, resolveLabel }) => {
  const { t } = useTranslation(translations)
  const [open, setOpen] = useState(false)
  const [entries, setEntries] = useState<FlowBindingEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<RelatedToolRef[]>([])
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setEntries(await client.getFlowBindings())
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings-flow-bindings-error-load'))
    } finally {
      setLoading(false)
    }
  }, [client, t])

  useEffect(() => {
    if (open && entries.length === 0) {
      load().catch(() => undefined)
    }
  }, [open, entries.length, load])

  const beginEdit = (entry: FlowBindingEntry) => {
    setEditing(entry.flow_name)
    setDraft(entry.effective.map(row => ({ ...row })))
  }

  const persist = async (flow: string, rows: RelatedToolRef[] | null) => {
    setSaving(true)
    setError(null)
    try {
      const updated = await client.updateFlowBinding(flow, rows)
      setEntries(prev => prev.map(e => (e.flow_name === flow ? updated : e)))
      setEditing(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings-flow-bindings-error-save', { flow }))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section data-testid="flow-bindings-manager">
      <button
        type="button"
        className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:font-semibold gba:uppercase gba:text-muted-foreground gba:tracking-wide gba:mb-2"
        onClick={() => setOpen(prev => !prev)}
        data-testid="flow-bindings-toggle"
      >
        <CaretRight className={`gba:h-3.5 gba:w-3.5 gba:transition-transform ${open ? 'gba:rotate-90' : ''}`} />
        {t('settings-flow-bindings-title')}
      </button>

      {open && (
        <div className="gba:space-y-2">
          <p className="gba:text-[11px] gba:text-muted-foreground">{t('settings-flow-bindings-desc')}</p>
          {error && (
            <div className="gba:rounded-lg gba:border gba:border-destructive/40 gba:bg-destructive/10 gba:px-3 gba:py-2 gba:text-xs gba:text-destructive">
              {error}
            </div>
          )}
          {loading && <p className="gba:text-xs gba:text-muted-foreground">{t('settings-action-loading')}</p>}
          {!loading &&
            entries.map(entry => (
              <div
                key={entry.flow_name}
                className="gba:rounded-lg gba:border gba:border-border gba:bg-card gba:p-3"
                data-testid={`flow-binding-${entry.flow_name}`}
              >
                <div className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:flex-wrap">
                  <span className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
                    <span className="gba:text-sm gba:font-semibold gba:truncate">{entry.flow_name}</span>
                    {entry.source && (
                      <span className="gba:rounded-full gba:bg-primary/10 gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-primary">
                        {entry.source === 'persisted'
                          ? t('settings-flow-bindings-source-edited')
                          : t('settings-flow-bindings-source-override')}
                      </span>
                    )}
                    {entry.effective.length === 0 && (
                      <span className="gba:text-[11px] gba:text-muted-foreground">
                        {t('settings-flow-bindings-self-contained')}
                      </span>
                    )}
                  </span>
                  {editing !== entry.flow_name && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => beginEdit(entry)}
                      data-testid={`flow-binding-edit-${entry.flow_name}`}
                    >
                      {t('settings-action-edit')}
                    </Button>
                  )}
                </div>

                {editing === entry.flow_name ? (
                  <FlowBindingEditor
                    draft={draft}
                    setDraft={setDraft}
                    generated={entry.generated}
                    saving={saving}
                    onCancel={() => setEditing(null)}
                    onSave={() => {
                      persist(entry.flow_name, draft).catch(() => undefined)
                    }}
                    onClear={() => {
                      persist(entry.flow_name, []).catch(() => undefined)
                    }}
                    resolveLabel={resolveLabel}
                  />
                ) : (
                  entry.effective.length > 0 && (
                    <div className="gba:mt-2">
                      <ToolCompanions
                        relatedTools={entry.effective}
                        resolveLabel={resolveLabel}
                        onOpen={onOpenTool}
                        compact
                      />
                    </div>
                  )
                )}
              </div>
            ))}
        </div>
      )}
    </section>
  )
}

interface FlowBindingEditorProps {
  draft: RelatedToolRef[]
  setDraft: React.Dispatch<React.SetStateAction<RelatedToolRef[]>>
  generated: RelatedToolRef[]
  saving: boolean
  onCancel: () => void
  onSave: () => void
  onClear: () => void
  resolveLabel: (toolRef: string) => string | undefined
}

const FlowBindingEditor: React.FC<FlowBindingEditorProps> = ({
  draft,
  setDraft,
  generated,
  saving,
  onCancel,
  onSave,
  onClear,
  resolveLabel
}) => {
  const { t } = useTranslation(translations)
  const addable = ADDABLE_COMPANIONS.filter(ref => !draft.some(r => r.tool_ref === ref))

  const setNecessity = (ref: string, necessity: RelatedToolRef['necessity']) =>
    setDraft(prev => prev.map(r => (r.tool_ref === ref ? { ...r, necessity } : r)))

  const remove = (ref: string) => setDraft(prev => prev.filter(r => r.tool_ref !== ref))

  const add = (ref: string) =>
    setDraft(prev => [
      ...prev,
      { tool_ref: ref, relation: relationFor(ref), necessity: 'recommended', reason: '', for_fields: [] }
    ])

  return (
    <div
      className="gba:mt-2 gba:space-y-2 gba:rounded-lg gba:border gba:border-border/60 gba:bg-muted/20 gba:p-2.5"
      data-testid="flow-binding-editor"
    >
      {draft.length === 0 && (
        <p className="gba:text-[11px] gba:text-muted-foreground">{t('settings-flow-bindings-no-companions')}</p>
      )}
      {draft.map(row => (
        <div key={row.tool_ref} className="gba:flex gba:items-center gba:gap-2">
          <span className="gba:flex-1 gba:min-w-0 gba:text-xs gba:font-medium gba:truncate">
            {resolveLabel(row.tool_ref) ?? row.tool_ref.split('.').slice(1).join('.')}
          </span>
          <select
            value={row.necessity}
            onChange={e => setNecessity(row.tool_ref, e.target.value as RelatedToolRef['necessity'])}
            className="gba:rounded gba:border gba:border-border gba:bg-background gba:px-1.5 gba:py-0.5 gba:text-[11px]"
            data-testid={`flow-binding-necessity-${row.tool_ref}`}
          >
            {NECESSITIES.map(n => (
              <option key={n} value={n}>
                {t(NECESSITY_LABEL_KEYS[n])}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="gba:text-muted-foreground gba:hover:text-destructive"
            onClick={() => remove(row.tool_ref)}
            data-testid={`flow-binding-remove-${row.tool_ref}`}
            title={t('settings-flow-bindings-remove-aria')}
          >
            <Trash className="gba:h-3.5 gba:w-3.5" />
          </button>
        </div>
      ))}

      {addable.length > 0 && (
        <div className="gba:flex gba:flex-wrap gba:gap-1.5">
          {addable.map(ref => (
            <button
              key={ref}
              type="button"
              className="gba:inline-flex gba:items-center gba:gap-0.5 gba:text-[11px] gba:font-medium gba:text-primary gba:hover:underline"
              onClick={() => add(ref)}
              data-testid={`flow-binding-add-${ref}`}
            >
              <PlusCircle className="gba:h-3.5 gba:w-3.5" />
              {resolveLabel(ref) ?? ref.split('.').slice(1).join('.')}
            </button>
          ))}
        </div>
      )}

      <div className="gba:flex gba:items-center gba:gap-2 gba:pt-1">
        <Button size="sm" disabled={saving} onClick={onSave} data-testid="flow-binding-save">
          {saving ? t('settings-skill-studio-saving') : t('action-save')}
        </Button>
        <Button variant="ghost" size="sm" disabled={saving} onClick={onCancel} data-testid="flow-binding-cancel">
          {t('action-cancel')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={saving}
          onClick={() => setDraft(generated.map(r => ({ ...r })))}
          data-testid="flow-binding-reset"
        >
          <ArrowCounterClockwise className="gba:h-3.5 gba:w-3.5 gba:mr-1" />
          {t('settings-flow-bindings-reset')}
        </Button>
        <Button variant="ghost" size="sm" disabled={saving} onClick={onClear} data-testid="flow-binding-clear">
          {t('settings-flow-bindings-clear')}
        </Button>
      </div>
    </div>
  )
}
