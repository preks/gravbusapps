import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Button, IconAvatar } from '@newwork/nw-design-system'
import { PackageIcon, LinkIcon, ArrowClockwiseIcon, HouseIcon, StackIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ComponentsView, ResourceView, HomeView, BundlesView } from './views'
import { ResourceManagerProvider, useResourceActions, useAzureData } from './contexts/ResourceManagerContext'
import { ConfigurationLayout, type ConfigurationView } from '@/components/layout/configuration-layout'
import { env } from '@/common/env/EnvUtils'

interface ResourceManagerProps extends BusinessAppContextProps {
  'data-testid'?: string
}

/** Bundles view and bundle registration flows are only available on local dev hostnames. */
const isLocalhostResourceManagerDev = (): boolean => {
  if (globalThis.window === undefined) return false
  const hostname = globalThis.window.location.hostname
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1'
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
  const localhostBundlesEnabled = useMemo(() => isLocalhostResourceManagerDev(), [])

  // Get initial view from URL or default to first view
  const getInitialView = useCallback(() => {
    if (globalThis.window === undefined) return 'components'
    const urlParams = new URLSearchParams(globalThis.window.location.search)
    const viewFromUrl = urlParams.get('view')

    const allowedViews = localhostBundlesEnabled
      ? (['home', 'bundles', 'components', 'resources'] as const)
      : (['home', 'components', 'resources'] as const)

    if (viewFromUrl && (allowedViews as readonly string[]).includes(viewFromUrl)) {
      return viewFromUrl
    }

    return 'components'
  }, [localhostBundlesEnabled])

  const [activeView, setActiveView] = useState<string>(getInitialView())

  // Update URL when view changes (optionally with tab/subview for resources)
  const updateUrl = useCallback((view: string, params?: { tab?: string; subview?: string }) => {
    if (globalThis.window === undefined) return
    const urlParams = new URLSearchParams(globalThis.window.location.search)

    urlParams.set('view', view)

    if (view === 'resources' && params) {
      if (params.tab) urlParams.set('tab', params.tab)
      if (params.subview) urlParams.set('subview', params.subview)
    } else if (view === 'components') {
      const componentsTab =
        params?.tab ??
        (['components', 'debug'].includes(urlParams.get('tab') || '') ? urlParams.get('tab') : null) ??
        'components'
      urlParams.set('tab', componentsTab)
      urlParams.delete('subview')
    } else if (view === 'bundles') {
      urlParams.delete('tab')
      urlParams.delete('subview')
    } else if (view !== 'resources') {
      urlParams.delete('tab')
      urlParams.delete('subview')
    }

    const newUrl = `${globalThis.window.location.pathname}?${urlParams.toString()}`
    globalThis.window.history.replaceState({}, '', newUrl)
  }, [])

  const handleNavigateTo = useCallback(
    (view: string, params?: { tab?: string; subview?: string }) => {
      if (!localhostBundlesEnabled && view === 'bundles') return
      updateUrl(view, params)
      setActiveView(view)
    },
    [localhostBundlesEnabled, updateUrl]
  )

  const handleViewChange = useCallback(
    (view: string) => {
      if (!view || view === activeView) return
      if (!localhostBundlesEnabled && view === 'bundles') return
      setActiveView(view)
      updateUrl(view)
    },
    [activeView, localhostBundlesEnabled, updateUrl]
  )

  // Ensure URL always has view parameter on initial load
  useEffect(() => {
    if (globalThis.window === undefined) return
    const urlParams = new URLSearchParams(globalThis.window.location.search)
    if (!urlParams.has('view')) {
      updateUrl(activeView)
    }
  }, [activeView, updateUrl])

  // Listen for browser back/forward navigation
  useEffect(() => {
    if (globalThis.window === undefined) return
    const handlePopState = () => {
      const newView = getInitialView()
      setActiveView(newView)
    }

    globalThis.window.addEventListener('popstate', handlePopState)
    return () => globalThis.window.removeEventListener('popstate', handlePopState)
  }, [getInitialView])

  useEffect(() => {
    if (localhostBundlesEnabled || globalThis.window === undefined) return
    if (activeView === 'bundles') {
      setActiveView('components')
      updateUrl('components')
      return
    }
    const params = new URLSearchParams(globalThis.window.location.search)
    if (params.get('view') === 'bundles') {
      updateUrl(activeView)
    }
  }, [activeView, localhostBundlesEnabled, updateUrl])

  const renderComponentsView = () => (
    <ComponentsView {...context} onNavigateTo={handleNavigateTo} data-testid={`${dataTestId}-components-view`} />
  )

  const views: ConfigurationView[] = [
    {
      value: 'home',
      label: 'Home',
      icon: <HouseIcon />,
      content: (
        <HomeView
          {...context}
          localhostBundlesEnabled={localhostBundlesEnabled}
          onViewChange={handleViewChange}
          onNavigateTo={handleNavigateTo}
          data-testid={`${dataTestId}-home-view`}
        />
      )
    },
    ...(localhostBundlesEnabled
      ? ([
          {
            value: 'bundles',
            label: 'Bundles',
            icon: <StackIcon />,
            content: (
              <BundlesView {...context} onNavigateTo={handleNavigateTo} data-testid={`${dataTestId}-bundles-view`} />
            )
          }
        ] satisfies ConfigurationView[])
      : []),
    {
      value: 'components',
      label: 'Components',
      icon: <PackageIcon />,
      content: renderComponentsView()
    },
    {
      value: 'resources',
      label: 'Resources',
      icon: <LinkIcon />,
      content: <ResourceView {...context} data-testid={`${dataTestId}-resource-view`} />
    }
  ]

  return (
    <ConfigurationLayout
      headerAvatar={
        <IconAvatar icon={PackageIcon} variant="secondary" size="lg" decorative={false} label="Resource Manager" />
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
            <ArrowClockwiseIcon className={isLoadingServices ? 'gba:animate-spin' : ''} />
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
              <ArrowClockwiseIcon className={isLoadingAzure ? 'gba:animate-spin' : ''} />
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
