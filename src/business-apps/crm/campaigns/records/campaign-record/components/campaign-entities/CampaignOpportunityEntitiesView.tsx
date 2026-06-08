import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { CustomerOpportunity } from '@/common/data/customer/types/customerOpportunityTypes'
import type { CustomerOpportunityQueryVariables } from '@/common/data/customer/queries/customerOpportunityQueries'
import { OpportunityLayout } from '@/common/components/common-relations/view-layouts/opportunity-layout'
import { createOpportunityConfig } from '@/common/components/common-relations/view-layouts/opportunity-layout/utils/opportunityConfigBuilder'
import { createOpportunityColumns } from '@/common/components/common-relations/view-layouts/opportunity-layout/config/opportunityColumns'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useCustomerOpportunitiesList } from '@/common/data/customer/hooks/useCustomerOpportunities'
import { useCustomerOpportunityFilters } from '@/business-apps/crm/core/apps/customer-relations/views/opportunity-view/hooks/useCustomerOpportunityFilters'
import { CUSTOMER_OPPORTUNITY_DESCRIPTORS } from '@/common/data/customer/types/customerOpportunityTypes'
import {
  insertCustomerColumnsAfter,
  CUSTOMER_OPPORTUNITY_EXTENDED_COLUMN_IDS,
  CUSTOMER_OPPORTUNITY_SORTABLE_COLUMNS
} from '@/common/components/customer/view-layouts/opportunity-layout/config/opportunityColumns'

interface CampaignOpportunityEntitiesViewProps extends BusinessAppContextProps {
  campaignId: string
}

export const CampaignOpportunityEntitiesView: React.FC<CampaignOpportunityEntitiesViewProps> = ({
  accessToken,
  campaignId
}) => {
  const context = useMemo(() => ({ accessToken }), [accessToken])
  const { fetchCustomerOpportunities } = useCustomerOpportunitiesList(context)

  const config = useMemo(() => {
    const baseConfig = createOpportunityConfig<CustomerOpportunity, CustomerOpportunityQueryVariables>({
      contextType: 'customer',
      extendQueryVariables: vars => ({ ...vars, salesCampaignIds: [campaignId] }),
      fetchOpportunities: async variables => fetchCustomerOpportunities(variables),
      filterDataHook: useCustomerOpportunityFilters,
      viewDescriptors: CUSTOMER_OPPORTUNITY_DESCRIPTORS,
      columnMappings: {
        pipeline: 'salesPipeline',
        stage: 'salesPipelineStage'
      },
      flowContexts: {
        entity: FlowContextName.customerOpportunityEntity,
        create: FlowContextName.customerOpportunityCreate
      },
      urlPaths: {
        opportunityRecord: '/platform/crm/opportunity-record',
        accountRecord: '/platform/crm/account-record',
        source: 'customer-relations'
      },
      boardConfig: {
        pipelineCatalog: 'SalesPipeline',
        pipelineStageCatalog: 'SalesPipelineStage',
        opportunityType: 'CustomerOpportunity',
        processName: 'transitionOpportunity',
        processDomain: 'customer-relations'
      },
      fetchBoardOpportunities: fetchCustomerOpportunities,
      extractBoardOpportunities: result => result.opportunities || [],
      extractBoardTotalCount: result => result.total || 0,
      rowActionsContextArray: [FlowContextName.customerOpportunityEntity],
      buildRowActionsExternalContextData: (row: { original: CustomerOpportunity }) => ({
        opportunityId: row.original.id
      })
    })

    return {
      ...baseConfig,
      createColumns: () => {
        const baseColumns = createOpportunityColumns() as ColumnDef<CustomerOpportunity>[]
        return insertCustomerColumnsAfter(baseColumns, 'amount')
      },
      createSortableColumns: (availableColumnIds?: string[]) => {
        const baseSortable = baseConfig.createSortableColumns(availableColumnIds)
        const additionalSortable = CUSTOMER_OPPORTUNITY_SORTABLE_COLUMNS.filter(
          col => !availableColumnIds || availableColumnIds.includes(col.id)
        )
        return [...baseSortable, ...additionalSortable]
      }
    } as typeof baseConfig
  }, [campaignId, fetchCustomerOpportunities])

  return (
    <OpportunityLayout
      context={context}
      config={config}
      customPrimaryAction={<></>}
      dataTestId="campaign-record-opportunity-view"
      extendVisibleColumns={CUSTOMER_OPPORTUNITY_EXTENDED_COLUMN_IDS}
      enableExport
      exportFilenamePrefix="campaign-opportunities"
      hideBoard
    />
  )
}
