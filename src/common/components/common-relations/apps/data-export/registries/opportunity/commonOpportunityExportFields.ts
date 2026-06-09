import type { Opportunity } from '@/common/data/relations/types/opportunityTypes'
import type { ExportFieldDefinition } from '../../types/exportFieldTypes'
import {
  formatExportCatalog,
  formatExportDateValue,
  formatExportPercentage,
  formatExportText,
  formatOpportunityAmount,
  formatOpportunityLinkedAccounts,
  formatOpportunityLinkedContacts,
  formatOwnerEmployee,
  getOpportunityPipelineLabel,
  getOpportunityStageLabel
} from '../../utils/exportFormatHelpers'
import { buildOwnerEmployeeIdExportField, buildRecordIdExportField } from '../../utils/exportExternalIdFieldBuilders'

/** Export fields derived from opportunity form segments. */
export function buildCommonOpportunityExportFields<T extends Opportunity = Opportunity>(): ExportFieldDefinition<T>[] {
  return [
    {
      key: 'name',
      label: 'Opportunity',
      formKeys: ['name'],
      defaultSelected: true,
      format: opportunity => formatExportText(opportunity.name)
    },
    {
      key: 'ownerEmployee',
      label: 'Owner',
      formKeys: ['ownerEmployeeId'],
      defaultSelected: true,
      format: opportunity => formatOwnerEmployee(opportunity.ownerEmployee)
    },
    {
      key: 'linkedAccounts',
      label: 'Linked Accounts',
      formKeys: ['opportunityAccounts', 'accountId'],
      defaultSelected: false,
      format: opportunity => formatOpportunityLinkedAccounts(opportunity)
    },
    {
      key: 'opportunityStatus',
      label: 'Status',
      formKeys: ['opportunityStatusRef'],
      defaultSelected: true,
      format: opportunity => formatExportCatalog(opportunity.opportunityStatus)
    },
    {
      key: 'opportunityPipeline',
      label: 'Pipeline',
      formKeys: ['opportunityPipelineRef'],
      defaultSelected: true,
      format: opportunity => getOpportunityPipelineLabel(opportunity)
    },
    {
      key: 'opportunityPipelineStage',
      label: 'Stage',
      formKeys: ['opportunityPipelineStageRef'],
      defaultSelected: true,
      format: opportunity => getOpportunityStageLabel(opportunity)
    },
    {
      key: 'opportunityForecast',
      label: 'Forecast',
      formKeys: ['opportunityForecastRef'],
      defaultSelected: true,
      format: opportunity => formatExportCatalog(opportunity.opportunityForecast)
    },
    {
      key: 'estimatedAmount',
      label: 'Amount',
      formKeys: ['estimatedAmount'],
      defaultSelected: true,
      format: opportunity => formatOpportunityAmount(opportunity)
    },
    {
      key: 'currency',
      label: 'Currency',
      formKeys: ['currencyRef'],
      defaultSelected: false,
      format: opportunity => formatExportCatalog(opportunity.currency)
    },
    {
      key: 'winningChance',
      label: 'Win Chance (%)',
      formKeys: ['winningChance'],
      defaultSelected: true,
      format: opportunity => formatExportPercentage(opportunity.winningChance)
    },
    {
      key: 'closeDate',
      label: 'Close Date',
      formKeys: ['closeDate'],
      defaultSelected: true,
      isDateColumn: true,
      format: opportunity => formatExportDateValue(opportunity.closeDate)
    },
    {
      key: 'description',
      label: 'Description',
      formKeys: ['description'],
      defaultSelected: false,
      format: opportunity => formatExportText(opportunity.description)
    },
    {
      key: 'notesSummary',
      label: 'Notes Summary',
      formKeys: ['notesSummary'],
      defaultSelected: false,
      format: opportunity => formatExportText(opportunity.notesSummary)
    },
    {
      key: 'linkedContacts',
      label: 'Linked Contacts',
      formKeys: ['opportunityContacts'],
      defaultSelected: false,
      format: opportunity => formatOpportunityLinkedContacts(opportunity)
    },
    {
      key: 'createdAt',
      label: 'Created Date',
      formKeys: [],
      defaultSelected: true,
      isDateColumn: true,
      format: opportunity => formatExportDateValue(opportunity.createdAt)
    },
    {
      key: 'updatedAt',
      label: 'Updated Date',
      formKeys: [],
      defaultSelected: false,
      isDateColumn: true,
      format: opportunity => formatExportDateValue(opportunity.updatedAt)
    },
    buildRecordIdExportField<T>('Opportunity ID'),
    buildOwnerEmployeeIdExportField<T>()
  ]
}
