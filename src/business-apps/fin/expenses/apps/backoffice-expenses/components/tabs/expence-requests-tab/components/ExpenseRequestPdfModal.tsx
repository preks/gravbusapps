import React from 'react'
import { Modal } from 'antd'
import { Alert, Spinner } from '@newwork/nw-design-system'

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
  return (
    <Modal
      title="Expense Request Document"
      open={isVisible}
      onCancel={onClose}
      footer={null}
      width="90vw"
      style={{ top: 20 }}
      data-testid="expense-request-pdf-modal"
    >
      {pdfLoading ? (
        <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
          <Spinner />
        </div>
      ) : pdfError ? (
        <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
          <Alert variant="destructive">
            <div className="gba:font-medium">Error Loading PDF</div>
            <div className="gba:text-sm">{pdfError}</div>
          </Alert>
        </div>
      ) : pdfUrl ? (
        <iframe
          src={pdfUrl}
          style={{ width: '100%', height: 'calc(90vh - 55px)', border: 'none' }}
          title="Expense Request PDF"
          data-testid="expense-request-pdf-iframe"
        />
      ) : (
        <div className="gba:text-center gba:p-8 gba:text-gray-500">No PDF URL available</div>
      )}
    </Modal>
  )
}

export default ExpenseRequestPdfModal
