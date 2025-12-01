import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  loadRemoteComponent,
  exposeRequiredDependencies
} from '@/common/loaders/remote-component-loader/remoteComponentLoader'
import { Spinner, Alert, AlertDescription, AlertTitle, Button } from '@newwork/nw-design-system'
import { AlertCircle, RefreshCw } from 'lucide-react'

// CDN base URLs matching gravity-platform
const REMOTE_COMPONENT_CDN_BASE_DEV = 'https://nwcdndevfiles.blob.core.windows.net/screens'
const REMOTE_COMPONENT_CDN_BASE_PROD = 'https://nwcdnprodfiles.blob.core.windows.net/screens'

// Token refresh event names (matching gravity-platform)
const TOKEN_REFRESH_EVENT = 'com.newwork.token.shouldRefreshAuthorizationHeader'
const MOBILE_TOKEN_UPDATED_EVENT = 'com.newwork.mobile.token.updated'

// Interface for component props passed to loaded remote component
interface RemoteComponentPassedProps {
  accessToken: string
  userInfo: BusinessAppContextProps['userInfo']
  additionalData: BusinessAppContextProps['additionalData']
  onClose: () => void
  onTaskCompleted?: (taskId: string) => void
  onTaskUpdated: () => void
}

interface RemoteScreenLoaderProps extends BusinessAppContextProps {
  componentPath: string
  version?: string
  onClose: () => void
  onTaskCompleted?: (taskId: string) => void
  onTaskUpdated: () => void
  isLoadingMetadata?: boolean // Flag to show spinner while parent is loading metadata
  /** Custom cache key for component isolation (useful for loading same component multiple times) */
  cacheKey?: string
}

/**
 * RemoteScreenLoader - Loads native screens dynamically from CDN
 *
 * This component uses the platform's remote component loading system to dynamically
 * load and render native screens from CDN in both development and production.
 *
 * CDN Selection Logic (matching gravity-platform):
 * - When version is provided: Uses PROD CDN with versioned files (index-{version}.js, main-{version}.css)
 * - When no version: Uses DEV CDN with standard files (index.js, main.css)
 *
 * How it works:
 * 1. Exposes all required dependencies (React, antd, etc.) to window object
 * 2. Creates a custom window.require function for module resolution
 * 3. Loads the component's JS and CSS files from CDN
 * 4. Handles chunk loading automatically via window.require
 * 5. Renders the loaded component with proper props
 */
