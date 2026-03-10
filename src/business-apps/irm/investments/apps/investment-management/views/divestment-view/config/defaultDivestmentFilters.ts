import type { FilterConfiguration } from '@newwork/nw-design-system'
import { opportunityFilterConfig } from '@/common/components/common-relations/view-layouts/opportunity-layout/config/opportunityFilters'

/**
 * Divestment opportunity filter configuration.
 * Extends the common opportunityFilterConfig by adding searchPlaceholder,
 * totalCount, and hasMore to multi-select filters for dynamic option loading.
 */
export const divestmentOpportunityFilterConfig: FilterConfiguration = {
  id: 'divestment-opportunity-filters',
  name: 'Divestment Opportunity Filters',
  groups: opportunityFilterConfig.groups.map(group => ({
    ...group,
    filters: group.filters.map(filter => {
      if (filter.type !== 'multi-select') return filter

      const label = filter.label || group.label || ''
      return {
        ...filter,
        config: {
          ...filter.config,
          searchPlaceholder: `Search ${label.toLowerCase()}...`,
          totalCount: 0,
          hasMore: false
        }
      }
    })
  }))
}
