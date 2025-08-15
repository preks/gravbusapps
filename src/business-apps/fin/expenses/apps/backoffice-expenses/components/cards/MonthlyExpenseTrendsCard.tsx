/**
 * Card component that displays a graph of monthly expense trends
 * Shows the total amount of paid expenses per month in EUR for the current year
 */

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Spinner, Alert } from '@newwork/nw-design-system';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { MonthlyExpenseTrend } from '../../types';
import { EXPENSE_COLORS } from '../../utils/colorConstants';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

export interface MonthlyExpenseTrendsCardProps {
  loading: boolean;
  error: Error | null;
  monthlyTrends: MonthlyExpenseTrend[];
  selectedCurrencyCode: string;
}

const MonthlyExpenseTrendsCard: React.FC<MonthlyExpenseTrendsCardProps> = ({ loading, error, monthlyTrends, selectedCurrencyCode }) => {
  const currentYear = new Date().getFullYear();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: selectedCurrencyCode,
      minimumFractionDigits: 2,
    }).format(value);
  };

  // Helper function to translate month names
  const getTranslatedMonthName = (monthName: string): string => {
    const monthMap: { [key: string]: string } = {
      'Jan': 'lowcoder:absence_report.totals_table.jan',
      'Feb': 'lowcoder:absence_report.totals_table.feb',
      'Mar': 'lowcoder:absence_report.totals_table.mar',
      'Apr': 'lowcoder:absence_report.totals_table.apr',
      'May': 'lowcoder:absence_report.totals_table.may',
      'Jun': 'lowcoder:absence_report.totals_table.jun',
      'Jul': 'lowcoder:absence_report.totals_table.jul',
      'Aug': 'lowcoder:absence_report.totals_table.aug',
      'Sep': 'lowcoder:absence_report.totals_table.sep',
      'Oct': 'lowcoder:absence_report.totals_table.oct',
      'Nov': 'lowcoder:absence_report.totals_table.nov',
      'Dec': 'lowcoder:absence_report.totals_table.dec'
    };
    
    const translationKey = monthMap[monthName];
    if (translationKey) {
      return getTranslationFromI18nKeyAndLabel(translationKey, monthName);
    }
    return monthName;
  };

  if (loading) {
    return (
      <Card className="gba:bg-blue-50 gba:h-full" data-testid="monthly-expense-trends-loading">
        <CardHeader>
          <CardTitle>{getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.monthly_expense_trends', "Monthly Expense Trends")} {currentYear}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
            <Spinner size="lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="gba:bg-blue-50 gba:h-full" data-testid="monthly-expense-trends-error">
        <CardHeader>
          <CardTitle>{getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.monthly_expense_trends', "Monthly Expense Trends")} {currentYear}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <div>
              <p className="gba:text-sm">Error: {error.message}</p>
            </div>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Custom tooltip formatter to match the original behavior
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const translatedMonth = getTranslatedMonthName(label);
      return (
        <div className="gba:bg-white gba:p-2 gba:border gba:rounded gba:shadow">
          <p className="gba:text-sm gba:font-medium">{`${getTranslationFromI18nKeyAndLabel('lowcoder:cards.month', 'Month').charAt(0).toUpperCase() + getTranslationFromI18nKeyAndLabel('lowcoder:cards.month', 'Month').slice(1)}: ${translatedMonth}`}</p>
          <p className="gba:text-sm" style={{ color: EXPENSE_COLORS.PRIMARY_BLUE }}>
            {getTranslationFromI18nKeyAndLabel('lowcoder:initiate_advance_payment.total', "Total")}: ${formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom label component for bar tops
  const renderCustomLabel = (props: any) => {
    const { x, y, width, value } = props;
    return (
      <text 
        x={x + width / 2} 
        y={y - 10} 
        fill={EXPENSE_COLORS.PRIMARY_BLUE} 
        textAnchor="middle" 
        dy={-6}
        className="gba:text-xs gba:opacity-60"
      >
        {formatCurrency(value)}
      </text>
    );
  };

  return (
    <Card className="gba:bg-blue-50 gba:w-full" data-testid="monthly-expense-trends-card">
      <CardHeader>
        <CardTitle className="gba:text-sm gba:font-medium gba:text-gray-700">
        {getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.monthly_expense_trends', "Monthly Expense Trends")} {currentYear}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:p-6">
        <div className="gba:h-80 gba:w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyTrends}
              margin={{ top: 30, right: 30, left: 20, bottom: 5 }}
            >
                             <XAxis 
                 dataKey="monthName" 
                 tick={{ fontSize: 12 }}
                 interval={0}
                 tickFormatter={getTranslatedMonthName}
               />
              <YAxis 
                tickFormatter={formatCurrency}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="totalAmount" 
                fill={EXPENSE_COLORS.PRIMARY_BLUE}
                label={renderCustomLabel}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlyExpenseTrendsCard;
