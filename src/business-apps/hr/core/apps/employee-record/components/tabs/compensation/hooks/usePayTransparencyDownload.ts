import { useCallback, useState } from 'react'
import { toast } from '@newwork/nw-design-system'
import { downloadEmployeePayTransparencyReport } from '@/business-apps/hr/compensation/api/downloadEmployeePayTransparencyReport'
import { triggerDownload } from '@/common/utils/excelExportUtils'

interface UsePayTransparencyDownloadParams {
  employeeId: string
  accessToken?: string
  t: (key: string) => string
}

export function usePayTransparencyDownload({ employeeId, accessToken, t }: UsePayTransparencyDownloadParams) {
  const [isDownloading, setIsDownloading] = useState(false)

  const download = useCallback(async () => {
    if (!accessToken) {
      toast.warning(t('rewards-pay-transparency-download-failed'))
      return
    }

    setIsDownloading(true)
    try {
      const { blob, filename } = await downloadEmployeePayTransparencyReport(accessToken, employeeId)
      triggerDownload(blob, filename)
    } catch (error) {
      console.error('Pay transparency download failed:', error instanceof Error ? error.message : error)
      toast.warning(t('rewards-pay-transparency-download-failed'))
    } finally {
      setIsDownloading(false)
    }
  }, [accessToken, employeeId, t])

  return {
    download,
    isDownloading,
    canDownload: Boolean(accessToken)
  }
}
