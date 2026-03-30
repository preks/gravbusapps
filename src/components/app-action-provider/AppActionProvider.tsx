'use client'

import React, { useState, useCallback } from 'react'
import { useAppActionData, extractAppActionProps, type AppActionCommonProps } from '@/common/hooks/useAppActionData'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { startProcess, getPlatformContext } from '@/common/utils/start-process'

const PROCESS_COMPLETION_TIMEOUT_MESSAGE = 'Process completion timeout'

export interface AppActionContext {
  /**
   * Available app actions
   */
  appActions: any[]

  /**
   * Function to execute a process with payload
   */
  executeAction: (payload: any) => Promise<void>

  /**
   * Whether the provider is loading app actions
   */
  isLoading: boolean

  /**
   * Whether a process is currently executing
   */
  isProcessing: boolean
}

export interface AppActionProviderProps
  extends BusinessAppContextProps,
    Omit<AppActionCommonProps, 'accessToken' | 'emptyStateBehavior'> {
  /**
   * Children can be React nodes or a function receiving the app action context
   */
  children: React.ReactNode | ((context: AppActionContext) => React.ReactNode)

  /**
   * Callback when process execution succeeds
   */
  onSuccess?: (payload: any) => void

  /**
   * Callback when process execution fails
   */
  onError?: (error: Error) => void

  /**
   * Custom data transformation before process execution
   */
  transformData?: (data: any) => any
}

const DATA_TEST_ID_PREFIX = 'AppActionProvider'

/**
 * AppActionProvider
 * A wrapper component that fetches app action data and provides process execution capabilities.
 * Does not impose any UI structure - consumer is responsible for rendering their own UI.
 */
export const AppActionProvider: React.FC<AppActionProviderProps> = props => {
  const { appActionConfig, cleanProps } = extractAppActionProps(props)

  // Force specific config for AppActionProvider
  const forcedConfig = {
    ...appActionConfig,
    accessToken: props.accessToken,
    deferMainContextRequestsUntilClick: false as const,
    emptyStateBehavior: 'hide' as const
  }

  const { combinedData, isLoading: isActionLoading } = useAppActionData(forcedConfig, DATA_TEST_ID_PREFIX)

  const { children, onSuccess, onError, transformData } = cleanProps as Omit<
    AppActionProviderProps,
    keyof AppActionCommonProps
  >

  const [isProcessing, setIsProcessing] = useState(false)

  const executeAction = useCallback(
    async (payload: any) => {
      try {
        setIsProcessing(true)

        // Transform data if transformation function provided
        const finalData = transformData ? transformData(payload) : payload

        // Get the first available action
        const first = combinedData[0] as any
        if (!first?.processName || !first?.domain) {
          throw new Error('No valid app action available')
        }

        // Merge the original payload with the provided data
        const mergedPayload = {
          ...first.payload,
          ...finalData
        }

        // Create promise that waits for process completion
        const waitForProcessCompletion = new Promise<void>((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            cleanup()
            reject(new Error(PROCESS_COMPLETION_TIMEOUT_MESSAGE))
          }, 30000)

          const handleProcessCompletion = () => {
            cleanup()
            resolve()
          }

          const cleanup = () => {
            clearTimeout(timeoutId)
            window.removeEventListener('com.newwork.process.processCompletion', handleProcessCompletion)
            window.removeEventListener('com.newwork.process.taskCompletion', handleProcessCompletion)
          }

          window.addEventListener('com.newwork.process.processCompletion', handleProcessCompletion)
          window.addEventListener('com.newwork.process.taskCompletion', handleProcessCompletion)
        })

        // Start process with skipScreen=true and merged payload
        startProcess({
          processName: first.processName,
          domain: first.domain,
          payload: {
            ...getPlatformContext(),
            ...mergedPayload
          },
          builderType: first.builderType || 'NATIVE_SCREEN',
          skipScreen: true,
          targetDesktop: first.targetDesktop,
          targetMobile: first.targetMobile
        } as any)

        const allowTimeoutFallback = first.contextName === 'contentEntryReact'

        // Wait for the process to complete when the platform emits the completion signal.
        // Some lightweight actions (such as content reactions) finish server-side without
        // dispatching a completion event, so their timeout should not be treated as failure.
        try {
          await waitForProcessCompletion
        } catch (error) {
          const timeoutError =
            error instanceof Error && error.message === PROCESS_COMPLETION_TIMEOUT_MESSAGE

          if (!timeoutError || !allowTimeoutFallback) {
            throw error
          }
        }

        if (onSuccess) {
          onSuccess(finalData)
        }
      } catch (error) {
        if (onError) {
          onError(error instanceof Error ? error : new Error('An unexpected error occurred'))
        }
        throw error
      } finally {
        setIsProcessing(false)
      }
    },
    [combinedData, transformData, onSuccess, onError]
  )

  // If no actions available, don't render
  if (combinedData.length === 0) {
    return null
  }

  const context: AppActionContext = {
    appActions: combinedData,
    executeAction,
    isLoading: isActionLoading,
    isProcessing
  }

  return <>{typeof children === 'function' ? children(context) : children}</>
}

export default AppActionProvider
