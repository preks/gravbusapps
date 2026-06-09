import type { InvestmentContact } from '@/common/data/investment/types/investmentContactTypes'
import { INVESTMENT_CONTACT_DESCRIPTORS } from '@/common/data/investment/types/investmentContactTypes'
import type { InvestmentContactQueryVariables } from '@/common/data/investment/queries/investmentContactQueries'
import type {
  EntityExportDefinition,
  ExportQueryParams
} from '@/common/components/common-relations/apps/data-export/types/configTypes'
import { buildIrmContactExportFields } from '@/common/components/common-relations/apps/data-export/registries/contact/irmContactExportFields'
import { IRM_CONTACT_EXPORT_FILTER_DESCRIPTORS } from '@/common/components/common-relations/apps/data-export/registries/contact/irmContactExportFilterDescriptors'
import { irmContactExportFilterConfig } from '@/common/components/common-relations/apps/data-export/registries/contact/irmContactExportFilterConfig'
import { buildContactQueryVariables } from '@/common/components/common-relations/view-layouts/contact-layout/utils/buildContactQueryVariables'

export function createIrmContactExportDefinition(
  fetchInvestmentContacts: (
    vars: InvestmentContactQueryVariables
  ) => Promise<{ contacts?: InvestmentContact[]; total?: number }>
): EntityExportDefinition<InvestmentContact, InvestmentContactQueryVariables> {
  return {
    entityType: 'contact',
    entityLabel: 'contacts',
    sheetName: 'Contacts',
    filenamePrefix: 'irm-contacts-export',
    graphqlEntityName: 'InvestmentContact',
    descriptors: INVESTMENT_CONTACT_DESCRIPTORS,
    filterDescriptors: IRM_CONTACT_EXPORT_FILTER_DESCRIPTORS,
    baseFilterConfig: irmContactExportFilterConfig,
    exportFields: buildIrmContactExportFields(),
    buildQueryVariables: ({ selectedFilters, limit = 50, offset = 0 }: ExportQueryParams) => {
      const pageSize = limit
      const pageIndex = pageSize > 0 ? Math.floor(offset / pageSize) : 0

      return buildContactQueryVariables<InvestmentContactQueryVariables>({
        selectedFilters,
        pagination: { pageIndex, pageSize },
        sorting: [{ id: 'createdAt', desc: true }]
      })
    },
    fetchPage: async vars => {
      const result = await fetchInvestmentContacts(vars)
      return {
        items: result.contacts ?? [],
        total: result.total ?? 0
      }
    }
  }
}
