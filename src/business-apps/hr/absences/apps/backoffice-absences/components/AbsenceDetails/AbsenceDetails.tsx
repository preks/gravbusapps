import React from 'react';
import { Button } from '@newwork/nw-design-system';
import { PiArrowLeft, PiCalendarBlank } from 'react-icons/pi';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { AbsenceList } from '../AbsenceList/AbsenceList';
import { useDashboardData } from '../../hooks/useDashboardData';

interface AbsenceDetailsProps extends BusinessAppContextProps {
  month?: string;
  startDate?: string;
  endDate?: string;
  onNavigateBack: () => void;
}

const AbsenceDetails: React.FC<AbsenceDetailsProps> = ({ 
  accessToken, 
  userInfo, 
  month, 
  startDate, 
  endDate,
  onNavigateBack
}) => {
  // Get dashboard data to show calculations
  const dashboardData = useDashboardData({ accessToken, userInfo });

  const getMonthDisplayName = (shortMonth?: string) => {
    const monthMap: Record<string, string> = {
      'Jan': 'January', 'Feb': 'February', 'Mar': 'March', 'Apr': 'April',
      'May': 'May', 'Jun': 'June', 'Jul': 'July', 'Aug': 'August',
      'Sep': 'September', 'Oct': 'October', 'Nov': 'November', 'Dec': 'December'
    };
    return monthMap[shortMonth || ''] || shortMonth || 'Unknown Month';
  };

  // Get calculations for the specific month
  const getMonthCalculations = () => {
    if (!dashboardData?.monthlyTrends || !month) {
      return null;
    }

    const monthName = getMonthDisplayName(month);
    const monthData = dashboardData.monthlyTrends.find(trend => trend.month === monthName);
    
    if (!monthData) return null;

    return {
      totalRequests: Object.values(monthData.typeBreakdown || {}).reduce((sum, count) => sum + count, 0),
      uniqueEmployees: monthData.uniqueEmployees || 0,
      avgRequestsPerEmployee: monthData.avgRequestsPerEmployee || 0,
      avgDurationPerRequest: monthData.avgDurationPerRequest || 0,
      totalDuration: monthData.totalDuration || 0
    };
  };

  const monthCalculations = getMonthCalculations();

  return (
    <div data-testid="absence-details-page" className="gba:space-y-6">
      {/* Back Navigation - Above everything */}
      <div className="gba:mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onNavigateBack}
          className="gba:flex gba:items-center gba:gap-2"
          data-testid="back-to-dashboard-button"
        >
          <PiArrowLeft size={16} />
          Back to Dashboard
        </Button>
      </div>

      {/* Page Header */}
      <div className="gba:bg-white gba:p-6 gba:rounded-lg gba:border gba:shadow-sm">
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-3">
            <PiCalendarBlank size={24} className="gba:text-blue-600" />
            <div>
              <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">
                {getMonthDisplayName(month)} Absence Details
              </h1>
              <p className="gba:text-gray-600 gba:mt-1">
                {startDate && endDate ? `${startDate} to ${endDate}` : 'All absences for selected month'}
              </p>
            </div>
          </div>
          
          {/* Breadcrumb */}
          <div className="gba:text-sm gba:text-gray-500">
            <span 
              className="gba:text-blue-600 gba:cursor-pointer hover:gba:underline"
              onClick={onNavigateBack}
            >
              Absence Dashboard
            </span>
            <span className="gba:mx-2">/</span>
            <span>{getMonthDisplayName(month)} Details</span>
          </div>
        </div>
      </div>

      {/* Month Analysis - Show Calculations */}
      {month && monthCalculations && (
        <div className="gba:bg-blue-50 gba:border gba:border-blue-200 gba:rounded-lg gba:p-6">
          <div className="gba:flex gba:items-start gba:gap-4">
            <span className="gba:text-blue-600 gba:text-2xl">📊</span>
            <div className="gba:flex-1">
              <div className="gba:text-blue-800 gba:font-bold gba:text-lg gba:mb-3">
                Showing absences for {getMonthDisplayName(month)}
              </div>
              <div className="gba:text-blue-600 gba:text-sm gba:mb-4">
                Drilled down from dashboard chart • {startDate} to {endDate}
              </div>
              
              {/* Calculations Grid */}
              <div className="gba:grid gba:grid-cols-2 gba:md:grid-cols-3 gba:lg:grid-cols-6 gba:gap-4">
                <div className="gba:bg-white gba:p-3 gba:rounded-lg gba:border">
                  <div className="gba:text-blue-800 gba:font-semibold gba:text-lg">
                    {monthCalculations.totalRequests}
                  </div>
                  <div className="gba:text-blue-600 gba:text-xs gba:uppercase gba:tracking-wide">
                    Total Requests
                  </div>
                </div>
                
                <div className="gba:bg-white gba:p-3 gba:rounded-lg gba:border">
                  <div className="gba:text-blue-800 gba:font-semibold gba:text-lg">
                    {monthCalculations.uniqueEmployees}
                  </div>
                  <div className="gba:text-blue-600 gba:text-xs gba:uppercase gba:tracking-wide">
                    Unique Employees
                  </div>
                </div>
                
                <div className="gba:bg-white gba:p-3 gba:rounded-lg gba:border">
                  <div className="gba:text-blue-800 gba:font-semibold gba:text-lg">
                    {monthCalculations.avgRequestsPerEmployee.toFixed(1)}
                  </div>
                  <div className="gba:text-blue-600 gba:text-xs gba:uppercase gba:tracking-wide">
                    Avg per Employee
                  </div>
                </div>
                
                <div className="gba:bg-white gba:p-3 gba:rounded-lg gba:border">
                  <div className="gba:text-blue-800 gba:font-semibold gba:text-lg">
                    {monthCalculations.avgDurationPerRequest.toFixed(1)} days
                  </div>
                  <div className="gba:text-blue-600 gba:text-xs gba:uppercase gba:tracking-wide">
                    Avg Duration
                  </div>
                </div>
                
                <div className="gba:bg-white gba:p-3 gba:rounded-lg gba:border">
                  <div className="gba:text-blue-800 gba:font-semibold gba:text-lg">
                    {monthCalculations.totalDuration}
                  </div>
                  <div className="gba:text-blue-600 gba:text-xs gba:uppercase gba:tracking-wide">
                    Total Duration (days)
                  </div>
                </div>
              </div>
              
              {/* Calculation Explanation */}
              <div className="gba:mt-4 gba:p-3 gba:bg-blue-100 gba:rounded-lg">
                <div className="gba:text-blue-700 gba:text-sm gba:font-medium gba:mb-1">
                  Calculation Details:
                </div>
                <div className="gba:text-blue-600 gba:text-xs gba:space-y-1">
                  <div>• Avg per Employee: {monthCalculations.totalRequests} requests ÷ {monthCalculations.uniqueEmployees} employees = {monthCalculations.avgRequestsPerEmployee.toFixed(2)}</div>
                  <div>• Avg Duration: {monthCalculations.totalDuration} total days ÷ {monthCalculations.totalRequests} requests = {monthCalculations.avgDurationPerRequest.toFixed(2)} days</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fallback if no calculations available */}
      {month && !monthCalculations && (
        <div className="gba:bg-blue-50 gba:border gba:border-blue-200 gba:rounded-lg gba:p-4">
          <div className="gba:flex gba:items-center gba:gap-3">
            <span className="gba:text-blue-600 gba:text-lg">📊</span>
            <div>
              <div className="gba:text-blue-800 gba:font-medium">
                Showing absences for {getMonthDisplayName(month)}
              </div>
              <div className="gba:text-blue-600 gba:text-sm">
                Drilled down from dashboard chart • {startDate} to {endDate}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Absence List with initial filters */}
      <AbsenceList 
        accessToken={accessToken}
        userInfo={userInfo}
        initialFilters={{
          startDate,
          endDate,
          month
        }}
      />
    </div>
  );
};

export default AbsenceDetails; 