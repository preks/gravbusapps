import React from 'react';
import { Card, CardHeader, CardContent, CardTitle, Alert, Spinner } from '@newwork/nw-design-system';
import { DashboardStats } from '../types';
import ComparisonCard from './ComparisonCard';
import ExpenseDistribution from './ExpenseDistribution';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

// Helper function to get comparison data based on chart view
const getComparisonProps = (stats: DashboardStats, chartView: string | number) => {
  switch (chartView) {
    case 'Quarterly':
      return {
        title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.quarterly_comparison','Quarterly Comparison'),
        currentValue: stats.currentQuarterExpenses?.total || 0,
        previousValue: stats.previousQuarterExpenses?.total || 0,
        currentLabel: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.this_quarter','This Quarter'),
        previousLabel: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.last_quarter','Last Quarter'),
      };
    case 'Yearly':
      return {
        title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.yearly_comparison','Yearly Comparison'),
        currentValue: stats.currentYearExpenses?.total || 0,
        previousValue: stats.previousYearExpenses?.total || 0,
        currentLabel: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.this_year','This Year'),
        previousLabel: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.last_year','Last Year'),
      };
    case 'Monthly':
    default:
      return {
        title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.monthly_comparison','Monthly Comparison'),
        currentValue: stats.currentMonthExpenses?.total || 0,
        previousValue: stats.previousMonthExpenses?.total || 0,
        currentLabel: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.this_month','This Month'),
        previousLabel: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.last_month','Last Month'),
      };
  }
};

export interface SpendingOverviewProps {
  stats: DashboardStats | undefined;
  isLoading: boolean;
  error: Error | null;
  chartView: string | number; // Period comes from top filter (Monthly | Quarterly | Yearly)
  currencyCode?: string;
}

export const SpendingOverview: React.FC<SpendingOverviewProps> = ({
  stats,
  isLoading,
  error,
  chartView,
  currencyCode,
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
          <h4 className="gba:font-semibold">{getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.error_loading_spending_overview','Error loading spending overview')}</h4>
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
          <CardTitle>{getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.spending_overview','Spending Overview')}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="gba:flex gba:flex-row gba:gap-6">
          <div className="gba:w-1/2" data-testid="expense-distribution">
            <ExpenseDistribution stats={stats} chartView={chartView} />
          </div>
          <div className="gba:w-1/2" data-testid="comparison-card">
            <ComparisonCard {...comparisonProps} currencyCode={currencyCode} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
