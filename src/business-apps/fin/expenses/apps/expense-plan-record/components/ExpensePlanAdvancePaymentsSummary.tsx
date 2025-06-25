import React from 'react';
import { Table, Typography } from 'antd';
import { AdvancePayment } from '../types/expensePlanRecord.types';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

const { Text } = Typography;

interface ExpensePlanAdvancePaymentsSummaryProps {
  pageData: readonly AdvancePayment[];
  formatAmount: (amount: number) => string;
}

const ExpensePlanAdvancePaymentsSummary: React.FC<ExpensePlanAdvancePaymentsSummaryProps> = ({ pageData, formatAmount }) => {
  let totalAmount = 0;

  pageData.forEach(({ amount }) => {
    totalAmount += amount;
  });

  return (
    <Table.Summary fixed>
      <Table.Summary.Row>
        <Table.Summary.Cell index={0}>
          <Text strong>
            {getTranslationFromI18nKeyAndLabel('expense.plan.advance.payments.total', 'Total')}
          </Text>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={1} align="right">
          <Text strong>
            {formatAmount(totalAmount)} {pageData[0]?.currency?.code || ''}
          </Text>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={2} colSpan={6} />
      </Table.Summary.Row>
    </Table.Summary>
  );
};

export default ExpensePlanAdvancePaymentsSummary;
