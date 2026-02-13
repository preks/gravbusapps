import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useBuilderClient } from '@/common/network/ai/builder/useBuilderClient'
import { getRuntimeEnvsForIframe } from '@/common/env/EnvUtils'
import { Loader2, AlertCircle, Upload, Download, CheckCircle, X } from 'lucide-react'
import { Button } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { getSafeHref } from '@/business-apps/core/create/apps/ai-builder/utils/helpers'

interface UniqueFileSummary {
  totalUniqueFiles: number
  created: number
  modified: number
  deleted: number
  files: Array<{
    path: string
    type: 'create' | 'modify' | 'delete'
  }>
}

interface PreviewSandboxProps {
  repoId: string
  sessionId: string
  accessToken?: string
  userInfo?: any
  onReady?: () => void
  onError?: (error: Error) => void
  uniqueFileSummary?: UniqueFileSummary | null
  onPublish?: () => void
  onDownloadPatch?: () => void
  onRefresh?: () => void
  publishSuccess?: string | null
  onDismissPublishSuccess?: () => void
}

export interface PreviewSandboxHandle {
  reload: () => void
}

export const PreviewSandbox = forwardRef<PreviewSandboxHandle, PreviewSandboxProps>(function PreviewSandbox(
  {
    repoId,
    sessionId,
    accessToken,
    userInfo,
    onReady,
    onError,
    uniqueFileSummary,
    onPublish,
    onRefresh,
    publishSuccess,
    onDismissPublishSuccess
  },
  ref
) {
  const [loading, setLoading] = useState(true)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [bundleVersion, setBundleVersion] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const previewUrlRef = useRef<string | null>(null)
  const builderClient = useBuilderClient(accessToken ?? '')

  previewUrlRef.current = previewUrl

  useImperativeHandle(
    ref,
    () => ({
      reload() {
        const iframe = iframeRef.current
        if (!iframe) return
        setIframeLoaded(false)
        try {
          iframe.contentWindow?.location.reload()
        } catch {
          const url = previewUrlRef.current
          if (url) iframe.src = url
        }
      }
    }),
    []
  )

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
      if (!source || source === globalThis.window || typeof (source as Window).postMessage !== 'function') return
      if (iframeRef.current?.contentWindow && source !== iframeRef.current.contentWindow) return

      const nwEnvs = getRuntimeEnvsForIframe()
      const targetOrigin = typeof event.origin === 'string' ? event.origin : '*'
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
        targetOrigin
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
    <div className="gba:w-full gba:h-full gba:flex gba:flex-col">
      {/* Preview Header */}
      <div className="gba:flex-shrink-0 gba:border-b gba:border-border gba:bg-card gba:px-4 gba:py-2">
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
          <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1 gba:min-w-0">
            {publishSuccess ? (
              <>
                <CheckCircle className="gba:w-4 gba:h-4 gba:text-success gba:flex-shrink-0" />
                <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1 gba:min-w-0">
                  <span className="gba:text-xs gba:font-medium gba:text-success gba:whitespace-nowrap">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.publish_success', 'Published!')}
                  </span>
                  <a
                    href={getSafeHref(publishSuccess)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gba:text-xs gba:text-primary hover:gba:underline gba:truncate"
                    title={publishSuccess}
                  >
                    {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.open_screen', 'Open screen')} →
                  </a>
                </div>
                {onDismissPublishSuccess && (
                  <button
                    onClick={onDismissPublishSuccess}
                    className="gba:text-muted-foreground hover:gba:text-foreground gba:flex-shrink-0"
                  >
                    <X className="gba:w-3 gba:h-3" />
                  </button>
                )}
              </>
            ) : (
              <>
                {uniqueFileSummary && uniqueFileSummary.totalUniqueFiles > 0 && onPublish && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={onPublish}
                    className="gba:h-7 gba:px-3 gba:gap-1.5 gba:text-xs"
                  >
                    <Upload className="gba:w-3.5 gba:h-3.5" />
                    {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.publish_button', 'Publish')}
                  </Button>
                )}
              </>
            )}
          </div>

          <div className="gba:flex gba:items-center gba:gap-1 gba:flex-shrink-0">
            {onRefresh && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onRefresh}
                className="gba:h-7 gba:px-2"
                title={getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.refresh_files', 'Refresh Files')}
              >
                <Download className="gba:w-3.5 gba:h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <div className="gba:flex-1 gba:relative">
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
    </div>
  )
})
