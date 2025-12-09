import React, { useMemo, useCallback } from 'react'
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Input } from '@newwork/nw-design-system'
import { useFormContext } from 'react-hook-form'
import { CatalogSelect } from '@/components/catalog-select'
import { EmployeeSelect } from '@/components/employee-select'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import AccountSelect from '@/common/components/common-relations/selects/account-select/AccountSelect'
import type { SelectOption as AccountSelectOption } from '@/common/components/common-relations/selects/account-select'
import { CompanySelect } from '@/components/company-select'
import { CURRENCY } from '@/common/constants/commonCatalogs'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

interface InvestmentInformationSegmentProps {
  // Business app context for EmployeeSelect and API calls (required for EmployeeSelect to work)
  businessAppContext?: BusinessAppContextProps

  // Owner employee from investment data (to display immediately)
  ownerEmployee?: any

  // Account selection props (like OpportunityInformationSegment)
  account?: any
  useAccounts?: {
    accounts: any[]
    total: number
    loading: boolean
    error: string | null
    refetch: (variables?: any) => Promise<void>
  }

  // Company from investment data (to display immediately)
  company?: any

  // Entity ID (investment ID for edit mode)
  entityId?: string

  // Investment Group (for dynamic type name)
  investmentGroup?: string | { id: string } | null

  // Custom fields (context-specific, e.g., InvestmentReport date, scope, investmentId)
  customFields?: React.ReactNode

  // Disable all fields (e.g., when data comes from selected investment)
  disabled?: boolean
}

// Helper function to get investment type display name
const getInvestmentTypeName = (group: string | { id: string } | null | undefined): string => {
  if (!group) return 'Investment'

  const groupId = typeof group === 'object' ? group.id : group
  const groupCode = groupId?.split(':').pop() || groupId
  switch (groupCode) {
    case 'LIQUID_FUND':
      return 'Liquid Fund'
    case 'REAL_ESTATE':
      return 'Real Estate'
    case 'EQUITY':
      return 'Equity'
    default:
      return 'Investment'
  }
}

