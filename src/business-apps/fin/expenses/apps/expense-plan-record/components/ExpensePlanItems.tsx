import React, { useMemo } from 'react';
import { Table, Card, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import Pill from '@/components/pill';
import { ExpensePlanItem } from '../types/expensePlanRecord.types';
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils';
import dayjs from 'dayjs';

interface ExpensePlanItemsProps {
  expensePlanItems: ExpensePlanItem[];
}

const { Text } = Typography;

// Table summary component defined outside parent component to fix lint error
interface TableSummaryProps {
  pageData: readonly ExpensePlanItem[];
  formatAmount: (amount: number) => string;
}

const TableSummary: React.FC<TableSummaryProps> = ({ pageData, formatAmount }) => {
  let totalAmount = 0;
  let totalReimbursable = 0;
  let totalDeductible = 0;

  pageData.forEach(({ totalAmount: amount, reimbursableAmount, deductibleAmount }) => {
    totalAmount += amount;
    totalReimbursable += reimbursableAmount;
    totalDeductible += deductibleAmount;
  });

  return (
    <Table.Summary fixed>
      <Table.Summary.Row>
        <Table.Summary.Cell index={0} colSpan={5}>
          <Text strong>
            {getTranslationFromI18nKeyAndLabel('expense.plan.items.total', 'Total')}
          </Text>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={5} align="right">
          <Text strong>{formatAmount(totalAmount)}</Text>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={6} align="right">
          <Text>{formatAmount(totalReimbursable)}</Text>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={7} align="right">
          <Text>{formatAmount(totalDeductible)}</Text>
        </Table.Summary.Cell>
      </Table.Summary.Row>
    </Table.Summary>
  );
};

const ExpensePlanItems: React.FC<ExpensePlanItemsProps> = ({ expensePlanItems }) => {
  const loading = false;
  const activeUserLocale = getCurrentActiveUserLocale();
  
  // Format date helper function
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return dayjs(dateString).format('DD.MM.YYYY');
  };

  // Format amount helper function
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat(activeUserLocale, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const columns: ColumnsType<ExpensePlanItem> = [
    {
      title: getTranslationFromI18nKeyAndLabel('expense.plan.item.code', 'Code'),
      dataIndex: 'code',
      key: 'code',
      render: (code: string | null) => code ?? '-',
      width: 100,
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense.plan.item.title', 'Title'),
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense.plan.item.expenseGroup', 'Expense Group'),
      dataIndex: ['expenseGroup', 'value'],
      key: 'expenseGroup',
      render: (text: string) => (
        <Pill 
          label={text} 
          type="waiting" 
          data-testid={`expense-group-pill-${text}`}
        />
      ),
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense.plan.item.expenseClass', 'Expense Class'),
      dataIndex: ['expenseClass', 'value'],
      key: 'expenseClass',
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense.plan.item.expenseDate', 'Date'),
      dataIndex: 'expenseDate',
      key: 'expenseDate',
      render: (date: string) => formatDate(date),
      sorter: (a, b) => dayjs(a.expenseDate).unix() - dayjs(b.expenseDate).unix(),
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense.plan.item.totalAmount', 'Total Amount'),
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'right',
      render: (amount: number) => <Text strong>{formatAmount(amount)}</Text>,
      sorter: (a, b) => a.totalAmount - b.totalAmount,
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense.plan.item.reimbursableAmount', 'Reimbursable'),
      dataIndex: 'reimbursableAmount',
      key: 'reimbursableAmount',
      align: 'right',
      render: (amount: number) => formatAmount(amount),
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense.plan.item.deductibleAmount', 'Deductible'),
      dataIndex: 'deductibleAmount',
      key: 'deductibleAmount',
      align: 'right',
      render: (amount: number) => formatAmount(amount),
    },
  ];

  // Calculate summary amounts for the cards
  const summaryAmounts = useMemo(() => {
    if (!expensePlanItems.length) {
      return { 
        reimbursable: 0, 
        nonReimbursable: 0, 
        deductible: 0, 
        nonDeductible: 0,
        total: 0
      };
    }
    
    return expensePlanItems.reduce((acc, item) => {
      // Calculate totals
      acc.reimbursable += item.reimbursableAmount || 0;
      acc.deductible += item.deductibleAmount || 0;
      acc.nonDeductible += item.nonDeductibleAmount || 0;
      acc.total += item.totalAmount || 0;
      
      // Calculate non-reimbursable (total minus reimbursable)
      const nonReimbursable = item.totalAmount - item.reimbursableAmount;
      acc.nonReimbursable += nonReimbursable > 0 ? nonReimbursable : 0;
      
      return acc;
    }, { 
      reimbursable: 0, 
      nonReimbursable: 0, 
      deductible: 0, 
      nonDeductible: 0,
      total: 0
    });
  }, [expensePlanItems]);
  
  // Card background colors
  const cardColors = {
    reimbursable: '#e6f7ee',
    nonReimbursable: '#fff7e6',
    deductible: '#e6f2ff',
    nonDeductible: '#ffebee',
    total: '#e8eaf6'
  };
  
  // Card text colors
  const textColors = {
    reimbursable: '#0DBC7B',
    nonReimbursable: '#FF9E02',
    deductible: '#0094D1',
    nonDeductible: '#DE1D49',
    total: '#3f51b5'
  };
  
  return (
    <Card 
      title={getTranslationFromI18nKeyAndLabel('expense.plan.items.title', 'Expense Plan Items')} 
      data-testid="expense-plan-items"
    >
      {/* Cards Grid Layout - 5 columns in a single row */}
      <div className="gba:grid gba:grid-cols-5 gba:gap-4 gba:mb-6" data-testid="expense-plan-summary-cards">
        {/* Total Amount Card */}
        <div 
          className="gba:rounded gba:p-4 gba:flex gba:flex-col gba:justify-center gba:border-2 gba:border-solid" 
          style={{ 
            borderColor: textColors.total,
            backgroundColor: cardColors.total
          }}
          data-testid="total-amount-card"
        >
          <Typography.Text className="gba:text-sm gba:mb-2 gba:block">
            {getTranslationFromI18nKeyAndLabel('expense.plan.item.totalAmount', 'Total Amount')}
          </Typography.Text>
          <Typography.Title level={3} style={{ color: textColors.total, margin: 0, fontWeight: 'bold' }}>
            {formatAmount(summaryAmounts.total)}
          </Typography.Title>
        </div>

        {/* Reimbursable */}
        <div 
          className="gba:rounded gba:p-4 gba:flex gba:flex-col gba:justify-center gba:border-2 gba:border-solid gba:bg-white" 
          style={{ 
            borderColor: textColors.reimbursable
          }}
          data-testid="reimbursable-amount-card"
        >
          <Typography.Text className="gba:text-sm gba:mb-2 gba:block">
            {getTranslationFromI18nKeyAndLabel('expense.plan.item.reimbursableAmount', 'Reimbursable')}
          </Typography.Text>
          <Typography.Title level={3} style={{ color: textColors.reimbursable, margin: 0 }}>
            {formatAmount(summaryAmounts.reimbursable)}
          </Typography.Title>
        </div>
        
        {/* Non-Reimbursable */}
        <div 
          className="gba:rounded gba:p-4 gba:flex gba:flex-col gba:justify-center gba:border-2 gba:border-solid gba:bg-white" 
          style={{ 
            borderColor: textColors.nonReimbursable
          }}
          data-testid="non-reimbursable-amount-card"
        >
          <Typography.Text className="gba:text-sm gba:mb-2 gba:block">
            {getTranslationFromI18nKeyAndLabel('expense.plan.item.nonReimbursableAmount', 'Non-Reimbursable')}
          </Typography.Text>
          <Typography.Title level={3} style={{ color: textColors.nonReimbursable, margin: 0 }}>
            {formatAmount(summaryAmounts.nonReimbursable)}
          </Typography.Title>
        </div>
        
        {/* Deductible */}
        <div 
          className="gba:rounded gba:p-4 gba:flex gba:flex-col gba:justify-center gba:border-2 gba:border-solid gba:bg-white" 
          style={{ 
            borderColor: textColors.deductible
          }}
          data-testid="deductible-amount-card"
        >
          <Typography.Text className="gba:text-sm gba:mb-2 gba:block">
            {getTranslationFromI18nKeyAndLabel('expense.plan.item.deductibleAmount', 'Deductible')}
          </Typography.Text>
          <Typography.Title level={3} style={{ color: textColors.deductible, margin: 0 }}>
            {formatAmount(summaryAmounts.deductible)}
          </Typography.Title>
        </div>
        
        {/* Non-Deductible */}
        <div 
          className="gba:rounded gba:p-4 gba:flex gba:flex-col gba:justify-center gba:border-2 gba:border-solid gba:bg-white" 
          style={{ 
            borderColor: textColors.nonDeductible
          }}
          data-testid="non-deductible-amount-card"
        >
          <Typography.Text className="gba:text-sm gba:mb-2 gba:block">
            {getTranslationFromI18nKeyAndLabel('expense.plan.item.nonDeductibleAmount', 'Non-Deductible')}
          </Typography.Text>
          <Typography.Title level={3} style={{ color: textColors.nonDeductible, margin: 0 }}>
            {formatAmount(summaryAmounts.nonDeductible)}
          </Typography.Title>
        </div>
      </div>
      <Table
        columns={columns}
        dataSource={expensePlanItems.map((item, index) => ({ ...item, key: index }))}
        loading={loading}
        pagination={false}
        size="middle"
        scroll={{ x: 'max-content' }}
        summary={(pageData) => (
          <TableSummary pageData={pageData} formatAmount={formatAmount} />
        )}
      />
    </Card>
  );
};

export default ExpensePlanItems;
