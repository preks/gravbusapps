import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system';
import { TabComponentProps, TimeFilter } from '../../../types';
import { OptimizedKPISection } from './KPISection/OptimizedKPISection';
import OptimizedAbsenceTrends from './AbsenceTrends/OptimizedAbsenceTrends';

interface DashboardTabProps extends TabComponentProps {
  onMonthClick?: (month: string, year?: number) => void;
  timeFilter?: TimeFilter;
  onTimeFilterChange?: (filter: TimeFilter) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  accessToken,
  userInfo,
  dashboardData,
  onMonthClick,
  timeFilter = 'current-year',
  onTimeFilterChange
}) => {
  if (!dashboardData) {
    return <div>Loading dashboard data...</div>;
  }
  return (
    <div className="gba:space-y-8" data-testid="dashboard-content">
      
      {/* Time Filter */}
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
        <div>
          <h2 className="gba:text-lg gba:font-semibold gba:text-gray-900">Dashboard Analytics</h2>
          <p className="gba:text-sm gba:text-gray-500">
            {dashboardData?.isLoading ? 'Loading...' : `Showing ${dashboardData?.totalAbsences || 0} absences`} • Filter: {timeFilter}
          </p>
        </div>
        <div className="gba:flex gba:items-center gba:gap-3">
          <span className="gba:text-sm gba:text-gray-600">Time Period:</span>
          <Select value={timeFilter} onValueChange={(value: any) => onTimeFilterChange?.(value)}>
            <SelectTrigger className="gba:w-48">
              <SelectValue placeholder="Select time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current-year">This Year</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="everything">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Dashboard Components - All optimized */}
      <OptimizedKPISection
        accessToken={accessToken}
        userInfo={userInfo}
        dashboardData={dashboardData}
      />
      
      <OptimizedAbsenceTrends
        accessToken={accessToken}
        userInfo={userInfo}
        dashboardData={dashboardData}
        onMonthClick={onMonthClick}
      />
    </div>
  );
}; 