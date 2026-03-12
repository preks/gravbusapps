import React from 'react'
import { Badge, Button, Combobox } from '@newwork/nw-design-system'
import { X } from 'lucide-react'
import { useDataSource } from '@/business-apps/ser/hooks/useDataSource'
import type { DataSourceConfig } from '@/business-apps/ser/types/flowTemplate'
import type { InputBlock } from '@/common/network/flows/FlowTemplateClient'

type InputDataSource = NonNullable<InputBlock['dataSource']>

export interface FlowDataSourceMultiSelectProps {
  value: string[]
  onValueChange: (value: string[]) => void
  dataSource: InputDataSource
  accessToken?: string
  placeholder?: string
  searchPlaceholder?: string
  initialOptions?: Array<{ value: string; label: string }>
  disabled?: boolean
  className?: string
  'data-testid'?: string
}

const normalizeDataSource = (ds: InputDataSource): DataSourceConfig | undefined => {
  const type = String(ds.type || '').toUpperCase()
  if (type !== 'ENTITY' && type !== 'CATALOG' && type !== 'CUSTOM_DATA') return undefined

  const dsAny = ds as any
  const catalogIdentifier = dsAny.catalogIdentifier

  return {
    type: type as DataSourceConfig['type'],
    entity: ds.entity,
    catalog: ds.catalog,
    catalogIdentifier: typeof catalogIdentifier === 'string' ? catalogIdentifier : ds.catalog,
    namespace: ds.namespace,
    key: ds.key,
    valueField: ds.valueField || 'id',
    labelField: ds.labelField || 'displayName'
  }
}

export const FlowDataSourceMultiSelect: React.FC<FlowDataSourceMultiSelectProps> = ({
  value,
  onValueChange,
  dataSource,
  accessToken,
  placeholder = 'Select',
  searchPlaceholder,
  initialOptions,
  disabled,
  className,
  'data-testid': testId = 'flow-datasource-multiselect'
}) => {
  const normalized = React.useMemo(() => normalizeDataSource(dataSource), [dataSource])
  const token = accessToken || ''

  const { options: apiOptions, isLoading, error, search, loadMore, hasMore } = useDataSource(normalized, token)

  const safeInitialOptions = React.useMemo(() => initialOptions ?? [], [initialOptions])

  const optionLabelByValue = React.useMemo(() => {
    const map = new Map<string, string>()
    safeInitialOptions.forEach(opt => map.set(String(opt.value), String(opt.label)))
    apiOptions.forEach(opt => map.set(String(opt.value), String(opt.label)))
    return map
  }, [apiOptions, safeInitialOptions])

  const comboboxOptions = React.useMemo(() => {
    if (apiOptions.length > 0) {
      return apiOptions.map(opt => ({ value: String(opt.value), label: opt.label }))
    }
    if (safeInitialOptions.length > 0) {
      return safeInitialOptions.map(opt => ({ value: String(opt.value), label: String(opt.label) }))
    }
    return []
  }, [apiOptions, safeInitialOptions])

  const selectedValues = Array.isArray(value) ? value : []

  const isDisabled = Boolean(disabled) || !normalized || !accessToken
  const effectiveSearchPlaceholder =
    searchPlaceholder || (normalized?.type === 'ENTITY' ? `Search ${normalized.entity || 'options'}...` : 'Search...')

  const emptyText = isLoading
    ? 'Loading...'
    : error
      ? 'Failed to load options'
      : normalized
        ? 'No options found'
        : 'Unsupported data source'

  return (
    <div className={className} data-testid={testId}>
      {selectedValues.length > 0 ? (
        <div className="gba:flex gba:flex-wrap gba:gap-2 gba:mb-2" data-testid={`${testId}-selected`}>
          {selectedValues.map(v => {
            const label = optionLabelByValue.get(String(v)) || String(v)
            return (
              <Badge
                key={String(v)}
                variant="secondary"
                className="gba:flex gba:items-center gba:gap-2"
                data-testid={`${testId}-selected-${String(v)}`}
              >
                <span className="gba:max-w-xs gba:truncate">{label}</span>
                {!isDisabled ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gba:h-5 gba:w-5 gba:p-0"
                    onClick={() => onValueChange(selectedValues.filter(x => x !== v))}
                    data-testid={`${testId}-remove-${String(v)}`}
                  >
                    <X className="gba:h-3 gba:w-3" />
                  </Button>
                ) : null}
              </Badge>
            )
          })}

          {!isDisabled && selectedValues.length > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onValueChange([])}
              data-testid={`${testId}-clear`}
            >
              Clear
            </Button>
          ) : null}
        </div>
      ) : null}

      <Combobox
        options={comboboxOptions as any}
        value=""
        onValueChange={(picked: string) => {
          const v = String(picked || '')
          if (!v) return
          if (selectedValues.includes(v)) return
          onValueChange([...selectedValues, v])
        }}
        placeholder={placeholder}
        searchPlaceholder={effectiveSearchPlaceholder}
        emptyText={emptyText}
        onSearch={q => search(q)}
        searchDebounce={300}
        loading={Boolean(isLoading)}
        onLoadMore={loadMore}
        hasMore={Boolean(hasMore)}
        data-testid={`${testId}-picker`}
        align="start"
        closeOnSelect={false}
        disabled={isDisabled}
      />
    </div>
  )
}

export default FlowDataSourceMultiSelect
