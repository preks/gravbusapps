import React from 'react';
import { Card, Alert, Spinner } from '@newwork/nw-design-system';
import { ArrowUpOutlined, ArrowDownOutlined, GlobalOutlined } from '@ant-design/icons';
import { PiCurrencyCircleDollar } from 'react-icons/pi';
import { formatNumber, calculatePercentChange } from '../utils/formatters';
import { DashboardStats } from '../types';

interface SummaryStatisticsProps {
  stats: DashboardStats | undefined;
  isLoading: boolean;
  error: Error | null;
}

export const SummaryStatistics: React.FC<SummaryStatisticsProps> = ({ stats, isLoading, error }) => {
  if (isLoading) {
    return (
      <div className="gba:summary-stats" data-testid="summary-statistics-loading">
        <div className="gba:flex gba:justify-center gba:p-6">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gba:summary-stats" data-testid="summary-statistics-error">
        <Alert variant="destructive">
          <h4 className="gba:font-semibold">Error loading statistics</h4>
          <p>{error.message}</p>
        </Alert>
      </div>
    );
  }
  
  if (!stats) return null;
  
  const currentTotal = stats.currentMonthExpenses?.total || 0;
  const previousTotal = stats.previousMonthExpenses?.total || 0;
  const percentChange = calculatePercentChange(currentTotal, previousTotal);
  const isPositiveChange = percentChange >= 0;

  return (
    <div className="gba:grid gba:grid-cols-3 gba:gap-4 gba:summary-stats" data-testid="summary-statistics">
      <Card className="gba:h-full" data-testid="current-month-expenses-card">
        <div className="gba:space-y-2">
          <div className="gba:flex gba:items-center gba:justify-between">
            <h3 className="gba:text-sm gba:font-medium gba:text-gray-600 gba:m-0">Current Month Expenses</h3>
            <div className="gba:flex gba:items-center gba:space-x-1" title={`${Math.abs(percentChange).toFixed(1)}% ${isPositiveChange ? 'increase' : 'decrease'} from last month`}>
              {isPositiveChange ? 
                <ArrowUpOutlined className="gba:text-red-500" /> : 
                <ArrowDownOutlined className="gba:text-green-600" />
              }
            </div>
          </div>
          <div className="gba:flex gba:items-center gba:space-x-2">
            <PiCurrencyCircleDollar size={24} className={isPositiveChange ? 'gba:text-red-500' : 'gba:text-green-600'} />
            <span className={`gba:text-2xl gba:font-bold ${isPositiveChange ? 'gba:text-red-500' : 'gba:text-green-600'}`} data-testid="current-month-value">
              {formatNumber(currentTotal)}
            </span>
          </div>
          <p className="gba:text-sm gba:text-gray-500 gba:m-0">{stats?.currentMonthExpenses?.count || 0} expense requests</p>
        </div>
      </Card>

      <Card className="gba:h-full" data-testid="pending-payouts-card">
        <div className="gba:space-y-2">
          <h3 className="gba:text-sm gba:font-medium gba:text-gray-600 gba:m-0">Pending Payouts</h3>
          <div className="gba:flex gba:items-center gba:space-x-2">
            <PiCurrencyCircleDollar size={24} className="gba:text-blue-500" />
            <span className="gba:text-2xl gba:font-bold gba:text-blue-500" data-testid="pending-payouts-value">
              {formatNumber(stats?.pendingPayouts || 0)}
            </span>
          </div>
          <p className="gba:text-sm gba:text-gray-500 gba:m-0">Awaiting payment</p>
        </div>
      </Card>

      <Card className="gba:h-full" data-testid="upcoming-trips-card">
        <div className="gba:space-y-2">
          <h3 className="gba:text-sm gba:font-medium gba:text-gray-600 gba:m-0">Upcoming Trips</h3>
          <div className="gba:flex gba:items-center gba:space-x-2">
            <GlobalOutlined className="gba:text-2xl gba:text-purple-600" />
            <span className="gba:text-2xl gba:font-bold gba:text-purple-600" data-testid="upcoming-trips-value">
              {stats?.upcomingTrips || 0}
            </span>
          </div>
          <p className="gba:text-sm gba:text-gray-500 gba:m-0">Planned business trips</p>
        </div>
      </Card>
    </div>
  );
};

export default SummaryStatistics;
