import React, { useCallback, useRef } from 'react'
import { ArrowSquareOutIcon, ImageIcon } from '@phosphor-icons/react'
import { AutoHeightHtmlIframe } from '../../artifacts/AutoHeightHtmlIframe'
import { buildArtifactDownloadUrl } from './artifactUrls'
import type { FinalAnswerArtifact } from './types'

export const HtmlArtifactPreviewCard: React.FC<{
  artifact: FinalAnswerArtifact
  sessionId: string
  onViewArtifact?: (artifactName: string) => void
}> = ({ artifact, sessionId, onViewArtifact }) => {
  const artifactPath = artifact.path || artifact.name
  const downloadUrl = buildArtifactDownloadUrl(sessionId, artifactPath)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const handleDownloadPng = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      const iframe = iframeRef.current
      if (!iframe?.contentWindow) return

      const expectedOrigin = new URL(downloadUrl, globalThis.location.href).origin
      const onMessage = (ev: MessageEvent) => {
        if (ev.origin !== expectedOrigin) return
        if (ev.data?.type === 'capture-png-result' && ev.data.dataUrl) {
          globalThis.removeEventListener('message', onMessage)
          const link = document.createElement('a')
          link.download = artifact.name.replace(/\.html?$/i, '') + '.png'
          link.href = ev.data.dataUrl
          document.body.appendChild(link)
          link.click()
          link.remove()
        } else if (ev.data?.type === 'capture-png-error') {
          globalThis.removeEventListener('message', onMessage)
        }
      }
      globalThis.addEventListener('message', onMessage)
      setTimeout(() => globalThis.removeEventListener('message', onMessage), 10_000)
      iframe.contentWindow.postMessage({ type: 'capture-png' }, expectedOrigin)
    },
    [artifact.name, downloadUrl]
  )

  const handleOpenNewTab = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      globalThis.open(downloadUrl, '_blank', 'noopener,noreferrer')
    },
    [downloadUrl]
  )

  return (
    <div
      className="gba:pt-4 gba:w-full gba:max-w-full gba:min-w-0 gba:overflow-hidden"
      data-testid={`enterprise-agent-final-artifact-${artifact.name}`}
    >
      <div className="gba:rounded-xl gba:border gba:border-border gba:overflow-hidden gba:bg-card gba:shadow-sm gba:text-left gba:group">
        <AutoHeightHtmlIframe
          src={downloadUrl}
          title={artifact.name}
          iframeRef={iframeRef}
          variant="inline"
          className="gba:bg-card gba:max-w-full"
        />
        <div className="gba:flex gba:items-center gba:justify-end gba:gap-1.5 gba:bg-card gba:px-2 gba:py-2">
          <button
            type="button"
            onClick={handleDownloadPng}
            title="Download as PNG"
            className="gba:inline-flex gba:items-center gba:justify-center gba:w-7 gba:h-7 gba:rounded-full gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors gba:cursor-pointer gba:border-0 gba:bg-transparent"
          >
            <ImageIcon className="gba:h-3.5 gba:w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleOpenNewTab}
            title="Open in new tab"
            className="gba:inline-flex gba:items-center gba:justify-center gba:w-7 gba:h-7 gba:rounded-full gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors gba:cursor-pointer gba:border-0 gba:bg-transparent"
          >
            <ArrowSquareOutIcon className="gba:h-3.5 gba:w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onViewArtifact?.(artifact.path || artifact.name)}
            title="Open full view"
            className="gba:text-xs gba:font-medium gba:text-primary gba:hover:text-primary/80 gba:transition-colors gba:cursor-pointer gba:ml-1 gba:border-0 gba:bg-transparent"
          >
            Open
          </button>
        </div>
      </div>
    </div>
  )
}
