import type { FilterConfiguration } from '@newwork/nw-design-system'

/**
 * Helper to determine filters based on current section
 */
export const getFiltersForSection = (
  currentSection: 'list' | 'board',
  hideFilters: boolean,
  selectedFilters: Record<string, any>,
  boardFilters: Record<string, any>
): Record<string, any> | undefined => {
  if (currentSection === 'list' && !hideFilters) return selectedFilters
  if (currentSection === 'board') return boardFilters
  return undefined
}

/**
 * Helper to determine filter configuration based on current section
 */
export const getFilterConfigForSection = (
  currentSection: 'list' | 'board',
  hideFilters: boolean,
  dynamicFilterConfig: FilterConfiguration,
  boardFilterConfig: FilterConfiguration
): FilterConfiguration | undefined => {
  if (currentSection === 'list' && !hideFilters) return dynamicFilterConfig
  if (currentSection === 'board') return boardFilterConfig
  return undefined
}

/**
 * Helper to determine filter change handler based on current section
 */
export const getFilterChangeHandlerForSection = (
  currentSection: 'list' | 'board',
  hideFilters: boolean,
  handleFilterUpdate: (filters: Record<string, any>) => void,
  setBoardFilters: (filters: Record<string, any>) => void
): ((filters: Record<string, any>) => void) | undefined => {
  if (currentSection === 'list' && !hideFilters) return handleFilterUpdate
  if (currentSection === 'board') return setBoardFilters
  return undefined
}
