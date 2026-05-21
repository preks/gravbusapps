import React, { useMemo, useCallback } from 'react'
import { Combobox, Alert, AlertDescription, Avatar, AvatarFallback, useTranslation } from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentCompanies } from '@/common/data/investment/hooks/useInvestmentCompanies'
import type { InvestmentCompany } from '@/common/data/investment/types/investmentCompanyTypes'
import translations from './_i18n'

interface InvestmentCompanySelectProps {
  value?: string | null
  onValueChange?: (value: string | null) => void
  onChange?: (company: InvestmentCompany | null) => void
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  dataTestId?: string
  error?: string | null
  businessAppContext?: BusinessAppContextProps
  initialCompany?: InvestmentCompany | null
  disabled?: boolean
}

const getInitials = (name?: string): string => {
  if (!name) return 'CO'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'CO'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

const InvestmentCompanySelect = React.forwardRef<HTMLButtonElement, InvestmentCompanySelectProps>(
  (
    {
      value,
      onValueChange,
      onChange,
      placeholder,
      searchPlaceholder,
      className,
      dataTestId = 'investment-company-select',
      error,
      businessAppContext,
      initialCompany,
      disabled = false,
      ...rest
    },
    ref
  ) => {
    const { t } = useTranslation(translations)
    const accessToken = businessAppContext?.accessToken || ''
    const resolvedPlaceholder = placeholder ?? t('placeholder')
    const resolvedSearchPlaceholder = searchPlaceholder ?? t('search-placeholder')

    const {
      companies,
      loading: companiesLoading,
      error: companiesError,
      refetch
    } = useInvestmentCompanies(accessToken, { limit: 20 })

    const companiesWithInitial = useMemo(() => {
      if (!initialCompany) return companies
      const isInCompanies = companies.some(company => company.id === initialCompany.id)
      if (isInCompanies) return companies
      if (value === initialCompany.id) {
        return [initialCompany, ...companies]
      }
      return companies
    }, [companies, initialCompany, value])

    const searchCompanies = useCallback(
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

          const selectedCompany = companiesWithInitial.find(company => company.id === newValue)
          onChange(selectedCompany ?? null)
        }
      },
      [onValueChange, onChange, companiesWithInitial]
    )

    const options = useMemo(() => {
      return companiesWithInitial.map(company => ({
        value: company.id,
        label: (
          <div className="gba:flex gba:items-start gba:gap-3 gba:w-full gba:min-w-0">
            <Avatar className="gba:self-center gba:flex-shrink-0" size="sm">
              <AvatarFallback className="gba:text-xs">{getInitials(company.name)}</AvatarFallback>
            </Avatar>
            <div className="gba:flex gba:flex-col gba:min-w-0 gba:flex-1 gba:overflow-hidden">
              <div className="gba:text-sm gba:font-medium gba:truncate gba:text-left">{company.name || ''}</div>
              {(company.code || company.description) && (
                <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-left gba:min-w-0">
                  {company.code && (
                    <span className="gba:text-muted-foreground gba:truncate gba:shrink-0">{company.code}</span>
                  )}
                  {company.code && company.description && (
                    <span className="gba:text-muted-foreground gba:shrink-0">.</span>
                  )}
                  {company.description && (
                    <span className="gba:text-muted-foreground gba:truncate gba:min-w-0">{company.description}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      }))
    }, [companiesWithInitial])

    return (
      <div className="gba:space-y-2 gba:w-full gba:max-w-full gba:min-w-0" data-testid={dataTestId}>
        <Combobox
          ref={ref}
          className={`gba:[&&]:h-auto gba:w-full gba:max-w-full gba:min-w-0 ${className || ''}`}
          options={options}
          value={value || ''}
          onValueChange={handleValueChange}
          placeholder={resolvedPlaceholder}
          searchPlaceholder={resolvedSearchPlaceholder}
          emptyText={companiesLoading ? t('loading') : t('empty')}
          onSearch={searchCompanies}
          searchDebounce={300}
          loading={Boolean(companiesLoading)}
          disabled={disabled || !accessToken}
          data-testid={dataTestId}
          align="start"
          {...rest}
        />

        {(error || companiesError) && (
          <Alert variant="destructive">
            <AlertDescription>{error || companiesError}</AlertDescription>
          </Alert>
        )}
      </div>
    )
  }
)

InvestmentCompanySelect.displayName = 'InvestmentCompanySelect'

export default InvestmentCompanySelect
export type { InvestmentCompanySelectProps }
