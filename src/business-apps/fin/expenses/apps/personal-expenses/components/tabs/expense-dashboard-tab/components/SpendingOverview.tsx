import React from 'react';
import { Card, CardHeader, CardContent, CardTitle, Alert, Spinner, Tabs, TabsList, TabsTrigger } from '@newwork/nw-design-system';
import { DashboardStats } from '../types';
import ComparisonCard from './ComparisonCard';
import ExpenseDistribution from './ExpenseDistribution';

// Helper function to get comparison data based on chart view
const getComparisonProps = (stats: DashboardStats, chartView: string | number) => {
  switch (chartView) {
    case 'Quarterly':
      return {
        title: 'Quarterly Comparison',
        currentValue: stats.currentQuarterExpenses?.total || 0,
        previousValue: stats.previousQuarterExpenses?.total || 0,
        currentLabel: 'This Quarter',
        previousLabel: 'Last Quarter',
      };
    case 'Yearly':
      return {
        title: 'Yearly Comparison',
        currentValue: stats.currentYearExpenses?.total || 0,
        previousValue: stats.previousYearExpenses?.total || 0,
        currentLabel: 'This Year',
        previousLabel: 'Last Year',
      };
    case 'Monthly':
    default:
      return {
        title: 'Monthly Comparison',
        currentValue: stats.currentMonthExpenses?.total || 0,
        previousValue: stats.previousMonthExpenses?.total || 0,
        currentLabel: 'This Month',
        previousLabel: 'Last Month',
      };
  }
};

export interface SpendingOverviewProps {
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
  setChartView,
}) => {
  if (isLoading) {
    return (
      <Card className="gba:spending-overview-card" data-testid="spending-overview-loading">
        <div className="gba:flex gba:justify-center gba:p-6">
          <Spinner size="lg" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="gba:spending-overview-card" data-testid="spending-overview-error">
        <Alert variant="destructive">
          <h4 className="gba:font-semibold">Error loading spending overview</h4>
          <p>{error.message}</p>
        </Alert>
      </Card>
    );
  }

  if (!stats) return null;

  const comparisonProps = getComparisonProps(stats, chartView);

  return (
    <Card className="gba:spending-overview-card" data-testid="spending-overview-card">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle>Spending Overview</CardTitle>
          <Tabs value={String(chartView)} onValueChange={setChartView} data-testid="view-selector">
            <TabsList>
              <TabsTrigger value="Monthly">Monthly</TabsTrigger>
              <TabsTrigger value="Quarterly">Quarterly</TabsTrigger>
              <TabsTrigger value="Yearly">Yearly</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="gba:flex gba:flex-row gba:gap-6">
          <div className="gba:w-1/2" data-testid="expense-distribution">
            <ExpenseDistribution stats={stats} chartView={chartView} />
          </div>
          <div className="gba:w-1/2" data-testid="comparison-card">
            <ComparisonCard {...comparisonProps} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
