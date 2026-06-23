/**
 * Searchable combobox for Investment Company Groups on the import upload step.
 * Groups are GraphQL entities (not catalog entries), so this mirrors the company
 * form lookup rather than `CatalogSelect` enforced selects.
 */

import React, { useMemo, useState } from 'react'
import { Combobox, Label } from '@newwork/nw-design-system'
import { useInvestmentCompanyGroups } from '@/common/data/investment/hooks/useInvestmentCompanyGroups'

export interface InvestmentCompanyGroupSelectProps {
  value: string | null
  onValueChange: (group: { id: string; name: string } | null) => void
  label: string
  placeholder: string
  searchPlaceholder: string
  emptyText: string
  loadErrorText?: string
  required?: boolean
  accessToken?: string
  'data-testid'?: string
}

export const InvestmentCompanyGroupSelect: React.FC<InvestmentCompanyGroupSelectProps> = ({
  value,
  onValueChange,
  label,
  placeholder,
  searchPlaceholder,
  emptyText,
  loadErrorText = 'Could not load company groups',
  required = false,
  accessToken,
  'data-testid': testId = 'investment-company-group-select'
}) => {
  const [search, setSearch] = useState('')
  const { groups, loading, error } = useInvestmentCompanyGroups(accessToken || '', {
    limit: 100,
    search: search || undefined,
    orderBy: [{ field: 'name', direction: 'ASC_NULLS_LAST' }]
  })

  const options = useMemo(() => groups.map(group => ({ value: group.id, label: group.name || group.id })), [groups])

  const handleChange = (selectedId: string) => {
    if (!selectedId) {
      onValueChange(null)
      return
    }
    const match = groups.find(group => group.id === selectedId)
    onValueChange({ id: selectedId, name: match?.name || selectedId })
  }

  return (
    <div data-testid={testId}>
      <Label htmlFor={`${testId}-input`}>
        {label}
        {required && <span className="gba:text-destructive gba:ml-1">*</span>}
      </Label>
      <Combobox
        value={value || ''}
        onValueChange={handleChange}
        options={options}
        onSearch={setSearch}
        loading={loading}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        emptyText={error ? loadErrorText : emptyText}
        className="gba:mt-2 gba:w-full"
        data-testid={`${testId}-combobox`}
      />
    </div>
  )
}
