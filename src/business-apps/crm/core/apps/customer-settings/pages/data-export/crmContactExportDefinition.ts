import type { CustomerContact } from '@/common/data/customer/types/customerContactTypes'
import { CUSTOMER_CONTACT_DESCRIPTORS } from '@/common/data/customer/types/customerContactTypes'
import type { CustomerContactQueryVariables } from '@/common/data/customer/queries/customerContactQueries'
import type {
  EntityExportDefinition,
  ExportQueryParams
} from '@/common/components/common-relations/apps/data-export/types/configTypes'
import { buildCrmContactExportFields } from '@/common/components/common-relations/apps/data-export/registries/contact/crmContactExportFields'
import { CRM_CONTACT_EXPORT_FILTER_DESCRIPTORS } from '@/common/components/common-relations/apps/data-export/registries/contact/crmContactExportFilterDescriptors'
import { crmContactExportFilterConfig } from '@/common/components/common-relations/apps/data-export/registries/contact/crmContactExportFilterConfig'
import { buildContactQueryVariables } from '@/common/components/common-relations/view-layouts/contact-layout/utils/buildContactQueryVariables'

export function createCrmContactExportDefinition(
  fetchCustomerContacts: (
    vars: CustomerContactQueryVariables
  ) => Promise<{ contacts?: CustomerContact[]; total?: number }>
): EntityExportDefinition<CustomerContact, CustomerContactQueryVariables> {
  return {
    entityType: 'contact',
    entityLabel: 'contacts',
    sheetName: 'Contacts',
    filenamePrefix: 'crm-contacts-export',
    graphqlEntityName: 'Contact',
    descriptors: CUSTOMER_CONTACT_DESCRIPTORS,
    filterDescriptors: CRM_CONTACT_EXPORT_FILTER_DESCRIPTORS,
    baseFilterConfig: crmContactExportFilterConfig,
    exportFields: buildCrmContactExportFields(),
    buildQueryVariables: ({ selectedFilters, limit = 50, offset = 0 }: ExportQueryParams) => {
      const pageSize = limit
      const pageIndex = pageSize > 0 ? Math.floor(offset / pageSize) : 0

      return buildContactQueryVariables<CustomerContactQueryVariables>({
        selectedFilters,
        pagination: { pageIndex, pageSize },
        sorting: [{ id: 'createdAt', desc: true }]
      })
    },
    fetchPage: async vars => {
      const result = await fetchCustomerContacts(vars)
      return {
        items: result.contacts ?? [],
        total: result.total ?? 0
      }
    }
  }
}
