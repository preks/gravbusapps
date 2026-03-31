import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  AlertDescription,
  Card,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Spinner,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { FilePdfIcon } from '@phosphor-icons/react'
import translations from '../../../apps/personal-expenses/_i18n'
import { getFileNameFromEmployeeDocument } from '../../utils/fileNameUtils'

type PrintResult = { success: boolean; pdfUrl?: string; error?: string }

// Utility function to truncate file names (same behavior as item sidebar)
const truncateFileName = (fileName: string, maxLength: number = 15): string => {
  if (!fileName || fileName.length <= maxLength) {
    return fileName || ''
  }

  const lastDotIndex = fileName.lastIndexOf('.')
  if (lastDotIndex === -1) {
    return fileName.substring(0, maxLength - 3) + '...'
  }

  const name = fileName.substring(0, lastDotIndex)
  const extension = fileName.substring(lastDotIndex)

  if (extension.length >= maxLength - 3) {
    return '...' + extension
  }

  if (name.length <= 3) {
    return fileName.substring(0, maxLength - 3) + '...'
  }

  const maxNameLength = maxLength - extension.length - 3
  return name.substring(0, maxNameLength) + '...' + extension
}

export interface TravelOrderAttachmentPreviewProps {
  record: any
  /**
   * Use the same fetcher as the table "Print" action.
   * Expected to return an objectUrl in `pdfUrl`.
   */
  fetchPdf: (record: any) => Promise<PrintResult>
  dataTestIdPrefix: string
}

export const TravelOrderAttachmentPreview: React.FC<TravelOrderAttachmentPreviewProps> = ({
  record,
  fetchPdf,
  dataTestIdPrefix
}) => {
  const { t } = useTranslation(translations)

  const [pdfPreviewOpen, setPdfPreviewOpen] = useState<boolean>(false)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>('')
  const [pdfLoading, setPdfLoading] = useState<boolean>(false)
  const [pdfError, setPdfError] = useState<string | null>(null)

  const isMounted = useRef(true)
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // Revoke the previously created object URL when it changes / unmounts.
  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl)
      }
    }
  }, [pdfPreviewUrl])

  const hasTravelOrder = Boolean(record?.employeeDocument?.file && String(record.employeeDocument.file).trim() !== '')

  const fileName = useMemo(() => {
    const result = getFileNameFromEmployeeDocument(record)
    // If utility returned default, use component's translation system
    if (result === 'document.pdf') {
      return t('travel-order-fallback-file-name')
    }
    return result
  }, [record, t])

  const openPdfPreview = useCallback(async () => {
    if (!hasTravelOrder) return

    setPdfPreviewOpen(true)
    setPdfLoading(true)
    setPdfError(null)

    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl)
      setPdfPreviewUrl('')
    }

    try {
      const result = await fetchPdf(record)
      if (!isMounted.current) return

      if (result.success && result.pdfUrl) {
        setPdfPreviewUrl(result.pdfUrl)
        return
      }

      setPdfError(result.error || t('travel-order-failed-to-load-pdf'))
    } catch (e) {
      if (!isMounted.current) return
      setPdfError(e instanceof Error ? e.message : t('travel-order-failed-to-load-pdf'))
    } finally {
      if (isMounted.current) setPdfLoading(false)
    }
  }, [fetchPdf, hasTravelOrder, pdfPreviewUrl, record, t])

  if (!hasTravelOrder) {
    return (
      <Card
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8"
        data-testid={`${dataTestIdPrefix}-travel-order-empty`}
      >
        <div className="gba:flex gba:flex-col gba:items-center gba:space-y-2">
          <FilePdfIcon size={48} className="gba:text-border" />
          <p className="gba:text-sm gba:text-gray-600">{t('travel-order-no-attached')}</p>
        </div>
      </Card>
    )
  }

  // Single-file "receipt-style" tile (matches the item sidebar layout)
  return (
    <>
      <div
        className="gba:grid gba:grid-cols-2 gba:gap-4 gba:sm:gba:grid-cols-3 gba:md:gba:grid-cols-4 gba:lg:gba:grid-cols-5"
        data-testid={`${dataTestIdPrefix}-travel-order-grid`}
      >
        <div
          className="gba:flex gba:flex-col gba:items-center gba:p-2 gba:bg-background gba:rounded-lg gba:w-[104px] gba:min-h-[130px] gba:max-h-[150px]"
          data-testid={`${dataTestIdPrefix}-travel-order-card`}
        >
          <button
            type="button"
            className="gba:w-[90px] gba:h-[90px] gba:flex gba:justify-center gba:items-center gba:bg-gray-100 gba:rounded-md gba:shadow gba:cursor-pointer hover:gba:bg-gray-200 gba:border-none"
            onClick={openPdfPreview}
            data-testid={`${dataTestIdPrefix}-travel-order-pdf-thumb`}
          >
            <FilePdfIcon size={48} className="gba:text-red-500" />
          </button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="gba:mt-2 gba:text-xs gba:text-center gba:w-full gba:px-1 gba:break-words gba:cursor-help"
                  data-testid={`${dataTestIdPrefix}-travel-order-name`}
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '100%',
                    lineHeight: '1.2',
                    wordBreak: 'break-all'
                  }}
                >
                  {truncateFileName(fileName, 18)}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="gba:max-w-xs">
                  <div className="gba:font-medium gba:break-words">{fileName}</div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <Dialog
        open={pdfPreviewOpen}
        onOpenChange={open => {
          setPdfPreviewOpen(open)
          if (!open) {
            setPdfLoading(false)
            setPdfError(null)
            if (pdfPreviewUrl) {
              URL.revokeObjectURL(pdfPreviewUrl)
              setPdfPreviewUrl('')
            }
          }
        }}
      >
        <DialogContent
          className="gba:!w-[90vw] gba:!max-w-[90vw] gba:max-h-[90vh]"
          data-testid={`${dataTestIdPrefix}-travel-order-modal`}
        >
          <DialogHeader>
            <DialogTitle>{t('travel-order-preview-title')}</DialogTitle>
          </DialogHeader>

          {(() => {
            if (pdfLoading) {
              return (
                <div className="gba:p-4 gba:flex gba:justify-center gba:items-center gba:py-8">
                  <Spinner />
                </div>
              )
            }
            if (pdfError) {
              return (
                <Alert variant="destructive" data-testid={`${dataTestIdPrefix}-travel-order-preview-error`}>
                  <AlertDescription>{pdfError}</AlertDescription>
                </Alert>
              )
            }
            return (
              <div className="gba:mt-4">
                <iframe
                  src={pdfPreviewUrl}
                  className="gba:w-full gba:h-[calc(90vh-120px)] gba:border-0"
                  title="PDF Preview"
                  data-testid={`${dataTestIdPrefix}-travel-order-preview-iframe`}
                />
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default TravelOrderAttachmentPreview
