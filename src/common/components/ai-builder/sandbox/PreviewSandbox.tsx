import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useBuilderClient } from '@/common/network/ai/builder/useBuilderClient'
import { getRuntimeEnvsForIframe } from '@/common/env/EnvUtils'
import { Loader2, AlertCircle, Upload, Download, CheckCircle, X } from 'lucide-react'
import { Button } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { getSafeHref } from '@/business-apps/core/create/apps/ai-builder/utils/helpers'
import { ScreenBuildingLoader } from '@/business-apps/core/create/apps/ai-orchestrator/features/orchestrator/components/widgets/ScreenBuildingLoader'

interface UniqueFileSummary {
  totalUniqueFiles: number
  createCount: number
  modifyCount: number
  deleteCount: number
  files: Array<{
    path: string
    type: 'create' | 'modify' | 'delete'
  }>
}

interface PreviewSandboxProps {
  repoId: string
  sessionId: string
  previewAppName?: string | null
  accessToken?: string
  userInfo?: any
  onReady?: () => void
  onError?: (error: Error) => void
  uniqueFileSummary?: UniqueFileSummary | null
  onPublish?: () => void
  onRefresh?: () => void
  publishSuccess?: string | null
  onDismissPublishSuccess?: () => void
  buildStatus?: {
    active: boolean
    lines: string[]
    error: string | null
  }
  allowLoad?: boolean
}

interface PreviewNamespaceContext {
  sessionNamespace: string
  namespace: string
}

function derivePreviewNamespaceContext(sessionNamespaceOrId: string): PreviewNamespaceContext {
  const seed = (sessionNamespaceOrId || '').trim()
  const normalized = seed.replace(/[^a-zA-Z0-9_]/g, '_')
  const draftNamespace = `draft_${normalized}`
  return {
    sessionNamespace: seed,
    namespace: draftNamespace
  }
}

export interface PreviewSandboxHandle {
  reload: (opts?: { cacheOnly?: boolean }) => void
}

