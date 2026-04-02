import React from 'react'
import { Combobox } from '@newwork/nw-design-system'

export interface TaxonomyOption {
  value: string
  label: string
}

interface TaxonomyMultiSelectProps {
  options: TaxonomyOption[]
  value: string[]
  onValueChange: (ids: string[]) => void
  onCreateNew?: (name: string) => Promise<string>
  isLoading?: boolean
  placeholder?: string
  'data-testid'?: string
  onSearch?: (search: string) => void
  onLoadMore?: () => void
  hasMore?: boolean
}

export const TaxonomyMultiSelect: React.FC<TaxonomyMultiSelectProps> = ({
  options,
  value,
  onValueChange,
  onCreateNew,
  isLoading = false,
  placeholder = 'Select or create...',
  'data-testid': testId,
  onSearch,
  onLoadMore,
  hasMore = false
}) => {
  return (
    <Combobox
      mode="tags"
      options={options}
      value={value}
      onValueChange={(next: string[]) => onValueChange(next)}
      onCreateTag={onCreateNew}
      placeholder={placeholder}
      searchPlaceholder="Search or create..."
      emptyText={isLoading ? 'Loading...' : 'No results'}
      loading={isLoading}
      {...(onSearch ? { onSearch, searchDebounce: 300 } : {})}
      onLoadMore={onLoadMore}
      hasMore={hasMore}
      data-testid={testId}
    />
  )
}
