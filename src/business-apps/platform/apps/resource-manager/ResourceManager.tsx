import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Button, IconAvatar } from '@newwork/nw-design-system'
import { Package, Link, ArrowsClockwise } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ComponentsView, ResourceView } from './views'
import { ResourceManagerProvider, useResourceActions, useAzureData } from './contexts/ResourceManagerContext'
import { ConfigurationLayout, type ConfigurationView } from '@/components/layout/configuration-layout'
import { env } from '@/common/env/EnvUtils'

interface ResourceManagerProps extends BusinessAppContextProps {
  'data-testid'?: string
}

// Helper function to check if Azure Storage credentials are configured
const isAzureConfigured = (): boolean => {
  const devAccountName = env('NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT_DEV')
  const devSasToken = env('NEXT_PUBLIC_AZURE_STORAGE_SAS_TOKEN_DEV')
  const prodAccountName = env('NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT_PROD')
  const prodSasToken = env('NEXT_PUBLIC_AZURE_STORAGE_SAS_TOKEN_PROD')

  // Azure is configured if at least DEV or PROD credentials are available
  const hasDevConfig = !!(devAccountName && devSasToken)
  const hasProdConfig = !!(prodAccountName && prodSasToken)

  return hasDevConfig || hasProdConfig
}

const ResourceManagerContent: React.FC<ResourceManagerProps & { dataTestId: string }> = ({
  dataTestId,
  ...context
}) => {
  const { refreshServices, refreshAzureData, isLoading: isLoadingServices } = useResourceActions()
  const { isLoadingAzure } = useAzureData()

  // Check if Azure Storage is configured
  const azureConfigured = useMemo(() => isAzureConfigured(), [])

  // Get initial view from URL or default to first view
  const getInitialView = useCallback(() => {
    if (typeof window === 'undefined') return 'components'
    const urlParams = new URLSearchParams(window.location.search)
    const viewFromUrl = urlParams.get('view')

    // Validate that the view exists
    if (viewFromUrl && ['components', 'resources'].includes(viewFromUrl)) {
      return viewFromUrl
    }

    return 'components'
  }, [])

  const [activeView, setActiveView] = useState<string>(getInitialView())

  // Update URL when view changes
  const updateUrl = useCallback((view: string) => {
    if (typeof window === 'undefined') return
    const urlParams = new URLSearchParams(window.location.search)

    urlParams.set('view', view)

    // Clear tabs parameter when switching views
    if (view !== 'resources' && urlParams.has('tab')) {
      urlParams.delete('tab')
      urlParams.delete('subview')
    }

    const newUrl = `${window.location.pathname}?${urlParams.toString()}`
    window.history.replaceState({}, '', newUrl)
  }, [])

  const handleViewChange = useCallback(
    (view: string) => {
      if (!view || view === activeView) return
      setActiveView(view)
      updateUrl(view)
    },
    [activeView, updateUrl]
  )

  // Ensure URL always has view parameter on initial load
  useEffect(() => {
    if (typeof window === 'undefined') return
    const urlParams = new URLSearchParams(window.location.search)
    if (!urlParams.has('view')) {
      updateUrl(activeView)
    }
  }, [activeView, updateUrl])

  // Listen for browser back/forward navigation
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handlePopState = () => {
      const newView = getInitialView()
      setActiveView(newView)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [getInitialView])

  // Render view content with loading state check
  const renderComponentsView = () => {
    if (isLoadingAzure) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:h-[calc(100vh-200px)]">
          <div className="gba:text-center">
            <ArrowsClockwise className="gba:w-8 gba:h-8 gba:mx-auto gba:mb-4 gba:animate-spin gba:text-primary" />
            <p className="gba:text-muted-foreground">Loading Azure Storage data...</p>
          </div>
        </div>
      )
    }
    return <ComponentsView {...context} data-testid={`${dataTestId}-components-view`} />
  }

  const views: ConfigurationView[] = [
    {
      value: 'components',
      label: 'Components',
      icon: <Package />,
      content: renderComponentsView()
    },
    {
      value: 'resources',
      label: 'Resources',
      icon: <Link />,
      content: <ResourceView {...context} data-testid={`${dataTestId}-resource-view`} />
    }
  ]

  return (
    <ConfigurationLayout
      headerAvatar={
        <IconAvatar icon={Package} variant="secondary" size="lg" decorative={false} label="Resource Manager" />
      }
      headerTitle="Resource Manager"
      headerDescription="Manage screens, components, and resources across dev, staging, and production environments"
      headerActions={
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
          {azureConfigured && (
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
          )}
        </div>
      }
      views={views}
      currentView={activeView}
      onViewChange={handleViewChange}
      data-testid={dataTestId}
    />
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
