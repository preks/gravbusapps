/**
 * useKogitoProcess Hook
 * Common hook for continuing/completing Kogito processes from EveryBox
 * Handles processInstanceId extraction and process continuation logic
 */

import { useCallback } from 'react'
import { message } from 'antd'
import { UnifiedTask } from '../types'
import { env } from '@/common/env/EnvUtils'

interface UseKogitoProcessOptions {
  task: UnifiedTask
  accessToken: string
  onSuccess?: () => void
  onError?: (error: Error) => void
}

interface ContinueProcessOptions {
  domain?: string // Optional - hook uses original endpoint from task.sourceMetadata
  processName?: string // Optional - hook uses original endpoint from task.sourceMetadata
  payload: Record<string, any>
  skipScreen?: boolean
}

export const useKogitoProcess = ({ task, accessToken, onSuccess, onError }: UseKogitoProcessOptions) => {
  // Extract processInstanceId from various possible locations
  let processInstanceId =
    task.sourceMetadata?.processInstanceId ||
    (task as any).processInstanceId ||
    (task.sourceMetadata as any)?.processId ||
    (task as any).processId

  // If not found in metadata, try to extract from endpoint URL
  // Endpoint format: /processes/{domain}/{processName}/{processInstanceId}/{taskName}/{taskId}
  // SPECIAL CASE: For nested processes, there may be multiple UUIDs - use the LAST UUID (second-to-last segment is taskName, last is taskId, before taskName is processInstanceId)
  if (!processInstanceId && task.sourceMetadata?.endpoint) {
    try {
      const endpoint = task.sourceMetadata.endpoint as string
      const url = new URL(endpoint.startsWith('http') ? endpoint : `https://example.com${endpoint}`)
      const pathSegments = url.pathname.split('/').filter(Boolean)

      // For standard format: /processes/{domain}/{processName}/{processInstanceId}/{taskName}/{taskId}
      // processInstanceId is the 3rd segment (index 3)
      // For nested format: /processes/{domain}/{processName1}/{id1}/{processName2}/{id2}
      // We need the FIRST UUID after processName (index 3), as that's the root process instance
      if (pathSegments.length >= 4 && pathSegments[0] === 'processes') {
        processInstanceId = pathSegments[3]
      }
    } catch {
      // Ignore URL parsing errors
    }
  }

  /**
   * Continue the Kogito process with the provided payload
   * Makes direct HTTP POST to Kogito task completion endpoint
   * Uses the original endpoint from task.sourceMetadata if available
   * Endpoint: /processes/{domain}/{processName}/{processId}/{taskName}/{taskId}?phase=complete&user={userId}
   */
  const continueProcess = useCallback(
    async ({ domain, processName, payload }: ContinueProcessOptions) => {
      // Extract userId from JWT token (sub claim)
      let userId = ''
      try {
        const tokenParts = accessToken.split('.')
        if (tokenParts.length === 3) {
          const tokenPayload = JSON.parse(atob(tokenParts[1]))
          userId = tokenPayload.sub || ''
        }
      } catch {
        // Ignore token parsing errors
      }

      // Build the completion endpoint
      let completionEndpoint = ''
      const kogitoBaseUrl = env('NEXT_PUBLIC_BASE_URL')

      // CRITICAL: Use the original endpoint from task.sourceMetadata if available
      // This ensures we use the exact endpoint that the backend expects
      if (task.sourceMetadata?.endpoint) {
        const originalEndpoint = task.sourceMetadata.endpoint as string

        // Parse the endpoint to ensure it's a proper URL
        if (originalEndpoint.startsWith('http://') || originalEndpoint.startsWith('https://')) {
          // Full URL provided - use the pathname only
          const parsedUrl = new URL(originalEndpoint)
          completionEndpoint = parsedUrl.pathname
        } else {
          // Relative path provided - use as is
          completionEndpoint = originalEndpoint
        }

        // Ensure the endpoint starts with /
        if (!completionEndpoint.startsWith('/')) {
          completionEndpoint = `/${completionEndpoint}`
        }

        // Build full URL
        completionEndpoint = `${kogitoBaseUrl}${completionEndpoint}`
      } else {
        // Fallback: Build endpoint manually if no original endpoint available
        if (!processInstanceId) {
          const error = new Error('Cannot complete task: missing process instance ID and no original endpoint')
          message.error(error.message)
          onError?.(error)
          throw error
        }

        // Extract taskName from task
        const taskName = task.name || (task as any).referenceName || 'Task'

        completionEndpoint = `${kogitoBaseUrl}/processes/${domain}/${processName}/${processInstanceId}/${taskName}/${task.id}`
      }

      const userParam = userId ? `&user=${userId}` : ''
      const response = await fetch(`${completionEndpoint}?phase=complete${userParam}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorText = await response.text()
        const err = new Error(`HTTP ${response.status}: ${errorText}`)
        message.error(`Failed to complete task: ${err.message}`)
        onError?.(err)
        throw err
      }

      const result = await response.json()

      // Call success callback
      onSuccess?.()
      return result
    },
    [processInstanceId, task, accessToken, onSuccess, onError]
  )

  return {
    processInstanceId,
    hasProcessInstanceId: !!processInstanceId,
    continueProcess
  }
}
