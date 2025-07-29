import React from 'react';
import { Modal } from 'antd';
import { Spinner, Alert } from '@newwork/nw-design-system';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

interface ExpenseRequestPdfModalProps {
  isVisible: boolean;
  pdfUrl: string;
  pdfLoading: boolean;
  pdfError: string;
  onClose: () => void;
}

export const ExpenseRequestPdfModal: React.FC<ExpenseRequestPdfModalProps> = ({
  isVisible,
  pdfUrl,
  pdfLoading,
  pdfError,
  onClose
}) => {
  return (
    <Modal
      title={getTranslationFromI18nKeyAndLabel(
        'expense.request.pdf.modal.title',
        'Expense Request PDF'
      )}
      open={isVisible}
      onCancel={onClose}
      footer={null}
      width="90%"
      style={{ top: 20 }}
      data-testid="expense-request-pdf-modal"
    >
      <div className="gba:min-h-[600px] gba:flex gba:justify-center gba:items-center">
        {pdfLoading ? (
          <div className="gba:flex gba:flex-col gba:items-center gba:gap-4">
            <Spinner size="lg" />
            <p className="gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel(
                'expense.request.pdf.loading',
                'Loading PDF...'
              )}
            </p>
          </div>
        ) : pdfError ? (
          <div className="gba:text-center gba:text-red-600">
            <p className="gba:font-medium">
              {getTranslationFromI18nKeyAndLabel(
                'expense.request.pdf.error.title',
                'Error Loading PDF'
              )}
            </p>
            <p className="gba:text-sm gba:mt-2">{pdfError}</p>
          </div>
        ) : pdfUrl ? (
          <iframe
            src={pdfUrl}
            className="gba:w-full gba:h-[600px] gba:border-0"
            title="Expense Request PDF"
            data-testid="expense-request-pdf-iframe"
          />
        ) : null}
      </div>
    </Modal>
  );
}; 