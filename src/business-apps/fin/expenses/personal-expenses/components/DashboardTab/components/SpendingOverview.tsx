import React from 'react';
import { Row, Col, Card, Typography, Progress, Statistic, Segmented, Empty, Spin, Alert } from 'antd';
import { formatCurrency } from '../utils/formatters';
import { DashboardStats, ExpenseType } from '../types';

const { Text } = Typography;

interface SpendingOverviewProps {
  stats: DashboardStats | undefined;
  isLoading: boolean;
  error: Error | null;
  chartView: string | number;
  setChartView: (view: string | number) => void;
}

export const SpendingOverview: React.FC<SpendingOverviewProps> = ({ 
  stats, 
  isLoading, 
  error, 
  chartView, 
  setChartView 
}) => {
  if (isLoading) {
    return (
      <Card className="gba:spending-overview-card">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
          <Spin size="large" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="gba:spending-overview-card">
        <Alert
          message="Error loading spending overview"
          description={error.message}
          type="error"
          showIcon
        />
      </Card>
    );
  }

  if (!stats) return null;

  // Process expense types for visualization
  const expenseTypes: ExpenseType[] = stats.expensesByType 
    ? Object.entries(stats.expensesByType)
        .map(([type, amount]) => ({ type, amount }))
        .sort((a, b) => b.amount - a.amount)
    : [];
  
  // Get total expenses for percentage calculations
  const totalExpenses = expenseTypes.reduce((sum, item) => sum + item.amount, 0) || 1; // Avoid division by zero

  return (
    <Card 
      title="Spending Overview" 
      className="gba:spending-overview-card"
      extra={
        <Segmented
          options={['Monthly', 'Quarterly']}
          value={chartView}
          onChange={setChartView}
        />
      }
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Expense Distribution" bordered={false}>
            {expenseTypes.length > 0 ? (
              <>
                {expenseTypes.slice(0, 5).map((item, index) => {
                  const percentage = (item.amount / totalExpenses) * 100;
                  return (
                    <div key={item.type} style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <Text>{item.type}</Text>
                        <Text>{formatCurrency(item.amount)}</Text>
                      </div>
                      <Progress 
                        percent={percentage} 
                        showInfo={false} 
                        strokeColor={['#108ee9', '#87d068', '#722ed1', '#fa8c16', '#f5222d'][index % 5]} 
                        style={{ height: '8px' }}
                      />
                    </div>
                  );
                })}
              </>
            ) : (
              <Empty description="No expense data available" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Monthly Comparison" bordered={false}>
            <Row gutter={[16, 16]} align="middle" style={{ marginBottom: '16px' }}>
              <Col span={12}>
                <Statistic 
                  title="This Month"
                  value={stats?.currentMonthExpenses?.total || 0}
                  precision={2}
                  formatter={(value) => formatCurrency(Number(value))}
                  valueStyle={{ color: '#108ee9' }}
                />
              </Col>
              <Col span={12}>
                <Statistic 
                  title="Last Month"
                  value={stats?.lastMonthExpenses?.total || 0}
                  precision={2}
                  formatter={(value) => formatCurrency(Number(value))}
                  valueStyle={{ color: '#8c8c8c' }}
                />
              </Col>
            </Row>
            
            {/* Visual comparison of current vs previous month */}
            <div style={{ display: 'flex', alignItems: 'flex-end', height: '100px', marginTop: '20px' }}>
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ 
                  width: '60px', 
                  height: `${stats?.currentMonthExpenses?.total ? 
                    Math.min(90, Math.max(10, (stats?.currentMonthExpenses?.total / Math.max(stats?.currentMonthExpenses?.total || 0, stats?.lastMonthExpenses?.total || 0)) * 90)) : 10}px`, 
                  backgroundColor: '#1890ff', 
                  marginBottom: '8px'
                }}></div>
                <Text>Current</Text>
              </div>
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ 
                  width: '60px', 
                  height: `${stats?.lastMonthExpenses?.total ? 
                    Math.min(90, Math.max(10, (stats?.lastMonthExpenses?.total / Math.max(stats?.currentMonthExpenses?.total || 0, stats?.lastMonthExpenses?.total || 0)) * 90)) : 10}px`, 
                  backgroundColor: '#d9d9d9', 
                  marginBottom: '8px'
                }}></div>
                <Text>Previous</Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </Card>
  );
};

export default SpendingOverview;
