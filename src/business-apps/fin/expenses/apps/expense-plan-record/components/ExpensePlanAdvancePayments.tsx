import React from 'react';
import { Table, Card, Badge } from 'antd';
import Pill from '@/components/pill';
import type { ColumnsType } from 'antd/es/table';
import { AdvancePayment } from '../types/expensePlanRecord.types';
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils';
import ExpensePlanAdvancePaymentsSummary from './ExpensePlanAdvancePaymentsSummary';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

interface ExpensePlanAdvancePaymentsProps {
  advancePayments: AdvancePayment[];
}

// Format and display advance payment data

const ExpensePlanAdvancePayments: React.FC<ExpensePlanAdvancePaymentsProps> = ({ advancePayments }) => {
  const activeUserLocale = getCurrentActiveUserLocale();
  
  // Format date helper function
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return dayjs(dateString).format('YYYY-MM-DD');
  };

  // Format amount helper function
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat(activeUserLocale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'PAID':
        return 'success';
      case 'REJECTED':
        return 'error';
      case 'PREPARED':
        return 'processing';
      case 'APPROVED':
        return 'success';
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
        <Badge 
          status={getStatusColor(status) as any} 
          text={getTranslationFromI18nKeyAndLabel(`expense.advance.status.${status.toLowerCase()}`, status)} 
        />
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
      render: (date: string | null) => formatDate(date),
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense.advance.transactionDate', 'Transaction Date'),
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      render: (date: string | null) => formatDate(date),
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
    <Card className="gba:mb-6" data-testid="expense-plan-advance-payments-card">
      <Table
        columns={columns}
        dataSource={advancePayments.map((item, index) => ({ ...item, key: index }))}
        pagination={false}
        size="middle"
        scroll={{ x: 'max-content' }}
        summary={(pageData) => <ExpensePlanAdvancePaymentsSummary pageData={pageData} formatAmount={formatAmount} />}
      />
    </Card>
  );
};

export default ExpensePlanAdvancePayments;
