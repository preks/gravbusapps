import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge
} from '@newwork/nw-design-system'
import { PiHandCoins } from 'react-icons/pi'
import { CheckCircle2, XCircle } from 'lucide-react'
import { AdvancePayment } from '../types/expensePlanV2Types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDateTime } from '@/business-apps/core/every/apps/every-box/utils/taskFormatters'
import Pill from '@/components/pill'

interface AdvancePaymentSectionProps {
  advancePayments: AdvancePayment[]
  currencyCode: string
  formatCurrency: (amount: number, currencyCode: string) => string
  prefixDataTestId?: string
}

const AdvancePaymentSection: React.FC<AdvancePaymentSectionProps> = ({
  advancePayments,
  currencyCode,
  formatCurrency,
  prefixDataTestId = 'approve-expense-plan-v2'
}) => {
  // Date formatting helper - use formatDateTime from every-box
  const formatDateDisplay = (dateString: string | null | undefined) => {
    if (!dateString) return '-'
    return formatDateTime(dateString)
  }

  // Format amount helper function
  const formatAmount = (amount: number, itemCurrencyCode?: string) => {
    return formatCurrency(amount, itemCurrencyCode ?? currencyCode)
  }

  // Map statuses to design system Badge variants
  const getStatusVariant = (status?: string): 'success' | 'destructive' | 'warning' | 'default' => {
    if (!status) return 'default'
    switch (status.toUpperCase()) {
      case 'PAID':
      case 'APPROVED':
        return 'success'
      case 'REJECTED':
        return 'destructive'
      case 'PENDING':
        return 'warning'
      default:
        return 'default'
    }
  }

  // Calculate total for table footer
  const totalAmount = useMemo(() => {
    return advancePayments.reduce((sum, payment) => sum + (payment.amount || 0), 0)
  }, [advancePayments])

  if (!advancePayments || advancePayments.length === 0) {
    return null
  }

  return (
    <Card data-testid={`${prefixDataTestId}-advance-payment-section`}>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <PiHandCoins className="gba:h-5 gba:w-5" />
          {getTranslationFromI18nKeyAndLabel('lowcoder:expense_records.plan.advance_payments', 'Advance Payments')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_table.code', 'Code')}
                </TableHead>
                <TableHead className="gba:text-right">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:expense_request_list.expense_plan_table.amount',
                    'Amount'
                  )}
                </TableHead>
                <TableHead>
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:expense_request_list.expense_plan_table.status',
                    'Status'
                  )}
                </TableHead>
                <TableHead>
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:create_expense_request.add_request_trip_details.payment_method',
                    'Payment Method'
                  )}
                </TableHead>
                <TableHead>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:advance_payment_details.decision_date', 'Decision Date')}
                </TableHead>
                <TableHead>
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:confirm_transfer_advance_payment.transaction_date_label',
                    'Transaction Date'
                  )}
                </TableHead>
                <TableHead>
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:confirm_transfer_advance_payment.transaction_id_label',
                    'Transaction Number'
                  )}
                </TableHead>
                <TableHead className="gba:text-center">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:expense_records.plan.confirmed', 'Confirmed')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {advancePayments.map((payment, index) => {
                const paymentMethod = payment.paymentMethod || ''
                const methodString = String(paymentMethod).trim()
                let methodLabel = methodString

                // Check for exact values first, then fallback to includes check
                if (methodString === 'DIRECT_DEPOSIT') {
                  methodLabel = getTranslationFromI18nKeyAndLabel(
                    'lowcoder:initiate_expense_plan.create_expense_plan.payment_method_select_direct_deposit',
                    'Direct Deposit'
                  )
                } else if (methodString === 'CASH_PAYMENT') {
                  methodLabel = getTranslationFromI18nKeyAndLabel(
                    'lowcoder:initiate_expense_plan.create_expense_plan.payment_method_select_cash_payment',
                    'Cash Payment'
                  )
                } else {
                  // Fallback to includes check for other formats
                  const lowered = methodString.toLowerCase()
                  if (lowered.includes('direct')) {
                    methodLabel = getTranslationFromI18nKeyAndLabel(
                      'lowcoder:initiate_expense_plan.create_expense_plan.payment_method_select_direct_deposit',
                      'Direct Deposit'
                    )
                  } else if (lowered.includes('cash')) {
                    methodLabel = getTranslationFromI18nKeyAndLabel(
                      'lowcoder:initiate_expense_plan.create_expense_plan.payment_method_select_cash_payment',
                      'Cash Payment'
                    )
                  }
                }

                return (
                  <TableRow
                    key={payment.code || index}
                    data-testid={`${prefixDataTestId}-advance-payment-row-${index}`}
                  >
                    <TableCell>{payment.code || '-'}</TableCell>
                    <TableCell className="gba:text-right gba:font-semibold">
                      {formatAmount(payment.amount, payment.currency?.code)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(payment.status)}>
                        {payment.status
                          ? getTranslationFromI18nKeyAndLabel(
                              `lowcoder:expense_statuses.${payment.status.toLowerCase()}`,
                              payment.status
                            )
                          : '-'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Pill
                        type="waiting"
                        label={methodLabel}
                        data-testid={`${prefixDataTestId}-payment-method-pill-${index}`}
                      />
                    </TableCell>
                    <TableCell>{formatDateDisplay(payment.decisionDate)}</TableCell>
                    <TableCell>{formatDateDisplay(payment.transactionDate)}</TableCell>
                    <TableCell>{payment.transactionNumber || '-'}</TableCell>
                    <TableCell className="gba:text-center">
                      {payment.transactionConfirmed ? (
                        <CheckCircle2 className="gba:h-5 gba:w-5 gba:text-green-500 gba:inline" />
                      ) : (
                        <XCircle className="gba:h-5 gba:w-5 gba:text-red-500 gba:inline" />
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
              {/* Total Row */}
              <TableRow className="gba:font-semibold" data-testid={`${prefixDataTestId}-advance-payment-total-row`}>
                <TableCell colSpan={7}>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:initiate_advance_payment.total', 'Total')}
                </TableCell>
                <TableCell className="gba:text-right">{formatAmount(totalAmount)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

export default AdvancePaymentSection
