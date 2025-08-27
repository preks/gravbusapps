import React from 'react';
import { Modal } from 'antd';
import { Alert, Spinner } from '@newwork/nw-design-system';

interface ExpenseRequestPdfModalProps {
  isVisible: boolean;
  pdfUrl: string;
  pdfLoading: boolean;
  pdfError: string;
  onClose: () => void;
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
      width="80%"
      style={{ top: 20 }}
      data-testid="expense-request-pdf-modal"
    >
      {pdfLoading ? (
        <div className="gba:flex gba:justify-center gba:items-center gba:h-96">
          <Spinner size="lg" />
          <div>Loading PDF...</div>
        </div>
      ) : pdfError ? (
        <div className="gba:flex gba:justify-center gba:items-center gba:h-96">
          <Alert variant="destructive">
            <div className="gba:font-medium">Error Loading PDF</div>
            <div className="gba:text-sm">{pdfError}</div>
          </Alert>
        </div>
      ) : pdfUrl ? (
        <iframe
          src={pdfUrl}
          style={{ width: '100%', height: '70vh', border: 'none' }}
          title="Expense Request PDF"
          data-testid="expense-request-pdf-iframe"
        />
      ) : (
        <div className="gba:flex gba:justify-center gba:items-center gba:h-96">
          <div>No PDF URL available</div>
        </div>
      )}
    </Modal>
  );
};

export default ExpenseRequestPdfModal; 