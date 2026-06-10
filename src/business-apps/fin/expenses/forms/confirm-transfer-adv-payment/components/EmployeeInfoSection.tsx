import React, { useState } from 'react'
import { Badge, Label, useTranslation } from '@newwork/nw-design-system'
import { CaretRightIcon, FileTextIcon } from '@phosphor-icons/react'
import { formatDateTime } from '@/common/utils/dateFormatter'
import { getAdvancePaymentStatusDisplayT } from '@/business-apps/fin/expenses/common/utils/statusDisplayUtils'
import commonTranslations from '@/business-apps/fin/expenses/common/_i18n'
import DocumentPdfModal from './DocumentPdfModal'
import translations from '../_i18n'

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
  const { t } = useTranslation(translations)
  const { t: tCommon } = useTranslation(commonTranslations)
  const statusConfig = getAdvancePaymentStatusDisplayT(tCommon, status)

  const [isPdfModalVisible, setIsPdfModalVisible] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState<string>('')

  const handleFileClick = () => {
    if (expensePlan.employeeDocument?.file) {
      setPdfLoading(true)
      setPdfError('')
      setIsPdfModalVisible(true)

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
    if (expensePlan.title) {
      // Navigation can be wired when expense plan id is available on this payload
    }
  }

  return (
    <>
      <div data-testid="confirm-transfer-adv-payment-v2-employee-section">
        <div className="gba:mb-4" data-testid="confirm-transfer-adv-payment-v2-payment-details">
          <div className="gba:grid gba:grid-cols-3 gba:gap-4 gba:mb-4">
            <div className="gba:flex gba:flex-col">
              <Label className="gba:text-sm gba:text-muted-foreground gba:mb-1">{t('label-amount')}</Label>
              <span className="gba:text-sm gba:font-semibold gba:text-foreground">
                {formatCurrency(amount, currency.code)}
              </span>
            </div>

            <div className="gba:flex gba:flex-col">
              <Label className="gba:text-sm gba:text-muted-foreground gba:mb-1">{t('label-request-date')}</Label>
              <span className="gba:text-sm gba:font-semibold gba:text-foreground">
                {expensePlan.decisionDate ? formatDateTime(expensePlan.decisionDate, 'date') : '-'}
              </span>
            </div>

            <div className="gba:flex gba:flex-col">
              <Label className="gba:text-sm gba:text-muted-foreground gba:mb-1">{tCommon('header-status')}</Label>
              <Badge variant={statusConfig.badgeVariant || 'outline'} className="gba:text-xs gba:w-fit">
                {statusConfig.label}
              </Badge>
            </div>
          </div>

          <div className="gba:flex gba:items-center gba:gap-2">
            <button
              type="button"
              className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground gba:hover:text-foreground gba:cursor-pointer"
              onClick={handleExpensePlanClick}
              data-testid="expense-plan-link-button"
            >
              <CaretRightIcon size={16} />
              {expensePlan.title}
            </button>
            <button
              type="button"
              className={`gba:flex gba:items-center gba:gap-1 gba:text-xs gba:cursor-pointer ${
                expensePlan.employeeDocument?.file
                  ? 'gba:text-muted-foreground gba:hover:text-foreground gba:hover:scale-105 gba:transition-transform'
                  : 'gba:text-muted-foreground/50 gba:cursor-not-allowed'
              }`}
              onClick={handleFileClick}
              disabled={!expensePlan.employeeDocument?.file}
              data-testid="document-view-button"
              title={expensePlan.employeeDocument?.file ? t('action-view-document') : t('error-no-document')}
            >
              <FileTextIcon size={16} />
            </button>
          </div>
        </div>
      </div>

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
