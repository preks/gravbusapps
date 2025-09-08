import React from 'react';
import { Table, Typography } from 'antd';
import { ExpensePlanItem } from '../types/expensePlanRecord.types';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { formatCurrencyDisplay } from '../utils/currency';

const { Text } = Typography;

interface ExpensePlanItemsSummaryProps {
  pageData: readonly ExpensePlanItem[];
  formatAmount?: (amount: number) => string;
  currencyCode?: string;
}

const ExpensePlanItemsSummary: React.FC<ExpensePlanItemsSummaryProps> = ({ pageData, formatAmount, currencyCode }) => {
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
          <Text strong>{formatAmount ? formatAmount(totalAmount) : formatCurrencyDisplay(totalAmount, currencyCode)}</Text>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={6} align="right">
          <Text>{formatAmount ? formatAmount(totalReimbursable) : formatCurrencyDisplay(totalReimbursable, currencyCode)}</Text>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={7} align="right">
          <Text>{formatAmount ? formatAmount(totalDeductible) : formatCurrencyDisplay(totalDeductible, currencyCode)}</Text>
        </Table.Summary.Cell>
      </Table.Summary.Row>
    </Table.Summary>
  );
};

export default ExpensePlanItemsSummary;
