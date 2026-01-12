import React from 'react'
import { Badge } from '@newwork/nw-design-system'
import { AdvancePayment } from '../../../hooks/useGetAdvancePayments'
import { getAdvancePaymentStatusDisplay } from '../../../utils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrencyDisplay } from '../../../utils'
import {
  DetailsPanelContent,
  type DetailsPanelField
} from '../../../../../common/components/details-panel/DetailsPanelContent'
import { getPaymentMethodDisplay, getExpensePlanDisplay } from '../../../../../common/utils/advancePaymentUtils'

interface AdvancePaymentDetailsProps extends BusinessAppContextProps {
  payment: AdvancePayment
}

const AdvancePaymentDetails: React.FC<AdvancePaymentDetailsProps> = ({ payment }) => {
  const statusConfig = getAdvancePaymentStatusDisplay(payment.status)
  const statusBadge = (
    <Badge variant={(statusConfig as any).badgeVariant || 'outline'} data-testid="advance-payment-status-badge">
      {statusConfig.label}
    </Badge>
  )

  const fields: DetailsPanelField[] = [
    {
      label: getTranslationFromI18nKeyAndLabel('common.code', 'Code'),
      value: payment.code || 'N/A',
      dataTestId: 'advance-payment-code'
    },
    {
      label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_table.status', 'Status'),
      value: statusBadge
    },
    {
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_request_overview.expense_history.expense_history_table.description',
        'Description'
      ),
      value:
        payment.description ??
        getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.no_description', 'No description'),
      dataTestId: 'advance-payment-description'
    },
    {
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_request.initial_expense_plan_select_label',
        'Expense Plan'
      ),
      value: payment.expensePlan
        ? `${payment.expensePlan.code} - ${payment.expensePlan.title}`
        : getExpensePlanDisplay(null)
    },
    {
      label: getTranslationFromI18nKeyAndLabel('lowcoder:manager_expense_request_list.expense_table.amount', 'Amount'),
      value: formatCurrencyDisplay(payment.amount || 0, payment.currency?.code)
    },
    ...(payment.costCenter
      ? [
          {
            label: getTranslationFromI18nKeyAndLabel(
              'lowcoder:create_expense_request.expense_request_container.current_cost_center_label',
              'Cost Center'
            ),
            value: payment.costCenter.name
          } as DetailsPanelField
        ]
      : []),
    {
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_request.add_request_trip_details.payment_method',
        'Payment Method'
      ),
      value: getPaymentMethodDisplay(payment.paymentMethod),
      dataTestId: 'advance-payment-payment-method'
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
    />
  )
}

export default AdvancePaymentDetails
