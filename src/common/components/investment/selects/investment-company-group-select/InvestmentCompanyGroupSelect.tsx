import React, { useMemo, useCallback } from 'react'
import { Combobox, useTranslation } from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentCompanyGroups } from '@/common/data/investment/hooks/useInvestmentCompanyGroups'
import type { InvestmentCompanyGroup } from '@/common/data/investment/types/investmentCompanyGroupTypes'
import translations from './_i18n'

interface InvestmentCompanyGroupSelectProps {
  value?: string | null
  onValueChange?: (value: string | null) => void
  onChange?: (group: InvestmentCompanyGroup | null) => void
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  dataTestId?: string
  error?: string | null
  businessAppContext?: BusinessAppContextProps
  disabled?: boolean
}

const InvestmentCompanyGroupSelect = React.forwardRef<HTMLButtonElement, InvestmentCompanyGroupSelectProps>(
  (
    {
      value,
      onValueChange,
      onChange,
      placeholder,
      searchPlaceholder,
      className,
      dataTestId = 'investment-company-group-select',
      error,
      businessAppContext,
      disabled = false
    },
    ref
  ) => {
    const { t } = useTranslation(translations)
    const accessToken = businessAppContext?.accessToken || ''
    const resolvedPlaceholder = placeholder ?? t('placeholder')
    const resolvedSearchPlaceholder = searchPlaceholder ?? t('search-placeholder')

    const { groups, loading, refetch } = useInvestmentCompanyGroups(accessToken, { limit: 50 })

    const searchGroups = useCallback(
      (searchTerm: string) => {
        if (refetch) {
          refetch({ search: searchTerm, offset: 0 })
        }
      },
      [refetch]
    )

    const handleValueChange = useCallback(
      (newValue: string | null) => {
        if (onValueChange) {
          onValueChange(newValue)
        }

        if (onChange) {
          if (!newValue) {
            onChange(null)
            return
          }
          const selectedGroup = groups.find(group => group.id === newValue)
          onChange(selectedGroup ?? null)
        }
      },
      [onValueChange, onChange, groups]
    )

    const options = useMemo(() => {
      return groups.map(group => ({
        value: group.id,
        label: group.name || group.id
      }))
    }, [groups])

    return (
      <div className="gba:space-y-2 gba:w-full" data-testid={dataTestId}>
        <Combobox
          ref={ref}
          className={`gba:w-full ${className || ''}`}
          options={options}
          value={value || ''}
          onValueChange={handleValueChange}
          placeholder={resolvedPlaceholder}
          searchPlaceholder={resolvedSearchPlaceholder}
          emptyText={loading ? t('loading') : t('empty')}
          onSearch={searchGroups}
          searchDebounce={300}
          loading={Boolean(loading)}
          disabled={disabled || !accessToken}
          data-testid={dataTestId}
          align="start"
        />
        {error && <p className="gba:text-sm gba:text-destructive">{error}</p>}
      </div>
    )
  }
)

InvestmentCompanyGroupSelect.displayName = 'InvestmentCompanyGroupSelect'

export default InvestmentCompanyGroupSelect
export type { InvestmentCompanyGroupSelectProps }
