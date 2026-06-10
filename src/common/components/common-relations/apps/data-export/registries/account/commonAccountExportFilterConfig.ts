import {
  accountCategoryExportFilterGroup,
  accountCommunicationExportFilterGroup,
  accountStatusExportFilterGroup,
  buildExportFilterConfig,
  createDateRangeGroup,
  createEntityMultiSelectGroup
} from '../../utils/filterConfigBuilders'

/** Common account export filters aligned with commonAccountFilterConfig. */
export const commonAccountExportFilterConfig = buildExportFilterConfig(
  'account-export-filters',
  'Account Export Filters',
  [
    createEntityMultiSelectGroup(
      'owner-group',
      'filter-owner',
      'ownerEmployeeIds',
      'filter-owner',
      'filter-search-owners',
      true
    ),
    createEntityMultiSelectGroup(
      'industry-group',
      'filter-industry',
      'industryClassIds',
      'filter-industry',
      'filter-search-industries'
    ),
    createEntityMultiSelectGroup(
      'legal-form-group',
      'filter-legal-form',
      'legalFormIds',
      'filter-legal-form',
      'filter-search-legal-forms'
    ),
    createEntityMultiSelectGroup(
      'company-size-group',
      'filter-company-size',
      'companySizeIds',
      'filter-company-size',
      'filter-search-company-sizes'
    ),
    createEntityMultiSelectGroup(
      'revenue-group',
      'filter-revenue-band',
      'accountAnnualRevenueBandIds',
      'filter-revenue-band',
      'filter-search-revenue-bands'
    ),
    createEntityMultiSelectGroup(
      'priority-group',
      'filter-priority',
      'accountPriorityIds',
      'filter-priority',
      'filter-search-priorities'
    ),
    accountCategoryExportFilterGroup,
    accountStatusExportFilterGroup,
    createEntityMultiSelectGroup(
      'country-group',
      'filter-country',
      'countryIds',
      'filter-country',
      'filter-search-countries'
    ),
    accountCommunicationExportFilterGroup,
    createDateRangeGroup('created-date-group', 'filter-created-date', 'createdAtRange', 'filter-created-date', true),
    createDateRangeGroup('updated-date-group', 'filter-updated-date', 'updatedAtRange', 'filter-updated-date')
  ]
)
