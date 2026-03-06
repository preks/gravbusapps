import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { EmailApiService } from '../services/EmailApiService'

export const useAttachmentDownload = (t: (key: string) => string) => {
  const [downloadingAttId, setDownloadingAttId] = useState<string | null>(null)

  const handleDownloadAttachment = useCallback(
    async (messageId: string, attachmentId: string) => {
      setDownloadingAttId(attachmentId)
      try {
        const { url, filename } = await EmailApiService.downloadAttachment(messageId, attachmentId)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        link.remove()
        setTimeout(() => URL.revokeObjectURL(url), 30000)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('reader-toast-download-failed'))
      } finally {
        setDownloadingAttId(null)
      }
    },
    [t]
  )

  return { downloadingAttId, handleDownloadAttachment }
}
