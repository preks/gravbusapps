import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface ExpenseItemMediaPreviewDialogsProps {
  previewOpen: boolean
  onPreviewOpenChange: (open: boolean) => void
  previewImage: string
  pdfPreviewOpen: boolean
  onPdfPreviewOpenChange: (open: boolean) => void
  pdfPreviewUrl: string
}

export function ExpenseItemMediaPreviewDialogs({
  previewOpen,
  onPreviewOpenChange,
  previewImage,
  pdfPreviewOpen,
  onPdfPreviewOpenChange,
  pdfPreviewUrl
}: ExpenseItemMediaPreviewDialogsProps) {
  return (
    <>
      <Dialog open={previewOpen} onOpenChange={onPreviewOpenChange}>
        <DialogContent className="gba:max-w-6xl gba:max-h-screen">
          <DialogHeader>
            <DialogTitle>
              {getTranslationFromI18nKeyAndLabel('lowcoder:expense.item.imagePreview', 'Image Preview')}
            </DialogTitle>
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
        <DialogContent className="gba:max-w-6xl gba:max-h-screen">
          <DialogHeader>
            <DialogTitle>
              {getTranslationFromI18nKeyAndLabel('lowcoder:expense.item.pdfPreview', 'PDF Preview')}
            </DialogTitle>
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
