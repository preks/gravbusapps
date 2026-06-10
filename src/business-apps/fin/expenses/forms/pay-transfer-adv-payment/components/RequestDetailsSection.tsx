import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge, Label, useTranslation } from '@newwork/nw-design-system'
import { CaretRightIcon, FileTextIcon } from '@phosphor-icons/react'
import { formatCurrency } from '../utils/formatters'
import { formatDateTime } from '@/common/utils/dateFormatter'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import {
  getAdvancePaymentStatusDisplayT,
  type StatusDisplayConfig
} from '@/business-apps/fin/expenses/common/utils/statusDisplayUtils'
import DocumentPdfModal from '../../confirm-transfer-adv-payment/components/DocumentPdfModal'
import commonTranslations from '@/business-apps/fin/expenses/common/_i18n'
import translations from '../_i18n'

interface RequestDetailsSectionProps {
  amount: number
  currency: {
    code: string
  }
  requestDate?: string | null
  status: string
  expensePlanId?: string
  expensePlanTitle?: string
  expensePlanDocument?: {
    id: string
    file: string
    mimeType: string
  }
  employeeId?: string
  accessToken?: string
  prefixDataTestId?: string
}

const RequestDetailsSection: React.FC<RequestDetailsSectionProps> = ({
  amount,
  currency,
  requestDate,
  status,
  expensePlanId,
  expensePlanTitle,
  expensePlanDocument,
  employeeId,
  accessToken,
  prefixDataTestId = 'pay-transfer-adv-payment-v2'
}) => {
  const { t } = useTranslation(translations)
  const { t: tCommon } = useTranslation(commonTranslations)
  const statusConfig: StatusDisplayConfig = getAdvancePaymentStatusDisplayT(tCommon, status)

  const [isPdfModalVisible, setIsPdfModalVisible] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  const handleExpensePlanClick = () => {
    if (!expensePlanId) {
      return
    }

    const url = buildPlatformUrl('/platform/fin/expenses/expense-plan-record', {
      expensePlanId
    })
    navigateTo(url)
  }

  const handleDocumentClick = () => {
    if (!expensePlanDocument?.file) {
      return
    }

    setPdfLoading(true)
    setIsPdfModalVisible(true)

    setTimeout(() => {
      setPdfLoading(false)
    }, 500)
  }

  const handleClosePdfModal = () => {
    setIsPdfModalVisible(false)
    setPdfLoading(false)
  }

  return (
    <>
      <Card data-testid={`${prefixDataTestId}-request-details-section`}>
        <CardHeader>
          <CardTitle data-testid={`${prefixDataTestId}-request-details-title`}>
            {t('section-request-details')}
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          <div className="gba:grid gba:grid-cols-3 gba:gap-4">
            <div>
              <Label className="gba:text-sm gba:text-muted-foreground gba:mb-1">{t('label-amount')}</Label>
              <p className="gba:text-base gba:font-semibold gba:text-foreground">
                {formatCurrency(amount, currency.code)}
              </p>
            </div>

            <div>
              <Label className="gba:text-sm gba:text-muted-foreground gba:mb-1">{t('label-request-date')}</Label>
              <p className="gba:text-base gba:font-semibold gba:text-foreground">
                {requestDate ? formatDateTime(requestDate, 'date') : '-'}
              </p>
            </div>

            <div>
              <Label className="gba:text-sm gba:text-muted-foreground gba:mb-1">{tCommon('header-status')}</Label>
              <Badge variant={statusConfig.badgeVariant || 'outline'} className="gba:text-xs">
                {statusConfig.label}
              </Badge>
            </div>
          </div>

          {expensePlanTitle && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:pt-2">
              <button
                type="button"
                className={`gba:flex gba:items-center gba:gap-1 gba:text-xs gba:transition-colors ${
                  expensePlanId
                    ? 'gba:text-muted-foreground gba:hover:text-foreground gba:cursor-pointer'
                    : 'gba:text-muted-foreground/50 gba:cursor-default'
                }`}
                onClick={handleExpensePlanClick}
                disabled={!expensePlanId}
                data-testid="expense-plan-link-button"
              >
                <CaretRightIcon size={16} />
                {expensePlanTitle}
              </button>
              <button
                type="button"
                className={`gba:flex gba:items-center gba:gap-1 gba:text-xs gba:cursor-pointer ${
                  expensePlanDocument?.file
                    ? 'gba:text-muted-foreground gba:hover:text-foreground gba:hover:scale-105 gba:transition-transform'
                    : 'gba:text-muted-foreground/50 gba:cursor-not-allowed'
                }`}
                onClick={handleDocumentClick}
                disabled={!expensePlanDocument?.file}
                data-testid="document-view-button"
                title={expensePlanDocument?.file ? t('action-view-document') : t('error-no-document')}
              >
                <FileTextIcon size={16} />
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      <DocumentPdfModal
        isVisible={isPdfModalVisible}
        pdfUrl={expensePlanDocument?.file || ''}
        pdfLoading={pdfLoading}
        pdfError=""
        onClose={handleClosePdfModal}
        accessToken={accessToken}
        employeeId={employeeId}
      />
    </>
  )
}

export default RequestDetailsSection
