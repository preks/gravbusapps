import React, { useMemo, useState } from 'react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@newwork/nw-design-system'
import { Workflow, Footprints, BookOpen, Database, Building2, Zap } from 'lucide-react'
import type { ExpressionSuggestionItem, ExpressionSourceType } from '@/common/components/flow/expression-editor'

const SOURCE_ORDER: ExpressionSourceType[] = ['trigger', 'workflow', 'steps', 'catalog', 'entity', 'orgchart']

const SOURCE_LABEL: Record<ExpressionSourceType, string> = {
  trigger: 'Trigger',
  workflow: 'Workflow',
  steps: 'Steps',
  catalog: 'Catalog',
  entity: 'Entity',
  orgchart: 'Org Chart'
}

const SOURCE_ICON: Record<ExpressionSourceType, React.ElementType> = {
  trigger: Zap,
  workflow: Workflow,
  steps: Footprints,
  catalog: BookOpen,
  entity: Database,
  orgchart: Building2
}

interface FlowContextExplorerProps {
  items: ExpressionSuggestionItem[]
  onSelect: (item: ExpressionSuggestionItem) => void
  placeholder?: string
  'data-testid'?: string
}

export const FlowContextExplorer: React.FC<FlowContextExplorerProps> = ({
  items,
  onSelect,
  placeholder = 'Search flow context…',
  'data-testid': testId = 'flow-context-explorer'
}) => {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = String(query || '')
      .trim()
      .toLowerCase()
    if (!q) return items
    return items.filter(i => {
      const label = String(i.label || '').toLowerCase()
      const desc = String(i.description || '').toLowerCase()
      const expr = String(i.expression || '').toLowerCase()
      return label.includes(q) || desc.includes(q) || expr.includes(q)
    })
  }, [items, query])

  const grouped = useMemo(() => {
    const map = new Map<ExpressionSourceType, ExpressionSuggestionItem[]>()
    for (const source of SOURCE_ORDER) map.set(source, [])
    for (const item of filtered) {
      const list = map.get(item.source) ?? []
      list.push(item)
      map.set(item.source, list)
    }
    for (const [source, list] of map.entries()) {
      list.sort((a, b) => String(a.label || '').localeCompare(String(b.label || '')))
      map.set(source, list)
    }
    return map
  }, [filtered])

  return (
    <Command shouldFilter={false} data-testid={testId}>
      <CommandInput placeholder={placeholder} value={query} onValueChange={setQuery} data-testid={`${testId}-search`} />
      <CommandList className="gba:max-h-80 gba:overflow-y-auto" data-testid={`${testId}-list`}>
        <CommandEmpty>No results.</CommandEmpty>
        {SOURCE_ORDER.map(source => {
          const list = grouped.get(source) ?? []
          if (!list.length) return null
          const Icon = SOURCE_ICON[source]
          return (
            <CommandGroup key={source} heading={SOURCE_LABEL[source]}>
              {list.map(item => (
                <CommandItem
                  key={item.id}
                  value={item.id}
                  onSelect={() => onSelect(item)}
                  data-testid={`${testId}-item-${item.id}`}
                >
                  <Icon className="gba:h-3.5 gba:w-3.5 gba:mr-2 gba:text-muted-foreground" />
                  <div className="gba:flex gba:flex-col gba:flex-1 gba:min-w-0">
                    <span className="gba:truncate gba:text-foreground">{item.label}</span>
                    {item.description ? (
                      <span className="gba:text-[10px] gba:text-muted-foreground gba:truncate">{item.description}</span>
                    ) : null}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )
        })}
      </CommandList>
    </Command>
  )
}
