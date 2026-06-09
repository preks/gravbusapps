import {
  buildExportFilterConfig,
  createDateRangeGroup,
  createEntityMultiSelectGroup,
  sensitiveExportFilterGroup
} from '../../utils/filterConfigBuilders'

/**
 * Common lead export filters — savable form fields only.
 * Catalog/entity filters load options via descriptors + useFilterGroups.
 * Excludes salutation (not on lead form).
 */
export const commonLeadExportFilterConfig = buildExportFilterConfig('lead-export-filters', 'Lead Export Filters', [
  createEntityMultiSelectGroup(
    'owner-group',
    'filter-owner',
    'ownerEmployeeIds',
    'filter-owner',
    'filter-search-owners',
    true
  ),
  createEntityMultiSelectGroup(
    'status-group',
    'filter-status',
    'leadStatusIds',
    'filter-status',
    'filter-search-status',
    true
  ),
  createEntityMultiSelectGroup(
    'rating-group',
    'filter-rating',
    'leadRatingIds',
    'filter-rating',
    'filter-search-rating'
  ),
  createEntityMultiSelectGroup(
    'source-group',
    'filter-source',
    'leadSourceIds',
    'filter-source',
    'filter-search-source'
  ),
  createEntityMultiSelectGroup(
    'industry-group',
    'filter-industry',
    'industryClassIds',
    'filter-industry',
    'filter-search-industry'
  ),
  sensitiveExportFilterGroup,
  createDateRangeGroup('created-date-group', 'filter-created-date', 'createdAtRange', 'filter-created-date', true),
  createDateRangeGroup('updated-date-group', 'filter-updated-date', 'updatedAtRange', 'filter-updated-date')
])
