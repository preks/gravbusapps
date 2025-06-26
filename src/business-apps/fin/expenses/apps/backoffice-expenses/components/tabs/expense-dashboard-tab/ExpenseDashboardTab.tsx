/**
 * Dashboard Tab Component for Expense Management Overview
 * Displays KPIs and statistics for expense management by composing various dashboard cards.
 */

import React from 'react';
import { Alert, Col, Row, Spin } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useDashboardStats } from '../../../hooks/useDashboardStats';
import ActualVsPlannedCard from '../../cards/ActualVsPlannedCard';
import MonthlyExpenseTrendsCard from '../../cards/MonthlyExpenseTrendsCard';
import MonthlySpendComparisonCard from '../../cards/MonthlySpendComparisonCard';
import TotalSpendYTDCard from '../../cards/TotalSpendYTDCard';
import TransferRequiredCard from '../../cards/TransferRequiredCard';
import PendingRequestsCard from '../../cards/PendingRequestsCard';
import AverageSpendPerTripCard from '../../cards/AverageSpendPerTripCard';

interface ExpenseDashboardTabProps extends BusinessAppContextProps {}

const ExpenseDashboardTab: React.FC<ExpenseDashboardTabProps> = (props) => {
  const { accessToken } = props;
  const { stats, loading, error } = useDashboardStats({ accessToken });

  if (loading) {
    return <Spin tip="Loading dashboard data..." />;
  }

  if (error) {
    return (
      <Alert
        message="Error Loading Dashboard Data"
        description={error.message || 'An error occurred while loading dashboard data'}
        type="error"
        showIcon
        className="gba:mb-4"
      />
    );
  }

  return (
    <>
      {/* Statistics Cards - First Row */}
      <Row gutter={16} className="gba:mb-6">
        <Col span={8}>
          <TotalSpendYTDCard loading={loading} error={error} ytdStats={stats.ytdStats} />
        </Col>
        <Col span={8}>
          <ActualVsPlannedCard
            loading={loading}
            error={error}
            ytdStats={stats.ytdStats}
            expensePlanYearly={stats.expensePlanYearly}
          />
        </Col>
        <Col span={8}>
          <TransferRequiredCard loading={loading} error={error} transferRequired={stats.transferRequired} />
        </Col>
      </Row>

      {/* Statistics Cards - Second Row */}
      <Row gutter={16} className="gba:mb-6">
        <Col span={8}>
          <MonthlySpendComparisonCard
            loading={loading}
            error={error}
            monthlySpendComparison={stats.monthlySpendComparison}
          />
        </Col>
        <Col span={8}>
          <PendingRequestsCard loading={loading} error={error} pendingRequestsCount={stats.pendingRequestsCount} />
        </Col>
        <Col span={8}>
          <AverageSpendPerTripCard
            loading={loading}
            error={error}
            avgSpendPerTrip={stats.avgSpendPerTrip}
            travelExpensesCount={stats.travelExpensesCount}
          />
        </Col>
      </Row>

      {/* Monthly Expense Trends Chart */}
      <div className="gba:mb-6">
        <MonthlyExpenseTrendsCard
          loading={loading}
          error={error}
          monthlyTrends={stats.monthlyTrends}
        />
      </div>
    </>
  );
};

export default ExpenseDashboardTab;
