/**
 * ExpressionSuggestion - Dropdown list rendered inside tippy popup.
 * Displays categorized suggestion items, keyboard-navigable.
 */

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { Workflow, Footprints, BookOpen, Database, Building2, Zap } from 'lucide-react'
import type { ExpressionSuggestionItem, ExpressionSourceType } from './types/expressionTypes'

const ICON_MAP: Record<ExpressionSourceType, React.ElementType> = {
  trigger: Zap,
  workflow: Workflow,
  steps: Footprints,
  catalog: BookOpen,
  entity: Database,
  orgchart: Building2
}

const SOURCE_LABELS: Record<ExpressionSourceType, string> = {
  trigger: 'Trigger',
  workflow: 'Workflow',
  steps: 'Steps',
  catalog: 'Catalog',
  entity: 'Entity',
  orgchart: 'Org Chart'
}

interface ExpressionSuggestionListProps {
  items: ExpressionSuggestionItem[]
  command: (item: ExpressionSuggestionItem) => void
}

interface ExpressionSuggestionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

export const ExpressionSuggestionList = forwardRef<ExpressionSuggestionListRef, ExpressionSuggestionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    // Group items by source category
    const grouped = useMemo(() => {
      const groups: Record<string, ExpressionSuggestionItem[]> = {}
      for (const item of items) {
        const key = item.source
        if (!groups[key]) groups[key] = []
        groups[key].push(item)
      }
      return groups
    }, [items])

    const flatItems = items

    const selectItem = useCallback(
      (index: number) => {
        const item = flatItems[index]
        if (item) command(item)
      },
      [flatItems, command]
    )

    useEffect(() => {
      setSelectedIndex(0)
    }, [items])

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex(prev => (prev + flatItems.length - 1) % flatItems.length)
          return true
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex(prev => (prev + 1) % flatItems.length)
          return true
        }
        if (event.key === 'Enter') {
          selectItem(selectedIndex)
          return true
        }
        return false
      }
    }))

    if (!items.length) {
      return (
        <div
          className="gba:bg-popover gba:border gba:rounded-lg gba:shadow-lg gba:p-3 gba:text-sm gba:text-muted-foreground"
          data-testid="expression-suggestion-empty"
        >
          No matching expressions
        </div>
      )
    }

    let flatIndex = 0

    return (
      <div
        className="gba:bg-popover gba:border gba:rounded-lg gba:shadow-xl gba:overflow-hidden gba:min-w-[280px] gba:max-h-[340px] gba:overflow-y-auto gba:py-1"
        data-testid="expression-suggestion-list"
      >
        {Object.entries(grouped).map(([source, sourceItems]) => {
          const Icon = ICON_MAP[source as ExpressionSourceType] || Workflow
          const groupLabel = SOURCE_LABELS[source as ExpressionSourceType] || source

          return (
            <div key={source}>
              <div className="gba:flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-1.5 gba:text-[10px] gba:font-semibold gba:uppercase gba:text-muted-foreground gba:tracking-wider">
                <Icon className="gba:h-3 gba:w-3" />
                {groupLabel}
              </div>
              {sourceItems.map(item => {
                const currentFlatIndex = flatIndex++
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectItem(currentFlatIndex)}
                    data-testid={`expression-suggestion-item-${item.id}`}
                    className={`gba:w-full gba:flex gba:flex-col gba:gap-0 gba:px-3 gba:py-1.5 gba:text-sm gba:text-left gba:transition-colors ${
                      currentFlatIndex === selectedIndex
                        ? 'gba:bg-accent gba:text-accent-foreground'
                        : 'gba:hover:bg-muted/50'
                    }`}
                  >
                    <span className="gba:font-medium gba:truncate">{item.label}</span>
                    {item.description && (
                      <span className="gba:text-xs gba:text-muted-foreground gba:truncate">{item.description}</span>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    )
  }
)

ExpressionSuggestionList.displayName = 'ExpressionSuggestionList'
