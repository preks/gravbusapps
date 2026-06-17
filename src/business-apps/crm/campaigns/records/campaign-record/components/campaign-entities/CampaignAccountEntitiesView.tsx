import { useMemo } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { Account } from '@/common/data/relations/types/accountTypes'
import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useCustomerAccountsList } from '@/common/data/customer/hooks/useCustomerAccounts'
import type { CustomerAccountQueryVariables } from '@/common/data/customer/queries/customerAccountQueries'
import { CUSTOMER_ACCOUNT_DESCRIPTORS } from '@/common/data/customer/types/customerAccountTypes'
import { AccountLayout, type AccountViewConfig } from '@/common/components/common-relations/view-layouts/account-layout'
import {
  commonAccountColumns,
  commonAccountFilterConfig,
  createProspectiveColumn
} from '@/common/components/common-relations/view-layouts/account-layout/config'
import type { FilterConfiguration } from '@newwork/nw-design-system'

interface CampaignAccountEntitiesViewProps extends BusinessAppContextProps {
  campaignId: string
}

const campaignAccountFilterConfig: FilterConfiguration = {
  ...commonAccountFilterConfig,
  groups: commonAccountFilterConfig.groups.filter(
    group => group.id !== 'status-group' && group.id !== 'contact-filters' && group.id !== 'account-type-group'
  )
}

const processDateRangeFilters = (selectedFilters: Record<string, any>, vars: CustomerAccountQueryVariables): void => {
  const dateRangeKeys = [
    'createdAtRange',
    'updatedAtRange',
    'foundationDateRange',
    'liquidationDateRange',
    'activeFromRange',
    'activeToRange'
  ]
  for (const rangeKey of dateRangeKeys) {
    const normalized = normalizeDateRange(selectedFilters[rangeKey])
    if (!normalized) continue
    const baseKey = rangeKey.replace('Range', '')
    if (normalized.from) vars[`${baseKey}From` as keyof CustomerAccountQueryVariables] = normalized.from
    if (normalized.to) vars[`${baseKey}To` as keyof CustomerAccountQueryVariables] = normalized.to
  }
}

export const CampaignAccountEntitiesView: React.FC<CampaignAccountEntitiesViewProps> = ({
  accessToken,
  campaignId
}) => {
  const context = useMemo(() => ({ accessToken }), [accessToken])
  const { fetchCustomerAccounts } = useCustomerAccountsList(context)

  const config = useMemo<AccountViewConfig<Account, CustomerAccountQueryVariables>>(
    () => ({
      fetchAccounts: fetchCustomerAccounts,
      entityName: 'Account',
      createColumns: () =>
        commonAccountColumns.map(col => (col.id === 'prospective' ? createProspectiveColumn('crm') : col)),
      descriptors: CUSTOMER_ACCOUNT_DESCRIPTORS,
      columnLabels: {
        name: 'Account Name',
        industryClass: 'Industry',
        ownerEmployee: 'Owner',
        createdAt: 'Created Date'
      },
      baseFilterConfig: campaignAccountFilterConfig,
      buildQueryVariables: ({ pagination, searchTerm, selectedFilters, sorting, visibleColumns }) => {
        const trimmedSearch = searchTerm.trim()
        const vars: CustomerAccountQueryVariables = {
          limit: pagination.pageSize,
          offset: pagination.pageIndex * pagination.pageSize,
          search: trimmedSearch || undefined,
          campaignIds: [campaignId]
        }

        // Scope free-text search to the visible table columns to keep the generated _or small.
        if (trimmedSearch && visibleColumns && visibleColumns.length > 0) {
          vars.searchDescriptorKeys = visibleColumns
        }

        processDateRangeFilters(selectedFilters, vars)

        for (const key of Object.keys(selectedFilters)) {
          if (key.endsWith('Range')) continue
          if (selectedFilters[key] === undefined || selectedFilters[key] === null) continue
          vars[key as keyof CustomerAccountQueryVariables] = selectedFilters[key]
        }

        if (sorting.length > 0) {
          vars.orderBy = [
            {
              field: sorting[0].id,
              direction: sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'
            }
          ]
        } else {
          vars.orderBy = [{ field: 'createdAt' as any, direction: 'DESC_NULLS_LAST' }]
        }

        return vars
      },
      flowContexts: {
        entityContext: FlowContextName.customerAccountEntity,
        createContext: FlowContextName.customerAccountCreate
      },
      buildRecordUrl: (id: string) => buildPlatformUrl('/platform/crm/account-record', { accountId: id }),
      variant: 'customer',
      rowActionsContextArray: [FlowContextName.customerAccountEntity],
      buildRowActionsExternalContextData: (row: { original: Account }) => ({ accountId: row.original.id || '' }),
      translations: {
        allAccounts: { key: 'common:allAccounts', default: 'All Accounts' },
        searchAccounts: { key: 'common:searchAccounts', default: 'Search accounts...' },
        filterAccounts: { key: 'common:filterAccounts', default: 'Filter Accounts' },
        filterAccountsDescription: {
          key: 'common:filterAccountsDescription',
          default: 'Apply filters to narrow down the account list'
        },
        addAccount: { key: 'crm:account.addAccount', default: 'Add Account' }
      }
    }),
    [campaignId, fetchCustomerAccounts]
  )

  return (
    <AccountLayout
      context={context}
      config={config}
      customPrimaryAction={<></>}
      dataTestId="campaign-record-account-view"
      enableExport
      exportFilenamePrefix="campaign-accounts"
    />
  )
}
