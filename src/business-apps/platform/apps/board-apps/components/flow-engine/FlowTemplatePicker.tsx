import React, { useEffect, useMemo, useState } from 'react'
import { Button, Input, Spinner, Badge, Checkbox, Label } from '@newwork/nw-design-system'
import { ArrowLeft, ArrowRight, Search, Filter } from 'lucide-react'
import type { FlowTemplateSummary, FlowEngineTagFilter } from '../../services/flowEngine'
import { listAllTemplates } from '../../services/flowEngine'
import { TAG_KEY_META, humanizeTagValue } from './flowTagLabels'

interface FlowTemplatePickerProps {
  selectedTemplateIds: string[]
  onSelectedTemplateIdsChange: (ids: string[]) => void
  tags: FlowEngineTagFilter[]
  onTagsChange: (tags: FlowEngineTagFilter[]) => void
  onBack: () => void
  onNext: () => void
  'data-testid'?: string
}

interface TagOption {
  key: string
  value: string
  label: string
}

function isTagSelected(tags: FlowEngineTagFilter[], key: string, value: string) {
  return tags.some(t => t.key === key && t.value === value)
}

function templateMatchesTags(tpl: FlowTemplateSummary, selectedTags: FlowEngineTagFilter[]): boolean {
  if (selectedTags.length === 0) return true
  if (!tpl.tags || typeof tpl.tags !== 'object') return false

  const byKey = new Map<string, string[]>()
  for (const t of selectedTags) {
    if (!byKey.has(t.key)) byKey.set(t.key, [])
    byKey.get(t.key)!.push(t.value)
  }

  for (const [key, wantedValues] of byKey) {
    const raw = (tpl.tags as Record<string, unknown>)[key]
    if (raw == null) return false
    const actual = Array.isArray(raw) ? raw.map(String) : [String(raw)]
    if (!wantedValues.some(w => actual.includes(w))) return false
  }
  return true
}

