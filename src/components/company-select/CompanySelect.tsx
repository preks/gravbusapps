import React, { useMemo, useCallback } from 'react'
import { Combobox, Alert, AlertDescription, Avatar, AvatarFallback } from '@newwork/nw-design-system'
import { Building2 } from 'lucide-react'
import { useCompanies } from '@/common/data/orgchart/hooks/useCompanies'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { Company } from '@/common/data/orgchart/types/companyTypes'

interface CompanySelectProps {
  value?: string | null
  onValueChange?: (value: string | null) => void
  onChange?: (company: Company | null) => void
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  dataTestId?: string
  error?: string | null
  businessAppContext?: BusinessAppContextProps
  initialCompany?: Company | null
  disabled?: boolean
}

const CompanySelect = React.forwardRef<HTMLButtonElement, CompanySelectProps>(
  (
    {
      value,
      onValueChange,
      onChange,
      placeholder = 'Search Company...',
      searchPlaceholder = 'Type to search...',
      className,
      dataTestId = 'company-select',
      error,
      businessAppContext,
      initialCompany,
      disabled = false,
      ...rest
    },
    ref
  ) => {
    const accessToken = businessAppContext?.accessToken || ''

    // Use companies hook
    const {
      companies,
      loading: companiesLoading,
      error: companiesError,
      refetch
    } = useCompanies(accessToken, { limit: 20 }, 'list')

    // Combine companies with initialCompany
    const companiesWithInitial = useMemo(() => {
      if (!initialCompany) return companies

      // Check if initialCompany is already in companies
      const isInCompanies = companies.some(c => c.id === initialCompany.id)
      if (isInCompanies) return companies

      // Add initialCompany to the list if it matches the current value
      if (value === initialCompany.id) {
        return [initialCompany, ...companies]
      }

      return companies
    }, [companies, initialCompany, value])

    // Search function for companies
    const searchCompanies = useCallback(
      (searchTerm: string) => {
        if (refetch) {
          refetch({ search: searchTerm, offset: 0 })
        }
      },
      [refetch]
    )

    // Handle value change
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

          // Find the company from the list
          const selectedCompany = companiesWithInitial.find(c => c.id === newValue)
          if (selectedCompany) {
            onChange(selectedCompany)
          } else {
            onChange(null)
          }
        }
      },
      [onValueChange, onChange, companiesWithInitial]
    )

    // Build options with avatar and details (like EmployeeSelect)
    const options = useMemo(() => {
      return companiesWithInitial.map(company => {
        return {
          value: company.id,
          label: (
            <div className="gba:flex gba:items-start gba:gap-3 gba:w-full gba:min-w-0">
              <Avatar className="gba:self-center gba:flex-shrink-0" size="sm">
                <AvatarFallback className="gba:text-xs">
                  <Building2 className="gba:w-4 gba:h-4" />
                </AvatarFallback>
              </Avatar>
              <div className="gba:flex gba:flex-col gba:min-w-0 gba:flex-1 gba:overflow-hidden">
                <div className="gba:text-sm gba:font-medium gba:truncate gba:text-left">{company.name || ''}</div>
                {(company.code || company.description) && (
                  <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-left gba:min-w-0">
                    {company.code && (
                      <span className="gba:text-muted-foreground gba:truncate gba:shrink-0">{company.code}</span>
                    )}
                    {company.code && company.description && (
                      <span className="gba:text-muted-foreground gba:shrink-0">·</span>
                    )}
                    {company.description && (
                      <span className="gba:text-muted-foreground gba:truncate gba:min-w-0">{company.description}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        }
      })
    }, [companiesWithInitial])

    return (
      <div className="gba:space-y-2 gba:w-full gba:max-w-full gba:min-w-0" data-testid={dataTestId}>
        <Combobox
          ref={ref as any}
          className={`gba:[&&]:h-auto gba:w-full gba:max-w-full gba:min-w-0 ${className || ''}`}
          options={options as any}
          value={value || ''}
          onValueChange={handleValueChange}
          placeholder={placeholder}
          searchPlaceholder={searchPlaceholder}
          emptyText={companiesLoading ? 'Loading...' : 'No companies found'}
          onSearch={searchCompanies}
          searchDebounce={300}
          loading={Boolean(companiesLoading)}
          disabled={disabled || !accessToken}
          data-testid={dataTestId}
          align="start"
          {...rest}
        />

        {/* Error Display */}
        {(error || companiesError) && (
          <Alert variant="destructive">
            <AlertDescription>{error || companiesError}</AlertDescription>
          </Alert>
        )}
      </div>
    )
  }
)

CompanySelect.displayName = 'CompanySelect'

export default CompanySelect
export type { CompanySelectProps }
