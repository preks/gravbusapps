import React, { useEffect, useRef, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Button, useTranslation } from '@newwork/nw-design-system'
import { X } from 'lucide-react'
import translations from '../_i18n'

interface LowcoderScreenLoaderProps extends BusinessAppContextProps {
  appId: string
  appName: string
  onClose: () => void
  onTaskCompleted?: (taskId: string) => void
  onTaskUpdated?: (payload?: unknown) => void
}

const LOWCODER_BASE_URL = 'https://newwork-dev.newwork.com/lowcoder'

export const LowcoderScreenLoader: React.FC<LowcoderScreenLoaderProps> = ({
  appId,
  appName,
  accessToken,
  userInfo,
  additionalData,
  onClose,
  onTaskCompleted,
  onTaskUpdated
}) => {
  const { t } = useTranslation(translations)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    // Build Lowcoder URL with query parameters
    const params = new URLSearchParams()

    // Add access token
    if (accessToken) {
      params.append('accessToken', accessToken)
    }

    // Add user info
    if (userInfo) {
      params.append('userInfo', JSON.stringify(userInfo))
    }

    // Add additional data (task payload, process metadata, etc.)
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        params.append(key, typeof value === 'string' ? value : JSON.stringify(value))
      })
    }

    const lowcoderUrl = `${LOWCODER_BASE_URL}/applications/${appId}?${params.toString()}`

    // Set iframe src
    if (iframeRef.current) {
      iframeRef.current.src = lowcoderUrl
    }
  }, [appId, accessToken, userInfo, additionalData])

  useEffect(() => {
    // Listen for messages from Lowcoder iframe
    const handleMessage = (event: MessageEvent) => {
      // Verify origin
      if (!event.origin.includes('newwork')) {
        return
      }

      // Handle different message types
      if (event.data.type === 'LOWCODER_LOADED') {
        setLoading(false)
        setErrorMessage(null)
      } else if (event.data.type === 'LOWCODER_ERROR') {
        setLoading(false)
        setErrorMessage(event.data.message || t('lowcoder-screen-failed'))
        console.error(
          '[LowcoderScreenLoader] Error:',
          event.data.message || t('lowcoder-screen-failed'),
          'Raw error:',
          event.data
        )
      } else if (event.data.type === 'TASK_COMPLETED') {
        if (onTaskCompleted && event.data.taskId) {
          onTaskCompleted(event.data.taskId)
        }
        if (onTaskUpdated) {
          const payload =
            event.data?.payload ??
            event.data?.formData ??
            event.data?.data ??
            event.data?.variables ??
            event.data?.result ??
            undefined
          onTaskUpdated(payload)
        }
        if (onClose) {
          onClose()
        }
      } else if (event.data.type === 'CLOSE_MODAL') {
        if (onClose) {
          onClose()
        }
      }
    }

    globalThis.addEventListener('message', handleMessage)

    // Set timeout for loading state
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        setLoading(false)
      }
    }, 5000)

    return () => {
      globalThis.removeEventListener('message', handleMessage)
      clearTimeout(loadingTimeout)
    }
  }, [loading, onClose, onTaskCompleted, onTaskUpdated, t])

  const handleIframeLoad = () => {
    setLoading(false)
  }

  const handleIframeError = () => {
    setLoading(false)
    setErrorMessage(t('lowcoder-screen-failed'))
    console.error('[LowcoderScreenLoader] Iframe failed to load:', iframeRef.current?.src)
  }

  return (
    <div className="gba:relative gba:w-full gba:h-full gba:min-h-[600px]">
      {/* Floating close button - Always visible for Lowcoder screens */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="gba:absolute gba:top-2 gba:right-2 gba:z-50 gba:rounded-full gba:hover:bg-muted gba:bg-card/80 gba:backdrop-blur-sm gba:shadow-md"
        data-testid="lowcoder-screen-close-button"
        title={t('task-dialog-close', { defaultValue: 'Close' })}
      >
        <X className="gba:h-5 gba:w-5" />
      </Button>

      {errorMessage ? (
        <div className="gba:flex gba:items-center gba:justify-center gba:w-full gba:h-full gba:min-h-[600px] gba:p-6">
          <div className="gba:text-center gba:max-w-md">
            <div className="gba:text-destructive gba:text-lg gba:font-semibold gba:mb-2">
              {t('lowcoder-screen-error-title')}
            </div>
            <div className="gba:text-muted-foreground gba:mb-4">{errorMessage}</div>
            <button
              onClick={onClose}
              className="gba:px-4 gba:py-2 gba:bg-primary gba:text-primary-foreground gba:rounded gba:hover:bg-primary/90"
            >
              {t('close')}
            </button>
          </div>
        </div>
      ) : (
        <iframe
          ref={iframeRef}
          title={appName}
          className="gba:w-full gba:h-full gba:min-h-[600px] gba:border-0"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
        />
      )}
    </div>
  )
}
