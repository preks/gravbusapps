import React, { useMemo, useState, useCallback } from 'react';
import { Button } from '@newwork/nw-design-system';
import { PiArrowLeft, PiCalendarBlank } from 'react-icons/pi';
import { BusinessAppContextProps } from '../../../../../../../../common/BusinessAppContext';
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
  }, [dashboardData.rawAbsences, startDate, endDate, month, department, status]);

  // 🚀 PHASE 2: Dynamic analysis calculations based on current filtered table data
  const dynamicAnalysis = useMemo(() => {
    if (!currentFilteredData?.absences?.length) {
      return null;
    }

    const filteredAbsences = currentFilteredData.absences;
    
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
      isFiltered: currentFilteredData.isFiltered,
      appliedFilters: currentFilteredData.appliedFilters
    };
  }, [currentFilteredData]);

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
                {month ? `${month} Absence Details` : 
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
            <span>{month ? `${month} Details` : 
                  department ? `${department} Department` : 'Filtered Details'}</span>
          </div>
        </div>
      </div>



      {/* 🚀 PHASE 2: Universal Dynamic Analysis - Shows when table is filtered */}
      {dynamicAnalysis && (
        <div className="gba:bg-green-50 gba:border gba:border-green-200 gba:rounded-lg gba:p-6">
          <div className="gba:flex gba:items-start gba:gap-4">
            <span className="gba:text-green-600 gba:text-2xl">📊</span>
            <div className="gba:flex-1">
              <div className="gba:text-green-800 gba:font-bold gba:text-lg gba:mb-3">
                {month ? `Analysis: ${month}` : 
                 department ? `Analysis: ${department} Department` : 'Absence Analysis'}
                <span className="gba:ml-2 gba:text-sm gba:bg-green-100 gba:text-green-700 gba:px-2 gba:py-1 gba:rounded">
                  {dynamicAnalysis.isFiltered ? 'Filtered' : 'Live'}
                </span>
              </div>
              <div className="gba:text-green-600 gba:text-sm gba:mb-4">
                {month && startDate && endDate ? `📅 ${startDate} to ${endDate}` :
                 department ? `🏢 Drilled down from department chart` :
                 '📊 Current table data analysis'}
                {dynamicAnalysis.isFiltered && (
                  <span className="gba:ml-2">• Updates automatically with your filters ✨</span>
                )}
              </div>
              
              {/* Dynamic Analysis Grid */}
              <div className="gba:grid gba:grid-cols-2 gba:md:grid-cols-4 gba:gap-4">
                <div className="gba:text-center gba:p-3 gba:bg-white gba:rounded gba:border gba:border-green-200">
                  <div className="gba:text-2xl gba:font-bold gba:text-green-800">
                    {dynamicAnalysis.totalDays}
                  </div>
                  <div className="gba:text-xs gba:text-green-600 gba:font-medium">Total Days (Filtered)</div>
                </div>
                
                <div className="gba:text-center gba:p-3 gba:bg-white gba:rounded gba:border gba:border-green-200">
                  <div className="gba:text-2xl gba:font-bold gba:text-green-800">
                    {dynamicAnalysis.totalRequests}
                  </div>
                  <div className="gba:text-xs gba:text-green-600 gba:font-medium">Total Requests (Filtered)</div>
                </div>
                
                <div className="gba:text-center gba:p-3 gba:bg-white gba:rounded gba:border gba:border-green-200">
                  <div className="gba:text-2xl gba:font-bold gba:text-green-800">
                    {dynamicAnalysis.uniqueEmployees}
                  </div>
                  <div className="gba:text-xs gba:text-green-600 gba:font-medium">Employees (Filtered)</div>
                </div>
                
                <div className="gba:text-center gba:p-3 gba:bg-white gba:rounded gba:border gba:border-green-200">
                  <div className="gba:text-2xl gba:font-bold gba:text-green-800">
                    {dynamicAnalysis.avgDaysPerEmployee}
                  </div>
                  <div className="gba:text-xs gba:text-green-600 gba:font-medium">Avg Days/Employee</div>
                </div>
              </div>

              {/* Additional Metrics */}
              <div className="gba:mt-4 gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
                <div className="gba:bg-white gba:p-3 gba:rounded gba:border gba:border-green-200">
                  <div className="gba:text-green-700 gba:font-medium gba:text-sm gba:mb-2">Performance Metrics</div>
                  <div className="gba:text-green-600 gba:text-xs gba:space-y-1">
                    <div>• Avg Duration per Request: {dynamicAnalysis.avgDaysPerRequest} days</div>
                    <div>• Requests per Employee: {dynamicAnalysis.uniqueEmployees > 0 ? Math.round((dynamicAnalysis.totalRequests / dynamicAnalysis.uniqueEmployees) * 100) / 100 : 0}</div>
                  </div>
                </div>

                <div className="gba:bg-white gba:p-3 gba:rounded gba:border gba:border-green-200">
                  <div className="gba:text-green-700 gba:font-medium gba:text-sm gba:mb-2">Filter Status</div>
                  <div className="gba:text-green-600 gba:text-xs gba:space-y-1">
                    {dynamicAnalysis.appliedFilters.search && (
                      <div>• Search Active: "{dynamicAnalysis.appliedFilters.search}"</div>
                    )}
                    <div>• Active Filters: {dynamicAnalysis.appliedFilters.selectedFilters?.length || 0}</div>
                    {dynamicAnalysis.appliedFilters.dateRange && (
                      <div>• Date Range Applied ✓</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Breakdown */}
              {Object.keys(dynamicAnalysis.statusBreakdown).length > 0 && (
                <div className="gba:mt-4 gba:bg-white gba:p-3 gba:rounded gba:border gba:border-green-200">
                  <div className="gba:text-green-700 gba:font-medium gba:text-sm gba:mb-2">Status Distribution (Filtered Data)</div>
                  <div className="gba:flex gba:gap-4 gba:text-xs">
                    {Object.entries(dynamicAnalysis.statusBreakdown).map(([status, count]) => (
                      <div key={status} className="gba:text-green-600">
                        <span className="gba:font-medium">{status}:</span> {count as number}
                      </div>
                    ))}
                  </div>
                </div>
              )}
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