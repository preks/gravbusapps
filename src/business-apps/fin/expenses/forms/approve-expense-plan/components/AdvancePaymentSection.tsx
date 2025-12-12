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
import Pill from '@/components/pill'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'

dayjs.extend(localizedFormat)

interface AdvancePaymentSectionProps {
  advancePayments: AdvancePayment[]
  currencyCode: string
  formatCurrency: (amount: number, currencyCode: string) => string
  prefixDataTestId?: string
  t: (key: string, vars?: Record<string, unknown>) => string
}

const AdvancePaymentSection: React.FC<AdvancePaymentSectionProps> = ({
  advancePayments,
  currencyCode,
  formatCurrency,
  prefixDataTestId = 'approve-expense-plan-v2',
  t
}) => {
  // Date formatting helper - format date and time using dayjs
  const formatDateDisplay = (dateString: string | null | undefined) => {
    if (!dateString) return '-'
    return dayjs(dateString).format('L LT') // e.g., "12/31/2024 2:30 PM"
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

  // Get translated status label
  const getStatusLabel = (status?: string): string => {
    if (!status) return '-'
    const statusUpper = status.toUpperCase()
    switch (statusUpper) {
      case 'APPROVED':
        return t('status-approved')
      case 'REJECTED':
        return t('status-rejected')
      case 'PENDING':
        return t('status-pending')
      case 'PAID':
        return t('status-paid')
      default:
        return status
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
          {t('section-advance-payments')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('label-code')}</TableHead>
                <TableHead className="gba:text-right">{t('label-amount')}</TableHead>
                <TableHead>{t('label-status')}</TableHead>
                <TableHead>{t('label-payment-method')}</TableHead>
                <TableHead>{t('label-decision-date')}</TableHead>
                <TableHead>{t('label-transaction-date')}</TableHead>
                <TableHead>{t('label-transaction-number')}</TableHead>
                <TableHead className="gba:text-center">{t('label-confirmed')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {advancePayments.map((payment, index) => {
                const paymentMethod = payment.paymentMethod || ''
                const methodString = String(paymentMethod).trim()
                let methodLabel = methodString

                // Check for exact values first, then fallback to includes check
                if (methodString === 'DIRECT_DEPOSIT') {
                  methodLabel = t('payment-method-direct-deposit')
                } else if (methodString === 'CASH_PAYMENT') {
                  methodLabel = t('payment-method-cash')
                } else {
                  // Fallback to includes check for other formats
                  const lowered = methodString.toLowerCase()
                  if (lowered.includes('direct')) {
                    methodLabel = t('payment-method-direct-deposit')
                  } else if (lowered.includes('cash')) {
                    methodLabel = t('payment-method-cash')
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
                      <Badge variant={getStatusVariant(payment.status)}>{getStatusLabel(payment.status)}</Badge>
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
                <TableCell>{t('label-total')}</TableCell>
                <TableCell className="gba:text-right">{formatAmount(totalAmount)}</TableCell>
                <TableCell colSpan={6} />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

export default AdvancePaymentSection
