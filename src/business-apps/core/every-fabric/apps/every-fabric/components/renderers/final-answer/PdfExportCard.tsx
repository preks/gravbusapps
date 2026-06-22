import React, { useCallback, useState } from 'react'
import { Badge, toast, useTranslation } from '@newwork/nw-design-system'
import { DownloadSimpleIcon, FileTextIcon } from '@phosphor-icons/react'
import type { MessageAttachmentRef, SessionAttachment } from '../../../types/enterpriseAgent'
import { useEnterpriseAgentClient } from '../../../hooks/useEnterpriseAgentClient'
import translations from '../../../_i18n'

export const PdfExportCard: React.FC<{
  attachment: SessionAttachment | MessageAttachmentRef
  sessionId?: string
  accessToken?: string
}> = ({ attachment, sessionId, accessToken }) => {
  const { t } = useTranslation(translations)
  const client = useEnterpriseAgentClient(accessToken ?? '')
  const [downloading, setDownloading] = useState(false)
  const fileName = attachment.name || 'export.pdf'

  const handleDownload = useCallback(async () => {
    if (!sessionId || !attachment.id) {
      toast.error(t('renderer-pdf-unavailable'))
      return
    }
    setDownloading(true)
    try {
      const blob = await client.fetchAttachmentContent(sessionId, attachment.id)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'unknown error'
      toast.error(t('renderer-pdf-download-error', { detail }))
    } finally {
      setDownloading(false)
    }
  }, [attachment.id, client, fileName, sessionId, t])

  const onDownloadClick = useCallback(() => {
    handleDownload().catch(() => {
      // Errors are surfaced via toast inside handleDownload
    })
  }, [handleDownload])

  return (
    <button
      type="button"
      onClick={onDownloadClick}
      disabled={!sessionId || !attachment.id || downloading}
      className="gba:flex gba:items-center gba:gap-2.5 gba:px-3.5 gba:py-2.5 gba:rounded-xl gba:border gba:border-border gba:bg-card gba:hover:bg-accent/50 gba:transition-all gba:duration-200 gba:cursor-pointer gba:w-full gba:text-left"
      data-testid={`pdf-export-card-${attachment.id}`}
    >
      <div className="gba:h-8 gba:w-8 gba:rounded-lg gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:shrink-0">
        <FileTextIcon className="gba:h-4 gba:w-4 gba:text-primary" />
      </div>
      <div className="gba:min-w-0 gba:flex-1">
        <span className="gba:text-xs gba:font-semibold gba:text-foreground gba:block gba:truncate">
          {t('renderer-pdf-ready')}
        </span>
        <span className="gba:text-[10px] gba:text-muted-foreground gba:block gba:truncate">{fileName}</span>
      </div>
      <Badge
        variant="secondary"
        className="gba:ml-auto gba:text-[10px] gba:shrink-0 gba:inline-flex gba:items-center gba:gap-1"
      >
        <DownloadSimpleIcon className="gba:h-3 gba:w-3" />
        {downloading ? t('renderer-download-ellipsis') : t('renderer-download')}
      </Badge>
    </button>
  )
}
