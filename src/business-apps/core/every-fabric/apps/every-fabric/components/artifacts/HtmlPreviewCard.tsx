import { useEffect, useRef, useState } from 'react'
import { ArrowsOutIcon, PlayIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { PROMPT_MANAGER_API_URL } from '@/common/utils/serviceResolver'

interface HtmlPreviewCardProps {
  artifactPath: string
  artifactName: string
  sessionId: string
  onExpand: () => void
}

const NATIVE_W = 1920
const NATIVE_H = 1080

function buildArtifactUrl(sessionId: string, path: string): string {
  const base = PROMPT_MANAGER_API_URL.endsWith('/') ? PROMPT_MANAGER_API_URL.slice(0, -1) : PROMPT_MANAGER_API_URL
  return `${base}/deep-agent/sessions/${sessionId}/artifacts/${encodeURIComponent(path)}`
}

const HtmlPreviewCard: React.FC<HtmlPreviewCardProps> = ({ artifactPath, artifactName, sessionId, onExpand }) => {
  const downloadUrl = buildArtifactUrl(sessionId, artifactPath)
  const displayName = artifactName.replace(/\.html?$/i, '')
  const [loadError, setLoadError] = useState(false)
  const [previewScale, setPreviewScale] = useState(0.25)
  const previewRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const el = previewRef.current
    if (!el) return
    const observer = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect
      if (width > 0) setPreviewScale(width / NATIVE_W)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="gba:pt-4" data-testid={`html-preview-card-${artifactName}`}>
      <div className="gba:rounded-xl gba:border gba:border-border gba:overflow-hidden gba:bg-background gba:shadow-sm">
        <button
          ref={previewRef}
          type="button"
          onClick={onExpand}
          className="gba:relative gba:w-full gba:aspect-video gba:max-h-56 gba:bg-foreground/95 gba:cursor-pointer gba:group gba:transition-colors gba:hover:bg-foreground/90 gba:block gba:overflow-hidden"
          aria-label={`Expand ${displayName}`}
          data-testid={`html-preview-expand-${artifactName}`}
        >
          {!loadError ? (
            <iframe
              src={downloadUrl}
              title={displayName}
              sandbox="allow-scripts allow-same-origin"
              style={{
                width: `${NATIVE_W}px`,
                height: `${NATIVE_H}px`,
                transform: `scale(${previewScale})`,
                transformOrigin: 'top left'
              }}
              className="gba:absolute gba:top-0 gba:left-0 gba:border-0 gba:pointer-events-none"
              loading="lazy"
              onError={() => setLoadError(true)}
              data-testid={`html-preview-iframe-${artifactName}`}
            />
          ) : (
            <div className="gba:absolute gba:inset-0 gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2">
              <WarningCircleIcon className="gba:h-8 gba:w-8 gba:text-muted-foreground/60" />
              <span className="gba:text-xs gba:text-muted-foreground/80">Preview unavailable</span>
            </div>
          )}
          <div className="gba:absolute gba:top-3 gba:right-3 gba:flex gba:items-center gba:gap-1 gba:px-2.5 gba:py-1.5 gba:rounded-lg gba:bg-background/90 gba:backdrop-blur-sm gba:border gba:border-border/50 gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity">
            <ArrowsOutIcon className="gba:h-3.5 gba:w-3.5 gba:text-foreground" />
            <span className="gba:text-xs gba:font-medium gba:text-foreground">Expand</span>
          </div>
        </button>
        <div className="gba:flex gba:items-center gba:gap-2.5 gba:px-3.5 gba:py-2.5">
          <div className="gba:h-7 gba:w-7 gba:rounded-lg gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:shrink-0">
            <PlayIcon className="gba:h-3.5 gba:w-3.5 gba:text-primary" weight="fill" />
          </div>
          <div className="gba:min-w-0 gba:flex-1">
            <p className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{displayName}</p>
            <p className="gba:text-xs gba:text-muted-foreground">Animated HTML composition</p>
          </div>
          <button
            type="button"
            onClick={onExpand}
            className="gba:text-xs gba:font-medium gba:text-primary gba:hover:text-primary/80 gba:transition-colors gba:shrink-0"
            data-testid={`html-preview-open-${artifactName}`}
          >
            Open
          </button>
        </div>
      </div>
    </div>
  )
}

export default HtmlPreviewCard
