import React, { useMemo } from 'react';
import { Button } from '@newwork/nw-design-system';
import { PiArrowLeft, PiCalendarBlank } from 'react-icons/pi';
import { BusinessAppContextProps } from '../../../../../../../../common/BusinessAppContext';
import { AbsenceList } from '../../tabs/absence-list-tab/AbsenceList/AbsenceList';
import { useDashboardData } from '../../../hooks/useDashboardData';

interface AbsenceDetailsProps extends BusinessAppContextProps {
  month?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  department?: string;
  departmentId?: string;
  timeFilter?: 'current-year' | 'quarter' | 'month' | 'everything';
  onNavigateBack: () => void;
}

const AbsenceDetails: React.FC<AbsenceDetailsProps> = ({ 
  accessToken, 
  userInfo, 
  month, 
  startDate, 
  endDate,
  status,
  department,
  departmentId,
  timeFilter,
  onNavigateBack
}) => {
  // Get dashboard data to show calculations - USE SAME TIME FILTER AS MAIN DASHBOARD
  const dashboardData = useDashboardData({ accessToken, userInfo, timeFilter });

      // Debug: Log to confirm we're using the dashboard data source
    console.log('🔍 AbsenceDetails Data Source:', {
      timeFilter,
      dataSource: 'Dashboard rawAbsences (will be filtered for specific month)',
      totalDashboardAbsences: dashboardData.totalAbsences,
      totalRawAbsences: dashboardData.rawAbsences?.length,
      monthRequested: month,
      dateRange: `${startDate} to ${endDate}`,
      note: 'Filtering will happen next...'
    });

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
    if (!dashboardData?.monthlyData || !month) {
      return null;
    }

    const monthName = getMonthDisplayName(month);
    const monthData = dashboardData.monthlyData.find((trend: any) => trend.month === monthName);
    
    if (!monthData) return null;

    return {
      totalRequests: Object.values(monthData.typeBreakdown || {}).reduce((sum: number, count: number) => sum + count, 0),
      uniqueEmployees: monthData.uniqueEmployees || 0,
      avgRequestsPerEmployee: monthData.avgRequestsPerEmployee || 0,
      avgDurationPerRequest: monthData.avgDurationPerRequest || 0,
      totalDuration: monthData.totalDuration || 0
    };
  };

  const monthCalculations = getMonthCalculations();

  // 🎯 FILTER rawAbsences for the specific month/date range
  const filteredAbsencesForMonth = useMemo(() => {
    if (!startDate || !endDate || !dashboardData.rawAbsences) {
      return { 
        absences: dashboardData.rawAbsences || [],
        overlappingInfo: { 
          fullyWithin: 0, 
          spanningInto: 0, 
          spanningOut: 0, 
          spanningAcross: 0,
          spanningIntoRequests: [],
          spanningOutRequests: [],
          fullyWithinRequests: [],
          spanningAcrossRequests: []
        }
      };
    }

    const rangeStart = new Date(startDate);
    const rangeEnd = new Date(endDate);
    
    let fullyWithin = 0;
    let spanningInto = 0; // starts before, ends within
    let spanningOut = 0;  // starts within, ends after
    let spanningAcross = 0; // starts before, ends after (spans across entire month)

    // Collect actual requests for each category
    const spanningIntoRequests: any[] = [];
    const spanningOutRequests: any[] = [];
    const fullyWithinRequests: any[] = [];
    const spanningAcrossRequests: any[] = [];

    const filtered = dashboardData.rawAbsences.filter((absence: any) => {
      // Use overlap logic: absence overlaps with the requested date range
      const absenceStart = new Date(absence.startDate);
      const absenceEnd = new Date(absence.endDate);

      const overlaps = absenceStart <= rangeEnd && absenceEnd >= rangeStart;
      
      if (overlaps) {
        // Categorize the type of overlap and collect the requests
        if (absenceStart >= rangeStart && absenceEnd <= rangeEnd) {
          fullyWithin++;
          fullyWithinRequests.push(absence);
        } else if (absenceStart < rangeStart && absenceEnd <= rangeEnd) {
          spanningInto++;
          spanningIntoRequests.push(absence);
        } else if (absenceStart >= rangeStart && absenceEnd > rangeEnd) {
          spanningOut++;
          spanningOutRequests.push(absence);
        } else if (absenceStart < rangeStart && absenceEnd > rangeEnd) {
          spanningAcross++;
          spanningAcrossRequests.push(absence);
        }
      }

      return overlaps;
    });

    const overlappingInfo = { 
      fullyWithin, 
      spanningInto, 
      spanningOut, 
      spanningAcross,
      // Add the actual requests for each category
      spanningIntoRequests,
      spanningOutRequests,
      fullyWithinRequests,
      spanningAcrossRequests
    };

    console.log('🎯 AbsenceDetails: Filtering rawAbsences for specific month/range', {
      totalRawAbsences: dashboardData.rawAbsences.length,
      dateRange: `${startDate} to ${endDate}`,
      filteredCount: filtered.length,
      month,
      overlapLogic: 'absenceStart <= rangeEnd && absenceEnd >= rangeStart',
      overlappingBreakdown: overlappingInfo
    });

    return { absences: filtered, overlappingInfo };
  }, [dashboardData.rawAbsences, startDate, endDate, month]);

  // Debug: Log filtering results
  console.log('✅ AbsenceDetails: Month filtering completed:', {
    totalRawAbsences: dashboardData.rawAbsences?.length,
    filteredForMonth: filteredAbsencesForMonth?.absences?.length,
    overlappingBreakdown: filteredAbsencesForMonth?.overlappingInfo,
    monthRequested: month,
    dateRange: `${startDate} to ${endDate}`,
    dataConsistency: '🎯 AbsenceList will now use month-filtered data only!',
    expectedResult: `January should show ${filteredAbsencesForMonth?.absences?.length} absences (not ${dashboardData.rawAbsences?.length})`
  });

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
                {month ? `${getMonthDisplayName(month)} Absence Details` : 
                 department ? `${department} Department Details` : 'Absence Details'}
              </h1>
              <p className="gba:text-gray-600 gba:mt-1">
                {startDate && endDate ? `${startDate} to ${endDate}` : 
                 month ? 'All absences for selected month' : 
                 department ? `All absences for ${department} department` : 'Filtered absence results'}
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
            <span>{month ? `${getMonthDisplayName(month)} Details` : 
                  department ? `${department} Department` : 'Filtered Details'}</span>
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
                    {monthCalculations?.totalRequests || 0}
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
                  <div className="gba:mt-2 gba:pt-2 gba:border-t gba:border-blue-200">
                    <div className="gba:font-medium gba:mb-1">Overlapping Requests (cross-month absences):</div>
                    <div>• Fully within month: {filteredAbsencesForMonth.overlappingInfo.fullyWithin} requests</div>
                    <div>• Spanning into month: {filteredAbsencesForMonth.overlappingInfo.spanningInto} requests (started before, ended within)</div>
                    <div>• Spanning out of month: {filteredAbsencesForMonth.overlappingInfo.spanningOut} requests (started within, ended after)</div>
                    <div>• Spanning across month: {filteredAbsencesForMonth.overlappingInfo.spanningAcross} requests (started before, ended after)</div>
                  </div>
                </div>
              </div>

              {/* Minimal Cross-Month Details */}
              {(filteredAbsencesForMonth.overlappingInfo.spanningIntoRequests.length > 0 || 
                filteredAbsencesForMonth.overlappingInfo.spanningOutRequests.length > 0) && (
                <div className="gba:mt-2 gba:p-2 gba:bg-amber-50 gba:border gba:border-amber-200 gba:rounded">
                  <div className="gba:text-amber-800 gba:text-xs gba:font-medium gba:mb-1">
                    🔍 Cross-Month: 
                    {filteredAbsencesForMonth.overlappingInfo.spanningIntoRequests.length > 0 && (
                      <span className="gba:ml-1">
                        INTO ({filteredAbsencesForMonth.overlappingInfo.spanningIntoRequests.length}): {
                          filteredAbsencesForMonth.overlappingInfo.spanningIntoRequests.map((absence: any, index: number) => {
                            const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            return (
                              <span key={absence.id || index} className="gba:text-amber-600">
                                {index > 0 && ', '}
                                {absence.employeeName || `${absence.employee?.firstName || ''} ${absence.employee?.lastName || ''}`.trim()} 
                                ({formatDate(absence.startDate)}-{formatDate(absence.endDate)})
                              </span>
                            );
                          })
                        }
                      </span>
                    )}
                    {filteredAbsencesForMonth.overlappingInfo.spanningIntoRequests.length > 0 && 
                     filteredAbsencesForMonth.overlappingInfo.spanningOutRequests.length > 0 && (
                      <span className="gba:mx-2">•</span>
                    )}
                    {filteredAbsencesForMonth.overlappingInfo.spanningOutRequests.length > 0 && (
                      <span>
                        OUT ({filteredAbsencesForMonth.overlappingInfo.spanningOutRequests.length}): {
                          filteredAbsencesForMonth.overlappingInfo.spanningOutRequests.map((absence: any, index: number) => {
                            const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            return (
                              <span key={absence.id || index} className="gba:text-amber-600">
                                {index > 0 && ', '}
                                {absence.employeeName || `${absence.employee?.firstName || ''} ${absence.employee?.lastName || ''}`.trim()} 
                                ({formatDate(absence.startDate)}-{formatDate(absence.endDate)})
                              </span>
                            );
                          })
                        }
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Department Analysis - Show Department Statistics */}
      {department && !month && (
        <div className="gba:bg-gray-50 gba:border gba:border-gray-200 gba:rounded-lg gba:p-6">
          <div className="gba:flex gba:items-start gba:gap-4">
            <span className="gba:text-gray-600 gba:text-2xl">🏢</span>
            <div className="gba:flex-1">
              <div className="gba:text-gray-800 gba:font-bold gba:text-lg gba:mb-3">
                Department Analysis: {department}
              </div>
              <div className="gba:text-gray-600 gba:text-sm gba:mb-4">
                Drilled down from department chart • {startDate && endDate ? `${startDate} to ${endDate}` : 'All time'}
              </div>
              
              {/* Department Statistics Grid */}
              <div className="gba:grid gba:grid-cols-2 gba:md:grid-cols-4 gba:gap-4">
                <div className="gba:text-center gba:p-3 gba:bg-white gba:rounded gba:border gba:border-gray-200">
                  <div className="gba:text-2xl gba:font-bold gba:text-gray-800">
                    {dashboardData?.departmentStats?.find(d => d.name === department)?.totalDays || 0}
                  </div>
                  <div className="gba:text-xs gba:text-gray-600 gba:font-medium">Total Days</div>
                </div>
                
                <div className="gba:text-center gba:p-3 gba:bg-white gba:rounded gba:border gba:border-gray-200">
                  <div className="gba:text-2xl gba:font-bold gba:text-gray-800">
                    {dashboardData?.departmentStats?.find(d => d.name === department)?.totalRequests || 0}
                  </div>
                  <div className="gba:text-xs gba:text-gray-600 gba:font-medium">Total Requests</div>
                </div>
                
                <div className="gba:text-center gba:p-3 gba:bg-white gba:rounded gba:border gba:border-gray-200">
                  <div className="gba:text-2xl gba:font-bold gba:text-gray-800">
                    {dashboardData?.departmentStats?.find(d => d.name === department)?.uniqueEmployees || 0}
                  </div>
                  <div className="gba:text-xs gba:text-gray-600 gba:font-medium">Employees</div>
                </div>
                
                <div className="gba:text-center gba:p-3 gba:bg-white gba:rounded gba:border gba:border-gray-200">
                  <div className="gba:text-2xl gba:font-bold gba:text-gray-800">
                    {dashboardData?.departmentStats?.find(d => d.name === department)?.avgDaysPerEmployee || 0}
                  </div>
                  <div className="gba:text-xs gba:text-gray-600 gba:font-medium">Avg Days/Employee</div>
                </div>
              </div>
              
              <div className="gba:mt-4 gba:text-gray-700 gba:text-sm">
                <strong>Department Performance:</strong> This department has{' '}
                {dashboardData?.departmentStats?.find(d => d.name === department)?.avgRequestsPerEmployee || 0} avg requests per employee.
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

      {/* Absence List with MONTH-FILTERED DATA */}
      <AbsenceList 
        accessToken={accessToken}
        userInfo={userInfo}
        initialFilters={{
          startDate,
          endDate,
          month,
          status,
          department,
          departmentId
        }}
        preFilteredData={filteredAbsencesForMonth.absences}
      />
    </div>
  );
};

export default AbsenceDetails; 