export const RemoteScreenLoader: React.FC<RemoteScreenLoaderProps> = ({
  componentPath,
  version,
  accessToken,
  userInfo,
  additionalData,
  onClose,
  onTaskCompleted,
  onTaskUpdated,
  isLoadingMetadata = false,
  cacheKey: propCacheKey
}) => {
  const [loading, setLoading] = useState(false)
  const [component, setComponent] = useState<React.ComponentType<any> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const prevVersionRef = useRef<string | undefined>(undefined)
  const prevCacheKeyRef = useRef<string | undefined>(undefined)

  // State for component props - allows hot-swapping token on refresh
  const [componentProps, setComponentProps] = useState<RemoteComponentPassedProps>({
    accessToken,
    userInfo,
    additionalData,
    onClose,
    onTaskCompleted,
    onTaskUpdated
  })

  // Extract component name from path (last segment in PascalCase)
  const componentName = useMemo(() => {
    if (!componentPath) {
      return ''
    }

    const pathSegments = componentPath.split('/').filter(Boolean)
    const lastSegment = pathSegments[pathSegments.length - 1]

    if (!lastSegment) {
      return ''
    }

    // Convert kebab-case to PascalCase
    return lastSegment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('')
  }, [componentPath])

  // Compute effective cache key (use prop if provided, else componentName)
  const cacheKey = useMemo(() => {
    return propCacheKey || componentName
  }, [propCacheKey, componentName])

  // CDN base URL - use PROD when version is provided (published screen), DEV otherwise
  // This matches the gravity-platform logic in RenderRemoteComponent.tsx
  const componentCdnBase = useMemo(() => {
    return version ? REMOTE_COMPONENT_CDN_BASE_PROD : REMOTE_COMPONENT_CDN_BASE_DEV
  }, [version])

  // Construct CSS URL based on version (matching gravity-platform pattern)
  const cssUrl = useMemo(() => {
    if (!componentCdnBase || !componentPath) {
      return ''
    }

    // Clean path - remove leading slash if present
    const cleanPath = componentPath.startsWith('/') ? componentPath.substring(1) : componentPath

    if (!version) {
      // No version - use standard main.css from DEV CDN
      return `${componentCdnBase}/${cleanPath}/main.css`
    }

    // With version - use versioned CSS from PROD CDN
    // Pattern: main-{version}.css (e.g., main-0.0.1-42.css)
    return `${componentCdnBase}/${cleanPath}/main-${version}.css`
  }, [componentCdnBase, componentPath, version])

  // Expose dependencies once on mount
  useEffect(() => {
    exposeRequiredDependencies()
  }, [])

  // Update component props when parent props change
  useEffect(() => {
    setComponentProps(prev => ({
      ...prev,
      accessToken,
      userInfo,
      additionalData,
      onClose,
      onTaskCompleted,
      onTaskUpdated
    }))
  }, [accessToken, userInfo, additionalData, onClose, onTaskCompleted, onTaskUpdated])

  // Token refresh handler - hot-swaps accessToken when Keycloak refreshes
  const handleTokenRefresh = useCallback(() => {
    // Try to get the latest token from globalThis (Keycloak stores it there)
    const globalAny = globalThis as any
    let latestToken: string | undefined

    // Priority 1: Keycloak instance token
    if (globalAny.keycloak?.token) {
      latestToken = globalAny.keycloak.token
    }
    // Priority 2: Session storage (mobile apps)
    else {
      try {
        latestToken = sessionStorage.getItem('com.newwork.mobile.accessToken') || undefined
      } catch {
        // Ignore sessionStorage errors
      }
    }

    // If we got a new token, hot-swap it
    if (latestToken && latestToken !== componentProps.accessToken) {
      console.log('[RemoteScreenLoader] Token refreshed, updating component props')
      setComponentProps(prev => ({
        ...prev,
        accessToken: latestToken
      }))
    }
  }, [componentProps.accessToken])

  // Listen for token refresh events
  useEffect(() => {
    // Handle Keycloak token refresh
    const onKeycloakRefresh = () => {
      console.log('[RemoteScreenLoader] Keycloak token refresh event received')
      handleTokenRefresh()
    }

    // Handle mobile token update
    const onMobileTokenUpdate = () => {
      console.log('[RemoteScreenLoader] Mobile token update event received')
      handleTokenRefresh()
    }

    // Add event listeners
    globalThis.addEventListener(TOKEN_REFRESH_EVENT, onKeycloakRefresh)
    globalThis.addEventListener(MOBILE_TOKEN_UPDATED_EVENT, onMobileTokenUpdate)

    // Cleanup on unmount
    return () => {
      globalThis.removeEventListener(TOKEN_REFRESH_EVENT, onKeycloakRefresh)
      globalThis.removeEventListener(MOBILE_TOKEN_UPDATED_EVENT, onMobileTokenUpdate)
    }
  }, [handleTokenRefresh])

  // Load CSS when cssUrl changes (matching gravity-platform pattern)
  useEffect(() => {
    if (!cssUrl || !componentName) {
      return
    }

    const versionSuffix = version ? `-${version}` : ''
    const linkId = `remote-component-css-${componentName}${versionSuffix}`

    // Check if this exact version's CSS is already loaded
    const existingLink = document.getElementById(linkId)
    if (existingLink) {
      return // CSS for this exact version is already loaded
    }

    // Clean up any existing CSS for this component (different versions only)
    const existingLinks = document.querySelectorAll(`link[id^="remote-component-css-${componentName}"]`)
    existingLinks.forEach(link => {
      if (link.id !== linkId) {
        console.log(`[RemoteScreenLoader] Removing old CSS for component: ${componentName}`)
        link.remove()
      }
    })

    // Create a link element for the CSS with version-specific ID
    const linkElement = document.createElement('link')
    linkElement.rel = 'stylesheet'
    linkElement.href = cssUrl
    linkElement.id = linkId
    linkElement.dataset.componentPath = componentPath
    linkElement.dataset.componentName = componentName
    linkElement.dataset.componentVersion = version || 'latest'

    // Handle CSS load errors gracefully (non-blocking)
    linkElement.onerror = () => {
      console.warn(`[RemoteScreenLoader] CSS failed to load: ${cssUrl}`)
    }

    // Add the link element to the document head
    document.head.appendChild(linkElement)
    console.log(`[RemoteScreenLoader] CSS loaded: ${cssUrl}`)

    // No cleanup function - CSS stays loaded for performance
    // Only gets removed when a different version is loaded
  }, [cssUrl, componentPath, componentName, version])

  // Clean up stale cache when switching between different versions or cache keys
  useEffect(() => {
    const prevVersion = prevVersionRef.current
    const currVersion = version
    const prevKey = prevCacheKeyRef.current
    const currKey = cacheKey

    // Clean up if version changed
    if (prevVersion !== undefined && currVersion !== undefined && prevVersion !== currVersion) {
      try {
        console.log(`[RemoteScreenLoader] Version changed from ${prevVersion} to ${currVersion}, cleaning up cache`)
        delete (globalThis as any)[cacheKey]
      } catch {
        // Ignore cleanup errors
      }
    }

    // Clean up old cache key if it changed
    if (prevKey !== undefined && currKey !== undefined && prevKey !== currKey) {
      try {
        console.log(`[RemoteScreenLoader] Cache key changed from ${prevKey} to ${currKey}, cleaning up old cache`)
        delete (globalThis as any)[prevKey]
        // Also remove the old script
        const oldScript = document.querySelector(`script[data-component-key="${prevKey}"]`)
        if (oldScript) {
          oldScript.remove()
        }
      } catch {
        // Ignore cleanup errors
      }
    }

    prevVersionRef.current = currVersion
    prevCacheKeyRef.current = currKey
  }, [version, cacheKey])

  // Load the component when path, version, or cacheKey changes
  useEffect(() => {
    // Don't load if still waiting for metadata or no componentPath
    if (isLoadingMetadata || !componentPath) {
      return
    }

    const loadComponent = async () => {
      try {
        // FIRST: Check if component is already available in globalThis
        // This handles the case when reopening the same screen
        const existingComponent = (globalThis as any)[cacheKey]
        if (existingComponent && typeof existingComponent === 'function') {
          console.log(`[RemoteScreenLoader] Component ${cacheKey} already available, using cached version`)
          setComponent(() => existingComponent)
          setError(null)
          setLoading(false)
          return
        }

        setLoading(true)
        setError(null)
        setComponent(null) // Reset component to show spinner

        console.log(
          `[RemoteScreenLoader] Loading component: ${componentName} (key: ${cacheKey}) from ${componentCdnBase}`,
          version ? `(version: ${version})` : '(no version - dev mode)'
        )

        // Load the component from CDN
        await loadRemoteComponent({
          componentPath,
          componentName,
          version,
          componentCdnBase,
          cacheKey, // Pass cacheKey for isolation
          timeout: 15000 // 15 second timeout (matching platform)
        })

        // Get the loaded component from globalThis (use cacheKey)
        const loadedComponent = (globalThis as any)[cacheKey]

        if (!loadedComponent) {
          throw new Error(
            `Component "${cacheKey}" not found on window after loading. Screen may not be published correctly.`
          )
        }

        setComponent(() => loadedComponent)
        setError(null) // Clear any previous errors
        console.log(`[RemoteScreenLoader] Component ${cacheKey} loaded successfully`)
      } catch (err) {
        console.error('❌ [RemoteScreenLoader]', err)
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        setError(errorMessage)
        setComponent(null)
      } finally {
        setLoading(false)
      }
    }

    loadComponent()
  }, [componentPath, componentName, version, componentCdnBase, cacheKey, isLoadingMetadata])

  // Retry handler for error state
  const handleRetry = () => {
    // Clean up component from cache to force fresh load
    try {
      delete (globalThis as any)[cacheKey]
      // Also remove the script to force reload
      const oldScript = document.querySelector(`script[data-component-key="${cacheKey}"]`)
      if (oldScript) {
        oldScript.remove()
      }
    } catch {
      // Ignore
    }
    setError(null)
    setLoading(true)
    // Re-trigger the load effect by clearing and re-setting
    setComponent(null)
  }

  // Show loading spinner while metadata is loading or component is loading
  if (isLoadingMetadata || loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:min-h-[200px]">
        <Spinner size="lg" />
      </div>
    )
  }

  // Show error state with retry option
  if (error) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:min-h-[200px] gba:p-6">
        <Alert variant="destructive" className="gba:max-w-md">
          <AlertCircle className="gba:h-4 gba:w-4" />
          <AlertTitle>Failed to load screen</AlertTitle>
          <AlertDescription className="gba:mt-2">
            <p className="gba:mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={handleRetry} className="gba:gap-2">
              <RefreshCw className="gba:h-4 gba:w-4" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Show message if no component loaded (shouldn't happen normally)
  if (!component) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:min-h-[200px]">
        <Spinner size="lg" />
      </div>
    )
  }

  // Render the loaded component with all required props (using state for hot-swap support)
  const LoadedComponent = component

  return (
    <div className="gba:animate-in gba:fade-in gba:duration-300 gba:pt-0 gba:px-0 gba:pb-0 gba:relative gba:h-full gba:flex gba:flex-col">
      <LoadedComponent
        accessToken={componentProps.accessToken}
        userInfo={componentProps.userInfo}
        additionalData={componentProps.additionalData}
        onClose={componentProps.onClose}
        onTaskCompleted={componentProps.onTaskCompleted}
        onTaskUpdated={componentProps.onTaskUpdated}
      />
    </div>
  )
}
