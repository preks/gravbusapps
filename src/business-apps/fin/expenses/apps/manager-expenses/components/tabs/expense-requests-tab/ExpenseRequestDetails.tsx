import React, { useMemo } from 'react'
import { Separator, Button, Badge, useTranslation } from '@newwork/nw-design-system'
import { getExpenseRequestStatusDisplayT, formatCurrencyDisplay } from '../../../utils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ArrowRightIcon } from '@phosphor-icons/react'
import { formatDate } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useExpenseRequestFileService } from '../../../../../common/files/useExpenseRequestFileService'
import TravelOrderAttachmentPreview from '../../../../../common/components/document-preview/TravelOrderAttachmentPreview'
import { ExpenseDetailsPanelContent } from '../../../../../common/components/details-panel/ExpenseDetailsPanelContent'
import { translateTypeValue, extractRequestTypeValue } from '../../../utils/typeUtils'
import translations from '../../../_i18n'

export interface ExpenseRequestDetailsProps extends BusinessAppContextProps {
  request: any
}

const ExpenseRequestDetails: React.FC<ExpenseRequestDetailsProps> = ({ request, ...contextProps }) => {
  const { t } = useTranslation(translations)
  // Call hooks unconditionally before any early returns
  const { printExpenseRequest } = useExpenseRequestFileService(contextProps)

  // Memoize headerRight before early return to ensure hooks are always called in same order
  const headerRight = useMemo(() => {
    if (!request) return null
    const statusConfig = getExpenseRequestStatusDisplayT(t, request.status)
    return (
      <Badge variant={(statusConfig as any).badgeVariant || 'outline'} data-testid="expense-request-status-badge">
        {statusConfig.label}
      </Badge>
    )
  }, [request?.status, t])

  if (!request) return null

  const notAvailable = t('expense-details-value-not-available')

  const getRequestType = (): string => {
    const typeValue = extractRequestTypeValue(request.requestType)
    return typeValue || notAvailable
  }

  const getPlanType = (): string | undefined => {
    const plan = request.expensePlan
    return extractRequestTypeValue(plan?.requestType) || extractRequestTypeValue(plan?.type)
  }

  const getDepartment = () => {
    return request.employee?.employeePosition?.organizationalUnit?.name || notAvailable
  }

  const additionalFields = [
    {
      label: t('expense-plans-detail-request-type'),
      value: translateTypeValue(getRequestType(), t)
    }
  ]

  const planTypeValue = getPlanType()
  if (planTypeValue) {
    additionalFields.push({
      label: t('expense-plans-detail-plan-type'),
      value: translateTypeValue(planTypeValue, t)
    })
  }

  additionalFields.push({
    label: t('expense-plans-detail-department'),
    value: getDepartment()
  })

  return (
    <ExpenseDetailsPanelContent
      dataTestIdPrefix="expense-request-details"
      showHeader={false}
      t={t}
      record={{
        title: request.title,
        code: request.code,
        employee:
          request.employee?.fullName ||
          request.employee?.displayName ||
          `${request.employee?.firstName || ''} ${request.employee?.lastName || ''}`.trim() ||
          notAvailable,
        employeeCode: request.employee?.code || undefined,
        startDate: request.startDate ? formatDate(request.startDate, 'date.short') : notAvailable,
        endDate: request.endDate ? formatDate(request.endDate, 'date.short') : notAvailable,
        creationDate: request.createdAt ? formatDate(request.createdAt, 'date.short') : notAvailable,
        totalRemainingAmount: request.totalRemainingAmount,
        totalAmount: typeof request.totalAmount === 'number' ? request.totalAmount : 0,
        currency: request.currency?.code || request.currencyRef || 'EUR'
      }}
      formatAmount={(amount, currencyCode) => formatCurrencyDisplay(amount, currencyCode)}
      additionalFields={additionalFields}
      headerRight={headerRight}
      extraContent={
        <TravelOrderAttachmentPreview
          record={request}
          fetchPdf={printExpenseRequest}
          dataTestIdPrefix="manager-expense-request-details"
        />
      }
      footer={
        <>
          <Separator />
          <div className="gba:flex gba:justify-end gba:gap-3 gba:mt-4">
            <Button
              variant="default"
              onClick={() => {
                const url = buildPlatformUrl('/platform/fin/expenses/expense-request-record', {
                  expenseRequestId: request.id,
                  referrer: '/platform/fin/expenses/manager-expenses?tab=expense-requests'
                })
                navigateTo(url)
              }}
              data-testid="expense-request-view-details-button"
            >
              <ArrowRightIcon className="gba:mr-2" />
              {t('expense-plans-detail-view-full')}
            </Button>
          </div>
        </>
      }
      expenseRequestId={request?.id}
      accessToken={contextProps.accessToken}
    />
  )
}

export default ExpenseRequestDetails
