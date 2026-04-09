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
import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useInvestmentLeadStatistics } from '@/common/data/investment/hooks/useInvestmentLeadStatistics'

// Helper function to process date range filters
const processLeadDateRanges = (selectedFilters: Record<string, any>, vars: InvestmentLeadQueryVariables): void => {
  const dateRangeKeys = ['createdAtRange', 'updatedAtRange']
  for (const rangeKey of dateRangeKeys) {
    const normalized = normalizeDateRange(selectedFilters[rangeKey])
    if (normalized) {
      const baseKey = rangeKey.replace('Range', '')
      if (normalized.from) vars[`${baseKey}From` as keyof InvestmentLeadQueryVariables] = normalized.from
      if (normalized.to) vars[`${baseKey}To` as keyof InvestmentLeadQueryVariables] = normalized.to
    }
  }
}

// Helper function to process sensitive filter
const processSensitiveFilter = (selectedFilters: Record<string, any>, vars: InvestmentLeadQueryVariables): void => {
  if (selectedFilters.sensitive !== undefined && selectedFilters.sensitive !== null) {
    if (Array.isArray(selectedFilters.sensitive) && selectedFilters.sensitive.length > 0) {
      const sensitiveValue = selectedFilters.sensitive[0]
      if (sensitiveValue === 'true') {
        vars.sensitive = true
      } else if (sensitiveValue === 'false') {
        vars.sensitive = false
      }
    }
  }
}

// Helper function to copy other filters
const copyLeadFilters = (
  selectedFilters: Record<string, any>,
  dateRangeKeys: string[],
  vars: InvestmentLeadQueryVariables
): void => {
  for (const key of Object.keys(selectedFilters)) {
    if (
      !dateRangeKeys.includes(key) &&
      key !== 'sensitive' &&
      selectedFilters[key] !== undefined &&
      selectedFilters[key] !== null
    ) {
      vars[key as keyof InvestmentLeadQueryVariables] = selectedFilters[key]
    }
  }
}

export type LeadViewProps = BusinessAppContextProps

export const LeadView: React.FC<LeadViewProps> = context => {
  const { initialFilters, saveFilters, initialSorting, saveSorting, initialVisibleColumns, saveVisibleColumns } =
    useViewPreferencesStorage('irm:investment-lead-preferences:v1')

  // Data Hooks
  const { fetchInvestmentLeads } = useInvestmentLeads(context)
  const leadStatistics = useInvestmentLeadStatistics(context)

  // Config — leadStatistics is intentionally excluded so that statistics state
  // updates (isLoading, recentLeads, etc.) do not recreate config, which would
  // cascade into new queryVariables/loadData references and re-fire GetInvestmentLeads.
  // leadStatistics is passed as a separate prop to LeadLayout instead.
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
        status: 'Status',
        rating: 'Rating',
        source: 'Source',
        industry: 'Industry',
        ownerEmployee: 'Owner',
        createdAt: 'Created Date',
        updatedAt: 'Updated Date'
      },
      baseFilterConfig: commonLeadFilterConfig,
      buildQueryVariables: (params: {
        pagination: { pageIndex: number; pageSize: number }
        searchTerm: string
        selectedFilters: Record<string, any>
        sorting: Array<{ id: string; desc: boolean }>
      }) => {
        const vars: InvestmentLeadQueryVariables = {
          limit: params.pagination.pageSize,
          offset: params.pagination.pageIndex * params.pagination.pageSize,
          search: params.searchTerm.trim() || undefined
        }

        const dateRangeKeys = ['createdAtRange', 'updatedAtRange']

        processLeadDateRanges(params.selectedFilters, vars)
        processSensitiveFilter(params.selectedFilters, vars)
        copyLeadFilters(params.selectedFilters, dateRangeKeys, vars)

        if (params.sorting.length > 0) {
          const columnId = params.sorting[0].id
          const direction = params.sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'

          if (columnId === 'lead') {
            vars.orderBy = [
              { field: 'firstName', direction },
              { field: 'lastName', direction }
            ]
          } else {
            vars.orderBy = [{ field: columnId as any, direction }]
          }
        } else {
          vars.orderBy = [{ field: 'createdAt' as any, direction: 'DESC_NULLS_LAST' }]
        }

        return vars
      },
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
