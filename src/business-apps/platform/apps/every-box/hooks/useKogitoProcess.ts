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
  domain: string
  processName: string
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
  if (!processInstanceId && task.sourceMetadata?.endpoint) {
    try {
      const endpoint = task.sourceMetadata.endpoint as string
      const url = new URL(endpoint.startsWith('http') ? endpoint : `https://example.com${endpoint}`)
      const pathSegments = url.pathname.split('/').filter(Boolean)

      // processInstanceId is typically the 3rd segment (after 'processes', domain, processName)
      if (pathSegments.length >= 4 && pathSegments[0] === 'processes') {
        processInstanceId = pathSegments[3]
        console.log('[useKogitoProcess] Extracted processInstanceId from endpoint:', processInstanceId)
      }
    } catch (error) {
      console.warn('[useKogitoProcess] Failed to extract processInstanceId from endpoint:', error)
    }
  }

  // Debug: Log task structure to help find processInstanceId and endpoint
  console.log('[useKogitoProcess] Task structure:', {
    taskId: task.id,
    hasSourceMetadata: !!task.sourceMetadata,
    endpoint: task.sourceMetadata?.endpoint,
    sourceMetadata: task.sourceMetadata,
    taskName: task.name,
    taskReferenceName: (task as any).referenceName,
    processInstanceId: processInstanceId,
    fullTask: task
  })

  /**
   * Continue the Kogito process with the provided payload
   * Makes direct HTTP POST to Kogito task completion endpoint
   * Endpoint: /processes/{domain}/{processName}/{processId}/{taskName}/{taskId}?phase=complete&user={userId}
   */
  const continueProcess = useCallback(
    async ({ domain, processName, payload }: ContinueProcessOptions) => {
      if (!processInstanceId) {
        const error = new Error('Cannot complete task: missing process instance ID')
        console.error('[useKogitoProcess] Missing processInstanceId - Full task:', task)
        message.error(error.message)
        onError?.(error)
        return Promise.reject(error)
      }

      // Extract taskName from endpoint URL, or use task.name or task.referenceName as fallback
      let taskName = 'Task'

      // Try to extract from endpoint URL first
      if (task.sourceMetadata?.endpoint) {
        try {
          const endpoint = task.sourceMetadata.endpoint as string
          // Parse URL to get pathname, handling both full URLs and path-only strings
          let pathname = endpoint
          if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
            pathname = new URL(endpoint).pathname
          }

          const pathSegments = pathname.split('/').filter(Boolean)
          // Pathname format: /processes/{domain}/{processName}/{processInstanceId}/{taskName}/{taskId}
          // After splitting: ['processes', 'domain', 'processName', 'processInstanceId', 'taskName', 'taskId']
          // Task name is the 5th segment (index 4)
          if (pathSegments.length >= 6 && pathSegments[0] === 'processes') {
            taskName = pathSegments[4]
            console.log('[useKogitoProcess] Extracted taskName from endpoint:', taskName)
          }
        } catch (error) {
          console.warn('[useKogitoProcess] Failed to extract taskName from endpoint:', error)
        }
      }

      // If extraction failed, try task.name or task.referenceName
      if (taskName === 'Task') {
        if (task.name) {
          taskName = task.name
          console.log('[useKogitoProcess] Using task.name as taskName:', taskName)
        } else if ((task as any).referenceName) {
          taskName = (task as any).referenceName
          console.log('[useKogitoProcess] Using task.referenceName as taskName:', taskName)
        }
      }

      // Extract userId from JWT token (sub claim)
      let userId = ''
      try {
        const tokenParts = accessToken.split('.')
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]))
          userId = payload.sub || ''
        }
      } catch (error) {
        console.warn('[useKogitoProcess] Failed to extract userId from token:', error)
      }

      // Build the Kogito task completion endpoint (matching gravity-platform pattern)
      const kogitoBaseUrl = env('NEXT_PUBLIC_NEWWORK_PLATFORM_API_URL') || 'https://newwork-dev.newwork.com'
      const completionEndpoint = `${kogitoBaseUrl}/processes/${domain}/${processName}/${processInstanceId}/${taskName}/${task.id}`

      console.log('[useKogitoProcess] Completing Kogito task (direct HTTP):', {
        domain,
        processName,
        processInstanceId,
        taskName,
        taskId: task.id,
        userId,
        endpoint: completionEndpoint,
        payload
      })

      try {
        const response = await fetch(`${completionEndpoint}?phase=complete${userId ? `&user=${userId}` : ''}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }

        const result = await response.json()
        console.log('[useKogitoProcess] Task completed successfully:', result)

        // Call success callback
        onSuccess?.()
        return Promise.resolve(result)
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error')
        console.error('[useKogitoProcess] Error completing task:', err)
        message.error(`Failed to complete task: ${err.message}`)
        onError?.(err)
        return Promise.reject(err)
      }
    },
    [processInstanceId, task, accessToken, onSuccess, onError]
  )

  return {
    processInstanceId,
    hasProcessInstanceId: !!processInstanceId,
    continueProcess
  }
}
