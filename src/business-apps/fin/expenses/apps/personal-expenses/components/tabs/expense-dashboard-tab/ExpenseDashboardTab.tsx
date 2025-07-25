import React, { useState, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetExpenseDashboard } from '../../../hooks/useGetExpenseDashboard';
import { WidgetGroup, WidgetItem } from '@/components/widget-group';
import { ArrowUpOutlined, GlobalOutlined } from '@ant-design/icons';
import { PiCurrencyCircleDollar } from 'react-icons/pi';
import {
  SpendingOverview,
  ActionFeed,
  QuickActionCards
} from './components';

interface ExpenseDashboardTabProps extends BusinessAppContextProps {}

const ExpenseDashboardTab: React.FC<ExpenseDashboardTabProps> = (props) => {
  const { stats, isLoading, error } = useGetExpenseDashboard(props);
  const [chartView, setChartView] = useState<string | number>('Monthly');

  // Function to navigate to expense items with a specific filter
  const navigateToExpenseItems = (filter: string) => {
    // Add navigation logic here if needed
    console.log('Navigate to expense items with filter:', filter);
  };

  // Helper function to calculate percentage change
  const calculatePercentChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Create dashboard statistics widgets using the same pattern as other tabs
  const dashboardWidgets = useMemo((): WidgetItem[] => {
    const currentTotal = stats?.currentMonthExpenses?.total || 0;
    const previousTotal = stats?.previousMonthExpenses?.total || 0;
    const percentChange = calculatePercentChange(currentTotal, previousTotal);
    const isPositiveChange = percentChange >= 0;

    return [
      {
        key: 'current-month-expenses',
        title: 'Current Month Expenses',
        value: currentTotal,
        prefix: <PiCurrencyCircleDollar />,
        color: isPositiveChange ? '#cf1322' : '#3f8600',
        valueIsString: true,
        description: `${stats?.currentMonthExpenses?.count || 0} expense requests`,
        trend: {
          value: `${Math.abs(percentChange).toFixed(1)}%`,
          positive: !isPositiveChange, // Inverted because lower expenses are better
          description: `${isPositiveChange ? 'increase' : 'decrease'} from last month`
        }
      },
      {
        key: 'pending-payouts',
        title: 'Pending Payouts',
        value: stats?.pendingPayouts || 0,
        prefix: <PiCurrencyCircleDollar />,
        color: '#1890ff',
        valueIsString: true,
        description: 'Awaiting payment'
      },
      {
        key: 'upcoming-trips',
        title: 'Upcoming Trips',
        value: stats?.upcomingTrips || 0,
        prefix: <GlobalOutlined />,
        color: '#722ed1',
        description: 'Planned business trips'
      },
      {
        key: 'placeholder-metric',
        title: 'Placeholder',
        value: 'Placeholder',
        prefix: <ArrowUpOutlined />,
        color: '#8c8c8c',
        valueIsString: true,
        description: 'Placeholder metric'
      }
    ];
  }, [stats]);

  return (
    <div className="gba:space-y-6 gba:w-full" data-testid="expense-dashboard-content">
      <div data-testid="dashboard-statistics-section">
        <WidgetGroup
          widgets={dashboardWidgets}
          isLoading={isLoading}
          error={error ? new Error(error) : null}
          skeletonCount={4}
          emptyText="No statistics available."
          data-testid="dashboard-statistics"
        />
      </div>
      
      <div data-testid="quick-action-cards-section" className="gba:px-6">
        <QuickActionCards {...props} />
      </div>

      <div data-testid="spending-overview-section" className="gba:px-6">
        <SpendingOverview
          stats={stats ?? undefined}
          isLoading={isLoading}
          error={error ? new Error(error) : null}
          chartView={chartView}
          setChartView={setChartView}
        />
      </div>

      <div data-testid="action-feed-section" className="gba:px-6">
        <ActionFeed stats={stats ?? undefined} isLoading={isLoading} error={error ? new Error(error) : null} />
      </div>
    </div>
  );
};

export default ExpenseDashboardTab;