const InvestmentInformationSegment: React.FC<InvestmentInformationSegmentProps> = ({
  businessAppContext,
  ownerEmployee,
  account,
  company,
  useAccounts,
  entityId,
  investmentGroup,
  customFields,
  disabled = false
}) => {
  const form = useFormContext<any>()
  const prefixDataTestId = 'InvestmentInformationSegment'

  // Get dynamic investment type name
  const investmentTypeName = getInvestmentTypeName(investmentGroup)

  // Transform accounts to AccountSelectOption[] (like OpportunityInformationSegment)
  const accountOptions = useMemo<AccountSelectOption[]>(() => {
    if (!useAccounts?.accounts) return []
    return useAccounts.accounts.map((acc: any) => ({
      id: acc.id,
      value: acc.id,
      label: acc.name || acc.displayName || '',
      name: acc.name || acc.displayName || ''
    }))
  }, [useAccounts?.accounts])

  // Search function for accounts (like OpportunityInformationSegment)
  const searchAccounts = useCallback(
    (searchTerm: string) => {
      if (useAccounts?.refetch) {
        useAccounts.refetch({ search: searchTerm, offset: 0 })
      }
    },
    [useAccounts?.refetch]
  )

  // Helper function to get account ID from value (like OpportunityInformationSegment)
  const getAccountIdFromValue = (value: any): string | null => {
    if (Array.isArray(value)) {
      return null
    }
    if (typeof value === 'object' && value !== null && 'id' in value) {
      return value.id
    }
    if (typeof value === 'string') {
      return value
    }
    return null
  }

  return (
    <div data-testid={formatDataTestId(prefixDataTestId, 'Container')} className="gba:space-y-6">
      {/* Header */}
      <div>
        <h3 className="gba:m-0 gba:text-foreground gba:text-lg gba:font-semibold gba:mb-2">
          {getTranslationFromI18nKeyAndLabel('investment.form.typeInformation', `${investmentTypeName} Information`)}
        </h3>
      </div>

      <div className="gba:space-y-6">
        {/* Company Selection */}
        <FormField
          control={form.control}
          name="investment.companyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{getTranslationFromI18nKeyAndLabel('investment.form.company', 'Company')}</FormLabel>
              <FormControl>
                <CompanySelect
                  value={field.value || null}
                  onValueChange={(v: string | null) => {
                    field.onChange(v || '')
                  }}
                  businessAppContext={businessAppContext}
                  initialCompany={company}
                  data-testid={formatDataTestId(prefixDataTestId, 'CompanySelect')}
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Owner Selection */}
        <FormField
          control={form.control}
          name="investment.ownerEmployeeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {getTranslationFromI18nKeyAndLabel('investment.form.typeOwner', `${investmentTypeName} Owner`)}
              </FormLabel>
              <FormControl>
                <EmployeeSelect
                  value={field.value || null}
                  onValueChange={(v: string | null) => field.onChange(v || '')}
                  businessAppContext={businessAppContext}
                  initialEmployee={ownerEmployee}
                  autoSelect={entityId ? undefined : 'current-user'}
                  placeholder={getTranslationFromI18nKeyAndLabel('investment.form.selectOwner', 'Select owner...')}
                  data-testid={formatDataTestId(prefixDataTestId, 'OwnerSelect')}
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Investment Name and Currency Row */}
        <div className="gba:grid gba:grid-cols-5 gba:gap-4 gba:w-full gba:min-w-0">
          {/* Investment Name - 3/5 width */}
          <div className="gba:col-span-3">
            <FormField
              control={form.control}
              name="investment.name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {getTranslationFromI18nKeyAndLabel('investment.form.typeName', `${investmentTypeName} Name`)}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ''}
                      placeholder={getTranslationFromI18nKeyAndLabel(
                        'investment.form.enterTypeName',
                        `Enter ${investmentTypeName.toLowerCase()} name`
                      )}
                      data-testid={formatDataTestId(prefixDataTestId, 'NameInput')}
                      disabled={disabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Currency - 2/5 width */}
          <div className="gba:col-span-2 gba:min-w-0">
            <FormField
              control={form.control}
              name="investment.currencyRef"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{getTranslationFromI18nKeyAndLabel('investment.form.currency', 'Currency')}</FormLabel>
                  <FormControl>
                    <CatalogSelect
                      catalogIdentifier={CURRENCY}
                      value={field.value || ''}
                      onValueChange={v => {
                        // Store as string ID (like ownerEmployeeId), not object
                        field.onChange(v || '')
                      }}
                      data-testid={formatDataTestId(prefixDataTestId, 'CurrencySelect')}
                      disabled={disabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Related Account */}
        <FormField
          control={form.control}
          name="investment.investmentAccountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {getTranslationFromI18nKeyAndLabel('investment.form.relatedAccount', 'Related Account')}
              </FormLabel>
              <FormControl>
                <AccountSelect
                  value={field.value || null}
                  onChange={value => {
                    // Type guard: ensure value is not an array (single-select mode)
                    if (Array.isArray(value)) {
                      return
                    }

                    // Extract ID from value (string or object)
                    const accountId = getAccountIdFromValue(value)
                    field.onChange(accountId || '')
                  }}
                  initialAccount={account}
                  dataTestId={formatDataTestId(prefixDataTestId, 'AccountSelect')}
                  error={useAccounts?.error || null}
                  accounts={accountOptions}
                  accountsLoading={useAccounts?.loading || false}
                  accountsError={useAccounts?.error || null}
                  searchAccounts={searchAccounts}
                  multiple={false}
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Custom fields (context-specific, e.g., InvestmentReport date, scope, investmentId) */}
        {customFields}
      </div>
    </div>
  )
}

export default InvestmentInformationSegment
