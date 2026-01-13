import React from 'react'
import { Separator, Button, Badge } from '@newwork/nw-design-system'
import { getAdvancePaymentStatusDisplay, formatCurrencyDisplay } from '../../../utils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PiArrowRight } from 'react-icons/pi'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import {
  DetailsPanelContent,
  type DetailsPanelField
} from '../../../../../common/components/details-panel/DetailsPanelContent'

export interface AdvancePaymentDetailsProps extends BusinessAppContextProps {
  payment: any
}

const AdvancePaymentDetails: React.FC<AdvancePaymentDetailsProps> = ({ payment }) => {
  if (!payment) return null

  const statusConfig = getAdvancePaymentStatusDisplay(payment.status)

  const fields: DetailsPanelField[] = [
    {
      label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_overview.side_bar.requester', 'Requester'),
      value: payment.expensePlan?.employee
        ? payment.expensePlan.employee.fullName ||
          payment.expensePlan.employee.displayName ||
          `${payment.expensePlan.employee.firstName ?? ''} ${payment.expensePlan.employee.lastName ?? ''}`.trim() ||
          'N/A'
        : 'N/A'
    }
  ]

  // Add employee code if available
  const employeeCode = payment.expensePlan?.employee?.code
  if (employeeCode && employeeCode !== 'N/A') {
    fields.push({
      label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_table.employee_code', 'Employee Code'),
      value: employeeCode
    })
  }

  // Add department
  const department = payment.expensePlan?.employee?.employeePosition?.organizationalUnit?.name
  fields.push({
    label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_employee_list.organizational_unit', 'Department'),
    value: department || 'N/A'
  })

  fields.push(
    {
      label: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.plan_details.duration', 'Duration'),
      value:
        payment.expensePlan?.startDate && payment.expensePlan?.endDate
          ? `${formatDate(payment.expensePlan.startDate, 'date.short')} → ${formatDate(payment.expensePlan.endDate, 'date.short')}`
          : 'N/A'
    },
    {
      label: getTranslationFromI18nKeyAndLabel('lowcoder:advance_payment_details.creation_date', 'Creation Date'),
      value: payment.createdAt ? formatDate(payment.createdAt, 'date.short') : 'N/A'
    },
    {
      label: getTranslationFromI18nKeyAndLabel('lowcoder:advance_payment_details.due_date', 'Due Date'),
      value: payment.dueDate ? formatDate(payment.dueDate, 'date.short') : 'N/A'
    },
    {
      label: getTranslationFromI18nKeyAndLabel('lowcoder:advance_payment_details.purpose', 'Purpose'),
      value: payment.purpose || 'Advance Payment'
    },
    {
      label: getTranslationFromI18nKeyAndLabel('lowcoder:advance_payment_details.amount', 'Amount'),
      value:
        typeof payment.amount === 'number'
          ? formatCurrencyDisplay(payment.amount, payment.currencyRef?.split(':').pop() || 'EUR')
          : '-'
    }
  )

  return (
    <DetailsPanelContent
      dataTestIdPrefix="advance-payment-details"
      showHeader={true}
      title={payment.expensePlan?.title || 'Advance Payment'}
      subtitle={payment.expensePlan?.code || payment.id}
      headerRight={
        <Badge variant={(statusConfig as any).badgeVariant || 'outline'} data-testid="advance-payment-status-badge">
          {statusConfig.label}
        </Badge>
      }
      fields={fields}
      footer={
        <>
          <Separator />
          <div className="gba:flex gba:justify-end gba:mt-4">
            <Button
              variant="default"
              onClick={() => {
                const url = buildPlatformUrl('/platform/fin/expenses/advance-payment-record', {
                  advancePaymentId: payment.id
                })
                navigateTo(url)
              }}
              data-testid="advance-payment-view-details-button"
            >
              <PiArrowRight className="gba:mr-2" />
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.plan_details.view_full_details',
                'View Full Details'
              )}
            </Button>
          </div>
        </>
      }
    />
  )
}

export default AdvancePaymentDetails
