import React, { useMemo } from 'react'
import { Combobox } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useInvestmentAccountsList } from '@/common/data/investment/hooks/useInvestmentAccounts'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { InvestmentAccount } from '@/common/data/investment/types/investmentAccountTypes'

type InvestmentAccountFieldProps = Omit<
  React.ComponentProps<typeof Combobox>,
  'value' | 'onValueChange' | 'mode' | 'options'
> & {
  fieldName: string
  businessAppContext: BusinessAppContextProps
  testIdPrefix?: string
  value?: string | { id: string } | null
  onValueChange?: (value: string | { id: string } | null) => void
}

export const InvestmentAccountField = ({
  fieldName,
  businessAppContext,
  testIdPrefix = 'InvestmentForm',
  value,
  onValueChange,
  ...props
}: InvestmentAccountFieldProps) => {
  // Use new declarative hook for account selection
  const { accounts, loading: investmentAccountsLoading } = useInvestmentAccountsList(businessAppContext, { limit: 50 })

  // Map InvestmentAccount[] to Combobox options format
  const accountOptions = useMemo(() => {
    return accounts.map((account: InvestmentAccount) => ({
      id: String(account.id),
      value: String(account.id),
      label: account.name || 'Unknown',
      name: account.name || 'Unknown'
    }))
  }, [accounts])

  // Note: useInvestmentAccountsList doesn't support search/loadMore yet
  // This is a limitation of the migration - functionality preserved where possible
  const searchInvestmentAccounts = () => {
    // Placeholder - would need to implement search via refetch with variables
  }
  const loadMoreInvestmentAccounts = () => {
    // Placeholder - would need pagination support in useInvestmentAccountsList
  }
  const investmentAccountsHasMore = false

  // Extract value: handle both object format {id: "..."} and string format
  const fieldValue =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as any)?.id || ''
      : (value as string) || ''

  return (
    <Combobox
      {...props}
      value={fieldValue}
      onValueChange={(newValue: string) => {
        // Store as string ID (like ownerEmployeeId), not object
        onValueChange?.(newValue || null)
      }}
      options={accountOptions}
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
  )
}
