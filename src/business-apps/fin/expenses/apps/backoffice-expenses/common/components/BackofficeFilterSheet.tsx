import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { FilterConfiguration, FilterValue } from '@newwork/nw-design-system'
import {
  Button,
  FilterGroup,
  ScrollArea,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@newwork/nw-design-system'
import { cn } from '@/common/utils/cn'
import { ExpenseRequestEmployeeFilterAccordion } from '../../components/tabs/expence-requests-tab/components/ExpenseRequestEmployeeFilterAccordion'

export interface CustomGroupRenderProps {
  selectedIds: string[]
  onSelectedIdsChange: (ids: string[]) => void
}

export interface CustomGroupConfig {
  groupId: string
  valueKey: string
  render: (props: CustomGroupRenderProps) => ReactNode
}

export interface BackofficeFilterSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  configuration: FilterConfiguration
  values?: Record<string, unknown>
  onApply?: (filters: Record<string, unknown>) => void
  onChange?: (filters: Record<string, unknown>) => void
  enableLiveFiltering?: boolean
  title?: string
  description?: string
  side?: 'left' | 'right' | 'top' | 'bottom'
  className?: string
  customGroup?: CustomGroupConfig
}

export function BackofficeFilterSheet({
  open,
  onOpenChange,
  configuration,
  values: valuesProp = {},
  onApply,
  onChange,
  enableLiveFiltering = false,
  title = 'Filters',
  description = 'Configure filters for your data',
  side = 'right',
  className,
  customGroup
}: Readonly<BackofficeFilterSheetProps>) {
  const [draftValues, setDraftValues] = useState(valuesProp)

  useEffect(() => {
    setDraftValues(valuesProp)
  }, [valuesProp])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next && !enableLiveFiltering) {
        setDraftValues(valuesProp)
      }
      onOpenChange(next)
    },
    [enableLiveFiltering, onOpenChange, valuesProp]
  )

  const [expandedIds, setExpandedIds] = useState(() => {
    const initial = new Set<string>()
    configuration?.groups?.forEach((group, index) => {
      const id = group.id || `group-${index}`
      const expanded = group.defaultExpanded ?? index === 0
      if (expanded) initial.add(id)
    })
    return initial
  })

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }, [])

  const handleFilterValueChange = useCallback(
    (filterId: string, value: FilterValue | undefined) => {
      setDraftValues(prev => {
        const next = { ...prev, [filterId]: value }
        if (enableLiveFiltering) onChange?.(next)
        return next
      })
    },
    [enableLiveFiltering, onChange]
  )

  const handleCustomIdsChange = useCallback(
    (ids: string[]) => {
      if (!customGroup) return
      setDraftValues(prev => {
        const next = { ...prev, [customGroup.valueKey]: ids }
        if (enableLiveFiltering) onChange?.(next)
        return next
      })
    },
    [customGroup, enableLiveFiltering, onChange]
  )

  const hasAnyActiveFilter = useMemo(
    () =>
      Object.values(draftValues).some(value =>
        Array.isArray(value) ? value.length > 0 : value != null && value !== ''
      ),
    [draftValues]
  )

  const groups = configuration?.groups ?? []

  const renderGroup = (group: FilterConfiguration['groups'][number], index: number) => {
    const groupId = group.id || `group-${index}`
    const isExpanded = expandedIds.has(groupId)
    const collapsible = group.collapsible !== false

    const isCustom = customGroup && group.id === customGroup.groupId
    const section = isCustom ? (
      <ExpenseRequestEmployeeFilterAccordion
        group={group}
        values={draftValues}
        isExpanded={isExpanded}
        onToggle={collapsible ? () => toggleGroup(groupId) : undefined}
      >
        {customGroup.render({
          selectedIds: Array.isArray(draftValues[customGroup.valueKey])
            ? (draftValues[customGroup.valueKey] as string[])
            : [],
          onSelectedIdsChange: handleCustomIdsChange
        })}
      </ExpenseRequestEmployeeFilterAccordion>
    ) : (
      <FilterGroup
        group={group}
        values={draftValues as Record<string, FilterValue>}
        onChange={handleFilterValueChange}
        isExpanded={isExpanded}
        onToggle={collapsible ? () => toggleGroup(groupId) : undefined}
        context="filter-sheet"
      />
    )

    return (
      <div key={groupId}>
        {section}
        {index < groups.length - 1 ? <Separator className="gba:my-2" /> : null}
      </div>
    )
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side={side} className={cn('gba:overflow-hidden gba:gap-0', className)}>
        <SheetHeader className="gba:border-b">
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <ScrollArea className="gba:flex-1 gba:min-h-0">
          <div className="gba:space-y-2 gba:px-3 gba:pt-3 gba:pb-6">
            {groups.length === 0 ? (
              <div className="gba:p-8 gba:text-center gba:text-sm gba:text-muted-foreground">
                <p>No filters configured</p>
              </div>
            ) : (
              groups.map(renderGroup)
            )}
          </div>
        </ScrollArea>
        <SheetFooter className="gba:border-t gba:pt-4">
          <div className="gba:flex gba:items-center gba:justify-between gba:w-full">
            {hasAnyActiveFilter ? (
              <Button
                variant="ghost"
                onClick={() => {
                  const cleared: Record<string, unknown> = {}
                  setDraftValues(cleared)
                  onChange?.(cleared)
                  onApply?.(cleared)
                }}
              >
                Clear All
              </Button>
            ) : (
              <div />
            )}
            <div className="gba:flex gba:items-center gba:gap-3">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onApply?.(draftValues)
                  onOpenChange(false)
                }}
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
