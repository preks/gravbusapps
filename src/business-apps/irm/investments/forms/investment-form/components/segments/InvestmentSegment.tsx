import React, { useState, useCallback, useEffect, useMemo } from 'react'
import {
  Input,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Combobox,
  Alert,
  Button
} from '@newwork/nw-design-system'
import { useFormContext } from 'react-hook-form'
import { EmployeeSelect } from '@/components/employee-select'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useInvestmentFormContext } from '../../context/InvestmentFormContext'
import { useGetInvestmentAccounts } from '@/common/data/investment'
import { SelectOption, InvestmentFormValues } from '../../types'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

const prefixDataTestId = 'InvestmentForm-InvestmentSegment'

// Helper function to get investment type display name
const getInvestmentTypeName = (group: string): string => {
  if (!group) return 'Investment'

  const groupCode = group.split(':').pop() || group

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

const InvestmentSegment: React.FC = () => {
  const { control } = useFormContext() // Get form control from react-hook-form context
  const {
    // Form values to get selected group
    formValues,
    setFormValues,
    // Employee positions for owner selection
    employeePositions,
    employeePositionsLoading,
    employeePositionsHasMore,
    searchEmployeePositions,
    loadMoreEmployeePositions,
    // Business app context for API calls
    businessAppContext
  } = useInvestmentFormContext()

  // Use enhanced hook for account selection with state management
  const {
    options: accounts,
    loading: accountsLoading,
    error: accountsError,
    hasMore: accountsHasMore,
    search: searchAccounts,
    loadMore: loadMoreAccounts
  } = useGetInvestmentAccounts(businessAppContext, {
    withState: true,
    autoFetch: true,
    pageSize: 50,
    mapToSelectOptions: true
  })

  // Currency data loading
  const [currencies, setCurrencies] = useState<SelectOption[]>([])
  const [currenciesLoading, setCurrenciesLoading] = useState(false)

  const catalogClient = useCatalogManagerClient(businessAppContext.accessToken)

  // Transform SelectOption[] to EmployeeOption[] format that EmployeeSelect expects
  // Load currencies
  const loadCurrencies = useCallback(async () => {
    if (!businessAppContext.accessToken) return

    setCurrenciesLoading(true)
    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: 'Currency',
          version: 'v1'
        },
        {
          limit: 200,
          offset: 0,
          returnTotalRecords: false,
          includeChildCatalogEntries: true
        }
      )

      const currencyOptions = (response.data || []).map((entry: any) => ({
        id: entry.id,
        value: entry.id,
        label: entry.value || entry.code,
        name: entry.value || entry.code
      }))

      setCurrencies(currencyOptions)
    } catch (error) {
      console.error('Error loading currencies:', error)
    } finally {
      setCurrenciesLoading(false)
    }
  }, [businessAppContext.accessToken, catalogClient])

  // Load currencies on mount
  useEffect(() => {
    loadCurrencies()
  }, [loadCurrencies])

  const assigneeOptions = useMemo(
    () =>
      (employeePositions || []).map(emp => ({
        id: emp.id,
        displayName: emp.label,
        pictureThumbnail: emp.extraInfo?.pictureThumbnail,
        organizationalUnitName: emp.extraInfo?.organizationalUnit,
        jobPositionName: emp.extraInfo?.jobPosition
      })),
    [employeePositions]
  )

  // Get dynamic investment type name
  const investmentGroupId =
    typeof formValues.investment.investmentGroup === 'object'
      ? formValues.investment.investmentGroup?.id || ''
      : formValues.investment.investmentGroup || ''
  const investmentTypeName = getInvestmentTypeName(investmentGroupId)

  return (
    <div data-testid={formatDataTestId(prefixDataTestId, 'Container')} className="gba:space-y-6">
      <div>
        <h3 className="gba:m-0 gba:text-foreground gba:text-lg gba:font-semibold gba:mb-2">
          {getTranslationFromI18nKeyAndLabel('investment.form.typeInformation', `${investmentTypeName} Information`)}
        </h3>
        <p className="gba:m-0 gba:text-muted-foreground gba:text-sm">
          {getTranslationFromI18nKeyAndLabel(
            'investment.form.basicInformation',
            `Basic information about the ${investmentTypeName.toLowerCase()}`
          )}
        </p>
      </div>

      <div className="gba:space-y-6">
        {/* Owner Selection */}
        <FormField
          control={control as any}
          name="investment.ownerEmployee"
          render={({ field }) => {
            const displayValue =
              field.value && typeof field.value === 'object' ? field.value.id || '' : field.value || ''
            return (
              <FormItem>
                <FormLabel>
                  {getTranslationFromI18nKeyAndLabel('investment.form.typeOwner', `${investmentTypeName} Owner`)}{' '}
                  <span className="gba:text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <EmployeeSelect
                    employees={assigneeOptions}
                    value={displayValue}
                    onValueChange={(value: string) => {
                      if (value) {
                        field.onChange({ id: value } as any)
                      } else {
                        field.onChange(null)
                      }
                    }}
                    onSearch={searchEmployeePositions}
                    loading={Boolean(employeePositionsLoading)}
                    onLoadMore={loadMoreEmployeePositions}
                    hasMore={Boolean(employeePositionsHasMore)}
                    placeholder={getTranslationFromI18nKeyAndLabel(
                      'investment.form.selectTypeOwner',
                      `Select ${investmentTypeName.toLowerCase()} owner`
                    )}
                    data-testid={formatDataTestId(prefixDataTestId, 'OwnerSelect')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )
          }}
        />

        {/* Investment Name and Currency Row */}
        <div className="gba:grid gba:grid-cols-5 gba:gap-4 gba:w-full gba:min-w-0">
          {/* Investment Name - 2/3 width */}
          <div className="gba:col-span-3">
            <FormField
              control={control as any}
              name="investment.name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {getTranslationFromI18nKeyAndLabel('investment.form.typeName', `${investmentTypeName} Name`)}{' '}
                    <span className="gba:text-destructive">*</span>
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
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Currency - 1/3 width */}
          <div className="gba:col-span-2 gba:min-w-0">
            <FormField
              control={control as any}
              name="investment.currency" // Without Ref suffix
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {getTranslationFromI18nKeyAndLabel('investment.form.currency', 'Currency')}{' '}
                    <span className="gba:text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Combobox
                      className="gba:w-full gba:min-w-0"
                      value={typeof field.value === 'object' ? field.value?.id || '' : field.value || ''}
                      onValueChange={value => {
                        // Store as object if value exists, undefined if cleared
                        const newValue = value ? ({ id: value } as any) : undefined
                        field.onChange(newValue)
                        // Note: setFormValues automatically merges investment fields
                        // Form state stores catalog objects (or string IDs for backward compatibility)
                        setFormValues({
                          investment: {
                            currency: newValue
                          }
                        } as Partial<InvestmentFormValues>)
                      }}
                      options={currencies}
                      placeholder={getTranslationFromI18nKeyAndLabel(
                        'investment.form.selectCurrency',
                        'Select currency...'
                      )}
                      searchPlaceholder="Search currencies..."
                      emptyText="No currencies found"
                      disabled={currenciesLoading}
                      loading={currenciesLoading}
                      data-testid={formatDataTestId(prefixDataTestId, 'CurrencySelect')}
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
          control={control as any}
          name="investment.investmentAccount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {getTranslationFromI18nKeyAndLabel('investment.form.relatedAccount', 'Related Account')}{' '}
                <span className="gba:text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Combobox
                  value={typeof field.value === 'object' ? field.value?.id || '' : field.value || ''}
                  onValueChange={(value: string) => {
                    // Store as object if value exists, undefined if cleared
                    field.onChange(value ? ({ id: value } as any) : undefined)
                  }}
                  options={accounts}
                  placeholder={getTranslationFromI18nKeyAndLabel('investment.form.selectAccount', 'Select account...')}
                  searchPlaceholder="Search accounts..."
                  emptyText="No accounts found"
                  disabled={accountsLoading}
                  loading={accountsLoading}
                  onSearch={searchAccounts}
                  onLoadMore={loadMoreAccounts}
                  hasMore={accountsHasMore}
                  data-testid={formatDataTestId(prefixDataTestId, 'AccountSelect')}
                />
              </FormControl>
              <FormMessage />
              {accountsError && (
                <Alert
                  variant="destructive"
                  className="gba:mt-2"
                  data-testid={formatDataTestId(prefixDataTestId, 'account-error-alert')}
                >
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <span>{accountsError}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAccountsError(null)
                        loadAccounts(accountSearchTerm, false)
                      }}
                      data-testid={formatDataTestId(prefixDataTestId, 'account-retry-button')}
                    >
                      {getTranslationFromI18nKeyAndLabel('common.retry', 'Retry')}
                    </Button>
                  </div>
                </Alert>
              )}
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}

export default InvestmentSegment
