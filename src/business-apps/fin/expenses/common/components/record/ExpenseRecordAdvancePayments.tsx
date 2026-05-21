import React from 'react'
import { Table } from 'antd'
import { Card, Badge, useTranslation } from '@newwork/nw-design-system'
import Pill from '@/components/pill'
import type { ColumnsType } from 'antd/es/table'
import { CheckCircleIcon, XCircleIcon } from '@phosphor-icons/react'
import { formatDate } from '@/common/utils/windowUtils'
import { formatCurrencyDisplay } from '../../utils/formatCurrency'
import { expenseRecordKey, expenseStatusTranslationKey } from '../../utils/expenseRecordI18n'
import { advancePaymentRowKey, withUniqueRowKeys } from '../../utils/expenseRecordRowKeys'
import type {
  ExpenseRecordAdvancePayment,
  ExpenseRecordI18nPrefix,
  ExpenseRecordTranslations
} from '../../types/expenseRecordShared.types'

interface ExpenseRecordAdvancePaymentsProps {
  advancePayments: ExpenseRecordAdvancePayment[]
  i18nPrefix: ExpenseRecordI18nPrefix
  translations: ExpenseRecordTranslations
  cardClassName?: string
  dataTestId: string
}

const getStatusVariant = (status: string): 'success' | 'destructive' | 'warning' | 'default' => {
  switch (status) {
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

const ExpenseRecordAdvancePaymentsSummary: React.FC<{
  pageData: readonly ExpenseRecordAdvancePayment[]
  totalLabel: string
}> = ({ pageData, totalLabel }) => {
  let totalAmount = 0

  pageData.forEach(({ amount }) => {
    totalAmount += amount
  })

  const currencyCode = pageData[0]?.currency?.code

  return (
    <Table.Summary fixed>
      <Table.Summary.Row>
        <Table.Summary.Cell index={0}>
          <span className="gba:font-semibold">{totalLabel}</span>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={1} align="right">
          <span className="gba:font-semibold">{formatCurrencyDisplay(totalAmount, currencyCode)}</span>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={2} colSpan={6} />
      </Table.Summary.Row>
    </Table.Summary>
  )
}

const ExpenseRecordAdvancePayments: React.FC<ExpenseRecordAdvancePaymentsProps> = ({
  advancePayments,
  i18nPrefix,
  translations,
  cardClassName,
  dataTestId
}) => {
  const { t } = useTranslation(translations)
  const key = (suffix: string) => expenseRecordKey(i18nPrefix, suffix)

  const formatDateDisplay = (dateString: string | null) => {
    if (!dateString) {
      return '-'
    }
    return formatDate(dateString, 'date.short') as string
  }

  const formatAmount = (amount: number, currencyCode?: string) => formatCurrencyDisplay(amount, currencyCode)

  const getStatusLabel = (status: string) => t(expenseStatusTranslationKey(status))

  const getPaymentMethodLabel = (method: string) => {
    const lowered = (method || '').toLowerCase()
    if (lowered.includes('direct')) {
      return t(key('payment-method-direct-deposit'))
    }
    if (lowered.includes('cash')) {
      return t(key('payment-method-cash'))
    }
    return method
  }

  const columns: ColumnsType<ExpenseRecordAdvancePayment> = [
    {
      title: t(key('column-code')),
      dataIndex: 'code',
      key: 'code',
      render: (code: string | null) => code ?? '-'
    },
    {
      title: t(key('column-amount')),
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (amount: number, record) => formatAmount(amount, record.currency?.code),
      sorter: (a, b) => a.amount - b.amount
    },
    {
      title: t(key('column-status')),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Badge variant={getStatusVariant(status)}>{getStatusLabel(status)}</Badge>,
      filters: [
        { text: getStatusLabel('PREPARED'), value: 'PREPARED' },
        { text: getStatusLabel('APPROVED'), value: 'APPROVED' },
        { text: getStatusLabel('PAID'), value: 'PAID' },
        { text: getStatusLabel('REJECTED'), value: 'REJECTED' },
        { text: getStatusLabel('PENDING'), value: 'PENDING' }
      ],
      onFilter: (value, record) => record.status === value
    },
    {
      title: t(key('column-payment-method')),
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (method: string) => (
        <Pill type="waiting" label={getPaymentMethodLabel(method)} data-testid="payment-method-pill" />
      )
    },
    {
      title: t(key('decision-date')),
      dataIndex: 'decisionDate',
      key: 'decisionDate',
      render: (date: string | null) => formatDateDisplay(date)
    },
    {
      title: t(key('column-transaction-date')),
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      render: (date: string | null) => formatDateDisplay(date)
    },
    {
      title: t(key('column-transaction-number')),
      dataIndex: 'transactionNumber',
      key: 'transactionNumber',
      render: (number: string | null) => number ?? '-'
    },
    {
      title: t(key('confirmed')),
      dataIndex: 'transactionConfirmed',
      key: 'transactionConfirmed',
      align: 'center',
      render: (confirmed: boolean) =>
        confirmed ? (
          <CheckCircleIcon size={16} className="gba:text-green-500" />
        ) : (
          <XCircleIcon size={16} className="gba:text-red-500" />
        )
    }
  ]

  return (
    <Card className={cardClassName} data-testid={dataTestId}>
      <Table
        columns={columns}
        dataSource={withUniqueRowKeys(advancePayments, advancePaymentRowKey, 'advance-payment')}
        pagination={false}
        size="middle"
        scroll={{ x: 'max-content' }}
        summary={pageData => <ExpenseRecordAdvancePaymentsSummary pageData={pageData} totalLabel={t(key('total'))} />}
      />
    </Card>
  )
}

export default ExpenseRecordAdvancePayments
