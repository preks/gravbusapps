import type { CustomerAccount } from '@/common/data/customer/types/customerAccountTypes'
import { CUSTOMER_ACCOUNT_DESCRIPTORS } from '@/common/data/customer/types/customerAccountTypes'
import type { CustomerAccountQueryVariables } from '@/common/data/customer/queries/customerAccountQueries'
import type {
  EntityExportDefinition,
  ExportQueryParams
} from '@/common/components/common-relations/apps/data-export/types/configTypes'
import { buildCrmAccountExportFields } from '@/common/components/common-relations/apps/data-export/registries/account/crmAccountExportFields'
import { crmAccountExportFilterConfig } from '@/common/components/common-relations/apps/data-export/registries/account/crmAccountExportFilterConfig'
import { buildAccountQueryVariables } from '@/common/components/common-relations/view-layouts/account-layout/utils/buildAccountQueryVariables'

export function createCrmAccountExportDefinition(
  fetchCustomerAccounts: (
    vars: CustomerAccountQueryVariables
  ) => Promise<{ accounts?: CustomerAccount[]; total?: number }>
): EntityExportDefinition<CustomerAccount, CustomerAccountQueryVariables> {
  return {
    entityType: 'account',
    entityLabel: 'accounts',
    sheetName: 'Accounts',
    filenamePrefix: 'crm-accounts-export',
    graphqlEntityName: 'Account',
    descriptors: CUSTOMER_ACCOUNT_DESCRIPTORS,
    baseFilterConfig: crmAccountExportFilterConfig,
    exportFields: buildCrmAccountExportFields(),
    buildQueryVariables: ({ selectedFilters, limit = 50, offset = 0 }: ExportQueryParams) => {
      const pageSize = limit
      const pageIndex = pageSize > 0 ? Math.floor(offset / pageSize) : 0

      return buildAccountQueryVariables<CustomerAccountQueryVariables>({
        selectedFilters,
        pagination: { pageIndex, pageSize },
        sorting: [{ id: 'createdAt', desc: true }]
      })
    },
    fetchPage: async vars => {
      const result = await fetchCustomerAccounts(vars)
      return {
        items: result.accounts ?? [],
        total: result.total ?? 0
      }
    }
  }
}
