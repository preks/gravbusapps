/**
 * Shared utility functions for Analytics View components
 * Used by both CRM and IRM analytics modules
 */

import { AnalyticsTabKey } from '../AnalyticsLayout'

export type TimeFilter = 'month' | 'quarter' | 'sixMonths' | 'year' | 'historical'

/**
 * Get initial analytics tab from URL parameters
 * @returns The analytics tab key from URL or default 'overview'
 */
export const getInitialAnalyticsTab = (): AnalyticsTabKey => {
  const urlParams = new URLSearchParams(globalThis.location.search)
  const tabFromUrl = urlParams.get('analyticsTab')
  const validTabs = ['overview', 'leads', 'accounts', 'opportunities', 'contacts']

  if (tabFromUrl && validTabs.includes(tabFromUrl)) {
    return tabFromUrl as AnalyticsTabKey
  }
  return 'overview'
}

/**
 * Update URL with analytics tab parameter
 * @param tab - The analytics tab key to set in URL
 */
export const updateAnalyticsTabUrl = (tab: AnalyticsTabKey): void => {
  const urlParams = new URLSearchParams(globalThis.location.search)
  urlParams.set('analyticsTab', tab)
  const newUrl = `${globalThis.location.pathname}?${urlParams.toString()}`
  globalThis.history.replaceState({}, '', newUrl)
}

/**
 * Initialize URL with analytics tab parameter if not present
 * @param currentTab - The current analytics tab
 */
export const initializeAnalyticsTabUrl = (currentTab: AnalyticsTabKey): void => {
  const urlParams = new URLSearchParams(globalThis.location.search)
  if (!urlParams.has('analyticsTab')) {
    updateAnalyticsTabUrl(currentTab)
  }
}
