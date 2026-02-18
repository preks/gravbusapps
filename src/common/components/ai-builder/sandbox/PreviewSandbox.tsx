import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useBuilderClient } from '@/common/network/ai/builder/useBuilderClient'
import { getRuntimeEnvsForIframe } from '@/common/env/EnvUtils'
import { Loader2, AlertCircle } from 'lucide-react'

interface PreviewSandboxProps {
  repoId: string
  sessionId: string
  previewAppName?: string | null
  accessToken?: string
  userInfo?: any
  onReady?: () => void
  onError?: (error: Error) => void
  buildStatus?: {
    active: boolean
    lines: string[]
    error: string | null
  }
  allowLoad?: boolean
}

export interface PreviewSandboxHandle {
  reload: (opts?: { cacheOnly?: boolean }) => void
}

export const PreviewSandbox = forwardRef<PreviewSandboxHandle, PreviewSandboxProps>(function PreviewSandbox(
  { repoId, sessionId, previewAppName, accessToken, userInfo, onReady, onError, buildStatus, allowLoad = true },
  ref
) {
  const [loading, setLoading] = useState(true)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [bundleVersion, setBundleVersion] = useState<string | null>(null)
  const [buildElapsedSec, setBuildElapsedSec] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const builderClient = useBuilderClient(accessToken ?? '')

  const createPreviewUrl = (cacheBust: string, cacheOnly?: boolean) => {
    const query: Record<string, string | boolean> = { v: cacheBust }
    const app = previewAppName?.trim()
    if (app) {
      query.app = app
    }
    if (cacheOnly) {
      query.bundle = false
    }
    return builderClient.getPreviewFileUrl(sessionId, 'index.html', query)
  }

  useImperativeHandle(
    ref,
    () => ({
      reload(opts?: { cacheOnly?: boolean }) {
        setIframeLoaded(false)
        const cacheBust = Date.now().toString()
        setBundleVersion(cacheBust)
        setPreviewUrl(createPreviewUrl(cacheBust, opts?.cacheOnly))
      }
    }),
    [builderClient, sessionId, previewAppName]
  )

  useEffect(() => {
    let mounted = true
    setIframeLoaded(false)

    const loadPreview = async () => {
      if (!allowLoad) {
        setLoading(false)
        return
      }
      if (!repoId || !sessionId) {
        setError('Missing repoId or sessionId')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        if (!mounted) return

        const cacheBust = Date.now().toString()
        const indexUrl = createPreviewUrl(cacheBust)
        setPreviewUrl(indexUrl)
        setBundleVersion(cacheBust)
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
  }, [repoId, sessionId, accessToken, allowLoad, previewAppName])

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

  useEffect(() => {
    if (!buildStatus?.active) {
      setBuildElapsedSec(0)
      return
    }

    setBuildElapsedSec(0)
    const timer = setInterval(() => {
      setBuildElapsedSec(prev => prev + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [buildStatus?.active])

  const handleIframeError = () => {
    const errorMsg = 'Failed to load preview iframe'
    console.error('[PreviewSandbox]', errorMsg)
    setError(errorMsg)

    if (onError) {
      onError(new Error(errorMsg))
    }
  }

  if (loading && !buildStatus?.active) {
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

  if (!previewUrl && !buildStatus?.active) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:text-muted-foreground">
        <p className="gba:text-sm">No preview available</p>
      </div>
    )
  }

  return (
    <div className="gba:w-full gba:h-full gba:relative">
      {previewUrl && (
        <iframe
          ref={iframeRef}
          src={previewUrl}
          className="gba:w-full gba:h-full gba:border-0"
          sandbox="allow-scripts allow-same-origin allow-forms"
          title="Preview Sandbox"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
        />
      )}
      {!iframeLoaded && previewUrl && !buildStatus?.active && (
        <div className="gba:absolute gba:inset-0 gba:flex gba:flex-col gba:items-center gba:justify-center gba:bg-background/80 gba:text-muted-foreground gba:gap-3">
          <Loader2 className="gba:w-8 gba:h-8 gba:animate-spin gba:text-primary" />
          <p className="gba:text-sm">Loading preview...</p>
        </div>
      )}
      {buildStatus?.active && (
        <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center gba:pointer-events-none">
          <div className="gba:bg-background/90 gba:border gba:border-border gba:rounded-lg gba:shadow-sm gba:px-4 gba:py-3 gba:w-[300px] gba:min-h-[150px] gba:text-sm gba:text-foreground">
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin gba:text-primary" />
                <span className="gba:font-medium">Preview build in progress</span>
              </div>
              <span className="gba:text-[11px] gba:text-muted-foreground">{buildElapsedSec}s</span>
            </div>
            <div className="gba:text-xs gba:text-muted-foreground gba:space-y-1 gba:h-[100px] gba:overflow-hidden">
              {(buildStatus.lines.length > 1
                ? buildStatus.lines.slice(-5)
                : [
                    ...(buildStatus.lines.slice(-1) || ['Running screen_build...']),
                    buildElapsedSec < 10
                      ? 'Preparing preview workspace...'
                      : buildElapsedSec < 25
                        ? 'Checking/installing dependencies if needed...'
                        : 'Running preview build...'
                  ]
              ).map((line, index) => (
                <p key={`${line}-${index}`}>{line}</p>
              ))}
            </div>
          </div>
        </div>
      )}
      {!buildStatus?.active && buildStatus?.error && (
        <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center gba:pointer-events-none">
          <div className="gba:bg-destructive/10 gba:border gba:border-destructive/30 gba:rounded-lg gba:px-4 gba:py-3 gba:max-w-sm gba:text-xs gba:text-destructive">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
              <AlertCircle className="gba:w-4 gba:h-4" />
              <span className="gba:font-semibold">Preview build failed</span>
            </div>
            <p>{buildStatus.error}</p>
          </div>
        </div>
      )}
    </div>
  )
})
