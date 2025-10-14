import React, { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { Tabs, Badge } from 'antd'
import { DeskQueue } from './DeskQueue'
import { CompletedTickets } from './CompletedTickets'
import { useUserCapabilities } from '../hooks/useUserCapabilities'
import { useCompletedTickets } from '../hooks/useCompletedTickets'
import { useServiceDeskCatalogCache } from '../../../hooks/useServiceDeskCatalogCache'
import { useMultipleDeskCounts } from '../hooks/useMultipleDeskCounts'
import { getUserEmployeeId } from '../../../utils/userUtils'
import type { StepReceiver } from '../../../../packages/services-plus-core/src'

// Feature flag to enable/disable capability-based filtering
// When true: Only shows service desk tabs for which the user has matching capabilities
// When false: Shows all service desk tabs regardless of user capabilities
const ENABLE_CAPABILITY_FILTERING = false // Re-enabled after fixing GraphQL client issues

/**
 * Capability-Based Service Desk Access Control
 *
 * This component implements capability-based filtering for service desk tabs:
 *
 * 1. Fetches user capabilities from org chart using their employeeId
 * 2. Matches user capabilities with Service Desk Catalog entries
 * 3. Only shows tabs where user has the required capability
 *
 * Matching Logic:
 * - User capability name (e.g., "HR_Manager") must match catalog entry's additionalValue2
 * - Supports both exact matches and normalized matches (case-insensitive, underscore-agnostic)
 * - "Under desk" tab is always shown (for uncategorized tickets)
 *
 * Feature Flag:
 * - Set ENABLE_CAPABILITY_FILTERING = false to disable filtering and show all tabs
 * - Useful for development or admin users who need access to all desks
 */

/**
 * Tickets component for managing service requests across different desks
 * Provides tabs for each desk the user is entitled to based on capabilities
 */
export interface TicketsProps extends BusinessAppContextProps {
  deskKey?: StepReceiver | string
  ticketId?: string
  onTaskSelect?: (taskId: string, deskKey: string) => void
  onTabChange?: (tabKey: string) => void
}

export const Tickets: React.FC<TicketsProps> = ({
  accessToken,
  userInfo,
  deskKey,
  ticketId,
  onTaskSelect,
  onTabChange
}) => {
  // Get user's employee ID for capability lookup
  const employeeId = getUserEmployeeId(userInfo)

  console.log('[Tickets] 🚀 Component initialized:', {
    employeeId,
    userInfo: userInfo ? 'present' : 'missing',
    accessToken: accessToken ? 'present' : 'missing',
    deskKey,
    ticketId,
    ENABLE_CAPABILITY_FILTERING
  })

  // Get user capabilities to determine available desks
  const { capabilities, isLoading, error } = useUserCapabilities({
    accessToken,
    userInfo,
    employeeId: employeeId || undefined
  })

  // Get Service Desk Catalog entries for all available desk tabs
  const {
    catalogEntries,
    isLoading: catalogLoading,
    error: catalogError
  } = useServiceDeskCatalogCache({
    accessToken,
    userInfo
  })

  // Get completed tickets count for badge
  const { totalCount: completedCount } = useCompletedTickets({
    accessToken,
    userInfo,
    limit: 1, // We only need the count, not the actual tickets
    offset: 0
  })

  // Filter catalog entries based on user capabilities FIRST
  const getFilteredCatalogEntries = () => {
    if (!catalogEntries) return []

    // If capability filtering is disabled, return all entries
    if (!ENABLE_CAPABILITY_FILTERING) {
      console.log('[Tickets] Capability filtering is disabled, showing all tabs')
      return catalogEntries
    }

    // If no capabilities are loaded yet, return empty array to avoid unnecessary fetching
    if (!capabilities || capabilities.length === 0) {
      console.log('[Tickets] No user capabilities found yet, waiting...')
      return []
    }

    console.log('[Tickets] Filtering catalog entries based on capabilities...')
    console.log(
      '[Tickets] User capabilities:',
      capabilities.map(c => c.name)
    )
    console.log(
      '[Tickets] Catalog entries:',
      catalogEntries.map(e => ({ code: e.code, additionalValue2: e.additionalValue2 }))
    )

    // Filter entries based on capability matching
    const filteredEntries = catalogEntries.filter(entry => {
      // Always show "Under desk" - it's for uncategorized tickets
      if (entry.code === 'Under desk') {
        return true
      }

      // Check if user has capability matching this desk
      // Match capability name with additionalValue2 (manager role) from catalog
      const hasCapability = capabilities.some(capability => {
        // Direct name match with additionalValue2
        const directMatch = capability.name === entry.additionalValue2

        // Also check for common variations (e.g., HR_Manager vs HR_MANAGER)
        const normalizedCapability = capability.name.toLowerCase().replace(/_/g, '')
        const normalizedEntry = (entry.additionalValue2 || '').toLowerCase().replace(/_/g, '')
        const normalizedMatch = normalizedCapability === normalizedEntry

        return directMatch || normalizedMatch
      })

      console.log(
        `[Tickets] Entry "${entry.code}" (${entry.additionalValue2}): ${hasCapability ? '✅ ALLOWED' : '❌ FILTERED'}`
      )
      return hasCapability
    })

    console.log(
      '[Tickets] Filtered entries:',
      filteredEntries.map(e => e.code)
    )
    return filteredEntries
  }

  // Get filtered desk keys ONLY for desks the user can see
  const filteredCatalogEntries = getFilteredCatalogEntries()
  const visibleDeskKeys = filteredCatalogEntries.map(entry => entry.code)

  // Get ticket counts ONLY for visible desks (major optimization!)
  const { counts: deskCounts, isLoading: countsLoading } = useMultipleDeskCounts({
    deskKeys: visibleDeskKeys,
    accessToken,
    userInfo
  })

  // Create a lookup for desk counts
  const getDeskCount = (deskCode: string): number => {
    return deskCounts[deskCode] || 0
  }

  // Tab state management
  const [activeTab, setActiveTab] = useState<string>(deskKey || '')

  // Get "Under desk" count for special filtering logic
  const underDeskCount = getDeskCount('Under desk')

  // Debug logging for data states
  console.log('[Tickets] 📊 Data states:', {
    capabilities: capabilities?.length || 0,
    catalogEntries: catalogEntries?.length || 0,
    isLoading,
    catalogLoading,
    countsLoading,
    error,
    catalogError,
    underDeskCount,
    deskCounts
  })

  // Log any errors in detail
  if (error) {
    console.error('[Tickets] ❌ User capabilities error:', error)
  }

  if (catalogError) {
    console.error('[Tickets] ❌ Catalog error:', catalogError)
  }

  if (capabilities) {
    console.log('[Tickets] 👤 User capabilities:', capabilities)
  }

  if (catalogEntries) {
    console.log(
      '[Tickets] 📋 Catalog entries:',
      catalogEntries.map(e => ({
        code: e.code,
        value: e.value,
        additionalValue2: e.additionalValue2
      }))
    )
  }

  // Update tab from props
  useEffect(() => {
    if (deskKey) {
      setActiveTab(deskKey)
    }
  }, [deskKey])

  // Default to first available desk if no tab is selected and no deskKey prop
  useEffect(() => {
    const filteredEntries = getFilteredCatalogEntries()

    if (filteredEntries && filteredEntries.length > 0) {
      // Get available tabs after capability and under desk filtering
      const availableTabs = filteredEntries.filter(entry => {
        if (entry.code === 'Under desk') {
          return underDeskCount > 0
        }
        return true
      })

      // If no activeTab or activeTab is invalid, set to first available tab
      if (!activeTab && !deskKey && availableTabs.length > 0) {
        const firstEntry = availableTabs[0]
        console.log(`[Tickets] Setting default tab to first available catalog entry: ${firstEntry.code}`)
        setActiveTab(firstEntry.code)
      }
      // If activeTab is "Under desk" but it's being filtered out, switch to first available tab
      else if (activeTab === 'Under desk' && underDeskCount === 0 && availableTabs.length > 0) {
        const firstEntry = availableTabs[0]
        console.log(`[Tickets] "Under desk" tab hidden due to no tickets, switching to: ${firstEntry.code}`)
        setActiveTab(firstEntry.code)
        // Notify parent component of tab change
        if (onTabChange) {
          onTabChange(firstEntry.code)
        }
      }
      // If current activeTab is not available due to capability filtering, switch to first available
      // But treat "completed" as always valid since it's not a catalog entry
      else if (
        activeTab &&
        activeTab !== 'completed' &&
        !availableTabs.some(tab => tab.code === activeTab) &&
        availableTabs.length > 0
      ) {
        const firstEntry = availableTabs[0]
        console.log(
          `[Tickets] Current tab "${activeTab}" not available due to capability filtering, switching to: ${firstEntry.code}`
        )
        setActiveTab(firstEntry.code)
        // Notify parent component of tab change
        if (onTabChange) {
          onTabChange(firstEntry.code)
        }
      }
    }
  }, [activeTab, deskKey, catalogEntries, capabilities, underDeskCount, onTabChange])

  // Handle tab change
  const handleTabChange = (key: string) => {
    setActiveTab(key)
    // Notify parent component about tab change
    if (onTabChange) {
      onTabChange(key)
    }
  }

  // Handle task selection
  const handleTaskSelect = (taskId: string, deskKey: string) => {
    if (onTaskSelect) {
      onTaskSelect(taskId, deskKey)
    }
  }

  // Loading state
  if (isLoading || catalogLoading || countsLoading) {
    return (
      <div data-testid="tickets-loading" className="gba:p-6 gba:text-center gba:text-gray-500">
        {getTranslationFromI18nKeyAndLabel('services.tickets.loading', 'Loading tickets...')}
      </div>
    )
  }

  // Error state
  if (error || catalogError) {
    return (
      <div data-testid="tickets-error" className="gba:p-6 gba:text-center gba:text-red-500">
        {getTranslationFromI18nKeyAndLabel('services.tickets.error', 'Error loading tickets. Please try again.')}
        {catalogError && <div className="gba:mt-2 gba:text-sm">Catalog Error: {catalogError}</div>}
      </div>
    )
  }

  // filteredCatalogEntries is already defined above

  // No catalog entries available after filtering
  if (!filteredCatalogEntries || filteredCatalogEntries.length === 0) {
    return (
      <div data-testid="tickets-no-access" className="gba:p-6 gba:text-center gba:text-gray-500">
        {getTranslationFromI18nKeyAndLabel(
          'services.tickets.noAccess',
          ENABLE_CAPABILITY_FILTERING
            ? 'No service desk categories available for your role.'
            : 'No service desk categories available.'
        )}
        {ENABLE_CAPABILITY_FILTERING && capabilities && capabilities.length > 0 && (
          <div className="gba:mt-4 gba:text-sm">
            <div>Your capabilities:</div>
            <div className="gba:mt-1">{capabilities.map(cap => cap.name).join(', ')}</div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div data-testid="service-desk-tickets" className="gba:h-full gba:flex gba:flex-col">
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        data-testid="tickets-tabs"
        className="gba:w-full gba:flex-1 gba:flex gba:flex-col [&_.ant-tabs-content-holder]:gba:flex-1 [&_.ant-tabs-tabpane]:gba:h-full"
        items={[
          // Service Desk Catalog tabs (filtered based on capabilities)
          ...filteredCatalogEntries
            .filter(entry => {
              // Hide "Under desk" tab when there are no uncategorized tickets
              if (entry.code === 'Under desk') {
                return underDeskCount > 0
              }
              return true // Show all other tabs (already filtered by capabilities)
            })
            .map(entry => {
              // Get ticket count for this desk
              const ticketCount = getDeskCount(entry.code)

              return {
                key: entry.code,
                label: (
                  <span
                    data-testid={`tickets-tab-${entry.code.toLowerCase()}`}
                    className="gba:flex gba:items-center gba:gap-2"
                  >
                    <span>
                      {getTranslationFromI18nKeyAndLabel(
                        `services.desk.${entry.code.toLowerCase()}.name`,
                        entry.value || entry.code // Use value as primary, code as fallback
                      )}
                    </span>
                    {ticketCount > 0 && <Badge count={ticketCount} size="small" className="gba:ml-1" />}
                  </span>
                ),
                children: (
                  <div className="gba:h-full">
                    <DeskQueue
                      deskKey={entry.code as StepReceiver}
                      ticketId={ticketId}
                      accessToken={accessToken}
                      userInfo={userInfo}
                      onTaskSelect={handleTaskSelect}
                    />
                  </div>
                )
              }
            }),
          // Completed Tickets tab
          {
            key: 'completed',
            label: (
              <span data-testid="tickets-tab-completed" className="gba:flex gba:items-center gba:gap-2">
                <span>{getTranslationFromI18nKeyAndLabel('services.desk.completed.name', 'Completed')}</span>
                {completedCount > 0 && <Badge count={completedCount} size="small" className="gba:ml-1" />}
              </span>
            ),
            children: (
              <div className="gba:h-full">
                <CompletedTickets accessToken={accessToken} userInfo={userInfo} onTaskSelect={handleTaskSelect} />
              </div>
            )
          }
        ]}
      />
    </div>
  )
}
