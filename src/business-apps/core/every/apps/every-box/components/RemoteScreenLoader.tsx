import React, { useState, useEffect, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  loadRemoteComponent,
  exposeRequiredDependencies
} from '@/common/loaders/remote-component-loader/remoteComponentLoader'

interface RemoteScreenLoaderProps extends BusinessAppContextProps {
  componentPath: string
  version?: string
  onClose: () => void
  onTaskCompleted?: (taskId: string) => void
  onTaskUpdated: () => void
  isLoadingMetadata?: boolean // Flag to show spinner while parent is loading metadata
}

/**
 * RemoteScreenLoader - Loads native screens dynamically from CDN
 *
 * This component uses the platform's remote component loading system to dynamically
 * load and render native screens from CDN in both development and production.
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
  isLoadingMetadata = false
}) => {
  const [loading, setLoading] = useState(false)
  const [component, setComponent] = useState<React.ComponentType<any> | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  // CDN base URL (use dev CDN for now, can be configured)
  const CDN_BASE = useMemo(() => {
    return process.env.NODE_ENV === 'production'
      ? 'https://nwcdndevfiles.blob.core.windows.net/screens' // TODO: Switch to prod CDN when ready
      : 'https://nwcdndevfiles.blob.core.windows.net/screens'
  }, [])

  // Expose dependencies once on mount
  useEffect(() => {
    exposeRequiredDependencies()
  }, [])

  // Load the component when path or version changes
  useEffect(() => {
    // Don't load if still waiting for metadata or no componentPath
    if (isLoadingMetadata || !componentPath) {
      return
    }

    const loadComponent = async () => {
      try {
        setLoading(true)
        setError(null)
        setComponent(null) // Reset component to show spinner

        // Load the component from CDN
        await loadRemoteComponent({
          componentPath,
          componentName,
          version,
          componentCdnBase: CDN_BASE,
          timeout: 10000 // 10 second timeout
        })

        // Get the loaded component from window
        const loadedComponent = (window as any)[componentName]

        if (!loadedComponent) {
          throw new Error(
            `Component "${componentName}" not found on window after loading. Screen may not be published correctly.`
          )
        }

        setComponent(() => loadedComponent)
        setError(null) // Clear any previous errors
      } catch (err) {
        // Enhanced error message for dev overrides
        const cdnUrl = `${CDN_BASE}/${componentPath}/index.js`
        const enhancedErrorMessage =
          `Failed to load component "${componentName}" from CDN.\n\n` +
          `CDN URL: ${cdnUrl}\n\n` +
          `This component may not be published to the dev CDN yet.\n` +
          `To fix this, publish the form using:\n` +
          `npm run publish:screen hr/absences/forms/${componentPath.split('/').pop()}\n\n` +
          `Original error: ${err instanceof Error ? err.message : 'Unknown error'}`

        console.error('❌ [RemoteScreenLoader]', enhancedErrorMessage)
        setError(enhancedErrorMessage)
        setComponent(null) // Clear component on error
      } finally {
        setLoading(false)
      }
    }

    loadComponent()
  }, [componentPath, componentName, version, CDN_BASE, isLoadingMetadata])

  // Don't render anything while loading or if there's an error
  if (isLoadingMetadata || loading || !component || error) {
    return null
  }

  // Render the loaded component with all required props
  const LoadedComponent = component

  return (
    <div className="gba:animate-in gba:fade-in gba:duration-300 gba:pt-0 gba:px-0 gba:pb-0 gba:relative gba:h-full gba:flex gba:flex-col">
      <LoadedComponent
        accessToken={accessToken}
        userInfo={userInfo}
        additionalData={additionalData}
        onClose={onClose}
        onTaskCompleted={onTaskCompleted}
        onTaskUpdated={onTaskUpdated}
      />
    </div>
  )
}