export const PreviewSandbox = forwardRef<PreviewSandboxHandle, PreviewSandboxProps>(function PreviewSandbox(
  {
    repoId,
    sessionId,
    previewAppName,
    accessToken,
    userInfo,
    onReady,
    onError,
    uniqueFileSummary,
    onPublish,
    onRefresh,
    publishSuccess,
    onDismissPublishSuccess,
    buildStatus,
    allowLoad = true
  },
  ref
) {
  const [loading, setLoading] = useState(true)
  const [previewReady, setPreviewReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [bundleVersion, setBundleVersion] = useState<string | null>(null)
  const [namespaceContext, setNamespaceContext] = useState<PreviewNamespaceContext | null>(null)
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
        setPreviewReady(false)
        const cacheBust = Date.now().toString()
        const nextUrl = createPreviewUrl(cacheBust, opts?.cacheOnly)
        setBundleVersion(cacheBust)
        setPreviewUrl(nextUrl)
      }
    }),
    [builderClient, sessionId, previewAppName]
  )

  useEffect(() => {
    let mounted = true
    const fallback = derivePreviewNamespaceContext(sessionId)
    setNamespaceContext(fallback)

    const loadSessionNamespace = async () => {
      try {
        const response = await builderClient.getSession(sessionId)
        const sessionNamespace = response.session?.namespace?.trim() || sessionId
        const derived = derivePreviewNamespaceContext(sessionNamespace)
        if (!mounted) return
        setNamespaceContext(derived)
      } catch {
        if (!mounted) return
        setNamespaceContext(fallback)
      }
    }

    if (sessionId) {
      void loadSessionNamespace()
    }

    return () => {
      mounted = false
    }
  }, [builderClient, sessionId])

  useEffect(() => {
    let mounted = true
    setPreviewReady(false)

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

      setPreviewReady(true)

      const nwEnvs = getRuntimeEnvsForIframe()
      const resolvedNamespaceContext = namespaceContext ?? derivePreviewNamespaceContext(sessionId)
      const targetOrigin = typeof event.origin === 'string' ? event.origin : '*'
      ;(source as Window).postMessage(
        {
          type: 'BUSINESS_APP_CONTEXT',
          context: {
            accessToken: accessToken,
            userInfo: userInfo,
            additionalData: {
              namespace: resolvedNamespaceContext.namespace,
              publishState: 'draft',
              sessionNamespace: resolvedNamespaceContext.sessionNamespace
            },
            nwEnvs,
            sentAt: Date.now()
          }
        },
        targetOrigin
      )
      console.log('[PreviewSandbox] Sent BUSINESS_APP_CONTEXT to iframe', {
        hasAccessToken: !!accessToken,
        hasUserInfo: !!userInfo,
        hasAdditionalDataNamespace: !!resolvedNamespaceContext.namespace,
        nwEnvsKeys: Object.keys(nwEnvs || {})
      })
    }
    globalThis.addEventListener('message', handleMessage)
    return () => globalThis.removeEventListener('message', handleMessage)
  }, [accessToken, userInfo, previewReady, namespaceContext, sessionId])

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
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full">
        <ScreenBuildingLoader />
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

  const showPreviewHeader = Boolean(
    publishSuccess || onRefresh || (uniqueFileSummary && uniqueFileSummary.totalUniqueFiles > 0 && onPublish)
  )

  return (
    <div className="gba:w-full gba:h-full gba:flex gba:flex-col">
      {showPreviewHeader && (
        <div className="gba:shrink-0 gba:border-b gba:border-border gba:bg-card gba:px-4 gba:py-2">
          <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
            <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1 gba:min-w-0">
              {publishSuccess ? (
                <>
                  <CheckCircle className="gba:w-4 gba:h-4 gba:text-success gba:shrink-0" />
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
                      className="gba:text-muted-foreground hover:gba:text-foreground gba:shrink-0"
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

            <div className="gba:flex gba:items-center gba:gap-1 gba:shrink-0">
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
      )}

      {/* Preview Content */}
      <div className="gba:flex-1 gba:relative">
        {previewUrl && (
          <iframe
            key={previewUrl}
            ref={iframeRef}
            src={previewUrl}
            className="gba:w-full gba:h-full gba:border-0 gba:transition-[opacity,filter] gba:duration-300 gba:ease-out"
            sandbox="allow-scripts allow-same-origin allow-forms"
            title="Preview Sandbox"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            style={{
              visibility: previewReady ? 'visible' : 'hidden',
              position: previewReady ? 'relative' : 'absolute',
              opacity: previewReady ? 1 : 0,
              filter: previewReady ? 'blur(0)' : 'blur(4px)',
              colorScheme: 'normal',
              background: 'transparent',
              pointerEvents: previewReady ? 'auto' : 'none'
            }}
          />
        )}
        {previewUrl && !buildStatus?.active && (
          <div
            className="gba:absolute gba:inset-0 gba:flex gba:flex-col gba:items-center gba:justify-center gba:bg-background gba:z-9999 gba:transition-opacity gba:duration-300 gba:ease-out"
            style={{ opacity: previewReady ? 0 : 1, pointerEvents: previewReady ? 'none' : 'auto' }}
          >
            <ScreenBuildingLoader />
          </div>
        )}
        {buildStatus?.active && (
          <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center gba:pointer-events-none">
            <div className="gba:bg-background/90 gba:border gba:border-border gba:rounded-lg gba:shadow-sm gba:px-4 gba:py-3 gba:max-w-sm gba:text-sm gba:text-foreground">
              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin gba:text-primary" />
                <span className="gba:font-medium">Preview build in progress</span>
              </div>
              <div className="gba:text-xs gba:text-muted-foreground gba:space-y-1">
                {buildStatus.lines.map((line, index) => (
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
    </div>
  )
})
