import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { X } from 'lucide-react'
import { Button, Spinner } from '@newwork/nw-design-system'
import { useScreenManagementApi } from '@/business-apps/core/every/apps/every-box/hooks/useScreenManagementApi'
import { RemoteScreenLoader } from '@/business-apps/core/every/apps/every-box/components/RemoteScreenLoader'
import { LowcoderScreenLoader } from '@/business-apps/core/every/apps/every-box/components/LowcoderScreenLoader'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface RemoteFormDisplayProps extends BusinessAppContextProps {
  screenKey: string
  formData?: Record<string, any>
  onClose?: () => void
  sendMessage?: (message: string, files: File[]) => void
  flowName?: string
  moduleName?: string
  flowUuid?: string
}

/**
 * RemoteFormDisplay - Displays a form from the screen management API
 * Properly handles authentication by fetching screen metadata first,
 * then rendering the appropriate loader component (RemoteScreenLoader or LowcoderScreenLoader)
 */
export const RemoteFormDisplay: React.FC<RemoteFormDisplayProps> = ({
  screenKey,
  accessToken,
  userInfo,
  formData = {},
  onClose,
  sendMessage,
  flowName,
  moduleName,
  flowUuid
}) => {
  const [screenMetadata, setScreenMetadata] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { fetchScreenByKey } = useScreenManagementApi(accessToken)
  const hasSubmittedRef = useRef(false)
  const hasCancelledRef = useRef(false)

  const normalizedFormData = useMemo(() => {
    const base = typeof formData === 'object' && formData !== null ? { ...formData } : {}
    const baseFlow = typeof base.flow === 'object' && base.flow !== null ? { ...base.flow } : {}
    const baseContentEntry =
      typeof base.contentEntry === 'object' && base.contentEntry !== null
        ? { ...base.contentEntry }
        : typeof baseFlow.contentEntry === 'object' && baseFlow.contentEntry !== null
          ? { ...baseFlow.contentEntry }
          : null

    if (!baseContentEntry) {
      return base
    }

    return {
      ...baseContentEntry,
      ...base,
      contentEntry: baseContentEntry,
      flow: {
        ...baseFlow,
        contentEntry: baseContentEntry
      }
    }
  }, [formData])

  useEffect(() => {
    hasSubmittedRef.current = false
  }, [screenKey, flowUuid])

  const handleFormSubmission = useCallback(
    (payload?: unknown) => {
      if (!sendMessage || hasSubmittedRef.current) return

      const baseFlow =
        typeof normalizedFormData?.flow === 'object' && normalizedFormData?.flow !== null
          ? { ...normalizedFormData.flow }
          : {}
      const baseContentEntry =
        typeof baseFlow.contentEntry === 'object' && baseFlow.contentEntry !== null
          ? { ...baseFlow.contentEntry }
          : null

      let nextFlow = { ...baseFlow }
      let nextTask: Record<string, any> | undefined

      const payloadObj = payload && typeof payload === 'object' ? (payload as Record<string, any>) : null
      if (payloadObj) {
        if (typeof payloadObj.flow === 'object' && payloadObj.flow !== null) {
          nextFlow = { ...nextFlow, ...(payloadObj.flow as Record<string, any>) }
        } else if (typeof payloadObj.contentEntry === 'object' && payloadObj.contentEntry !== null) {
          nextFlow = {
            ...nextFlow,
            contentEntry: {
              ...(baseContentEntry || {}),
              ...(payloadObj.contentEntry as Record<string, any>)
            }
          }
        } else {
          // Treat payload as a direct content entry payload
          nextFlow = baseContentEntry
            ? {
                ...nextFlow,
                contentEntry: {
                  ...baseContentEntry,
                  ...(payloadObj as Record<string, any>)
                }
              }
            : { ...nextFlow, ...(payloadObj as Record<string, any>) }
        }

        if (typeof payloadObj.task === 'object' && payloadObj.task !== null) {
          nextTask = payloadObj.task as Record<string, any>
        }
      }

      const message = JSON.stringify(
        {
          action: 'form_submission',
          flow_name: flowName || '',
          module_name: moduleName || '',
          uuid: flowUuid || '',
          data: {
            flow: nextFlow,
            ...(nextTask ? { task: nextTask } : {})
          }
        },
        null,
        2
      )

      sendMessage(message, [])
      hasSubmittedRef.current = true
    },
    [sendMessage, normalizedFormData, flowName, moduleName, flowUuid]
  )

  const handleFormCancel = useCallback(() => {
    if (!sendMessage || hasCancelledRef.current) return
    const cancelMessage = JSON.stringify({
      action: 'form_cancel',
      flow_name: flowName || '',
      module_name: moduleName || '',
      uuid: flowUuid || '',
      userMessage: `Cancelled: ${flowName || screenKey}`
    })
    sendMessage(cancelMessage, [])
    hasCancelledRef.current = true
  }, [sendMessage, flowName, moduleName, flowUuid, screenKey])

  useEffect(() => {
    const loadScreenMetadata = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch screen metadata using authenticated API
        const metadata = await fetchScreenByKey(screenKey)

        if (!metadata) {
          setError(`Screen "${screenKey}" not found`)
          setIsLoading(false)
          return
        }

        // Validate metadata structure
        if (metadata.builderType === 'NATIVE_SCREEN' && !metadata.componentPath) {
          console.error('[RemoteFormDisplay] Invalid metadata: NATIVE_SCREEN without componentPath', metadata)
          setError(`Screen "${screenKey}" has invalid metadata: missing componentPath`)
          setIsLoading(false)
          return
        }

        if (metadata.builderType === 'LOWCODER' && !metadata.appId) {
          setError(`Screen "${screenKey}" has invalid metadata: missing appId`)
          setIsLoading(false)
          return
        }
        setScreenMetadata(metadata)
        setIsLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load form')
        setIsLoading(false)
      }
    }

    loadScreenMetadata()
  }, [screenKey, fetchScreenByKey])

  useEffect(() => {
    const handleProcessContinue = (event: Event) => {
      const customEvent = event as CustomEvent<{ event?: string; payload?: unknown }>
      const eventType = customEvent.detail?.event
      const isCancelEvent = typeof eventType === 'string' && /pause|abort|cancel/i.test(eventType)
      if (isCancelEvent) {
        handleFormCancel()
        return
      }
      handleFormSubmission(customEvent.detail?.payload)
    }

    globalThis.addEventListener('com.newwork.process.continue', handleProcessContinue)
    return () => {
      globalThis.removeEventListener('com.newwork.process.continue', handleProcessContinue)
    }
  }, [handleFormSubmission])

  const handleClose = () => {
    handleFormCancel()
    if (onClose) {
      onClose()
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <Card
        className="gba:border-2 gba:border-primary/30 gba:shadow-lg gba:overflow-hidden"
        data-testid="remote-form-display"
      >
        <CardHeader className="gba:flex gba:items-center gba:justify-between gba:bg-gradient-to-r gba:from-muted/50 gba:to-muted/30 gba:border-b-2">
          <CardTitle className="gba:text-lg gba:font-bold">Content Entry Form</CardTitle>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="gba:h-8 gba:w-8"
              onClick={handleClose}
              data-testid="remote-form-close-button"
              aria-label="Close form"
            >
              <X className="gba:h-4 gba:w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="gba:p-8">
          <div className="gba:flex gba:items-center gba:justify-center">
            <Spinner size="lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card
        className="gba:border-2 gba:border-destructive/30 gba:shadow-lg gba:overflow-hidden"
        data-testid="remote-form-display"
      >
        <CardHeader className="gba:flex gba:items-center gba:justify-between gba:bg-gradient-to-r gba:from-muted/50 gba:to-muted/30 gba:border-b-2">
          <CardTitle className="gba:text-lg gba:font-bold">Content Entry Form</CardTitle>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="gba:h-8 gba:w-8"
              onClick={handleClose}
              data-testid="remote-form-close-button"
              aria-label="Close form"
            >
              <X className="gba:h-4 gba:w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="gba:p-6 gba:text-center">
          <p className="gba:text-sm gba:text-destructive gba:mb-4">{error}</p>
          <Button
            variant="outline"
            onClick={() => {
              setIsLoading(true)
              setError(null)
              setScreenMetadata(null)
            }}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Render appropriate loader based on screen type
  if (screenMetadata?.builderType === 'NATIVE_SCREEN' && screenMetadata.componentPath) {
    return (
      <Card
        className="gba:border-2 gba:border-primary/30 gba:shadow-lg gba:overflow-hidden"
        data-testid="remote-form-display"
      >
        <CardHeader className="gba:flex gba:items-center gba:justify-between gba:bg-gradient-to-r gba:from-muted/50 gba:to-muted/30 gba:border-b-2">
          <CardTitle className="gba:text-lg gba:font-bold">Content Entry Form</CardTitle>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="gba:h-8 gba:w-8"
              onClick={handleClose}
              data-testid="remote-form-close-button"
              aria-label="Close form"
            >
              <X className="gba:h-4 gba:w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="gba:p-0 gba:min-h-[600px]">
          <RemoteScreenLoader
            componentPath={screenMetadata.componentPath}
            version={screenMetadata.version}
            accessToken={accessToken}
            userInfo={userInfo}
            additionalData={normalizedFormData}
            onClose={handleClose}
            onTaskUpdated={(payload?: unknown) => handleFormSubmission(payload)}
            isLoadingMetadata={false}
          />
        </CardContent>
      </Card>
    )
  }

  if (screenMetadata?.builderType === 'LOWCODER' && screenMetadata.appId) {
    return (
      <Card
        className="gba:border-2 gba:border-primary/30 gba:shadow-lg gba:overflow-hidden"
        data-testid="remote-form-display"
      >
        <CardHeader className="gba:flex gba:items-center gba:justify-between gba:bg-gradient-to-r gba:from-muted/50 gba:to-muted/30 gba:border-b-2">
          <CardTitle className="gba:text-lg gba:font-bold">Content Entry Form</CardTitle>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="gba:h-8 gba:w-8"
              onClick={handleClose}
              data-testid="remote-form-close-button"
              aria-label="Close form"
            >
              <X className="gba:h-4 gba:w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="gba:p-0 gba:min-h-[600px]">
          <LowcoderScreenLoader
            appId={screenMetadata.appId}
            appName={screenMetadata.appName || 'Content Entry Form'}
            accessToken={accessToken}
            userInfo={userInfo}
            additionalData={normalizedFormData || {}}
            onClose={handleClose}
            onTaskUpdated={(payload?: unknown) => handleFormSubmission(payload)}
          />
        </CardContent>
      </Card>
    )
  }

  // Unknown screen type or invalid metadata
  return (
    <Card
      className="gba:border-2 gba:border-destructive/30 gba:shadow-lg gba:overflow-hidden"
      data-testid="remote-form-display"
    >
      <CardHeader className="gba:flex gba:items-center gba:justify-between gba:bg-gradient-to-r gba:from-muted/50 gba:to-muted/30 gba:border-b-2">
        <CardTitle className="gba:text-lg gba:font-bold">Content Entry Form</CardTitle>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="gba:h-8 gba:w-8"
            onClick={handleClose}
            data-testid="remote-form-close-button"
            aria-label="Close form"
          >
            <X className="gba:h-4 gba:w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="gba:p-6 gba:text-center">
        <p className="gba:text-sm gba:text-destructive gba:mb-2">Unable to load form screen.</p>
        <p className="gba:text-xs gba:text-muted-foreground">
          Screen type: {screenMetadata?.builderType || 'unknown'}, componentPath:{' '}
          {screenMetadata?.componentPath || 'N/A'}, appId: {screenMetadata?.appId || 'N/A'}
        </p>
        <p className="gba:text-xs gba:text-muted-foreground gba:mt-2">
          Expected NATIVE_SCREEN with componentPath or LOWCODER with appId.
        </p>
      </CardContent>
    </Card>
  )
}

export default RemoteFormDisplay
