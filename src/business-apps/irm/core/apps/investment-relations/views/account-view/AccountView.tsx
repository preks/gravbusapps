import { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentAccounts } from '@/common/data/investment/hooks/useInvestmentAccounts'
import { AccountLayout, type AccountViewConfig } from '@/common/components/common-relations/view-layouts/account-layout'
import type { InvestmentAccount } from '@/common/data/investment/types'
import type { InvestmentAccountQueryVariables } from '@/common/data/investment/queries/investmentAccountQueries'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import {
  createAccountColumns,
  createAccountSortableColumns
} from '@/common/components/common-relations/view-layouts/account-layout/config'
import { accountFilterConfig } from '@/common/components/common-relations/view-layouts/account-layout/config'
import { useAccountFilterOptions } from '../account-view/hooks/useAccountFilterOptions'
import { AccountStatistics } from '../account-view/components/AccountStatistics'
import {
  applyBasicFilters,
  applyDateFilter
} from '@/common/components/common-relations/view-layouts/account-layout/utils/queryHelpers'

export type AccountViewProps = BusinessAppContextProps

export const AccountView: React.FC<AccountViewProps> = context => {
  const { fetchInvestmentAccounts } = useGetInvestmentAccounts(context)

  const config: AccountViewConfig<InvestmentAccount, InvestmentAccountQueryVariables> = useMemo(
    () => ({
      contextType: 'investment',

      fetchAccounts: async (variables: InvestmentAccountQueryVariables) => {
        const result = await fetchInvestmentAccounts(variables)
        return {
          accounts: result.InvestmentAccount || [],
          total: result.InvestmentAccountAggregate?.aggregate?.count || 0
        }
      },

      filterDataHook: useAccountFilterOptions,

      createColumns: createAccountColumns as any,
      createSortableColumns: createAccountSortableColumns,

      mapColumnToGraphQLField: (columnId: string): string => {
        const mapping: Record<string, string> = {
          name: 'name',
          email: 'email',
          phone: 'phone',
          geographicPresence: 'geographicPresence',
          industryClass: 'industryClass',
          legalForm: 'legalForm',
          companySize: 'companySize',
          ownerEmployee: 'ownerEmployee',
          createdAt: 'createdAt',
          updatedAt: 'updatedAt'
        }
        return mapping[columnId] || 'createdAt'
      },

      baseFilterConfig: accountFilterConfig,

      buildQueryVariables: (params: {
        pagination: { pageIndex: number; pageSize: number }
        searchTerm: string
        selectedFilters: Record<string, any>
        sorting: Array<{ id: string; desc: boolean }>
        mapColumnToGraphQLField: (columnId: string) => string
      }) => {
        const vars: InvestmentAccountQueryVariables = {
          limit: params.pagination.pageSize,
          offset: params.pagination.pageIndex * params.pagination.pageSize,
          search: params.searchTerm.trim() || undefined
        }

        applyBasicFilters(vars, params.selectedFilters)
        applyDateFilter(vars, params.selectedFilters)

        if (params.sorting.length > 0) {
          vars.orderBy = [
            {
              field: params.mapColumnToGraphQLField(params.sorting[0].id) as any,
              direction: params.sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'
            }
          ]
        } else {
          vars.orderBy = [{ field: 'createdAt' as any, direction: 'DESC_NULLS_LAST' }]
        }

        return vars
      },

      flowContexts: {
        entityContext: FlowContextName.investmentAccountEntity,
        createContext: FlowContextName.investmentAccountCreate
      },

      renderStatistics: ({ context: ctx }) => {
        return <AccountStatistics {...ctx} />
      },

      processCompletionEvents: [
        'com.newwork.process.taskCompletion',
        'com.newwork.process.completion',
        'com.newwork.process.continue',
        'com.newwork.process.processCompletion',
        'processCompletion',
        'accountCompletion',
        'accountCompleted'
      ]
    }),
    [context, fetchInvestmentAccounts]
  )

  return <AccountLayout context={context} config={config} dataTestId="investment-account-view" />
}

export default AccountView
