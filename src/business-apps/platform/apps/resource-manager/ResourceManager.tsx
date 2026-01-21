import React, { useState, useEffect, useCallback } from 'react'
import { PageLayout, Button } from '@newwork/nw-design-system'
import { Package, Link, ArrowsClockwise } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ComponentsView, ResourceView } from './views'
import { ResourceManagerProvider, useResourceManagerContext } from './contexts/ResourceManagerContext'

interface ResourceManagerProps extends BusinessAppContextProps {
  'data-testid'?: string
}

const ResourceManagerContent: React.FC<ResourceManagerProps & { dataTestId: string }> = ({
  dataTestId,
  ...context
}) => {
  const {
    refreshServices,
    refreshAzureData,
    isLoading: isLoadingServices,
    isLoadingAzure
  } = useResourceManagerContext()
  const viewOptions = [
    {
      key: 'components',
      label: 'Components',
      icon: <Package />
    },
    {
      key: 'resources',
      label: 'Resources',
      icon: <Link />
    }
  ]

  // Get initial view from URL or default to first view
  const getInitialView = useCallback(() => {
    if (typeof window === 'undefined') return viewOptions[0].key
    const urlParams = new URLSearchParams(window.location.search)
    const viewFromUrl = urlParams.get('view')

    // Validate that the view exists in our options
    if (viewFromUrl && viewOptions.some(option => option.key === viewFromUrl)) {
      return viewFromUrl
    }

    // Default to first view
    return viewOptions[0].key
  }, [])

  const [activeTab, setActiveTab] = useState<string>(getInitialView())

  // Update URL when view changes
  const updateUrl = useCallback((view: string) => {
    if (typeof window === 'undefined') return
    const urlParams = new URLSearchParams(window.location.search)

    // Always set the view parameter
    urlParams.set('view', view)

    // Clear tabs parameter when switching views (tabs only apply to resources view)
    if (view !== 'resources' && urlParams.has('tab')) {
      urlParams.delete('tab')
      urlParams.delete('subview')
    }

    const newUrl = `${window.location.pathname}?${urlParams.toString()}`
    window.history.replaceState({}, '', newUrl)
  }, [])

  const handleTabChange = useCallback(
    (key: string) => {
      if (!key || key === activeTab) {
        return
      }
      setActiveTab(key)
      updateUrl(key)
    },
    [activeTab, updateUrl]
  )

  // Ensure URL always has view parameter on initial load
  useEffect(() => {
    if (typeof window === 'undefined') return
    const urlParams = new URLSearchParams(window.location.search)
    if (!urlParams.has('view')) {
      updateUrl(activeTab)
    }
  }, [activeTab, updateUrl])

  // Listen for browser back/forward navigation
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handlePopState = () => {
      const newView = getInitialView()
      setActiveTab(newView)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [getInitialView])

  const renderTabContent = () => {
    // Show loading screen while Azure Storage data is being loaded
    if (activeTab === 'components' && isLoadingAzure) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:h-[calc(100vh-200px)]">
          <div className="gba:text-center">
            <ArrowsClockwise className="gba:w-8 gba:h-8 gba:mx-auto gba:mb-4 gba:animate-spin gba:text-primary" />
            <p className="gba:text-muted-foreground">Loading Azure Storage data...</p>
          </div>
        </div>
      )
    }

    switch (activeTab) {
      case 'components':
        return <ComponentsView {...context} data-testid={`${dataTestId}-components-view`} />
      case 'resources':
        return <ResourceView {...context} data-testid={`${dataTestId}-resource-view`} />
      default:
        return null
    }
  }

  return (
    <div data-testid={dataTestId}>
      <PageLayout
        headerIcon={Package}
        headerTitle="Resource Manager"
        headerDescription="Manage screens, components, and resources across dev, staging, and production environments"
        headerSubViews={{
          value: activeTab,
          onValueChange: handleTabChange,
          items: viewOptions.map(option => ({
            value: option.key,
            label: option.label,
            icon: option.icon
          }))
        }}
        headerContent={
          <div className="gba:flex gba:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshServices}
              disabled={isLoadingServices}
              data-testid={`${dataTestId}-refresh-services-button`}
            >
              <ArrowsClockwise className={isLoadingServices ? 'gba:animate-spin' : ''} />
              Refresh Services
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAzureData}
              disabled={isLoadingAzure}
              data-testid={`${dataTestId}-refresh-azure-button`}
            >
              <ArrowsClockwise className={isLoadingAzure ? 'gba:animate-spin' : ''} />
              Refresh Azure Data
            </Button>
          </div>
        }
        variant="default"
        className="gba:min-h-screen"
      >
        <div className="gba:h-full gba:overflow-auto">{renderTabContent()}</div>
      </PageLayout>
    </div>
  )
}

export const ResourceManager: React.FC<ResourceManagerProps> = ({
  'data-testid': dataTestId = 'resource-manager',
  ...context
}) => {
  return (
    <ResourceManagerProvider {...context}>
      <ResourceManagerContent dataTestId={dataTestId} {...context} />
    </ResourceManagerProvider>
  )
}
