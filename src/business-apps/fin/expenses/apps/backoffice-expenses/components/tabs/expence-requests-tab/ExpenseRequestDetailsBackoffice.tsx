import React from 'react'
import { Separator, Button, Card, CardContent, CardHeader, CardTitle, useTranslation } from '@newwork/nw-design-system'
import { Badge } from '@newwork/nw-design-system'
import { getExpenseRequestStatusDisplay } from '../../../utils/utils'
import { formatCurrencyDisplay } from '../../../../personal-expenses/utils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CalendarIcon, ClockIcon, PathIcon, ArrowRightIcon } from '@phosphor-icons/react'
import { formatDate } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import translations from '../../../_i18n'
import TravelOrderAttachmentPreview from '../../../../../common/components/TravelOrderAttachmentPreview'
import { useExpenseRequestFileService as useCommonExpenseRequestFileService } from '../../../../../common/files/useExpenseRequestFileService'

export interface ExpenseRequestDetailsBackofficeProps extends BusinessAppContextProps {
  selectedItem: any
  onClose?: () => void
  requestTypeLabel?: string
}

const ExpenseRequestDetailsBackoffice: React.FC<ExpenseRequestDetailsBackofficeProps> = ({
  selectedItem,
  requestTypeLabel,
  ...contextProps
}) => {
  const { t } = useTranslation(translations)
  // Call hooks unconditionally before any early returns
  const { printExpenseRequest } = useCommonExpenseRequestFileService(contextProps)

  if (!selectedItem) return null

  // Trip type removed in favor of explicit request/plan type labels passed from parent
  const formatTypeLabel = (value?: string) => {
    if (value === null || value === undefined) return 'N/A'
    const trimmed = String(value).trim()
    if (!trimmed) return 'N/A'
    if (trimmed.toUpperCase() === 'N/A') return 'N/A'
    return trimmed
      .replace(/[_-]/g, ' ')
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }
  const renderDetailRow = (label: string, value: React.ReactNode, isStrongValue = false) => (
    <div className="gba:flex gba:justify-between gba:items-center">
      <span className="gba:text-sm gba:font-medium gba:text-gray-700">{label}</span>
      <span
        className={isStrongValue ? 'gba:text-sm gba:font-semibold gba:text-gray-900' : 'gba:text-sm gba:text-gray-900'}
      >
        {value}
      </span>
    </div>
  )
  const renderDateInfoRow = (config: { icon: React.ReactNode; label: string; value: string }) => (
    <div className="gba:flex gba:items-center gba:space-x-2">
      {config.icon}
      <span className="gba:text-sm gba:text-gray-700">
        {config.label}: {config.value}
      </span>
    </div>
  )

  return (
    <div className="gba:p-6 gba:space-y-6" data-testid="expense-request-details-content">
      {/* Header Section */}
      <div className="gba:flex gba:justify-between gba:items-start gba:mb-6">
        <div className="gba:flex-1">
          <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900 gba:mb-1" data-testid="expense-request-title">
            {selectedItem.title}
          </h2>
          <p className="gba:text-sm gba:text-gray-500" data-testid="expense-request-code">
            {selectedItem.code}
          </p>
        </div>
        <div className="gba:flex gba:items-center gba:gap-3">
          {(() => {
            const statusConfig = getExpenseRequestStatusDisplay(selectedItem.status, t)
            return (
              <Badge
                variant={(statusConfig as any).badgeVariant || 'outline'}
                data-testid="expense-request-status-badge"
              >
                {statusConfig.label}
              </Badge>
            )
          })()}
        </div>
      </div>

      {/* Date Information */}
      <Card>
        <CardContent className="gba:p-4 gba:space-y-3">
          {selectedItem.startDate && selectedItem.endDate && (
            <div className="gba:flex gba:items-center gba:space-x-2">
              <CalendarIcon weight="duotone" className="gba:text-gray-500" />
              <span className="gba:text-sm gba:text-gray-700">
                {t('detail-duration')}: {formatDate(selectedItem.startDate, 'date.short')} {' → '}
                {formatDate(selectedItem.endDate, 'date.short')}
              </span>
            </div>
          )}

          {selectedItem.requestDate &&
            renderDateInfoRow({
              icon: <ClockIcon className="gba:text-gray-500" />,
              label: t('detail-request-date'),
              value: formatDate(selectedItem.requestDate, 'date.short')
            })}

          {selectedItem.decisionDate &&
            renderDateInfoRow({
              icon: <PathIcon className="gba:text-gray-500" />,
              label: t('detail-decision-date'),
              value: formatDate(selectedItem.decisionDate, 'date.short')
            })}
        </CardContent>
      </Card>

      {/* Description */}
      {selectedItem.description && (
        <Card>
          <CardHeader>
            <CardTitle className="gba:text-base">{t('detail-description')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="gba:text-sm gba:text-gray-700" data-testid="expense-request-description">
              {selectedItem.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Details Information */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:text-base">{t('detail-expense-request-details')}</CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          <div className="gba:grid gba:grid-cols-1 gba:gap-4">
            {(selectedItem.employee || selectedItem.reporter) &&
              renderDetailRow(
                t('detail-requester'),
                selectedItem.employee?.fullName || selectedItem.employee || selectedItem.reporter
              )}

            {selectedItem.employee?.employeePosition?.supervisor &&
              renderDetailRow(t('detail-manager'), selectedItem.employee.employeePosition.supervisor.fullName)}

            {(selectedItem.costCenter?.name || selectedItem.employee?.employeePosition?.costCenter?.name) &&
              renderDetailRow(
                t('detail-cost-center'),
                selectedItem.costCenter?.name || selectedItem.employee?.employeePosition?.costCenter?.name
              )}

            {(selectedItem.project?.name || selectedItem.project) &&
              renderDetailRow(t('detail-project'), selectedItem.project?.name || selectedItem.project)}

            {renderDetailRow(t('detail-request-type'), formatTypeLabel(requestTypeLabel))}

            {renderDetailRow(
              t('header-total-amount'),
              (() => {
                const displayAmount = selectedItem.reimbursableAmount ?? selectedItem.amount
                return typeof displayAmount === 'number'
                  ? formatCurrencyDisplay(displayAmount, selectedItem.currency?.code)
                  : '-'
              })(),
              true
            )}

            {(() => {
              const aggAmount = selectedItem.expensePlan?.advancePaymentAggregate?.aggregate?.sum?.amount
              const listAmount =
                Array.isArray(selectedItem.expensePlan?.advancePayment) &&
                selectedItem.expensePlan.advancePayment.length > 0
                  ? selectedItem.expensePlan.advancePayment.reduce((sum: number, ap: any) => sum + (ap.amount || 0), 0)
                  : null
              const advanceAmount =
                aggAmount && aggAmount > 0 ? aggAmount : listAmount && listAmount > 0 ? listAmount : null

              return advanceAmount
                ? renderDetailRow(
                    t('detail-advance-payment'),
                    formatCurrencyDisplay(advanceAmount, selectedItem.currency?.code),
                    true
                  )
                : null
            })()}
          </div>
        </CardContent>
      </Card>

      <TravelOrderAttachmentPreview
        record={selectedItem}
        fetchPdf={printExpenseRequest}
        dataTestIdPrefix="backoffice-expense-request-details"
      />

      <Separator />

      {/* Action Button */}
      <div className="gba:flex gba:justify-end">
        <Button
          variant="default"
          onClick={() => {
            const url = buildPlatformUrl('/platform/fin/expenses/expense-request-record', {
              expenseRequestId: selectedItem.id,
              referrer: '/platform/fin/expenses/backoffice-expenses?tab=expense-requests'
            })
            navigateTo(url)
          }}
          data-testid="view-expense-request-details-button"
        >
          <ArrowRightIcon className="gba:mr-2" />
          {t('detail-view-full-details')}
        </Button>
      </div>
    </div>
  )
}

export default ExpenseRequestDetailsBackoffice
