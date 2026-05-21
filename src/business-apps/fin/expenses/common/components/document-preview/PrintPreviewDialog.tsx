import React from 'react'
import { Spinner, Dialog, DialogContent, DialogHeader, DialogTitle } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface PrintPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  loading: boolean
  pdfUrl: string
  testIdPrefix: string
  noDocumentDetailsMessage?: string
}

const DEFAULT_NO_DOCUMENT_DETAILS = 'This expense plan does not have an associated document to print.'

export const PrintPreviewDialog = React.memo(function PrintPreviewDialog({
  open,
  onOpenChange,
  title,
  loading,
  pdfUrl,
  testIdPrefix,
  noDocumentDetailsMessage
}: PrintPreviewDialogProps) {
  const noDocumentMessage =
    noDocumentDetailsMessage ??
    getTranslationFromI18nKeyAndLabel('lowcoder:print.no_document_details', DEFAULT_NO_DOCUMENT_DETAILS)

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
        title={getTranslationFromI18nKeyAndLabel('lowcoder:print.preview_title', 'Print Preview')}
        data-testid={`${testIdPrefix}-pdf-iframe`}
      />
    )
  } else {
    dialogBody = (
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8 gba:text-center">
        <div className="gba:text-muted-foreground gba:mb-4">
          {getTranslationFromI18nKeyAndLabel('lowcoder:print.no_document', 'No document available for printing')}
        </div>
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
