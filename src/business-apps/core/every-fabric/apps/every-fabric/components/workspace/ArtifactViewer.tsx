import { Suspense, useEffect, useState } from 'react'
import type { ArtifactFile } from '../../types/fabric'
import { useEnterpriseAgentClient } from '../../hooks/useEnterpriseAgentClient'
import { ArtifactToolbar } from '../artifacts/ArtifactToolbar'
import { renderers } from '../artifacts/renderers'

// ─── Content fetcher ──────────────────────────────────────────────────────────

function useArtifactContent(file: ArtifactFile | null, accessToken: string) {
  const client = useEnterpriseAgentClient(accessToken)
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setContent(null)
      return
    }

    // HTML renders via iframe — no text fetch needed
    if (file.rendererType === 'html') {
      setContent(null)
      return
    }

    setLoading(true)
    setError(null)

    client
      .getArtifactContent(file.sessionId, file.artifactKey)
      .then(text => setContent(text))
      .catch(err => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }, [file, client])

  return { content, loading, error }
}

// ─── Suspense fallback ────────────────────────────────────────────────────────

const RendererLoading: React.FC = () => (
  <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:gap-2">
    <div className="gba:h-5 gba:w-5 gba:rounded-full gba:border-2 gba:border-border gba:border-t-primary gba:animate-spin" />
    <span className="gba:text-xs gba:text-muted-foreground">Loading renderer…</span>
  </div>
)

// ─── Main component ───────────────────────────────────────────────────────────

export interface ArtifactViewerProps {
  file: ArtifactFile | null
  accessToken: string
  onClose: () => void
}

export const ArtifactViewer: React.FC<ArtifactViewerProps> = ({ file, accessToken, onClose }) => {
  const isOpen = file !== null
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview')
  const { content, loading, error } = useArtifactContent(file, accessToken)

  // Reset view mode when a different artifact opens
  useEffect(() => {
    setViewMode('preview')
  }, [file?.name])

  // Escape to close
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const Renderer = file ? renderers[file.rendererType] : null

  return (
    <>
      <div
        aria-hidden="true"
        className={`gba:fixed gba:inset-0 gba:bg-slate-950/28 gba:backdrop-blur-[5px] gba:z-[70] gba:transition-opacity gba:duration-200 ${
          isOpen ? 'gba:opacity-100 gba:pointer-events-auto' : 'gba:opacity-0 gba:pointer-events-none'
        }`}
        onClick={onClose}
      />

      <dialog
        open={isOpen}
        aria-modal="true"
        aria-label={file?.name ?? 'Artifact viewer'}
        data-testid="fabric-artifact-viewer"
        className={`gba:fixed gba:top-24 sm:gba:top-28 lg:gba:top-24 gba:left-4 sm:gba:left-6 lg:gba:left-10 gba:right-4 sm:gba:right-6 lg:gba:right-10 gba:bottom-4 sm:gba:bottom-6 lg:gba:bottom-8 gba:z-[80] gba:flex gba:max-h-none gba:w-auto gba:max-w-none gba:flex-col gba:overflow-hidden gba:rounded-[1.75rem] gba:border gba:border-border/80 gba:bg-card/98 gba:p-0 gba:shadow-[0_30px_90px_rgba(15,23,42,0.24)] gba:backdrop:bg-transparent gba:transition-all gba:duration-300 gba:ease-out ${
          isOpen
            ? 'gba:translate-y-0 gba:scale-100 gba:opacity-100 gba:pointer-events-auto'
            : 'gba:translate-y-4 gba:scale-[0.985] gba:opacity-0 gba:pointer-events-none'
        }`}
      >
        {file && (
          <>
            <ArtifactToolbar
              file={file}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              content={content}
              onClose={onClose}
            />

            <div className="gba:flex-1 gba:overflow-hidden gba:relative">
              {loading && (
                <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center gba:bg-card">
                  <div className="gba:h-6 gba:w-6 gba:rounded-full gba:border-2 gba:border-border gba:border-t-primary gba:animate-spin" />
                </div>
              )}

              {error && !loading && (
                <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:gap-2 gba:p-8 gba:text-center">
                  <p className="gba:text-sm gba:text-destructive">Failed to load: {error}</p>
                  <a
                    href={file.downloadUrl}
                    download={file.name}
                    className="gba:text-xs gba:underline gba:text-muted-foreground gba:hover:text-foreground"
                  >
                    Download instead
                  </a>
                </div>
              )}

              {!error && Renderer && (
                <Suspense fallback={<RendererLoading />}>
                  <div className="gba:h-full gba:overflow-hidden">
                    <Renderer file={file} content={content} viewMode={viewMode} />
                  </div>
                </Suspense>
              )}
            </div>
          </>
        )}
      </dialog>
    </>
  )
}
