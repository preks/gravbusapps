import React from 'react'
import { Separator, Button, Badge, useTranslation } from '@newwork/nw-design-system'
import { getAdvancePaymentStatusDisplay, formatCurrencyDisplay } from '../../../utils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PiArrowRight } from 'react-icons/pi'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import {
  DetailsPanelContent,
  type DetailsPanelField
} from '../../../../../common/components/details-panel/DetailsPanelContent'
import { getPaymentMethodDisplay, getExpensePlanDisplay } from '../../../../../common/utils/advancePaymentUtils'
import translations from '../../../../personal-expenses/_i18n'

export interface AdvancePaymentDetailsProps extends BusinessAppContextProps {
  payment: any
}

const AdvancePaymentDetails: React.FC<AdvancePaymentDetailsProps> = ({ payment }) => {
  const { t } = useTranslation(translations)
  if (!payment) return null

  const statusConfig = getAdvancePaymentStatusDisplay(payment.status) as any

  const fields: DetailsPanelField[] = [
    {
      label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_table.status', 'Status'),
      value: (
        <Badge variant={statusConfig?.badgeVariant || 'outline'} data-testid="advance-payment-status-badge">
          {statusConfig?.label || 'N/A'}
        </Badge>
      )
    },
    ...(payment.expensePlan?.startDate && payment.expensePlan?.endDate
      ? [
          {
            label: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.plan_details.duration', 'Duration'),
            value: `${formatDate(payment.expensePlan.startDate, 'date.short')} → ${formatDate(payment.expensePlan.endDate, 'date.short')}`
          } as DetailsPanelField
        ]
      : []),
    ...(payment.decisionDate
      ? [
          {
            label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.decision_date', 'Decision Date'),
            value: formatDate(payment.decisionDate, 'date.short')
          } as DetailsPanelField
        ]
      : []),
    ...(payment.transactionDate
      ? [
          {
            label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.transaction_date', 'Transaction Date'),
            value: formatDate(payment.transactionDate, 'date.short')
          } as DetailsPanelField
        ]
      : []),
    ...(payment.expensePlan?.employee?.fullName ||
    payment.expensePlan?.employee?.displayName ||
    payment.expensePlan?.reporter
      ? [
          {
            label: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_request_overview.side_bar.requester',
              'Requester'
            ),
            value:
              payment.expensePlan.employee?.fullName ||
              payment.expensePlan.employee?.displayName ||
              payment.expensePlan.reporter
          } as DetailsPanelField
        ]
      : []),
    ...(payment.expensePlan?.employee?.employeePosition?.supervisor?.fullName
      ? [
          {
            label: getTranslationFromI18nKeyAndLabel(
              'lowcoder:employee_profile.profile_icon_list.manager_title',
              'Manager'
            ),
            value: payment.expensePlan.employee.employeePosition.supervisor.fullName
          } as DetailsPanelField
        ]
      : []),
    ...(payment.expensePlan?.code
      ? [
          {
            label: t('expense-plan-code'),
            value: payment.expensePlan.code
          } as DetailsPanelField
        ]
      : []),
    {
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_request.initial_expense_plan_select_label',
        'Expense Plan'
      ),
      value: payment.expensePlan?.title || getExpensePlanDisplay(null)
    },
    ...(payment.costCenter?.name ||
    payment.expensePlan?.costCenter?.name ||
    payment.expensePlan?.employee?.employeePosition?.costCenter?.name
      ? [
          {
            label: getTranslationFromI18nKeyAndLabel(
              'lowcoder:create_expense_request.expense_request_container.current_cost_center_label',
              'Cost Center'
            ),
            value:
              payment.costCenter?.name ||
              payment.expensePlan?.costCenter?.name ||
              payment.expensePlan?.employee?.employeePosition?.costCenter?.name
          } as DetailsPanelField
        ]
      : []),
    ...(payment.project?.name || payment.expensePlan?.project?.name
      ? [
          {
            label: getTranslationFromI18nKeyAndLabel('lowcoder:add_allowance_info_request.select_project', 'Project'),
            value: payment.project?.name || payment.expensePlan?.project?.name
          } as DetailsPanelField
        ]
      : []),
    {
      label: getTranslationFromI18nKeyAndLabel('lowcoder:manager_expense_request_list.expense_table.amount', 'Amount'),
      value: formatCurrencyDisplay(
        payment.amount || 0,
        payment.currency?.code || payment.currencyRef?.split(':').pop() || 'EUR'
      )
    },
    ...(payment.expensePlan?.totalAmount !== null && payment.expensePlan?.totalAmount !== undefined
      ? [
          {
            label: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_request_list.expense_plan_table.total_amount',
              'Plan Total Amount'
            ),
            value: formatCurrencyDisplay(
              payment.expensePlan.totalAmount || 0,
              payment.expensePlan.currency?.code ||
                payment.currency?.code ||
                payment.currencyRef?.split(':').pop() ||
                'EUR'
            )
          } as DetailsPanelField
        ]
      : []),
    {
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_request.add_request_trip_details.payment_method',
        'Payment Method'
      ),
      value: getPaymentMethodDisplay(payment.paymentMethod)
    }
  ]

  return (
    <DetailsPanelContent
      dataTestIdPrefix="advance-payment-details"
      title={getTranslationFromI18nKeyAndLabel(
        'lowcoder:personal_expenses.advance_payment_details_title',
        'Advance Payment Details'
      )}
      subtitle={payment.code || undefined}
      fields={fields}
      showHeader={false}
      footer={
        <>
          <Separator />
          {payment.expensePlan?.id ? (
            <div className="gba:flex gba:justify-end gba:mt-4">
              <Button
                variant="default"
                onClick={() => {
                  const url = buildPlatformUrl('/platform/fin/expenses/expense-plan-record', {
                    expensePlanId: payment.expensePlan.id
                  })
                  navigateTo(url)
                }}
                data-testid="view-expense-plan-details-button"
              >
                <PiArrowRight className="gba:mr-2" />
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:team_expenses_page.plan_details.view_full_details',
                  'View Full Details'
                )}
              </Button>
            </div>
          ) : null}
        </>
      }
    />
  )
}

export default AdvancePaymentDetails
