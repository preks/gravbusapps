import React from 'react'
import { Button, type FilterConfiguration } from '@newwork/nw-design-system'
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'

/**
 * Default row actions component for opportunity rows
 */
export const DefaultOpportunityRowActions = <TOpportunity extends { id: string }>({
  row,
  accessToken,
  entityContext
}: {
  row: { original: TOpportunity }
  accessToken: string
  entityContext: FlowContextName
}) => (
  <AppActionMenu
    contextsArray={[entityContext]}
    externalContextData={{ opportunityId: row.original.id }}
    prefixDataTestId="opportunity-actions"
    accessToken={accessToken}
    emptyStateBehavior="enable"
    deferMainContextRequestsUntilClick
  >
    <Button variant="ghost" size="icon" data-testid={`opportunity-actions-${row.original.id}`}>
      <svg className="gba:h-4 gba:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
        />
      </svg>
    </Button>
  </AppActionMenu>
)

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
