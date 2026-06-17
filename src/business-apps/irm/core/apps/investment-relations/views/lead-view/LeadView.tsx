import { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { LeadLayout, type LeadViewConfig } from '@/common/components/common-relations/view-layouts/lead-layout'
import { useViewPreferencesStorage } from '@/common/hooks/useViewPreferencesStorage'
import { type InvestmentLead, INVESTMENT_LEAD_DESCRIPTORS } from '@/common/data/investment/types/investmentLeadTypes'
import {
  commonLeadColumns,
  commonLeadFilterConfig
} from '@/common/components/common-relations/view-layouts/lead-layout/config'
import { useInvestmentLeads } from '@/common/data/investment/hooks/useInvestmentLeads'
import type { InvestmentLeadQueryVariables } from '@/common/data/investment/queries/investmentLeadQueries'
import { buildLeadQueryVariables } from '@/common/components/common-relations/view-layouts/lead-layout/utils/buildLeadQueryVariables'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useInvestmentLeadStatistics } from '@/common/data/investment/hooks/useInvestmentLeadStatistics'

export type LeadViewProps = BusinessAppContextProps

export const LeadView: React.FC<LeadViewProps> = context => {
  const { initialFilters, saveFilters, initialSorting, saveSorting, initialVisibleColumns, saveVisibleColumns } =
    useViewPreferencesStorage('irm:investment-lead-preferences:v1')

  const { fetchInvestmentLeads } = useInvestmentLeads(context)
  const leadStatistics = useInvestmentLeadStatistics(context)

  const config: LeadViewConfig<InvestmentLead, InvestmentLeadQueryVariables> = useMemo(
    () => ({
      fetchLeads: fetchInvestmentLeads,
      createColumns: () => commonLeadColumns() as any,
      descriptors: INVESTMENT_LEAD_DESCRIPTORS,
      entityName: 'InvestmentLead',
      columnLabels: {
        lead: 'Lead',
        firstName: 'First Name',
        lastName: 'Last Name',
        address: 'Location',
        leadStatus: 'Status',
        leadRating: 'Rating',
        leadSource: 'Source',
        industryClass: 'Industry',
        ownerEmployee: 'Owner',
        createdAt: 'Created Date',
        updatedAt: 'Updated Date'
      },
      baseFilterConfig: commonLeadFilterConfig,
      buildQueryVariables: params =>
        buildLeadQueryVariables<InvestmentLeadQueryVariables>({
          pagination: params.pagination,
          searchTerm: params.searchTerm,
          selectedFilters: params.selectedFilters,
          sorting: params.sorting,
          visibleColumns: params.visibleColumns
        }),
      flowContexts: {
        entityContext: FlowContextName.investmentLeadEntity,
        createContext: FlowContextName.investmentLeadCreate
      },
      buildRecordUrl: (id: string) => buildPlatformUrl('/platform/irm/lead-record', { leadId: id }),
      rowActionsContextArray: [FlowContextName.investmentLeadEntity],
      buildRowActionsExternalContextData: (row: { original: InvestmentLead }) => ({
        leadId: row.original.id
      }),
      translations: {
        allLeads: { key: 'common:allLeads', default: 'All Leads' },
        searchLeads: { key: 'common:searchLeads', default: 'Search leads...' },
        filterLeads: { key: 'common:filterLeads', default: 'Filter Leads' },
        filterLeadsDescription: {
          key: 'common:filterLeadsDescription',
          default: 'Apply filters to narrow down the lead list'
        },
        addLead: { key: 'irm:lead.addLead', default: 'Add Lead' }
      }
    }),
    [fetchInvestmentLeads]
  )

  return (
    <LeadLayout
      context={context}
      config={config}
      leadStatistics={leadStatistics}
      dataTestId="investment-lead-view"
      enableExport
      exportFilenamePrefix="leads"
      initialFilters={initialFilters}
      onFilterChange={saveFilters}
      initialSorting={initialSorting ?? undefined}
      onSortingChange={saveSorting}
      initialVisibleColumns={initialVisibleColumns ?? undefined}
      onVisibleColumnsChange={saveVisibleColumns}
    />
  )
}

export default LeadView
