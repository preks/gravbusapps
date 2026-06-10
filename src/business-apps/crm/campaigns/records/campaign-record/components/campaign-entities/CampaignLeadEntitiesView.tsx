import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { LeadLayout, type LeadViewConfig } from '@/common/components/common-relations/view-layouts/lead-layout'
import {
  commonLeadColumns,
  commonLeadFilterConfig
} from '@/common/components/common-relations/view-layouts/lead-layout/config'
import type { CustomerLead } from '@/common/data/customer/types/customerLeadTypes'
import { CUSTOMER_LEAD_DESCRIPTORS, toCustomerLead } from '@/common/data/customer/types/customerLeadTypes'
import {
  buildCustomerLeadOrderBy,
  buildCustomerLeadQuery,
  buildCustomerLeadWhereCondition,
  type CustomerLeadQueryVariables
} from '@/common/data/customer/queries/customerLeadQueries'

interface CampaignLeadEntitiesViewProps extends BusinessAppContextProps {
  campaignId: string
}

const processDateRangeFilters = (selectedFilters: Record<string, any>, vars: CustomerLeadQueryVariables): void => {
  const dateRangeKeys = ['createdAtRange', 'updatedAtRange']
  for (const rangeKey of dateRangeKeys) {
    const normalized = normalizeDateRange(selectedFilters[rangeKey])
    if (!normalized) continue
    const baseKey = rangeKey.replace('Range', '')
    if (normalized.from) vars[`${baseKey}From` as keyof CustomerLeadQueryVariables] = normalized.from
    if (normalized.to) vars[`${baseKey}To` as keyof CustomerLeadQueryVariables] = normalized.to
  }
}

const processSensitiveFilter = (selectedFilters: Record<string, any>, vars: CustomerLeadQueryVariables): void => {
  if (!Array.isArray(selectedFilters.sensitive) || selectedFilters.sensitive.length === 0) return
  const sensitiveValue = selectedFilters.sensitive[0]
  if (sensitiveValue === 'true') vars.sensitive = true
  if (sensitiveValue === 'false') vars.sensitive = false
}

const processSorting = (sorting: Array<{ id: string; desc: boolean }>, vars: CustomerLeadQueryVariables): void => {
  if (sorting.length === 0) {
    vars.orderBy = [{ field: 'createdAt' as any, direction: 'DESC_NULLS_LAST' }]
    return
  }
  const columnId = sorting[0].id
  const direction = sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'
  if (columnId === 'lead') {
    vars.orderBy = [
      { field: 'firstName', direction },
      { field: 'lastName', direction }
    ]
    return
  }
  vars.orderBy = [{ field: columnId as any, direction }]
}

export const CampaignLeadEntitiesView: React.FC<CampaignLeadEntitiesViewProps> = ({ accessToken, campaignId }) => {
  const context = useMemo(() => ({ accessToken }), [accessToken])
  const graphqlClient = useGraphQLClient(accessToken)

  const config = useMemo<LeadViewConfig<CustomerLead, CustomerLeadQueryVariables>>(
    () => ({
      fetchLeads: async (variables: CustomerLeadQueryVariables) => {
        const query = buildCustomerLeadQuery()
        const whereCondition = buildCustomerLeadWhereCondition(
          variables,
          [],
          [{ salesCampaignId: { _eq: campaignId } }]
        )
        const orderBy = buildCustomerLeadOrderBy(variables.orderBy || [])
        const result = await graphqlClient.request<{
          Lead: CustomerLead[]
          LeadAggregate: { aggregate: { count: number } }
        }>(query, {
          limit: variables.limit || 50,
          offset: variables.offset || 0,
          where: whereCondition,
          orderBy
        })

        return {
          leads: result.Lead.map(toCustomerLead),
          total: result.LeadAggregate?.aggregate?.count || 0
        }
      },
      createColumns: () => commonLeadColumns() as ColumnDef<CustomerLead>[],
      descriptors: CUSTOMER_LEAD_DESCRIPTORS,
      entityName: 'Lead',
      columnLabels: {
        lead: 'Lead',
        leadStatus: 'Status',
        ownerEmployee: 'Owner',
        createdAt: 'Created Date'
      },
      baseFilterConfig: commonLeadFilterConfig,
      buildQueryVariables: ({ pagination, searchTerm, selectedFilters, sorting }) => {
        const vars: CustomerLeadQueryVariables = {
          limit: pagination.pageSize,
          offset: pagination.pageIndex * pagination.pageSize,
          search: searchTerm.trim() || undefined
        }
        processDateRangeFilters(selectedFilters, vars)
        processSensitiveFilter(selectedFilters, vars)

        for (const key of Object.keys(selectedFilters)) {
          if (['createdAtRange', 'updatedAtRange', 'sensitive'].includes(key)) continue
          if (selectedFilters[key] === undefined || selectedFilters[key] === null) continue
          vars[key as keyof CustomerLeadQueryVariables] = selectedFilters[key]
        }

        processSorting(sorting, vars)
        return vars
      },
      flowContexts: {
        entityContext: FlowContextName.customerLeadEntity,
        createContext: FlowContextName.customerLeadCreate
      },
      buildRecordUrl: (id: string) => buildPlatformUrl('/platform/crm/lead-record', { leadId: id }),
      rowActionsContextArray: [FlowContextName.customerLeadEntity],
      buildRowActionsExternalContextData: (row: { original: CustomerLead }) => ({ leadId: row.original.id }),
      translations: {
        allLeads: { key: 'common:allLeads', default: 'All Leads' },
        searchLeads: { key: 'common:searchLeads', default: 'Search leads...' },
        filterLeads: { key: 'common:filterLeads', default: 'Filter Leads' },
        filterLeadsDescription: {
          key: 'common:filterLeadsDescription',
          default: 'Apply filters to narrow down the lead list'
        },
        addLead: { key: 'crm:lead.addLead', default: 'Add Lead' }
      }
    }),
    [campaignId, graphqlClient]
  )

  return (
    <LeadLayout
      context={context}
      config={config}
      customPrimaryAction={<></>}
      dataTestId="campaign-record-lead-view"
      enableExport
      exportFilenamePrefix="campaign-leads"
    />
  )
}
