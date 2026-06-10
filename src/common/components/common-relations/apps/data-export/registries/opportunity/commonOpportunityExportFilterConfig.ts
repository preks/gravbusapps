import {
  buildExportFilterConfig,
  createDateRangeGroup,
  createEntityMultiSelectGroup,
  createNumberRangeGroup
} from '../../utils/filterConfigBuilders'

/** Common opportunity export filters aligned with opportunityFilterConfig. */
export const commonOpportunityExportFilterConfig = buildExportFilterConfig(
  'opportunity-export-filters',
  'Opportunity Export Filters',
  [
    createEntityMultiSelectGroup(
      'stage-group',
      'filter-stage',
      'opportunityPipelineStageIds',
      'filter-stage',
      'filter-search-stages',
      true
    ),
    createEntityMultiSelectGroup(
      'status-group',
      'filter-status',
      'opportunityStatusIds',
      'filter-status',
      'filter-search-status',
      true
    ),
    createEntityMultiSelectGroup(
      'forecast-group',
      'filter-forecast',
      'opportunityForecastIds',
      'filter-forecast',
      'filter-search-forecast'
    ),
    createEntityMultiSelectGroup(
      'pipeline-group',
      'filter-pipeline',
      'opportunityPipelineIds',
      'filter-pipeline',
      'filter-search-pipelines'
    ),
    createEntityMultiSelectGroup(
      'owner-group',
      'filter-owner',
      'ownerEmployeeIds',
      'filter-owner',
      'filter-search-owners'
    ),
    createEntityMultiSelectGroup(
      'account-group',
      'filter-account',
      'accountIds',
      'filter-account',
      'filter-search-accounts'
    ),
    createNumberRangeGroup('amount-group', 'filter-amount-range', 'amount', 'filter-amount-range'),
    createDateRangeGroup('close-date-group', 'filter-close-date', 'closeDateRange', 'filter-close-date'),
    createDateRangeGroup('created-date-group', 'filter-created-date', 'createdAtRange', 'filter-created-date'),
    createDateRangeGroup('updated-date-group', 'filter-updated-date', 'updatedAtRange', 'filter-updated-date')
  ]
)
