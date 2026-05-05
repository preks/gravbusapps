import React from 'react'
import { Combobox } from '@newwork/nw-design-system'
import { useDataSource } from '@/business-apps/ser/hooks/useDataSource'
import type { DataSourceConfig } from '@/business-apps/ser/types/flowTemplate'
import type { InputBlock } from '@/common/network/flows/FlowTemplateClient'

type InputDataSource = NonNullable<InputBlock['dataSource']>

export interface FlowDataSourceSelectProps {
  value: string
  onValueChange: (value: string) => void
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
  if (type !== 'CUSTOM_ENTITY' && type !== 'CATALOG' && type !== 'INTERNAL_ENTITY') {
    return undefined
  }

  const dsAny = ds as any
  const catalogIdentifier = dsAny.catalogIdentifier

  return {
    type: type as DataSourceConfig['type'],
    entity: ds.entity,
    catalog: ds.catalog,
    catalogIdentifier: typeof catalogIdentifier === 'string' ? catalogIdentifier : ds.catalog,
    namespace: ds.namespace,
    valueField: ds.valueField || 'id',
    labelField: ds.labelField || 'displayName'
  }
}

export const FlowDataSourceSelect: React.FC<FlowDataSourceSelectProps> = ({
  value,
  onValueChange,
  dataSource,
  accessToken,
  placeholder = 'Select',
  searchPlaceholder,
  initialOptions,
  disabled,
  className,
  'data-testid': testId = 'flow-datasource-select'
}) => {
  const normalized = React.useMemo(() => normalizeDataSource(dataSource), [dataSource])

  const token = accessToken || ''
  const { options: apiOptions, isLoading, error, search, loadMore, hasMore } = useDataSource(normalized, token)

  const safeInitialOptions = React.useMemo(() => initialOptions ?? [], [initialOptions])

  const options = React.useMemo(() => {
    if (apiOptions.length > 0) {
      return apiOptions.map(opt => ({ value: String(opt.value), label: opt.label }))
    }
    if (safeInitialOptions.length > 0) {
      return safeInitialOptions.map(opt => ({ value: String(opt.value), label: String(opt.label) }))
    }
    return []
  }, [apiOptions, safeInitialOptions])

  const isDisabled = Boolean(disabled) || !normalized || !accessToken
  const effectiveSearchPlaceholder =
    searchPlaceholder ||
    (normalized?.type === 'CUSTOM_ENTITY' || normalized?.type === 'INTERNAL_ENTITY'
      ? `Search ${normalized.entity || 'options'}...`
      : 'Search...')

  const emptyText = isLoading
    ? 'Loading...'
    : error
      ? 'Failed to load options'
      : normalized
        ? 'No options found'
        : 'Unsupported data source'

  return (
    <Combobox
      className={className}
      options={options as any}
      value={value || ''}
      onValueChange={(next: string) => onValueChange(next || '')}
      placeholder={placeholder}
      searchPlaceholder={effectiveSearchPlaceholder}
      emptyText={emptyText}
      onSearch={q => search(q)}
      searchDebounce={300}
      loading={Boolean(isLoading)}
      onLoadMore={loadMore}
      hasMore={Boolean(hasMore)}
      data-testid={testId}
      align="start"
      disabled={isDisabled}
    />
  )
}

export default FlowDataSourceSelect
