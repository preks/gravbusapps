import React from 'react';
import { Table, Card, Typography, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ExpenseAllowance } from '../types/expensePlanRecord.types';
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

interface ExpensePlanAllowancesProps {
  expenseAllowances: ExpenseAllowance[];
}

const { Text } = Typography;

const ExpensePlanAllowances: React.FC<ExpensePlanAllowancesProps> = ({ expenseAllowances }) => {
  const activeUserLocale = getCurrentActiveUserLocale();
  
  // Format date helper function
  const formatDate = (dateString: string) => {
    return dayjs(dateString).format('YYYY-MM-DD');
  };

  // Format amount helper function
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat(activeUserLocale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Boolean indicator component
  const BooleanIndicator = ({ value }: { value: boolean }) => (
    value ? 
      <CheckOutlined className="gba:text-green-500" /> : 
      <CloseOutlined className="gba:text-red-500" />
  );

  const columns: ColumnsType<ExpenseAllowance> = [
    {
      title: getTranslationFromI18nKeyAndLabel('expense.allowance.date', 'Date'),
      dataIndex: 'allowanceDate',
      key: 'allowanceDate',
      render: (date: string) => formatDate(date),
      sorter: (a, b) => dayjs(a.allowanceDate).unix() - dayjs(b.allowanceDate).unix(),
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense.allowance.region', 'Travel Region'),
      dataIndex: ['travelRegion', 'value'],
      key: 'travelRegion',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense.allowance.dayRate', 'Day Rate'),
      dataIndex: 'dayRate',
      key: 'dayRate',
      align: 'right',
      render: (amount: number) => <Text strong>{formatAmount(amount)}</Text>,
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense.allowance.breakfast', 'Breakfast'),
      dataIndex: 'breakfast',
      key: 'breakfast',
      align: 'center',
      render: (value: boolean) => <BooleanIndicator value={value} />,
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense.allowance.lunch', 'Lunch'),
      dataIndex: 'lunch',
      key: 'lunch',
      align: 'center',
      render: (value: boolean) => <BooleanIndicator value={value} />,
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense.allowance.dinner', 'Dinner'),
      dataIndex: 'dinner',
      key: 'dinner',
      align: 'center',
      render: (value: boolean) => <BooleanIndicator value={value} />,
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense.allowance.overnight', 'Overnight'),
      dataIndex: 'overnight',
      key: 'overnight',
      align: 'center',
      render: (value: boolean) => <BooleanIndicator value={value} />,
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense.allowance.accommodation', 'Accommodation'),
      dataIndex: 'overnightAccommodation',
      key: 'overnightAccommodation',
      align: 'center',
      render: (value: boolean) => <BooleanIndicator value={value} />,
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense.allowance.deductionLimit', 'Deduction Limit'),
      dataIndex: 'deductionLimit',
      key: 'deductionLimit',
      align: 'right',
      render: (amount: number) => formatAmount(amount),
    },
  ];

  return (
    <Card 
      title={getTranslationFromI18nKeyAndLabel('expense.plan.allowances.title', 'Allowances')} 
      bordered={false}
      data-testid="expense-plan-allowances"
    >
      <Table
        columns={columns}
        dataSource={expenseAllowances.map((item, index) => ({ ...item, key: index }))}
        pagination={{ 
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: (total, range) => 
            getTranslationFromI18nKeyAndLabel(
              'expense.plan.allowances.pagination',
              `${range[0]}-${range[1]} of ${total} items`
            )
        }}
        size="middle"
        scroll={{ x: 'max-content' }}
        summary={(pageData) => {
          let totalDayRate = 0;
          let totalDeductionLimit = 0;

          pageData.forEach(({ dayRate, deductionLimit }) => {
            totalDayRate += dayRate;
            totalDeductionLimit += deductionLimit;
          });

          return (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={2}>
                  <Text strong>
                    {getTranslationFromI18nKeyAndLabel('expense.plan.allowances.total', 'Total')}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <Text strong>{formatAmount(totalDayRate)}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} colSpan={5} />
                <Table.Summary.Cell index={8} align="right">
                  <Text>{formatAmount(totalDeductionLimit)}</Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          );
        }}
      />
    </Card>
  );
};

export default ExpensePlanAllowances;
