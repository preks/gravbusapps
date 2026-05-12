import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react'
import type { ArtifactFile } from '../../../types/fabric'
import CodeArtifact from './CodeArtifact'

export interface HtmlArtifactProps {
  file: ArtifactFile
  content: string | null
  viewMode: 'preview' | 'code'
}

const NATIVE_W = 1920
const NATIVE_H = 1080

const HtmlArtifact: React.FC<HtmlArtifactProps> = ({ file, content, viewMode }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      const s = Math.min(width / NATIVE_W, height / NATIVE_H)
      setScale(s)
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const handleReplay = useCallback(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const src = iframe.src
    iframe.src = ''
    requestAnimationFrame(() => {
      iframe.src = src
    })
  }, [])

  if (viewMode === 'code' && content !== null) {
    return <CodeArtifact file={file} content={content} viewMode={viewMode} language="html" />
  }

  return (
    <div
      ref={containerRef}
      className="gba:relative gba:w-full gba:h-full gba:flex gba:items-center gba:justify-center gba:overflow-hidden gba:bg-black"
      data-testid="fabric-html-artifact"
    >
      <iframe
        ref={iframeRef}
        src={file.downloadUrl}
        title={file.name}
        sandbox="allow-scripts allow-same-origin"
        style={{
          width: `${NATIVE_W}px`,
          height: `${NATIVE_H}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'center center'
        }}
        className="gba:border-0 gba:shrink-0"
        data-testid="fabric-html-iframe"
      />
      <div className="gba:absolute gba:bottom-4 gba:right-4 gba:flex gba:items-center gba:gap-2">
        <button
          type="button"
          onClick={handleReplay}
          className="gba:flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-2 gba:rounded-lg gba:bg-background/90 gba:backdrop-blur-sm gba:border gba:border-border/60 gba:shadow-sm gba:text-xs gba:font-medium gba:text-foreground gba:hover:bg-background gba:transition-colors"
          aria-label="Replay animation"
          data-testid="fabric-html-replay"
        >
          <ArrowCounterClockwiseIcon className="gba:h-3.5 gba:w-3.5" />
          Replay
        </button>
      </div>
    </div>
  )
}

export default HtmlArtifact
