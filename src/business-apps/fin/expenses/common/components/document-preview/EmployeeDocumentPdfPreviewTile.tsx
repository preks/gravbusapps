import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Spinner,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { getFileNameFromEmployeeDocument, type HasEmployeeDocument } from '../../utils/fileNameUtils'
import type { PrintPdfResult } from '../../files/useEmployeeDocumentPdfFileService'

export interface EmployeeDocumentPdfPreviewTileProps {
  record: HasEmployeeDocument
  fetchPdf: (record: HasEmployeeDocument) => Promise<PrintPdfResult>
  dataTestIdPrefix: string
}

export const EmployeeDocumentPdfPreviewTile: React.FC<EmployeeDocumentPdfPreviewTileProps> = ({
  record,
  fetchPdf,
  dataTestIdPrefix
}) => {
  const [previewOpen, setPreviewOpen] = useState<boolean>(false)
  const [pdfUrl, setPdfUrl] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const isMounted = useRef<boolean>(true)
  useEffect(() => {
    return () => {
      isMounted.current = false
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
  }, [pdfUrl])

  const hasDocument = Boolean(record?.employeeDocument?.file && String(record.employeeDocument.file).trim() !== '')

  const fileName = useMemo(
    () => getFileNameFromEmployeeDocument(record, undefined, undefined, 'employee-document.pdf'),
    [record]
  )

  const openPreview = useCallback(async () => {
    if (!hasDocument) return

    setPreviewOpen(true)
    setLoading(true)
    setError(null)

    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl)
      setPdfUrl('')
    }

    try {
      const result = await fetchPdf(record)
      if (!isMounted.current) return

      if (result.success && result.pdfUrl) {
        setPdfUrl(result.pdfUrl)
        return
      }

      setError(
        result.error ||
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:expenses.employee_document_pdf.error.failed_to_load',
            'Failed to load PDF'
          )
      )
    } catch (e) {
      if (!isMounted.current) return
      setError(
        e instanceof Error
          ? e.message
          : getTranslationFromI18nKeyAndLabel(
              'lowcoder:expenses.employee_document_pdf.error.failed_to_load',
              'Failed to load PDF'
            )
      )
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }, [fetchPdf, hasDocument, pdfUrl, record])

  if (!hasDocument) {
    return (
      <Card data-testid={`${dataTestIdPrefix}-employee-document-empty`}>
        <CardContent className="gba:p-4">
          <div className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:expenses.employee_document_pdf.no_document_attached',
              'No document attached'
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card data-testid={`${dataTestIdPrefix}-employee-document-card`}>
        <CardContent className="gba:p-4">
          <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="gba:min-w-0 gba:flex-1 gba:cursor-help"
                    data-testid={`${dataTestIdPrefix}-employee-document-name`}
                  >
                    <div className="gba:text-sm gba:font-medium gba:truncate">{fileName}</div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="gba:max-w-xs gba:break-words">{fileName}</div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              variant="outline"
              onClick={openPreview}
              data-testid={`${dataTestIdPrefix}-employee-document-preview-button`}
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:expenses.employee_document_pdf.preview', 'Preview')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={previewOpen}
        onOpenChange={open => {
          setPreviewOpen(open)
          if (!open) {
            setError(null)
            if (pdfUrl) {
              URL.revokeObjectURL(pdfUrl)
              setPdfUrl('')
            }
          }
        }}
      >
        <DialogContent className="gba:max-w-4xl" data-testid={`${dataTestIdPrefix}-employee-document-modal`}>
          <DialogHeader>
            <DialogTitle>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:expenses.employee_document_pdf.preview_title',
                'PDF Preview'
              )}
            </DialogTitle>
          </DialogHeader>

          {(() => {
            if (loading) {
              return (
                <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
                  <Spinner />
                </div>
              )
            }
            if (error) {
              return (
                <Alert variant="destructive" data-testid={`${dataTestIdPrefix}-employee-document-preview-error`}>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )
            }
            if (pdfUrl) {
              return (
                <div className="gba:mt-4 gba:w-full gba:aspect-video">
                  <iframe
                    src={pdfUrl}
                    className="gba:w-full gba:h-full gba:border-0"
                    title={getTranslationFromI18nKeyAndLabel(
                      'lowcoder:expenses.employee_document_pdf.preview_iframe_title',
                      'PDF Preview'
                    )}
                    data-testid={`${dataTestIdPrefix}-employee-document-preview-iframe`}
                  />
                </div>
              )
            }
            return (
              <div className="gba:text-sm gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:expenses.employee_document_pdf.error.failed_to_load',
                  'Failed to load PDF'
                )}
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default EmployeeDocumentPdfPreviewTile
