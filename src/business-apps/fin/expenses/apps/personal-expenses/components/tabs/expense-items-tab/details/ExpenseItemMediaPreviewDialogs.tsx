import { Dialog, DialogContent, DialogHeader, DialogTitle, useTranslation } from '@newwork/nw-design-system'
import personalTranslations from '../../../../_i18n'

type ExpenseItemTranslationsBundle = Record<'en-US' | 'de-DE' | 'ro-RO', string>

export interface ExpenseItemMediaPreviewDialogsProps {
  previewOpen: boolean
  onPreviewOpenChange: (open: boolean) => void
  previewImage: string
  pdfPreviewOpen: boolean
  onPdfPreviewOpenChange: (open: boolean) => void
  pdfPreviewUrl: string
  translations?: ExpenseItemTranslationsBundle
}

export function ExpenseItemMediaPreviewDialogs({
  previewOpen,
  onPreviewOpenChange,
  previewImage,
  pdfPreviewOpen,
  onPdfPreviewOpenChange,
  pdfPreviewUrl,
  translations
}: Readonly<ExpenseItemMediaPreviewDialogsProps>) {
  const { t } = useTranslation(translations ?? personalTranslations)

  return (
    <>
      <Dialog open={previewOpen} onOpenChange={onPreviewOpenChange}>
        <DialogContent className="gba:max-w-6xl gba:max-h-screen" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t('expense-items-media-image-preview')}</DialogTitle>
          </DialogHeader>
          <div className="gba:mt-4 gba:flex gba:justify-center">
            <img
              src={previewImage}
              alt="Preview"
              className="gba:max-w-full gba:max-h-[min(80vh,36rem)] gba:object-contain"
              data-testid="image-preview"
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={pdfPreviewOpen} onOpenChange={onPdfPreviewOpenChange}>
        <DialogContent className="gba:max-w-6xl gba:max-h-screen" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t('expense-items-media-pdf-preview')}</DialogTitle>
          </DialogHeader>
          <div className="gba:mt-4">
            <iframe
              src={pdfPreviewUrl}
              className="gba:w-full gba:h-[min(80vh,36rem)] gba:border-0"
              title="PDF Preview"
              data-testid="pdf-preview-iframe"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
