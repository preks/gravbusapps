import React from 'react';
import { Table } from 'antd';
import { Card, Badge } from '@newwork/nw-design-system';
import Pill from '@/components/pill';
import type { ColumnsType } from 'antd/es/table';
import { AdvancePayment } from '../types/expenseRequestRecord.types';
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale, formatDate } from '@/common/utils/windowUtils';
import ExpenseRequestAdvancePaymentsSummary from './ExpenseRequestAdvancePaymentsSummary';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

interface ExpenseRequestAdvancePaymentsProps {
  advancePayments: AdvancePayment[];
}

// Format and display advance payment data

const ExpenseRequestAdvancePayments: React.FC<ExpenseRequestAdvancePaymentsProps> = ({ advancePayments }) => {
  const activeUserLocale = getCurrentActiveUserLocale();
  
  // Localized date display
  const formatDateDisplay = (dateString: string | null) => {
    if (!dateString) return '-';
    return formatDate(dateString, 'date.short') as string;
  };

  // Format amount helper function
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat(activeUserLocale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Map statuses to design system Badge variants
  const getStatusVariant = (status: string): 'success' | 'destructive' | 'warning' | 'default' => {
    switch (status) {
      case 'PAID':
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'destructive';
      case 'PENDING':
        return 'warning';
      default:
        return 'default';
    }
  };

  const columns: ColumnsType<AdvancePayment> = [
    {
      title: getTranslationFromI18nKeyAndLabel('expense.advance.code', 'Code'),
      dataIndex: 'code',
      key: 'code',
      render: (code: string | null) => code ?? '-',
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense.advance.amount', 'Amount'),
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (amount: number, record) => (
        <span>
          {formatAmount(amount)} {record.currency?.code ?? ''}
        </span>
      ),
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense.advance.status', 'Status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Badge variant={getStatusVariant(status)}>
          {getTranslationFromI18nKeyAndLabel(`expense.advance.status.${status.toLowerCase()}`, status)}
        </Badge>
      ),
      filters: [
        { text: 'Prepared', value: 'PREPARED' },
        { text: 'Approved', value: 'APPROVED' },
        { text: 'Paid', value: 'PAID' },
        { text: 'Rejected', value: 'REJECTED' },
        { text: 'Pending', value: 'PENDING' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense.advance.paymentMethod', 'Payment Method'),
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (method: string) => (
        <Pill 
          type="waiting" 
          label={getTranslationFromI18nKeyAndLabel(`expense.advance.paymentMethod.${method.toLowerCase() ?? 'other'}`, method)}
          data-testid="payment-method-pill"
        />
      ),
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense.advance.decisionDate', 'Decision Date'),
      dataIndex: 'decisionDate',
      key: 'decisionDate',
      render: (date: string | null) => formatDateDisplay(date),
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense.advance.transactionDate', 'Transaction Date'),
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      render: (date: string | null) => formatDateDisplay(date),
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense.advance.transactionNumber', 'Transaction Number'),
      dataIndex: 'transactionNumber',
      key: 'transactionNumber',
      render: (number: string | null) => number ?? '-',
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense.advance.transactionConfirmed', 'Confirmed'),
      dataIndex: 'transactionConfirmed',
      key: 'transactionConfirmed',
      align: 'center',
      render: (confirmed: boolean) => (
        confirmed ? 
          <CheckCircleOutlined className="gba:text-green-500" /> : 
          <CloseCircleOutlined className="gba:text-red-500" />
      ),
    },
  ];

  return (
    <Card className="gba:mb-6" data-testid="expense-request-advance-payments-card">
      <Table
        columns={columns}
        dataSource={advancePayments.map((item, index) => ({ ...item, key: index }))}
        pagination={false}
        size="middle"
        scroll={{ x: 'max-content' }}
        summary={(pageData) => <ExpenseRequestAdvancePaymentsSummary pageData={pageData} formatAmount={formatAmount} />}
      />
    </Card>
  );
};

export default ExpenseRequestAdvancePayments;
