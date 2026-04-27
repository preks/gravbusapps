import React, { useMemo } from 'react'
import { Combobox, Alert, AlertDescription } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useInvestment } from '@/common/data/investment/hooks/useInvestment.new'

export interface SelectOption {
  id: string
  value: string
  label: string
  name: string
  pictureThumbnail?: string
}

export interface InvestmentSelectProps {
  /** Access token used to hydrate the current `value` if it's not present in `investments`. */
  accessToken: string | null | undefined
  value: string | null | undefined
  onChange: (id: string | null) => void
  investments: SelectOption[]
  investmentsLoading?: boolean
  investmentsError?: string | null
  searchInvestments?: (search: string) => void
  disabled?: boolean
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  /**
   * When true (default), if `value` is set but is not present in `investments`,
   * the component fetches that single investment by id so the trigger can show its
   * real name instead of the raw id.
   */
  hydrateUnknownValue?: boolean
  ['data-testid']?: string
  error?: string | null
}

/**
 * Single-select investment combobox.
 *
 * Mirrors the API of `ContactSelect` / `AccountSelect`. Accepts a pre-loaded list of
 * `investments` options and, when `value` references an investment that is not in that
 * list (e.g. because the list is scoped to a related account but the form already
 * carries an investment id from another context), self-hydrates the missing
 * investment by id so the user sees its name rather than its uuid.
 */
const InvestmentSelect: React.FC<InvestmentSelectProps> = ({
  accessToken,
  value,
  onChange,
  investments,
  investmentsLoading = false,
  investmentsError = null,
  searchInvestments,
  disabled = false,
  placeholder = 'Search and select investment...',
  searchPlaceholder = 'Type to search...',
  emptyText: emptyTextProp,
  hydrateUnknownValue = true,
  'data-testid': dataTestId = 'investment-select',
  error = null
}) => {
  const isValueInOptions = !!value && investments.some(i => i.id === value)
  const shouldHydrate = hydrateUnknownValue && !!value && !isValueInOptions

  const { investment: hydratedInvestment, loading: hydrating } = useInvestment(
    shouldHydrate ? accessToken || '' : '',
    shouldHydrate ? value || undefined : undefined,
    'minimal'
  )

  const effectiveInvestments = useMemo<SelectOption[]>(() => {
    if (!value || isValueInOptions) {
      return investments
    }
    const hydratedLabel = hydratedInvestment?.name || hydratedInvestment?.code
    const label = hydratedLabel || (hydrating ? 'Loading…' : 'Investment')
    const placeholderOption: SelectOption = { id: value, value, label, name: label }
    return [placeholderOption, ...investments]
  }, [investments, value, isValueInOptions, hydratedInvestment, hydrating])

  const comboboxOptions = useMemo(
    () =>
      effectiveInvestments.map(inv => ({
        value: inv.id,
        label: inv.label || inv.name
      })),
    [effectiveInvestments]
  )

  const isLoading = investmentsLoading || (shouldHydrate && hydrating)
  const emptyText = emptyTextProp ?? (isLoading ? 'Loading...' : 'No investments found')

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
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        emptyText={emptyText}
        disabled={Boolean(disabled) || investmentsLoading}
        loading={isLoading}
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

export default InvestmentSelect
