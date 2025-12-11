import React, { useEffect, useRef, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface LowcoderScreenLoaderProps extends BusinessAppContextProps {
  appId: string
  appName: string
  onClose: () => void
  onTaskCompleted?: (taskId: string) => void
  onTaskUpdated: () => void
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
  const [loading, setLoading] = useState(true)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_error, setError] = useState<string | null>(null)
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
        setError(null)
      } else if (event.data.type === 'LOWCODER_ERROR') {
        setLoading(false)
        setError(event.data.message || 'Failed to load Lowcoder screen')
      } else if (event.data.type === 'TASK_COMPLETED') {
        if (onTaskCompleted && event.data.taskId) {
          onTaskCompleted(event.data.taskId)
        }
        if (onTaskUpdated) {
          onTaskUpdated()
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
  }, [loading, onClose, onTaskCompleted, onTaskUpdated])

  const handleIframeLoad = () => {
    setLoading(false)
  }

  const handleIframeError = () => {
    setLoading(false)
    setError('Failed to load Lowcoder screen')
  }

  return (
    <div className="gba:relative gba:w-full gba:h-full gba:min-h-[600px]">
      <iframe
        ref={iframeRef}
        title={appName}
        className="gba:w-full gba:h-full gba:min-h-[600px] gba:border-0"
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
      />
    </div>
  )
}
