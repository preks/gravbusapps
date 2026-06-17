import { useMemo, useState } from 'react'
import { AiButton, Button, useTranslation } from '@newwork/nw-design-system'
import { Plus } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { LeadLayout, type LeadViewConfig } from '@/common/components/common-relations/view-layouts/lead-layout'
import { useViewPreferencesStorage } from '@/common/hooks/useViewPreferencesStorage'
import { type CustomerLead, CUSTOMER_LEAD_DESCRIPTORS } from '@/common/data/customer/types/customerLeadTypes'
import {
  commonLeadColumns,
  commonLeadFilterConfig
} from '@/common/components/common-relations/view-layouts/lead-layout/config'
import { useCustomerLeads } from '@/common/data/customer/hooks/useCustomerLeads'
import type { CustomerLeadQueryVariables } from '@/common/data/customer/queries/customerLeadQueries'
import { buildLeadQueryVariables } from '@/common/components/common-relations/view-layouts/lead-layout/utils/buildLeadQueryVariables'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useCustomerLeadStatistics } from '@/common/data/customer/hooks/useCustomerLeadStatistics'
import { AppAction } from '@/components/app-action/AppAction'
import icpScoringI18n from '@/common/components/icp-scoring/_i18n'
import { IcpScoringSelectionDialog } from '@/business-apps/crm/core/features/icp-scoring'
import { insertCustomerLeadColumnsAfter } from '@/common/components/customer/view-layouts/lead-layout/config/leadColumns'

export type LeadViewProps = BusinessAppContextProps

export const LeadView: React.FC<LeadViewProps> = context => {
  const { accessToken } = context
  const { t } = useTranslation(icpScoringI18n)
  const { initialFilters, saveFilters, initialSorting, saveSorting, initialVisibleColumns, saveVisibleColumns } =
    useViewPreferencesStorage('crm:customer-lead-preferences:v1')
  const [isBulkScoringOpen, setIsBulkScoringOpen] = useState(false)
  const [scoreRefreshKey, setScoreRefreshKey] = useState(0)

  const { fetchCustomerLeads } = useCustomerLeads(context)
  const leadStatistics = useCustomerLeadStatistics(context)

  const config: LeadViewConfig<CustomerLead, CustomerLeadQueryVariables> = useMemo(
    () => ({
      fetchLeads: fetchCustomerLeads,
      createColumns: () => insertCustomerLeadColumnsAfter(commonLeadColumns() as ColumnDef<CustomerLead>[], 'lead'),
      descriptors: CUSTOMER_LEAD_DESCRIPTORS,
      entityName: 'Lead',
      columnLabels: {
        lead: 'Lead',
        firstName: 'First Name',
        lastName: 'Last Name',
        address: 'Location',
        leadStatus: 'Status',
        leadRating: 'Rating',
        leadSource: 'Source',
        aiLeadScore: 'Lead Score',
        aiLeadGrade: 'Lead Grade',
        industryClass: 'Industry',
        ownerEmployee: 'Owner',
        createdAt: 'Created Date',
        updatedAt: 'Updated Date'
      },
      baseFilterConfig: commonLeadFilterConfig,
      buildQueryVariables: params =>
        buildLeadQueryVariables<CustomerLeadQueryVariables>(
          {
            pagination: params.pagination,
            searchTerm: params.searchTerm,
            selectedFilters: params.selectedFilters,
            sorting: params.sorting,
            visibleColumns: params.visibleColumns
          },
          { nonSortableColumns: ['communicationChannels', 'location'] }
        ),
      flowContexts: {
        entityContext: FlowContextName.customerLeadEntity,
        createContext: FlowContextName.customerLeadCreate
      },
      buildRecordUrl: (id: string) => buildPlatformUrl('/platform/crm/lead-record', { leadId: id }),
      rowActionsContextArray: [FlowContextName.customerLeadEntity],
      buildRowActionsExternalContextData: (row: { original: CustomerLead }) => ({
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
        addLead: { key: 'crm:lead.addLead', default: 'Add Lead' }
      }
    }),
    [fetchCustomerLeads, accessToken, t]
  )

  const handleBulkScored = () => {
    setScoreRefreshKey(previous => previous + 1)
  }

  return (
    <>
      <LeadLayout
        key={scoreRefreshKey}
        context={context}
        config={config}
        leadStatistics={leadStatistics}
        dataTestId="customer-lead-view"
        enableExport
        exportFilenamePrefix="leads"
        initialFilters={initialFilters}
        onFilterChange={saveFilters}
        initialSorting={initialSorting ?? undefined}
        onSortingChange={saveSorting}
        initialVisibleColumns={initialVisibleColumns ?? undefined}
        onVisibleColumnsChange={saveVisibleColumns}
        customPrimaryAction={
          <div className="gba:flex gba:flex-wrap gba:gap-2">
            <AppAction
              contextsArray={[FlowContextName.customerLeadCreate]}
              accessToken={accessToken}
              data-testid="add-lead-action"
              emptyStateBehavior="hide"
            >
              <Button size="sm" variant="default" data-testid="add-lead-button" type="button">
                <Plus size={16} />
                {getTranslationFromI18nKeyAndLabel(
                  config.translations.addLead.key,
                  config.translations.addLead.default
                )}
              </Button>
            </AppAction>
            <AiButton
              size="sm"
              type="button"
              onClick={() => setIsBulkScoringOpen(true)}
              data-testid="customer-lead-view-open-bulk-scoring"
            >
              {t('icp-scoring-title')}
            </AiButton>
          </div>
        }
      />

      <IcpScoringSelectionDialog
        entityType="lead"
        open={isBulkScoringOpen}
        onOpenChange={setIsBulkScoringOpen}
        accessToken={accessToken}
        onScored={handleBulkScored}
      />
    </>
  )
}

export default LeadView
