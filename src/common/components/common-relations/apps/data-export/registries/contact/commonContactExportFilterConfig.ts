import {
  buildExportFilterConfig,
  contactInfoExportFilterGroup,
  createDateRangeGroup,
  createEntityMultiSelectGroup
} from '../../utils/filterConfigBuilders'

/**
 * Common contact export filters — savable form fields and list-aligned filters.
 * Catalog/entity filters load options via descriptors + useFilterGroups.
 */
export const commonContactExportFilterConfig = buildExportFilterConfig(
  'contact-export-filters',
  'Contact Export Filters',
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
      'department-group',
      'filter-department',
      'departmentIds',
      'filter-department',
      'filter-search-departments'
    ),
    createEntityMultiSelectGroup(
      'job-position-group',
      'filter-job-position',
      'jobPositions',
      'filter-job-position',
      'filter-search-job-positions'
    ),
    createEntityMultiSelectGroup(
      'academic-title-group',
      'filter-academic-title',
      'academicTitleIds',
      'filter-academic-title',
      'filter-search-academic-titles'
    ),
    createEntityMultiSelectGroup(
      'salutation-group',
      'filter-salutation',
      'salutationIds',
      'filter-salutation',
      'filter-search-salutations'
    ),
    createEntityMultiSelectGroup(
      'language-group',
      'filter-language',
      'languageIds',
      'filter-language',
      'filter-search-languages'
    ),
    contactInfoExportFilterGroup,
    createDateRangeGroup('created-date-group', 'filter-created-date', 'createdAtRange', 'filter-created-date', true),
    createDateRangeGroup('updated-date-group', 'filter-updated-date', 'updatedAtRange', 'filter-updated-date')
  ]
)
