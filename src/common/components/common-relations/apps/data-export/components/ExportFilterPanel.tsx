import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FilterConfiguration, FilterValue } from '@newwork/nw-design-system'
import { Button, FilterGroup, Separator, Spinner, useTranslation } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import translations from '../_i18n'

export interface ExportFilterPanelProps {
  filterConfiguration: FilterConfiguration
  values: Record<string, unknown>
  onChange: (filters: Record<string, unknown>) => void
  isLoading?: boolean
  prefixDataTestId?: string
}

export function ExportFilterPanel({
  filterConfiguration,
  values,
  onChange,
  isLoading = false,
  prefixDataTestId = 'ExportFilterPanel'
}: Readonly<ExportFilterPanelProps>) {
  const { t } = useTranslation(translations)
  const [draftValues, setDraftValues] = useState(values)
  const [expandedIds, setExpandedIds] = useState(() => {
    const initial = new Set<string>()
    filterConfiguration.groups.forEach((group, index) => {
      const id = group.id || `group-${index}`
      const expanded = group.defaultExpanded ?? index === 0
      if (expanded) initial.add(id)
    })
    return initial
  })

  useEffect(() => {
    setDraftValues(values)
  }, [values])

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedIds(previous => {
      const next = new Set(previous)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }, [])

  const updateField = useCallback(
    (key: string, value: unknown) => {
      setDraftValues(previous => {
        const next = { ...previous, [key]: value }
        onChange(next)
        return next
      })
    },
    [onChange]
  )

  const handleFilterValueChange = useCallback(
    (filterId: string, value: FilterValue | undefined) => updateField(filterId, value),
    [updateField]
  )

  const hasAnyActiveFilter = useMemo(
    () =>
      Object.values(draftValues).some(value =>
        Array.isArray(value) ? value.length > 0 : value != null && value !== ''
      ),
    [draftValues]
  )

  const handleClearAll = useCallback(() => {
    const cleared: Record<string, unknown> = {}
    setDraftValues(cleared)
    onChange(cleared)
  }, [onChange])

  const groups = filterConfiguration.groups

  if (isLoading) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:py-8"
        data-testid={formatDataTestId(prefixDataTestId, 'loading')}
      >
        <Spinner />
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <p className="gba:text-sm gba:text-muted-foreground" data-testid={formatDataTestId(prefixDataTestId, 'empty')}>
        {t('no-filters-configured')}
      </p>
    )
  }

  return (
    <div className="gba:space-y-3" data-testid={formatDataTestId(prefixDataTestId, 'panel')}>
      {hasAnyActiveFilter && (
        <div className="gba:flex gba:justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            data-testid={formatDataTestId(prefixDataTestId, 'clear-all')}
          >
            {t('clear-all-filters')}
          </Button>
        </div>
      )}

      <div className="gba:space-y-2">
        {groups.map((group, index) => {
          const groupId = group.id || `group-${index}`
          const isExpanded = expandedIds.has(groupId)
          const collapsible = group.collapsible !== false

          return (
            <div key={groupId}>
              <FilterGroup
                group={group}
                values={draftValues as Record<string, FilterValue>}
                onChange={handleFilterValueChange}
                isExpanded={isExpanded}
                onToggle={collapsible ? () => toggleGroup(groupId) : undefined}
                context="filter-sheet"
                className="gba:[&_label[for*='-option-']]:!h-auto gba:[&_label[for*='-option-']]:!items-start gba:[&_label[for*='-option-']]:!py-2 gba:[&_label[for*='-option-']]:!min-h-10 gba:[&_label[for*='-option-']_[role='checkbox']]:!self-start gba:[&_label[for*='-option-']_[role='checkbox']]:!mt-0.5 gba:[&_label[for*='-option-']_[data-slot='checkbox']]:!self-start gba:[&_label[for*='-option-']_[data-slot='checkbox']]:!mt-0.5 gba:[&_label[for*='-option-']_span]:!block gba:[&_label[for*='-option-']_span]:!whitespace-normal gba:[&_label[for*='-option-']_span]:!text-clip gba:[&_label[for*='-option-']_span]:!overflow-visible gba:[&_label[for*='-option-']_span]:![overflow-wrap:anywhere]"
              />
              {index < groups.length - 1 ? <Separator className="gba:my-2" /> : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
