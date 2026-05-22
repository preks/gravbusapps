import React from 'react'
import { Spinner, Dialog, DialogContent, DialogHeader, DialogTitle, useTranslation } from '@newwork/nw-design-system'
import translations from '../../_i18n'

export interface PrintPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  loading: boolean
  pdfUrl: string
  testIdPrefix: string
  noDocumentDetailsMessage?: string
}

export const PrintPreviewDialog = React.memo(function PrintPreviewDialog({
  open,
  onOpenChange,
  title,
  loading,
  pdfUrl,
  testIdPrefix,
  noDocumentDetailsMessage
}: PrintPreviewDialogProps) {
  const { t } = useTranslation(translations)
  const noDocumentMessage = noDocumentDetailsMessage ?? t('print-no-document-details-default')
  const previewTitle = t('print-preview-title')
  const noDocumentLabel = t('print-no-document')

  let dialogBody: React.ReactNode
  if (loading) {
    dialogBody = (
      <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
        <Spinner />
      </div>
    )
  } else if (pdfUrl) {
    dialogBody = (
      <iframe
        src={pdfUrl}
        className="gba:w-full gba:border-0 gba:min-h-[calc(90vh-55px)]"
        title={previewTitle}
        data-testid={`${testIdPrefix}-pdf-iframe`}
      />
    )
  } else {
    dialogBody = (
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8 gba:text-center">
        <div className="gba:text-muted-foreground gba:mb-4">{noDocumentLabel}</div>
        <div className="gba:text-sm gba:text-muted-foreground">{noDocumentMessage}</div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="gba:!w-[90vw] gba:!max-w-[90vw] gba:!p-0 gba:!rounded-md gba:max-h-[90vh]"
        data-testid={`${testIdPrefix}-print-modal`}
      >
        <DialogHeader className="gba:p-4">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {dialogBody}
      </DialogContent>
    </Dialog>
  )
})
