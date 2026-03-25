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
import { ExpenseRequestEmployeeFilterAccordion } from '../../expence-requests-tab/components/ExpenseRequestEmployeeFilterAccordion'
import { ADVANCE_PAYMENT_REPORTER_FILTER_GROUP_ID } from '../constants/advancePaymentReporterFilter'

export interface ReporterFilterRenderProps {
  selectedReporterIds: string[]
  onSelectedReporterIdsChange: (reporterIds: string[]) => void
}

export interface AdvancePaymentFilterSheetProps {
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
  renderReporterFilter?: (props: ReporterFilterRenderProps) => ReactNode
}

export function AdvancePaymentFilterSheet({
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
  renderReporterFilter
}: Readonly<AdvancePaymentFilterSheetProps>) {
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
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }, [])

  const handleFilterValueChange = useCallback(
    (filterId: string, value: FilterValue | undefined) => {
      setDraftValues(prev => {
        const next = { ...prev, [filterId]: value }
        if (enableLiveFiltering) {
          onChange?.(next)
        }
        return next
      })
    },
    [enableLiveFiltering, onChange]
  )

  const handleReporterIdsChange = useCallback(
    (reporterIds: string[]) => {
      setDraftValues(prev => {
        const next = { ...prev, reporterIds }
        if (enableLiveFiltering) {
          onChange?.(next)
        }
        return next
      })
    },
    [enableLiveFiltering, onChange]
  )

  const hasAnyActiveFilter = useMemo(
    () =>
      Object.values(draftValues).some(value =>
        Array.isArray(value) ? value.length > 0 : value != null && value !== ''
      ),
    [draftValues]
  )

  const groups = configuration?.groups ?? []

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side={side} className={cn('nw:overflow-hidden nw:gap-0', className)}>
        <SheetHeader className="nw:border-b">
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <ScrollArea className="nw:flex-1 nw:min-h-0">
          <div className="nw:space-y-2 nw:px-3 nw:pt-3 nw:pb-6">
            {groups.map((group, index) => {
              const groupId = group.id || `group-${index}`
              const isExpanded = expandedIds.has(groupId)
              const collapsible = group.collapsible !== false

              const section =
                group.id === ADVANCE_PAYMENT_REPORTER_FILTER_GROUP_ID && renderReporterFilter ? (
                  <ExpenseRequestEmployeeFilterAccordion
                    group={group}
                    values={draftValues}
                    isExpanded={isExpanded}
                    onToggle={collapsible ? () => toggleGroup(groupId) : undefined}
                  >
                    {renderReporterFilter({
                      selectedReporterIds: Array.isArray(draftValues.reporterIds)
                        ? (draftValues.reporterIds as string[])
                        : [],
                      onSelectedReporterIdsChange: handleReporterIdsChange
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
                  {index < groups.length - 1 ? <Separator className="nw:my-2" /> : null}
                </div>
              )
            })}
          </div>
        </ScrollArea>
        <SheetFooter className="nw:border-t nw:pt-4">
          <div className="nw:flex nw:items-center nw:justify-between nw:w-full">
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
            <div className="nw:flex nw:items-center nw:gap-3">
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
