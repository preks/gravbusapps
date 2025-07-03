import React from 'react';
import { Row, Col, Card, Typography, Empty, Progress } from 'antd';
import { formatCurrency } from '../utils/formatters';
import { DashboardStats, ExpenseType } from '../types';

const { Text } = Typography;

interface ExpenseDistributionProps {
  stats: DashboardStats | undefined;
  chartView: string | number;
}

export const ExpenseDistribution: React.FC<ExpenseDistributionProps> = ({ stats, chartView }) => {
  const getExpensesByType = () => {
    switch (chartView) {
      case 'Quarterly':
        return stats?.expensesByTypeQuarter || {};
      case 'Yearly':
        return stats?.expensesByTypeYear || {};
      case 'Monthly':
      default:
        return stats?.expensesByTypeMonth || {};
    }
  };

  const expensesByType = getExpensesByType();

  const expenseTypes: ExpenseType[] = Object.entries(expensesByType)
    .map(([type, amount]) => ({ type, amount: amount as number }))
    .sort((a, b) => b.amount - a.amount);

  const totalExpenses = expenseTypes.reduce((sum, item) => sum + item.amount, 0);

  if (expenseTypes.length === 0) {
    return (
      <Card title="Expense Distribution" bordered={false} data-testid="expense-distribution-card">
        <Empty description="No expense data available" />
      </Card>
    );
  }

  return (
    <Card title="Expense Distribution" bordered={false} data-testid="expense-distribution-card">
      <div>
        <Row gutter={[16, 0]}>
          <Col span={12} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }} data-testid="distribution-chart">
            <div style={{ position: 'relative', width: 120, height: 120 }}>
              {expenseTypes.slice(0, 5).map((item, index) => {
                const percentage = totalExpenses > 0 ? (item.amount / totalExpenses) * 100 : 0;
                return (
                  <div key={item.type} style={{ position: 'absolute', top: 0, left: 0 }}>
                    <Progress
                      type="circle"
                      percent={percentage}
                      width={120 - index * 10}
                      strokeWidth={12}
                      strokeColor={['#1890ff', '#52c41a', '#722ed1', '#fa8c16', '#f5222d'][index % 5]}
                      format={() => ''}
                      data-testid={`progress-circle-${item.type}`}
                    />
                  </div>
                );
              })}
            </div>
          </Col>
          <Col span={12} data-testid="distribution-legend">
            {expenseTypes.slice(0, 5).map((item, index) => {
              const percentage = totalExpenses > 0 ? Math.round((item.amount / totalExpenses) * 100) : 0;
              return (
                <div key={item.type} style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }} data-testid={`legend-item-${item.type}`}>
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      backgroundColor: ['#1890ff', '#52c41a', '#722ed1', '#fa8c16', '#f5222d'][index % 5],
                      marginRight: 8,
                    }}
                    data-testid={`legend-color-${item.type}`}
                  ></div>
                  <Text style={{ marginRight: 'auto' }}>{item.type}</Text>
                  <Text strong>{percentage}%</Text>
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    {formatCurrency(item.amount)}
                  </Text>
                </div>
              );
            })}
          </Col>
        </Row>
      </div>
    </Card>
  );
};

export default ExpenseDistribution;