export const FlowTemplatePicker: React.FC<FlowTemplatePickerProps> = ({
  selectedTemplateIds,
  onSelectedTemplateIdsChange,
  tags,
  onTagsChange,
  onBack,
  onNext,
  'data-testid': testId = 'flow-template-picker'
}) => {
  const [allTemplates, setAllTemplates] = useState<FlowTemplateSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    void (async () => {
      try {
        const result = await listAllTemplates()
        if (!cancelled) setAllTemplates(result)
      } catch {
        if (!cancelled) setAllTemplates([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const allTagKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const tpl of allTemplates) {
      if (!tpl.tags || typeof tpl.tags !== 'object') continue
      for (const key of Object.keys(tpl.tags)) keys.add(key)
    }
    return Array.from(keys).sort((a, b) => {
      const oa = TAG_KEY_META[a]?.order ?? 99
      const ob = TAG_KEY_META[b]?.order ?? 99
      return oa - ob
    })
  }, [allTemplates])

  const cascadingTagCatalog = useMemo(() => {
    const result = new Map<string, TagOption[]>()
    for (const key of allTagKeys) {
      const higherTags = tags.filter(t => {
        const tOrder = TAG_KEY_META[t.key]?.order ?? 99
        const thisOrder = TAG_KEY_META[key]?.order ?? 99
        return tOrder < thisOrder
      })
      const eligible = allTemplates.filter(t => templateMatchesTags(t, higherTags))
      const values = new Set<string>()
      for (const tpl of eligible) {
        if (!tpl.tags || typeof tpl.tags !== 'object') continue
        const raw = (tpl.tags as Record<string, unknown>)[key]
        if (raw == null) continue
        const arr = Array.isArray(raw) ? raw : [raw]
        for (const v of arr) {
          if (v != null && String(v).trim()) values.add(String(v))
        }
      }
      if (values.size > 0) {
        result.set(
          key,
          Array.from(values)
            .sort()
            .map(v => ({ key, value: v, label: humanizeTagValue(key, v) }))
        )
      }
    }
    return result
  }, [allTemplates, allTagKeys, tags])

  const filteredTemplates = useMemo(() => {
    let list = allTemplates.filter(t => templateMatchesTags(t, tags))
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        t =>
          t.name.toLowerCase().includes(q) ||
          (t.description ?? '').toLowerCase().includes(q) ||
          (t.type ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [allTemplates, tags, search])

  const toggleTag = (key: string, value: string) => {
    if (isTagSelected(tags, key, value)) {
      onTagsChange(tags.filter(t => !(t.key === key && t.value === value)))
    } else {
      onTagsChange([...tags, { key, value }])
    }
  }

  const toggleTemplate = (id: string) => {
    onSelectedTemplateIdsChange(
      selectedTemplateIds.includes(id) ? selectedTemplateIds.filter(t => t !== id) : [...selectedTemplateIds, id]
    )
  }

  return (
    <div className="gba:space-y-4" data-testid={testId}>
      <div>
        <h3 className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-1">Select templates &amp; filters</h3>
        <p className="gba:text-xs gba:text-muted-foreground">
          Use the filters below to narrow down templates, then select which ones to import.
        </p>
      </div>

      {/* Auto-discovered tag filters (cascading: child groups narrow based on parent selections) */}
      {cascadingTagCatalog.size > 0 && (
        <div className="gba:space-y-3">
          <Label className="gba:text-xs gba:flex gba:items-center gba:gap-1">
            <Filter className="gba:w-3 gba:h-3" /> Filter by category
          </Label>
          {Array.from(cascadingTagCatalog.entries()).map(([key, options]) => {
            const meta = TAG_KEY_META[key]
            return (
              <div key={key} className="gba:space-y-1.5">
                <div>
                  <span className="gba:text-xs gba:font-medium gba:text-foreground">{meta?.label ?? key}</span>
                  {meta?.description && <p className="gba:text-[11px] gba:text-muted-foreground">{meta.description}</p>}
                </div>
                <div className="gba:flex gba:flex-wrap gba:gap-1.5">
                  {options.map(opt => {
                    const active = isTagSelected(tags, opt.key, opt.value)
                    return (
                      <button
                        key={`${opt.key}-${opt.value}`}
                        onClick={() => toggleTag(opt.key, opt.value)}
                        className={`gba:px-2.5 gba:py-1 gba:rounded-md gba:text-xs gba:border gba:transition-colors ${
                          active
                            ? 'gba:bg-primary gba:text-primary-foreground gba:border-primary'
                            : 'gba:bg-card gba:text-foreground gba:border-border gba:hover:border-primary/40 gba:hover:bg-muted/30'
                        }`}
                        data-testid={`${testId}-tag-${opt.key}-${opt.label}`}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Selected tags summary */}
      {tags.length > 0 && (
        <div className="gba:flex gba:items-center gba:flex-wrap gba:gap-1.5 gba:pt-1">
          <span className="gba:text-[11px] gba:text-muted-foreground">Active filters:</span>
          {tags.map((t, i) => (
            <Badge key={`${t.key}-${t.value}-${i}`} variant="info" className="gba:text-[11px]">
              {TAG_KEY_META[t.key]?.label ?? t.key}: {humanizeTagValue(t.key, t.value)}
            </Badge>
          ))}
          <button
            onClick={() => onTagsChange([])}
            className="gba:text-[11px] gba:text-muted-foreground gba:hover:text-destructive gba:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Template search */}
      <div className="gba:relative">
        <Search className="gba:absolute gba:left-2 gba:top-1/2 gba:-translate-y-1/2 gba:w-3.5 gba:h-3.5 gba:text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="gba:h-8 gba:text-xs gba:pl-7"
          data-testid={`${testId}-search`}
        />
      </div>

      {/* Template list */}
      <div className="gba:border gba:rounded-md gba:max-h-48 gba:overflow-y-auto">
        {isLoading ? (
          <div className="gba:flex gba:justify-center gba:py-6">
            <Spinner size="sm" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <p className="gba:text-xs gba:text-muted-foreground gba:py-6 gba:text-center">
            {allTemplates.length === 0 ? 'No templates found' : 'No templates match the selected filters'}
          </p>
        ) : (
          filteredTemplates.map(tpl => {
            const checked = selectedTemplateIds.includes(tpl.id)
            return (
              <label
                key={tpl.id}
                className="gba:flex gba:items-start gba:gap-2 gba:px-3 gba:py-2 gba:hover:bg-muted/30 gba:cursor-pointer gba:border-b gba:last:border-b-0"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggleTemplate(tpl.id)}
                  className="gba:mt-0.5"
                  data-testid={`${testId}-tpl-${tpl.id}`}
                />
                <div className="gba:min-w-0 gba:flex-1">
                  <span className="gba:text-xs gba:font-medium gba:text-foreground">{tpl.name}</span>
                  {tpl.description && (
                    <p className="gba:text-[11px] gba:text-muted-foreground gba:truncate">{tpl.description}</p>
                  )}
                </div>
                {tpl.type && (
                  <Badge variant="outline" className="gba:text-[10px] gba:flex-shrink-0">
                    {tpl.type}
                  </Badge>
                )}
              </label>
            )
          })
        )}
      </div>

      <p className="gba:text-xs gba:text-muted-foreground">
        {selectedTemplateIds.length === 0
          ? `${filteredTemplates.length} template(s) available — none selected means all will be imported.`
          : `${selectedTemplateIds.length} of ${filteredTemplates.length} template(s) selected.`}
      </p>

      <div className="gba:flex gba:justify-between gba:pt-2">
        <Button variant="outline" size="sm" onClick={onBack} data-testid={`${testId}-back`}>
          <ArrowLeft className="gba:w-3.5 gba:h-3.5 gba:mr-1" /> Back
        </Button>
        <Button size="sm" onClick={onNext} data-testid={`${testId}-next`}>
          Next <ArrowRight className="gba:w-3.5 gba:h-3.5 gba:ml-1" />
        </Button>
      </div>
    </div>
  )
}
