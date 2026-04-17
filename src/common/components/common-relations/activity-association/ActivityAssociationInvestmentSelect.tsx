import React, { useMemo } from 'react'
import { Combobox, Alert, AlertDescription } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import type { InvestmentAssociationSelectOption } from './types'

export interface ActivityAssociationInvestmentSelectProps {
  value: string | null | undefined
  onChange: (id: string | null) => void
  investments: InvestmentAssociationSelectOption[]
  investmentsLoading: boolean
  investmentsError?: string | null
  searchInvestments: (search: string) => void
  disabled?: boolean
  ['data-testid']?: string
  error?: string | null
}

/**
 * Single optional investment picker for IRM activity association (linked investments from accounts).
 */
export const ActivityAssociationInvestmentSelect: React.FC<ActivityAssociationInvestmentSelectProps> = ({
  value,
  onChange,
  investments,
  investmentsLoading,
  investmentsError = null,
  searchInvestments,
  disabled = false,
  'data-testid': dataTestId = 'activity-association-investment',
  error = null
}) => {
  const effectiveInvestments = useMemo(() => {
    if (!value) {
      return investments
    }
    if (investments.some(i => i.id === value)) {
      return investments
    }
    const placeholder: InvestmentAssociationSelectOption = { id: value, value, label: value, name: value }
    return [placeholder, ...investments]
  }, [investments, value])

  const comboboxOptions = useMemo(
    () =>
      effectiveInvestments.map(inv => ({
        value: inv.id,
        label: inv.label || inv.name
      })),
    [effectiveInvestments]
  )

  const emptyText = investmentsLoading ? 'Loading...' : 'No investments found'

  return (
    <div className="gba:space-y-2 gba:w-full gba:min-w-0" data-testid={dataTestId}>
      <Combobox
        value={value || ''}
        onValueChange={v => {
          if (v === '' || v === null || v === undefined) {
            onChange(null)
            return
          }
          onChange(String(v))
        }}
        options={comboboxOptions as any}
        placeholder="Search and select investment..."
        searchPlaceholder="Type to search..."
        emptyText={emptyText}
        disabled={Boolean(disabled) || investmentsLoading}
        loading={investmentsLoading}
        onSearch={searchInvestments}
        searchDebounce={300}
        data-testid={formatDataTestId(dataTestId, 'combobox')}
      />
      {(error || investmentsError) && (
        <Alert variant="destructive">
          <AlertDescription>{error || investmentsError}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
