import React from 'react'
import {
  Alert,
  Spinner,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../../../../_i18n'

interface ExpenseRequestPdfModalProps {
  isVisible: boolean
  pdfUrl: string
  pdfLoading: boolean
  pdfError: string
  onClose: () => void
}

const ExpenseRequestPdfModal: React.FC<ExpenseRequestPdfModalProps> = ({
  isVisible,
  pdfUrl,
  pdfLoading,
  pdfError,
  onClose
}) => {
  const { t } = useTranslation(translations)

  return (
    <Dialog open={isVisible} onOpenChange={open => !open && onClose()}>
      <DialogContent
        className="gba:!w-[90vw] gba:!max-w-[90vw] gba:!p-0 gba:!rounded-md"
        style={{ height: '90vh' }}
        data-testid="expense-request-pdf-modal"
      >
        <DialogHeader className="gba:p-4">
          <DialogTitle>{t('pdf-modal-title')}</DialogTitle>
        </DialogHeader>
        {pdfLoading ? (
          <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
            <Spinner />
          </div>
        ) : pdfError ? (
          <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
            <Alert variant="destructive">
              <div className="gba:font-medium">{t('pdf-error-loading')}</div>
              <div className="gba:text-sm">{pdfError}</div>
            </Alert>
          </div>
        ) : pdfUrl ? (
          <iframe
            src={pdfUrl}
            className="gba:w-full gba:border-0"
            style={{ height: 'calc(90vh - 55px)' }}
            title={t('pdf-iframe-title')}
            data-testid="expense-request-pdf-iframe"
          />
        ) : (
          <div className="gba:text-center gba:p-8 gba:text-gray-500">{t('empty-no-document')}</div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ExpenseRequestPdfModal
