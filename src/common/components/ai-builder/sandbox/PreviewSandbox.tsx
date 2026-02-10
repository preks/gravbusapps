import React, { useEffect, useState, useRef } from 'react'
import { useBuilderClient } from '@/common/network/ai/builder/useBuilderClient'
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
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [bundleVersion, setBundleVersion] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const builderClient = useBuilderClient(accessToken)

  useEffect(() => {
    let mounted = true

    const loadPreview = async () => {
      if (!repoId || !sessionId) {
        setError('Missing repoId or sessionId')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Get bundle info (triggers build if needed)
        const bundle = await builderClient.getPreviewBundle(repoId, sessionId)

        if (!mounted) return

        // Set preview URL using the returned path
        const indexUrl = builderClient.getPreviewFileUrl(repoId, sessionId, 'index.html')
        setPreviewUrl(indexUrl)
        setBundleVersion(bundle.bundleVersion)

        if (onReady) {
          onReady()
        }
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

  // Reload preview when iframe loads
  const handleIframeLoad = () => {
    console.log('[PreviewSandbox] Iframe loaded successfully', { bundleVersion })

    // Send auth data to preview via postMessage
    if (iframeRef.current?.contentWindow && accessToken) {
      console.log('[PreviewSandbox] Sending auth data to preview iframe')
      iframeRef.current.contentWindow.postMessage(
        {
          type: 'BUSINESS_APP_CONTEXT',
          context: {
            accessToken: accessToken,
            userInfo: userInfo
          }
        },
        '*'
      )
    }
  }

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
    </div>
  )
}
