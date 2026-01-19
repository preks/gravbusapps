import React, { useState } from 'react'
import { Badge } from '@newwork/nw-design-system'
import { RightOutlined, FileTextOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import DocumentPdfModal from './DocumentPdfModal'

interface EmployeeInfoSectionProps {
  employee: {
    id: string
  }
  amount: number
  currency: {
    code: string
  }
  status: string
  expensePlan: {
    title?: string
    planDate?: string
    decisionDate?: string
    employeeDocument?: {
      id: string
      file: string
      mimeType: string
    }
  }
  accessToken?: string
}

const formatCurrency = (amount: number, currencyCode: string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2
  }).format(amount)
}

const EmployeeInfoSection: React.FC<EmployeeInfoSectionProps> = ({
  employee,
  amount,
  currency,
  status,
  expensePlan,
  accessToken
}) => {
  const [isPdfModalVisible, setIsPdfModalVisible] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState<string>('')

  const handleFileClick = () => {
    if (expensePlan.employeeDocument?.file) {
      setPdfLoading(true)
      setPdfError('')
      setIsPdfModalVisible(true)

      // Simulate loading completion since the file is already available
      setTimeout(() => {
        setPdfLoading(false)
      }, 500)
    }
  }

  const handleClosePdfModal = () => {
    setIsPdfModalVisible(false)
    setPdfLoading(false)
    setPdfError('')
  }

  const handleExpensePlanClick = () => {
    // Navigate to the expense plan details or open in new tab
    if (expensePlan.title) {
      // You can implement navigation logic here if needed
    }
  }

  return (
    <>
      <div data-testid="confirm-transfer-adv-payment-v2-employee-section">
        {/* Payment details - now in 3-column layout */}
        <div className="gba:mb-4" data-testid="confirm-transfer-adv-payment-v2-payment-details">
          {/* First row: Amount, Request Date, Status */}
          <div className="gba:grid gba:grid-cols-3 gba:gap-4 gba:mb-4">
            <div className="gba:flex gba:flex-col">
              <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-1">
                {getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.expense_table.amount', 'Amount')}
              </span>
              <span className="gba:text-sm gba:font-semibold gba:text-foreground">
                {formatCurrency(amount, currency.code)}
              </span>
            </div>

            <div className="gba:flex gba:flex-col">
              <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-1">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:confirm_transfer_advance_payment.request_date_label',
                  'Request Date'
                )}
              </span>
              <span className="gba:text-sm gba:font-semibold gba:text-foreground">
                {(() => {
                  if (!expensePlan.decisionDate) {
                    return '-'
                  }
                  try {
                    const parsed = dayjs(expensePlan.decisionDate)
                    if (parsed.isValid()) {
                      // Format date in a user-friendly format (e.g., "Nov 18, 2025")
                      return parsed.format('MMM D, YYYY')
                    }
                    return expensePlan.decisionDate
                  } catch {
                    return expensePlan.decisionDate
                  }
                })()}
              </span>
            </div>

            <div className="gba:flex gba:flex-col">
              <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-1">Status</span>
              <Badge
                variant="secondary"
                className="gba:bg-warning-100 gba:text-warning-700 gba:px-2 gba:py-1 gba:rounded-full gba:text-xs gba:w-fit"
              >
                {status}
              </Badge>
            </div>
          </div>

          {/* Second row: File information */}
          <div className="gba:flex gba:items-center gba:gap-2">
            <button
              className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground gba:hover:text-foreground gba:cursor-pointer"
              onClick={handleExpensePlanClick}
              data-testid="expense-plan-link-button"
            >
              <RightOutlined />
              {expensePlan.title}
            </button>
            <button
              className={`gba:flex gba:items-center gba:gap-1 gba:text-xs gba:cursor-pointer ${
                expensePlan.employeeDocument?.file
                  ? 'gba:text-muted-foreground gba:hover:text-foreground gba:hover:scale-105 gba:transition-transform'
                  : 'gba:text-muted-foreground/50 gba:cursor-not-allowed'
              }`}
              onClick={handleFileClick}
              disabled={!expensePlan.employeeDocument?.file}
              data-testid="document-view-button"
              title={expensePlan.employeeDocument?.file ? 'View Document' : 'No document available'}
            >
              <FileTextOutlined />
            </button>
          </div>
        </div>
      </div>

      {/* PDF Modal */}
      <DocumentPdfModal
        isVisible={isPdfModalVisible}
        pdfUrl={expensePlan.employeeDocument?.file || ''}
        pdfLoading={pdfLoading}
        pdfError={pdfError}
        onClose={handleClosePdfModal}
        accessToken={accessToken}
        employeeId={employee.id}
      />
    </>
  )
}

export default EmployeeInfoSection
