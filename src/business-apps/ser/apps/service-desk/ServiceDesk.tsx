import React, { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'
import type { StepReceiver } from '../../../packages/services-plus-core/src'
import { Dashboard } from './components/dashboard'
import { Tickets } from './components/Tickets'
import { TemplatesTab } from './components/TemplatesTab'
import { Analytics } from './components/Analytics'
import { TaskRecord } from './components/TaskRecord'
import { ServiceDeskCatalogDiagnostic } from './components/ServiceDeskCatalogDiagnostic'
import { PageLayout } from '@newwork/nw-design-system'
import { EmployeeNameCacheProvider, enableCacheDebugConsole } from '../../services/employee-cache'
import { ServiceDeskCatalogCacheProvider, enableCatalogCacheDebugConsole } from '../../services/catalog-cache'
import { HeadsetIcon, ChartBarIcon, TicketIcon, FileTextIcon, HouseIcon, BugIcon } from '@phosphor-icons/react'

// UI Components
import { Alert } from '@newwork/nw-design-system'

/**
 * ServiceDesk component for managing service requests across different desks
 * Provides tabs for each desk the user is entitled to based on capabilities
 */
export interface ServiceDeskProps extends BusinessAppContextProps {
  deskKey?: StepReceiver
  ticketId?: string
}

// Parse URL parameters for subview, ticketTab and ticketId
const parseUrlParams = () => {
  const path = window.location.pathname
  const searchParams = new URLSearchParams(window.location.search)

  // Match task patterns: /task/123 (legacy path-based)
  const taskMatch = path.match(/\/task\/([^\/]+)/)

  // Get subview from URL parameter (e.g., ?subview=tickets)
  const subviewFromUrl = searchParams.get('subview') || 'dashboard'

  // Get ticket tab from URL parameter (e.g., ?tab=IT or ?tab=completed)
  const ticketTabFromUrl = searchParams.get('tab') || null

  // Get taskId from URL parameter (new parameter-based approach)
  const taskIdFromParam = searchParams.get('taskId') || null

  return {
    subviewFromUrl,
    ticketIdFromUrl: taskIdFromParam || (taskMatch ? taskMatch[1] : null),
    ticketTabFromUrl
  }
}

const ServiceDesk: React.FC<ServiceDeskProps> = ({ accessToken, userInfo, deskKey, ticketId }) => {
  const { subviewFromUrl, ticketIdFromUrl, ticketTabFromUrl } = parseUrlParams()

  // Use tab parameter or component prop for desk key
  const resolvedDeskKey = deskKey || ticketTabFromUrl || ''
  const resolvedTicketId = ticketId || ticketIdFromUrl || null

  // Feature flag guard - check if Services module is enabled
  const servicesFeature = useFeature(Feature.Services.Enabled.Key)
  const isServicesEnabled = servicesFeature !== false // true if undefined (development) or true

  // Submenu and tab state management with URL parameter support
  const [activeSubView, setActiveSubView] = useState<string>(subviewFromUrl)
  const [activeTab, setActiveTab] = useState<string>(() => {
    // Prioritize ticketTabFromUrl, then resolvedDeskKey
    if (ticketTabFromUrl) {
      return ticketTabFromUrl
    }
    if (resolvedDeskKey) {
      return resolvedDeskKey
    }
    return ''
  })
  // Removed diagnostic state - no longer needed since capability loading is handled by sub-components
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(resolvedTicketId)
  const [lastTicketsTab, setLastTicketsTab] = useState<string>('') // Remember last selected tab in Tickets subview

  // Note: Capability-based filtering is now handled by the Tickets component

  // Update task from URL parameters and initialize state
  useEffect(() => {
    if (resolvedTicketId) {
      setSelectedTaskId(resolvedTicketId)
    }

    // Initialize lastTicketsTab if we're starting on tickets subview with an active tab
    if (activeSubView === 'tickets' && activeTab && !lastTicketsTab) {
      setLastTicketsTab(activeTab)
    }

    // Note: URL parameters are handled by the navigation system
    // No need to manually set URL parameters on component load
  }, [resolvedTicketId, activeSubView, activeTab, lastTicketsTab])

  // Handle browser navigation (back/forward/refresh)
  useEffect(() => {
    const handlePopState = () => {
      const { subviewFromUrl, ticketIdFromUrl, ticketTabFromUrl } = parseUrlParams()

      // Update subview from URL
      setActiveSubView(subviewFromUrl)

      // Update active tab from tab parameter
      if (ticketTabFromUrl) {
        setActiveTab(ticketTabFromUrl)
      }

      if (ticketIdFromUrl) {
        setSelectedTaskId(ticketIdFromUrl)
      } else {
        setSelectedTaskId(null)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Handle submenu change
  const handleSubViewChange = (subView: string) => {
    setActiveSubView(subView)
    setSelectedTaskId(null) // Clear task selection when switching subviews

    // Update URL parameters directly for internal navigation
    const url = new URL(window.location.href)

    // Clear or set subview parameter
    if (subView === 'dashboard') {
      url.searchParams.delete('subview')
    } else {
      url.searchParams.set('subview', subView)
    }

    // When switching to tickets, use last remembered tab
    if (subView === 'tickets' && lastTicketsTab) {
      setActiveTab(lastTicketsTab)
      url.searchParams.set('tab', lastTicketsTab)
    } else {
      url.searchParams.delete('tab')
    }

    // Update URL without full navigation
    window.history.pushState({}, '', url.toString())
  }

  // Handle ticket tab change (IT, HR, Completed, etc.)
  const handleTicketTabChange = (tabKey: string) => {
    console.log('🔍 [ServiceDesk] handleTicketTabChange called:', { tabKey, previousActiveTab: activeTab })
    setActiveTab(tabKey)
    setLastTicketsTab(tabKey) // Remember this tab for when user returns to Tickets subview
    setSelectedTaskId(null) // Clear task selection when switching tabs

    // Update URL parameters directly for internal navigation
    const url = new URL(window.location.href)
    url.searchParams.set('tab', tabKey)

    console.log('🔍 [ServiceDesk] Tab change URL:', url.toString())
    window.history.pushState({}, '', url.toString())
  }

  // Handle task selection
  const handleTaskSelect = (taskId: string, _deskKey: string) => {
    console.log('🔍 [ServiceDesk] handleTaskSelect called:', { taskId, _deskKey, activeTab, activeSubView })
    setSelectedTaskId(taskId)

    // Update URL parameters directly for internal navigation
    const url = new URL(window.location.href)
    url.searchParams.set('taskId', taskId)

    console.log('🔍 [ServiceDesk] Task select URL:', url.toString())
    window.history.pushState({}, '', url.toString())
  }

  // Handle closing task detail
  const handleTaskClose = () => {
    console.log('🔍 [ServiceDesk] handleTaskClose called:', { activeTab, activeSubView })
    setSelectedTaskId(null)

    // Update URL parameters directly - remove taskId parameter
    const url = new URL(window.location.href)
    url.searchParams.delete('taskId')

    console.log('🔍 [ServiceDesk] Task close URL:', url.toString())
    window.history.pushState({}, '', url.toString())
  }

  // Feature flag check - return early if explicitly disabled
  if (servicesFeature === false) {
    return (
      <div data-testid="services-plus-disabled" className="gba:p-6 gba:text-center">
        <Alert variant="default" className="gba:max-w-md gba:mx-auto">
          <h4 className="gba:font-semibold">
            {getTranslationFromI18nKeyAndLabel('services.feature.disabled.title', 'Feature Not Available')}
          </h4>
          <p>
            {getTranslationFromI18nKeyAndLabel(
              'services.feature.disabled.description',
              'Services+ is not enabled for your organization.'
            )}
          </p>
        </Alert>
      </div>
    )
  }

  // Get current user ID
  const currentUserId = userInfo?.id

  // Define allowed user IDs for diagnostic tab (add your user ID here)
  const diagnosticAllowedUserIds = ['c2c0b944-8f68-4599-810f-6faccecd1a68']

  // Check if current user can see diagnostic tab
  const canSeeDiagnostic = diagnosticAllowedUserIds.includes(currentUserId || '')

  // Check if current user can see templates tab (same users as diagnostic)
  const canSeeTemplates = diagnosticAllowedUserIds.includes(currentUserId || '')

  // Debug info for development
  console.log('ServiceDesk Debug:', {
    servicesFeature,
    isServicesEnabled,
    accessToken: !!accessToken,
    userInfo: !!userInfo,
    userId: currentUserId,
    canSeeDiagnostic,
    canSeeTemplates
  })

  // Enable cache debug console in development
  React.useEffect(() => {
    enableCacheDebugConsole()
    enableCatalogCacheDebugConsole()
  }, [])

  // Note: Access control is now handled by individual components (e.g., Tickets component)

  // Note: Default tab selection is now handled by the Tickets component

  // Show task record if selected
  if (selectedTaskId) {
    return (
      <TaskRecord
        taskId={selectedTaskId}
        deskKey={activeTab}
        accessToken={accessToken}
        userInfo={userInfo}
        onClose={handleTaskClose}
      />
    )
  }

  // Render content based on active submenu
  const renderSubViewContent = () => {
    switch (activeSubView) {
      case 'dashboard':
        return <Dashboard accessToken={accessToken} userInfo={userInfo} onTaskSelect={handleTaskSelect} />
      case 'tickets':
        return (
          <Tickets
            deskKey={activeTab}
            ticketId={ticketId}
            accessToken={accessToken}
            userInfo={userInfo}
            onTaskSelect={handleTaskSelect}
            onTabChange={handleTicketTabChange}
          />
        )
      case 'templates':
        return <TemplatesTab accessToken={accessToken} userInfo={userInfo} />
      case 'analytics':
        return <Analytics accessToken={accessToken} userInfo={userInfo} />
      case 'diagnostic':
        return <ServiceDeskCatalogDiagnostic accessToken={accessToken} userInfo={userInfo} />
      default:
        return <Dashboard accessToken={accessToken} userInfo={userInfo} />
    }
  }

  return (
    <EmployeeNameCacheProvider
      accessToken={accessToken}
      config={{
        enableDebugLogging: process.env.NODE_ENV === 'development',
        ttl: 5 * 60 * 1000, // 5 minutes cache
        maxEntries: 500, // Reasonable limit for service desk usage
        batchTimeout: 50 // Faster batching for better UX
      }}
    >
      <ServiceDeskCatalogCacheProvider
        accessToken={accessToken}
        config={{
          enableDebugLogging: process.env.NODE_ENV === 'development',
          ttl: 10 * 60 * 1000 // 10 minutes cache (catalog changes less frequently)
        }}
      >
        <div data-testid="service-desk-container" className="gba:h-full">
          <PageLayout
            headerTitle={getTranslationFromI18nKeyAndLabel('services.desk.title', 'Service Desk')}
            headerDescription={getTranslationFromI18nKeyAndLabel(
              'services.desk.description',
              'Manage service requests and tickets across different departments'
            )}
            headerIcon={HeadsetIcon}
            variant="ext2"
            headerSubViews={{
              value: activeSubView,
              items: [
                {
                  value: 'dashboard',
                  label: getTranslationFromI18nKeyAndLabel('services.desk.submenu.dashboard', 'Dashboard'),
                  icon: <HouseIcon size={16} />
                },
                {
                  value: 'tickets',
                  label: getTranslationFromI18nKeyAndLabel('services.desk.submenu.tickets', 'Tickets'),
                  icon: <TicketIcon size={16} />
                },
                // Only show templates tab for allowed users
                ...(canSeeTemplates
                  ? [
                      {
                        value: 'templates',
                        label: getTranslationFromI18nKeyAndLabel('services.desk.submenu.templates', 'Templates'),
                        icon: <FileTextIcon size={16} />
                      }
                    ]
                  : []),
                {
                  value: 'analytics',
                  label: getTranslationFromI18nKeyAndLabel('services.desk.submenu.analytics', 'Analytics'),
                  icon: <ChartBarIcon size={16} />
                },
                // Only show diagnostic tab for allowed users
                ...(canSeeDiagnostic
                  ? [
                      {
                        value: 'diagnostic',
                        label: getTranslationFromI18nKeyAndLabel('services.desk.submenu.diagnostic', 'Diagnostic'),
                        icon: <BugIcon size={16} />
                      }
                    ]
                  : [])
              ],
              onValueChange: handleSubViewChange
            }}
            className="gba:h-full"
          >
            {renderSubViewContent()}
          </PageLayout>
        </div>
      </ServiceDeskCatalogCacheProvider>
    </EmployeeNameCacheProvider>
  )
}

export default ServiceDesk
