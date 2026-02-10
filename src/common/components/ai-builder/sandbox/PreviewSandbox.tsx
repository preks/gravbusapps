import React, { useEffect, useState, useRef } from 'react'
import { useBuilderClient } from '@/common/network/ai/builder/useBuilderClient'
import { getRuntimeEnvsForIframe } from '@/common/env/EnvUtils'
import { Loader2, AlertCircle } from 'lucide-react'

interface PreviewSandboxProps {
  repoId: string
  sessionId: string
  accessToken?: string
  userInfo?: any
  onReady?: () => void
  onError?: (error: Error) => void
}

export const PreviewSandbox: React.FC<PreviewSandboxProps> = ({
  repoId,
  sessionId,
  accessToken,
  userInfo,
  onReady,
  onError
}) => {
  const [loading, setLoading] = useState(true)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [bundleVersion, setBundleVersion] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const builderClient = useBuilderClient(accessToken ?? '')

  useEffect(() => {
    let mounted = true
    setIframeLoaded(false)

    const loadPreview = async () => {
      if (!repoId || !sessionId) {
        setError('Missing repoId or sessionId')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        if (!mounted) return

        const indexUrl = builderClient.getPreviewFileUrl(sessionId, 'index.html')
        setPreviewUrl(indexUrl)
        setBundleVersion(sessionId)
      } catch (err) {
        if (!mounted) return

        const errorMessage = err instanceof Error ? err.message : 'Failed to load preview'
        console.error('[PreviewSandbox] Load error:', err)
        setError(errorMessage)

        if (onError) {
          onError(err instanceof Error ? err : new Error(errorMessage))
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadPreview()

    return () => {
      mounted = false
    }
  }, [repoId, sessionId, accessToken])

  const handleIframeLoad = () => {
    setIframeLoaded(true)
    console.log('[PreviewSandbox] Iframe loaded successfully', { bundleVersion })
    if (onReady) {
      onReady()
    }
  }

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'PREVIEW_READY') return
      const source = event.source
      if (!source || source === window || typeof (source as Window).postMessage !== 'function') return
      if (iframeRef.current?.contentWindow && source !== iframeRef.current.contentWindow) return

      const nwEnvs = getRuntimeEnvsForIframe()
      ;(source as Window).postMessage(
        {
          type: 'BUSINESS_APP_CONTEXT',
          context: {
            accessToken: accessToken,
            userInfo: userInfo,
            nwEnvs,
            sentAt: Date.now()
          }
        },
        '*'
      )
      console.log('[PreviewSandbox] Sent BUSINESS_APP_CONTEXT to iframe', {
        hasAccessToken: !!accessToken,
        hasUserInfo: !!userInfo,
        nwEnvsKeys: Object.keys(nwEnvs || {})
      })
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [accessToken, userInfo])

  const handleIframeError = () => {
    const errorMsg = 'Failed to load preview iframe'
    console.error('[PreviewSandbox]', errorMsg)
    setError(errorMsg)

    if (onError) {
      onError(new Error(errorMsg))
    }
  }

  if (loading) {
    return (
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:text-muted-foreground gba:gap-3">
        <Loader2 className="gba:w-8 gba:h-8 gba:animate-spin gba:text-primary" />
        <p className="gba:text-sm">Building preview...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:text-destructive gba:gap-3 gba:p-6">
        <AlertCircle className="gba:w-8 gba:h-8" />
        <p className="gba:text-sm gba:font-semibold">Preview Error</p>
        <p className="gba:text-xs gba:text-muted-foreground gba:text-center gba:max-w-md">{error}</p>
      </div>
    )
  }

  if (!previewUrl) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:text-muted-foreground">
        <p className="gba:text-sm">No preview available</p>
      </div>
    )
  }

  return (
    <div className="gba:w-full gba:h-full gba:relative">
      <iframe
        ref={iframeRef}
        src={previewUrl}
        className="gba:w-full gba:h-full gba:border-0"
        sandbox="allow-scripts allow-same-origin allow-forms"
        title="Preview Sandbox"
        onLoad={handleIframeLoad}
        onError={handleIframeError}
      />
      {!iframeLoaded && (
        <div className="gba:absolute gba:inset-0 gba:flex gba:flex-col gba:items-center gba:justify-center gba:bg-background/80 gba:text-muted-foreground gba:gap-3">
          <Loader2 className="gba:w-8 gba:h-8 gba:animate-spin gba:text-primary" />
          <p className="gba:text-sm">Loading preview...</p>
        </div>
      )}
    </div>
  )
}
