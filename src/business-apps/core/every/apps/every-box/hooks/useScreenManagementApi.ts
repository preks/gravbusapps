import { useCallback } from 'react'
import { env } from '@/common/env/EnvUtils'

interface ScreenMetadata {
  screenKey: string
  componentPath?: string // Optional - only for NATIVE_SCREEN
  version?: string // Optional - only for NATIVE_SCREEN
  builderType: 'NATIVE_SCREEN' | 'LOWCODER'
  // LOWCODER-specific fields
  appId?: string
  appName?: string
}

export const useScreenManagementApi = (accessToken: string) => {
  const fetchScreenByKey = useCallback(
    async (screenKey: string): Promise<ScreenMetadata | null> => {
      try {
        const response = await fetch(
          env('NEXT_PUBLIC_SCREEN_MANAGEMENT_SERVICE_API') + '/screen?screenKey=' + screenKey,
          {
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        )

        if (response.ok) {
          const responseData = await response.json()

          // Check if response has data array
          if (!Array.isArray(responseData?.data) || responseData.data.length === 0) {
            return null
          }

          // Get the first screen from the data array
          const data = responseData.data[0]

          // Check if screen was found
          if (!data?.screenKey) {
            return null
          }

          // Extract builderType from screenComponents
          const builderType = data.screenComponents?.builderType as 'NATIVE_SCREEN' | 'LOWCODER' | undefined

          if (!builderType) {
            return null
          }

          // Handle LOWCODER screens
          if (builderType === 'LOWCODER') {
            return {
              screenKey: data.screenKey,
              builderType: 'LOWCODER' as const,
              appId: data.screenComponents?.appId,
              appName: data.screenComponents?.appName || data.name
            }
          }

          // Handle NATIVE_SCREEN screens
          if (builderType === 'NATIVE_SCREEN') {
            let componentPath: string | undefined
            let version: string | undefined

            // Check for screenComponents.formDefinition structure
            if (data.screenComponents?.formDefinition) {
              componentPath = data.screenComponents.formDefinition.componentPath
              version = data.screenComponents.formDefinition.version
            }
            // Check for direct properties
            else if (data.componentPath) {
              componentPath = data.componentPath
              version = data.version || '1'
            }

            if (!componentPath) {
              return null
            }

            return {
              screenKey: data.screenKey,
              componentPath,
              version,
              builderType: 'NATIVE_SCREEN' as const
            }
          }

          return null
        }

        return null
      } catch {
        return null
      }
    },
    [accessToken]
  )

  return { fetchScreenByKey }
}
