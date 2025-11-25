import React from 'react'
import { Controller, Control, FieldValues } from 'react-hook-form'
import { Combobox, FormItem, FormLabel, FormControl, FormMessage } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useGetInvestmentAccounts } from '@/common/data/investment/hooks/useInvestmentAccounts'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DynamicFormFieldDefinition } from '@/components/dynamic-form'

interface InvestmentAccountFieldProps {
  field: DynamicFormFieldDefinition
  fieldName: string
  control: Control<FieldValues>
  businessAppContext: BusinessAppContextProps
  testIdPrefix?: string
}

export const InvestmentAccountField: React.FC<InvestmentAccountFieldProps> = ({
  field,
  fieldName,
  control,
  businessAppContext,
  testIdPrefix = 'InvestmentForm'
}) => {
  // Use enhanced hook for account selection with state management
  const {
    options: investmentAccounts,
    loading: investmentAccountsLoading,
    hasMore: investmentAccountsHasMore,
    search: searchInvestmentAccounts,
    loadMore: loadMoreInvestmentAccounts
  } = useGetInvestmentAccounts(businessAppContext, {
    withState: true,
    autoFetch: true,
    pageSize: 50,
    mapToSelectOptions: true
  })

  return (
    <Controller
      name={fieldName as any}
      control={control}
      render={({ field: formField, fieldState }) => (
        <FormItem>
          <FormLabel>
            {field.label}
            {field.required && <span className="gba:text-destructive"> *</span>}
          </FormLabel>
          <FormControl>
            <Combobox
              value={typeof formField.value === 'object' ? formField.value?.id || '' : formField.value || ''}
              onValueChange={value => {
                // Store as object if value exists, undefined if cleared
                formField.onChange(value ? ({ id: value } as any) : undefined)
              }}
              options={investmentAccounts}
              placeholder={getTranslationFromI18nKeyAndLabel(
                'investment.form.selectInvestmentAccount',
                'Select investment account...'
              )}
              searchPlaceholder="Search investment accounts..."
              emptyText="No investment accounts found"
              disabled={investmentAccountsLoading}
              loading={investmentAccountsLoading}
              onSearch={searchInvestmentAccounts}
              onLoadMore={loadMoreInvestmentAccounts}
              hasMore={investmentAccountsHasMore}
              data-testid={formatDataTestId(testIdPrefix, `${fieldName}Select`)}
            />
          </FormControl>
          <FormMessage>{fieldState.error?.message}</FormMessage>
        </FormItem>
      )}
    />
  )
}
