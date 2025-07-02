import React from 'react';
import { Row, Col, Card, Segmented, Spin, Alert } from 'antd';
import { DashboardStats } from '../types';
import ComparisonCard from './ComparisonCard';
import ExpenseDistribution from './ExpenseDistribution';

interface SpendingOverviewProps {
  stats: DashboardStats | undefined;
  isLoading: boolean;
  error: Error | null;
  chartView: string | number;
  setChartView: (view: string | number) => void;
}

const getComparisonProps = (stats: DashboardStats | undefined, chartView: string | number) => {
  switch (chartView) {
    case 'Quarterly':
      return {
        title: 'Quarterly Comparison',
        currentValue: stats?.currentQuarterExpenses?.total || 0,
        previousValue: stats?.previousQuarterExpenses?.total || 0,
        currentLabel: 'This Quarter',
        previousLabel: 'Last Quarter',
      };
    case 'Yearly':
      return {
        title: 'Yearly Comparison',
        currentValue: stats?.currentYearExpenses?.total || 0,
        previousValue: stats?.previousYearExpenses?.total || 0,
        currentLabel: 'This Year',
        previousLabel: 'Last Year',
      };
    case 'Monthly':
    default:
      return {
        title: 'Monthly Comparison',
        currentValue: stats?.currentMonthExpenses?.total || 0,
        previousValue: stats?.previousMonthExpenses?.total || 0,
        currentLabel: 'This Month',
        previousLabel: 'Last Month',
      };
  }
};

export const SpendingOverview: React.FC<SpendingOverviewProps> = ({
  stats,
  isLoading,
  error,
  chartView,
  setChartView,
}) => {
  if (isLoading) {
    return (
      <Card className="gba:spending-overview-card" data-testid="spending-overview-loading">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
          <Spin size="large" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="gba:spending-overview-card" data-testid="spending-overview-error">
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

  const comparisonProps = getComparisonProps(stats, chartView);

  return (
    <Card
      title="Spending Overview"
      className="gba:spending-overview-card"
      data-testid="spending-overview-card"
      extra={
        <Segmented
          options={['Monthly', 'Quarterly', 'Yearly']}
          value={chartView}
          onChange={setChartView}
          data-testid="view-selector"
        />
      }
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <ExpenseDistribution stats={stats} />
        </Col>
        <Col xs={24} lg={12}>
          <ComparisonCard {...comparisonProps} />
        </Col>
      </Row>
    </Card>
  );
};

export default SpendingOverview;
