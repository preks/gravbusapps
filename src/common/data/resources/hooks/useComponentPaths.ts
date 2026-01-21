import { useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { env } from '@/common/env/EnvUtils'

interface ComponentPathVersionInfo {
  versions: string[] // ["123", "124", "125"] from index-{version}.js
  hasUnversioned: boolean // true if index.js exists
}

interface UseComponentPathsResult {
  componentPathVersions: Map<string, ComponentPathVersionInfo> // Map<componentPath, ComponentPathVersionInfo>
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook to fetch component path versions from Azure Storage (DEV and PROD)
 * Uses Azure Storage REST API directly (not SDK, as SDK doesn't work in browser due to CORS)
 *
 * NOTE: Loads ALL blobs in container, not just for specific componentPaths
 * componentPaths parameter is kept for future filtering but not used currently
 */
export const useComponentPaths = (
  context: BusinessAppContextProps,
  componentPaths: string[],
  environment: 'dev' | 'prod' = 'dev'
): UseComponentPathsResult => {
  const [componentPathVersions, setComponentPathVersions] = useState<Map<string, ComponentPathVersionInfo>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchComponentPathVersions = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Get Azure Storage credentials from environment using env() function (same pattern as other clients)
      // Support both DEV and PROD variants
      const accountName =
        environment === 'prod'
          ? env('NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT_PROD')
          : env('NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT_DEV')

      const sasToken =
        environment === 'prod'
          ? env('NEXT_PUBLIC_AZURE_STORAGE_SAS_TOKEN_PROD')
          : env('NEXT_PUBLIC_AZURE_STORAGE_SAS_TOKEN_DEV')

      const containerName = env('NEXT_PUBLIC_AZURE_BLOB_CONTAINER_NAME') || 'screens'

      if (!accountName || !sasToken) {
        throw new Error(
          `Azure Storage credentials not configured for ${environment.toUpperCase()}. Please set NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT_${environment.toUpperCase()} and NEXT_PUBLIC_AZURE_STORAGE_SAS_TOKEN_${environment.toUpperCase()} in environment variables or window.nw-envs`
        )
      }

      // Use Azure Storage REST API directly (same pattern as BusinessAppIDE.tsx)
      // Format: https://{accountName}.blob.core.windows.net/{containerName}?restype=container&comp=list&{sasToken}
      // Note: CORS must be enabled on Azure Storage to allow these requests
      // Azure Storage List Blobs API returns max 5000 blobs per request, so we need to paginate

      const versionsMap = new Map<string, ComponentPathVersionInfo>()
      let blobCount = 0
      const sampleBlobNames: string[] = []
      const indexBlobNames: string[] = []
      let marker: string | null = null

      // Paginate through all blobs using NextMarker continuation token
      do {
        const markerParam = marker ? `&marker=${encodeURIComponent(marker)}` : ''
        const listBlobsUrl = `https://${accountName}.blob.core.windows.net/${containerName}?restype=container&comp=list${markerParam}&${sasToken}`

        const response = await fetch(listBlobsUrl, {
          method: 'GET',
          mode: 'cors',
          headers: {
            'x-ms-version': '2021-04-10'
          }
        })

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error')
          throw new Error(`Failed to list blobs: ${response.status} ${response.statusText}. ${errorText}`)
        }

        const xmlText = await response.text()

        // Parse XML response
        const parser = new DOMParser()
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml')

        // Check for XML parsing errors
        const parseError = xmlDoc.querySelector('parsererror')
        if (parseError) {
          throw new Error(`Failed to parse XML response: ${parseError.textContent}`)
        }

        // Extract NextMarker for pagination
        const nextMarkerElement = xmlDoc.getElementsByTagName('NextMarker')[0]
        marker = nextMarkerElement?.textContent || null

        const blobElements = xmlDoc.getElementsByTagName('Blob')

        // Iterate through all blobs from this page
        for (let i = 0; i < blobElements.length; i++) {
          const blobElement = blobElements[i]
          const nameElement = blobElement.getElementsByTagName('Name')[0]
          if (!nameElement || !nameElement.textContent) continue

          const blobName = nameElement.textContent
          blobCount++

          // Log first 20 blob names to understand the format
          if (blobCount <= 20) {
            sampleBlobNames.push(blobName)
          }

          // Collect all blobs containing "index" for debugging
          if (blobName.includes('index')) {
            indexBlobNames.push(blobName)
          }

          // Match patterns:
          // 1. {componentPath}/index-{version}.js (versioned - can have multiple)
          // 2. {componentPath}/index.js (unversioned)
          const indexVersionMatch = blobName.match(/^(.+)\/index-(\d+)\.js$/)
          const indexUnversionedMatch = blobName.match(/^(.+)\/index\.js$/)

          if (indexVersionMatch) {
            const componentPath = indexVersionMatch[1]
            const version = indexVersionMatch[2]

            // Initialize if doesn't exist
            if (!versionsMap.has(componentPath)) {
              versionsMap.set(componentPath, { versions: [], hasUnversioned: false })
            }

            // Add version to array (avoid duplicates)
            const info = versionsMap.get(componentPath)!
            if (!info.versions.includes(version)) {
              info.versions.push(version)
            }
          } else if (indexUnversionedMatch) {
            const componentPath = indexUnversionedMatch[1]

            // Initialize if doesn't exist
            if (!versionsMap.has(componentPath)) {
              versionsMap.set(componentPath, { versions: [], hasUnversioned: false })
            }

            // Mark as having unversioned index.js
            versionsMap.get(componentPath)!.hasUnversioned = true
          }
        }
      } while (marker)

      setComponentPathVersions(versionsMap)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch component path versions'
      setError(errorMessage)
      setComponentPathVersions(new Map())
    } finally {
      setIsLoading(false)
    }
  }, [environment])

  // Don't load automatically - only when refetch() is called
  // This enables lazy loading for comboboxes

  return {
    componentPathVersions,
    isLoading,
    error,
    refetch: fetchComponentPathVersions
  }
}
