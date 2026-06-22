import React, { useCallback, useRef, useState } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { ArrowSquareOutIcon, ImageIcon } from '@phosphor-icons/react'
import { useEnterpriseAgentClient } from '../../../hooks/useEnterpriseAgentClient'
import { AutoHeightHtmlIframe } from '../../artifacts/AutoHeightHtmlIframe'
import { downloadHtmlArtifactPng } from '../../artifacts/htmlArtifactPngCapture'
import translations from '../../../_i18n'
import { buildArtifactDownloadUrl } from './artifactUrls'
import type { FinalAnswerArtifact } from './types'

export const HtmlArtifactPreviewCard: React.FC<{
  artifact: FinalAnswerArtifact
  sessionId: string
  accessToken?: string
  onViewArtifact?: (artifactName: string) => void
}> = ({ artifact, sessionId, accessToken, onViewArtifact }) => {
  const { t } = useTranslation(translations)
  const artifactPath = artifact.path || artifact.name
  const downloadUrl = buildArtifactDownloadUrl(sessionId, artifactPath)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const client = useEnterpriseAgentClient(accessToken ?? '')
  const [isCapturingPng, setIsCapturingPng] = useState(false)

  const handleDownloadPng = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      if (isCapturingPng) return

      setIsCapturingPng(true)
      try {
        await downloadHtmlArtifactPng({
          fileName: artifact.name,
          iframe: iframeRef.current,
          downloadUrl,
          fetchHtml: accessToken ? () => client.getArtifactContent(sessionId, artifactPath) : undefined
        })
      } finally {
        setIsCapturingPng(false)
      }
    },
    [accessToken, artifact.name, artifactPath, client, downloadUrl, isCapturingPng, sessionId]
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
            disabled={isCapturingPng}
            title={isCapturingPng ? t('renderer-artifact-saving-png') : t('renderer-artifact-download-png')}
            className="gba:inline-flex gba:items-center gba:justify-center gba:w-7 gba:h-7 gba:rounded-full gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors gba:cursor-pointer gba:border-0 gba:bg-transparent gba:disabled:opacity-50"
          >
            <ImageIcon className="gba:h-3.5 gba:w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleOpenNewTab}
            title={t('renderer-artifact-open-new-tab')}
            className="gba:inline-flex gba:items-center gba:justify-center gba:w-7 gba:h-7 gba:rounded-full gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors gba:cursor-pointer gba:border-0 gba:bg-transparent"
          >
            <ArrowSquareOutIcon className="gba:h-3.5 gba:w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onViewArtifact?.(artifact.path || artifact.name)}
            title={t('renderer-artifact-open-full')}
            className="gba:text-xs gba:font-medium gba:text-primary gba:hover:text-primary/80 gba:transition-colors gba:cursor-pointer gba:ml-1 gba:border-0 gba:bg-transparent"
          >
            {t('renderer-artifact-open')}
          </button>
        </div>
      </div>
    </div>
  )
}
