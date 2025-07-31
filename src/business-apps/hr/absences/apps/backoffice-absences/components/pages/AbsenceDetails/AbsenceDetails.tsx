import React, { useMemo, useState, useCallback } from 'react';
import { PiArrowLeft, PiCalendarBlank } from 'react-icons/pi';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { AbsenceList } from '../../tabs/absence-list-tab/AbsenceList/AbsenceList';
import { DashboardData } from '../../../types';

interface AbsenceDetailsProps extends BusinessAppContextProps {
  month?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  department?: string;
  timeFilter?: 'current-year' | 'quarter' | 'month' | 'everything';
  dashboardData: DashboardData;
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
  dashboardData,
  onNavigateBack
}) => {
  // 🚀 PHASE 2: Track current filtered data for dynamic analysis
  const [currentFilteredData, setCurrentFilteredData] = useState<{
    absences: any[];
    total: number;
    isFiltered: boolean;
    appliedFilters: any;
  } | null>(null);

  // 🚀 PHASE 2: Callback to receive filtered data from AbsenceList
  const handleDataChange = useCallback((data: {
    absences: any[];
    total: number;
    isFiltered: boolean;
    appliedFilters: any;
  }) => {
    setCurrentFilteredData(data);
  }, []);

  // 🎯 FILTER rawAbsences for the specific month/date range - MOVE THIS BEFORE EARLY RETURNS
  const filteredAbsencesForMonth = useMemo(() => {
    // 🔧 FIX: Use current date ranges from table if available, otherwise use props
    const currentStartDate = currentFilteredData?.appliedFilters?.currentDateRange?.startDate || startDate;
    const currentEndDate = currentFilteredData?.appliedFilters?.currentDateRange?.endDate || endDate;
    
    if (!currentStartDate || !currentEndDate || !dashboardData.rawAbsences) {
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

    const rangeStart = new Date(currentStartDate);
    const rangeEnd = new Date(currentEndDate);

    // Filter absences using overlap logic AND department filter
    const filtered = dashboardData.rawAbsences.filter((absence: any) => {
      const absenceStart = new Date(absence.startDate);
      const absenceEnd = new Date(absence.endDate);
      
      // Date overlap logic: absence overlaps with the month if:
      // absence start <= month end AND absence end >= month start
      const dateOverlaps = absenceStart <= rangeEnd && absenceEnd >= rangeStart;
      
      // Apply department filter if provided
      if (department) {
        const employeeDepartment = absence.employee?.employeePosition?.organizationalUnit?.name;
        
        // Special handling for "No Department" case
        if (department === 'NO_DEPARTMENT_SPECIAL') {
          return dateOverlaps && (!employeeDepartment || employeeDepartment.trim() === '');
        } else {
          return dateOverlaps && employeeDepartment === department;
        }
      }
      
      // Apply status filter if provided  
      if (status) {
        return dateOverlaps && absence.status === status;
      }
      
      return dateOverlaps;
    });

    // Categorize overlapping types for analysis
    const fullyWithinRequests: any[] = [];
    const spanningIntoRequests: any[] = [];
    const spanningOutRequests: any[] = [];
    const spanningAcrossRequests: any[] = [];

    filtered.forEach((absence: any) => {
      const absenceStart = new Date(absence.startDate);
      const absenceEnd = new Date(absence.endDate);

      if (absenceStart >= rangeStart && absenceEnd <= rangeEnd) {
        fullyWithinRequests.push(absence);
      } else if (absenceStart < rangeStart && absenceEnd <= rangeEnd) {
        spanningIntoRequests.push(absence);
      } else if (absenceStart >= rangeStart && absenceEnd > rangeEnd) {
        spanningOutRequests.push(absence);
      } else if (absenceStart < rangeStart && absenceEnd > rangeEnd) {
        spanningAcrossRequests.push(absence);
      }
    });

    const overlappingInfo = {
      fullyWithin: fullyWithinRequests.length,
      spanningInto: spanningIntoRequests.length,
      spanningOut: spanningOutRequests.length,
      spanningAcross: spanningAcrossRequests.length,
      fullyWithinRequests,
      spanningIntoRequests,
      spanningOutRequests,
      spanningAcrossRequests
    };



    return { absences: filtered, overlappingInfo };
  }, [dashboardData.rawAbsences, startDate, endDate, month, department, status, currentFilteredData]);

  // 🚀 PHASE 2: Dynamic analysis calculations based on current filtered table data
  const dynamicAnalysis = useMemo(() => {
    // Use either table-filtered data or date-filtered data, whichever is more restrictive
    let sourceData: any[] = [];
    let isFiltered = false;
    let appliedFilters: any = {};

    if (currentFilteredData?.absences?.length) {
      // Use table-filtered data when available (user applied additional filters)
      sourceData = currentFilteredData.absences;
      isFiltered = currentFilteredData.isFiltered;
      appliedFilters = currentFilteredData.appliedFilters;
    } else if (filteredAbsencesForMonth?.absences?.length) {
      // Use date-filtered data when no table filters applied
      sourceData = filteredAbsencesForMonth.absences;
      isFiltered = !!(startDate || endDate || month || department || status);
      appliedFilters = {
        dateRange: (startDate || endDate) ? { startDate, endDate } : undefined,
        month,
        department,
        status
      };
    } else {
      return null;
    }

    if (!sourceData.length) {
      return null;
    }

    const filteredAbsences = sourceData;

    // Calculate core metrics from currently visible table data
    const totalRequests = filteredAbsences.length;
    const totalDays = filteredAbsences.reduce((sum: number, absence: any) =>
      sum + (absence.effectiveDays || absence.calendarDays || 0), 0
    );

    // Calculate unique employees from filtered data
    const uniqueEmployeeIds = new Set(filteredAbsences.map((absence: any) => absence.employee?.id));
    const uniqueEmployees = uniqueEmployeeIds.size;

    // Calculate averages
    const avgDaysPerEmployee = uniqueEmployees > 0 ? Math.round((totalDays / uniqueEmployees) * 100) / 100 : 0;
    const avgDaysPerRequest = totalRequests > 0 ? Math.round((totalDays / totalRequests) * 100) / 100 : 0;

    // Status breakdown from current filtered data
    const statusBreakdown = filteredAbsences.reduce((acc: any, absence: any) => {
      const status = absence.status || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    // Department breakdown from current filtered data
    const departmentBreakdown = filteredAbsences.reduce((acc: any, absence: any) => {
      const deptName = absence.employee?.employeePosition?.organizationalUnit?.name || 'No Department';
      acc[deptName] = (acc[deptName] || 0) + 1;
      return acc;
    }, {});

    return {
      totalRequests,
      totalDays,
      uniqueEmployees,
      avgDaysPerEmployee,
      avgDaysPerRequest,
      statusBreakdown,
      departmentBreakdown,
      isFiltered: isFiltered,
      appliedFilters: appliedFilters
    };
  }, [currentFilteredData, filteredAbsencesForMonth, startDate, endDate, month, department, status]);

  // 🎯 Dynamic UI Labels - Show current filter state
  const currentUIState = useMemo(() => {
    // Get current date ranges from table filters if available
    const currentStartDate = currentFilteredData?.appliedFilters?.currentDateRange?.startDate || startDate;
    const currentEndDate = currentFilteredData?.appliedFilters?.currentDateRange?.endDate || endDate;
    
    // Check if user has changed filters from original navigation
    const hasChangedFilters = currentFilteredData?.isFiltered || 
      (currentStartDate !== startDate) || 
      (currentEndDate !== endDate);
    
    // Determine current context
    let title = 'Absence Details';
    let description = 'Filtered absence results';
    let breadcrumb = 'Filtered Details';
    
    if (hasChangedFilters && currentFilteredData?.appliedFilters) {
      // User has applied filters - show current filter state
      const filters = currentFilteredData.appliedFilters;
      const parts = [];
      
      if (filters.currentDateRange?.startDate && filters.currentDateRange?.endDate) {
        parts.push(`${filters.currentDateRange.startDate} to ${filters.currentDateRange.endDate}`);
      }
      
      if (filters.search) {
        parts.push(`"${filters.search}"`);
      }
      
      if (filters.selectedFilters?.length > 0) {
        parts.push(`${filters.selectedFilters.length} filters`);
      }
      
      title = parts.length > 0 ? `Filtered Absence Details` : 'Absence Details';
      description = parts.length > 0 ? parts.join(' • ') : 'All absence results';
      breadcrumb = 'Custom Filters';
      
    } else {
      // No user filters - show original navigation context
      if (month) {
        title = `${month} Absence Details`;
        description = currentStartDate && currentEndDate 
          ? `${currentStartDate} to ${currentEndDate}` 
          : `All absences for ${month}`;
        breadcrumb = `${month} Details`;
      } else if (department) {
        title = `${department} Department Details`;
        description = `All absences for ${department} department`;
        breadcrumb = `${department} Department`;
      } else if (status) {
        title = `${status} Status Details`;
        description = `All ${status.toLowerCase()} absences`;
        breadcrumb = `${status} Status`;
      }
    }
    
    return {
      title,
      description,
      breadcrumb,
      hasChangedFilters,
      currentDateRange: { startDate: currentStartDate, endDate: currentEndDate }
    };
  }, [currentFilteredData, startDate, endDate, month, department, status]);

  // 🚀 CRITICAL: Handle loading state properly - AFTER ALL HOOKS
  if (dashboardData.isLoading) {
    return (
      <div className="gba:p-6">
        <div className="gba:flex gba:items-center gba:gap-4 gba:mb-6">
          <Button onClick={onNavigateBack} className="gba:flex gba:items-center gba:gap-2">
            <PiArrowLeft />
            Back to Dashboard
          </Button>
        </div>
        <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
          <div className="gba:text-gray-600">Loading absence details...</div>
        </div>
      </div>
    );
  }

  // 🚀 CRITICAL: Handle error state properly - AFTER ALL HOOKS 
  if (dashboardData.error) {
    return (
      <div className="gba:p-6">
        <div className="gba:flex gba:items-center gba:gap-4 gba:mb-6">
          <Button onClick={onNavigateBack} className="gba:flex gba:items-center gba:gap-2">
            <PiArrowLeft />
            Back to Dashboard
          </Button>
        </div>
        <div className="gba:bg-red-50 gba:border gba:border-red-200 gba:rounded-lg gba:p-4">
          <div className="gba:text-red-800 gba:font-medium">Error loading absence details</div>
          <div className="gba:text-red-600 gba:text-sm gba:mt-1">{dashboardData.error}</div>
        </div>
      </div>
    );
  }

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
                {currentUIState.title}
              </h1>
              <p className="gba:text-gray-600 gba:mt-1">
                {currentUIState.description}
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
            <span>{currentUIState.breadcrumb}</span>
          </div>
        </div>
      </div>



      {/* 🚀 PHASE 2: Universal Dynamic Analysis - Shows when table is filtered */}
      {dynamicAnalysis && (
        <div className="gba:bg-white gba:border gba:border-gray-200 gba:rounded-lg gba:p-4">
          <div className="gba:mb-3">
            <div className="gba:text-gray-900 gba:font-medium gba:text-base gba:mb-1">
              {currentUIState.hasChangedFilters ? (
                // User has changed filters - show generic analysis title
                department ? `Analysis: ${department} Department` : 'Date Range Analysis'
              ) : (
                // Original navigation context - show specific context
                month ? `Analysis: ${month}` : 
                department ? `Analysis: ${department} Department` : 'Absence Analysis'
              )}
              <span className="gba:ml-2 gba:text-xs gba:bg-gray-100 gba:text-gray-700 gba:px-2 gba:py-1 gba:rounded">
                {dynamicAnalysis.isFiltered ? 'Filtered' : 'Live'}
              </span>
            </div>
            <div className="gba:text-gray-600 gba:text-sm">
              {currentUIState.hasChangedFilters ? (
                currentUIState.currentDateRange.startDate && currentUIState.currentDateRange.endDate ? 
                  `Live Analysis • ${currentUIState.currentDateRange.startDate} to ${currentUIState.currentDateRange.endDate}` :
                  'Live Analysis • Custom filters applied'
              ) : (
                month && startDate && endDate ? `Drilled down from trends chart • ${startDate} to ${endDate}` :
                department ? `Drilled down from department chart` :
                status ? `Drilled down from status chart` :
                'Current table data analysis'
              )}
              {dynamicAnalysis.isFiltered && (
                <span className="gba:ml-2">• Updates automatically</span>
              )}
            </div>
          </div>
          
          {/* Dynamic Analysis Grid - Main Metrics as Cards */}
          <div className="gba:grid gba:grid-cols-2 gba:md:grid-cols-4 gba:gap-3">
            <Card>
              <CardHeader className="gba:pb-2">
                <CardTitle className="gba:text-sm gba:font-medium">Total Days</CardTitle>
              </CardHeader>
              <CardContent className="gba:pt-0">
                <div className="gba:text-2xl gba:font-bold gba:text-gray-900">
                  {dynamicAnalysis.totalDays}
                </div>
                <div className="gba:text-xs gba:text-gray-600">Filtered Results</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="gba:pb-2">
                <CardTitle className="gba:text-sm gba:font-medium">Total Requests</CardTitle>
              </CardHeader>
              <CardContent className="gba:pt-0">
                <div className="gba:text-2xl gba:font-bold gba:text-gray-900">
                  {dynamicAnalysis.totalRequests}
                </div>
                <div className="gba:text-xs gba:text-gray-600">Filtered Results</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="gba:pb-2">
                <CardTitle className="gba:text-sm gba:font-medium">Employees</CardTitle>
              </CardHeader>
              <CardContent className="gba:pt-0">
                <div className="gba:text-2xl gba:font-bold gba:text-gray-900">
                  {dynamicAnalysis.uniqueEmployees}
                </div>
                <div className="gba:text-xs gba:text-gray-600">Filtered Results</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="gba:pb-2">
                <CardTitle className="gba:text-sm gba:font-medium">Avg Days/Employee</CardTitle>
              </CardHeader>
              <CardContent className="gba:pt-0">
                <div className="gba:text-2xl gba:font-bold gba:text-gray-900">
                  {dynamicAnalysis.avgDaysPerEmployee}
                </div>
                <div className="gba:text-xs gba:text-gray-600">Filtered Results</div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analysis - 4 Cards in a Row */}
          <div className="gba:mt-3 gba:grid gba:gap-3 gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-4">
            {/* Cross-Month Analysis Card - First Position */}
            <Card>
              <CardHeader className="gba:pb-2">
                <CardTitle className="gba:text-sm gba:font-medium">
                  {month ? `Cross-Month Analysis (${month})` : 'Request Details'}
                </CardTitle>
              </CardHeader>
              <CardContent className="gba:pt-0">
                {filteredAbsencesForMonth.overlappingInfo && (
                  filteredAbsencesForMonth.overlappingInfo.spanningInto > 0 || 
                  filteredAbsencesForMonth.overlappingInfo.spanningOut > 0 || 
                  filteredAbsencesForMonth.overlappingInfo.spanningAcross > 0
                ) ? (
                  <div className="gba:text-xs gba:text-gray-600 gba:space-y-1">
                    <div>Fully within period: {filteredAbsencesForMonth.overlappingInfo.fullyWithin} requests</div>
                    {filteredAbsencesForMonth.overlappingInfo.spanningInto > 0 && (
                      <div>Spanning INTO period: {filteredAbsencesForMonth.overlappingInfo.spanningInto} requests</div>
                    )}
                    {filteredAbsencesForMonth.overlappingInfo.spanningOut > 0 && (
                      <div>Spanning OUT of period: {filteredAbsencesForMonth.overlappingInfo.spanningOut} requests</div>
                    )}
                    {filteredAbsencesForMonth.overlappingInfo.spanningAcross > 0 && (
                      <div>Spanning ACROSS period: {filteredAbsencesForMonth.overlappingInfo.spanningAcross} requests</div>
                    )}
                    
                    {/* Detailed Employee Info for Spanning Requests */}
                    {(filteredAbsencesForMonth.overlappingInfo.spanningIntoRequests?.length > 0 || 
                      filteredAbsencesForMonth.overlappingInfo.spanningOutRequests?.length > 0) && (
                      <div className="gba:mt-2 gba:pt-2 gba:border-t gba:border-gray-200">
                        {filteredAbsencesForMonth.overlappingInfo.spanningIntoRequests?.length > 0 && (
                          <div className="gba:mb-1">
                            <span className="gba:font-medium">INTO:</span> {
                              filteredAbsencesForMonth.overlappingInfo.spanningIntoRequests.slice(0, 2).map((absence: any, index: number) => {
                                const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                const employeeName = absence.employeeName || `${absence.employee?.firstName || ''} ${absence.employee?.lastName || ''}`.trim();
                                return (
                                  <span key={absence.id || index} className="gba:text-gray-500">
                                    {index > 0 && ', '}
                                    {employeeName} ({formatDate(absence.startDate)}-{formatDate(absence.endDate)})
                                  </span>
                                );
                              })
                            }
                            {filteredAbsencesForMonth.overlappingInfo.spanningIntoRequests.length > 2 && (
                              <span className="gba:text-gray-500"> +{filteredAbsencesForMonth.overlappingInfo.spanningIntoRequests.length - 2} more</span>
                            )}
                          </div>
                        )}
                        {filteredAbsencesForMonth.overlappingInfo.spanningOutRequests?.length > 0 && (
                          <div>
                            <span className="gba:font-medium">OUT:</span> {
                              filteredAbsencesForMonth.overlappingInfo.spanningOutRequests.slice(0, 2).map((absence: any, index: number) => {
                                const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                const employeeName = absence.employeeName || `${absence.employee?.firstName || ''} ${absence.employee?.lastName || ''}`.trim();
                                return (
                                  <span key={absence.id || index} className="gba:text-gray-500">
                                    {index > 0 && ', '}
                                    {employeeName} ({formatDate(absence.startDate)}-{formatDate(absence.endDate)})
                                  </span>
                                );
                              })
                            }
                            {filteredAbsencesForMonth.overlappingInfo.spanningOutRequests.length > 2 && (
                              <span className="gba:text-gray-500"> +{filteredAbsencesForMonth.overlappingInfo.spanningOutRequests.length - 2} more</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="gba:text-xs gba:text-gray-500">
                    {month ? 'No cross-month requests' : 'All requests within period'}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Card */}
            <Card>
              <CardHeader className="gba:pb-2">
                <CardTitle className="gba:text-sm gba:font-medium">Performance</CardTitle>
              </CardHeader>
              <CardContent className="gba:pt-0">
                <div className="gba:text-xs gba:text-gray-600 gba:space-y-1">
                  <div>Avg Duration per Request: {dynamicAnalysis.avgDaysPerRequest} days</div>
                  <div>Requests per Employee: {dynamicAnalysis.uniqueEmployees > 0 ? Math.round((dynamicAnalysis.totalRequests / dynamicAnalysis.uniqueEmployees) * 100) / 100 : 0}</div>
                </div>
              </CardContent>
            </Card>

            {/* Status Distribution Card */}
            <Card>
              <CardHeader className="gba:pb-2">
                <CardTitle className="gba:text-sm gba:font-medium">Status Distribution</CardTitle>
              </CardHeader>
              <CardContent className="gba:pt-0">
                {Object.keys(dynamicAnalysis.statusBreakdown).length > 0 ? (
                  <div className="gba:flex gba:flex-wrap gba:gap-2 gba:text-xs">
                    {Object.entries(dynamicAnalysis.statusBreakdown).map(([status, count]) => (
                      <div key={status} className="gba:text-gray-600 gba:bg-gray-50 gba:px-2 gba:py-1 gba:rounded">
                        <span className="gba:font-medium">{status}:</span> {count as number}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="gba:text-xs gba:text-gray-500">No status data</div>
                )}
              </CardContent>
            </Card>

            {/* Department Distribution Card */}
            <Card>
              <CardHeader className="gba:pb-2">
                <CardTitle className="gba:text-sm gba:font-medium">Department Distribution</CardTitle>
              </CardHeader>
              <CardContent className="gba:pt-0">
                {Object.keys(dynamicAnalysis.departmentBreakdown).length > 0 ? (
                  <div className="gba:flex gba:flex-wrap gba:gap-2 gba:text-xs">
                    {Object.entries(dynamicAnalysis.departmentBreakdown).map(([dept, count]) => (
                      <div key={dept} className="gba:text-gray-600 gba:bg-gray-50 gba:px-2 gba:py-1 gba:rounded">
                        <span className="gba:font-medium">{dept}:</span> {count as number}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="gba:text-xs gba:text-gray-500">No department data</div>
                )}
              </CardContent>
            </Card>
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
          status,
          department
        }}
        preFilteredData={filteredAbsencesForMonth.absences}
        dashboardData={dashboardData}
        onDataChange={handleDataChange}
      />
    </div>
  );
};

export default AbsenceDetails; 