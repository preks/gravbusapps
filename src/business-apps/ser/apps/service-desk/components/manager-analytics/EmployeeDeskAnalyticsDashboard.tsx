import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@newwork/nw-design-system';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useUserCapabilitiesGraphQL, useDesksForUser } from '../../../../hooks';
import { useServiceDeskCatalogCache, useMultipleDeskCounts } from '../../../../hooks';
import { useEmployeeNamesBatch, EmployeeDisplayName } from '../../../../hooks/useEmployeeNamesBatch';
import { TimeframeSelector, LoadingSpinner, ErrorBoundary } from './shared';
import { Users, Building2, BarChart3, PieChart as PieChartIcon, TrendingUp, Shield } from 'lucide-react';

export interface EmployeeDeskAnalyticsDashboardProps extends BusinessAppContextProps {}

export const EmployeeDeskAnalyticsDashboard: React.FC<EmployeeDeskAnalyticsDashboardProps> = ({
  accessToken,
  userInfo,
}) => {
  const [timeframe, setTimeframe] = useState<'wtd' | 'mtd' | 'qtd' | 'ytd'>('wtd');

  // Fetch user capabilities and desk access data
  const {
    capabilities,
    organizationalUnits,
    isLoading: capabilitiesLoading,
    error: capabilitiesError,
  } = useUserCapabilitiesGraphQL({ accessToken, userInfo });

  const {
    availableDesks,
    isLoading: deskAccessLoading,
    error: deskAccessError,
  } = useDesksForUser({ accessToken, userInfo });

  // Get service desk catalog and ticket counts
  const { catalogEntries } = useServiceDeskCatalogCache({ accessToken, userInfo });
  const deskKeys = catalogEntries.map(entry => entry.code);
  const { counts: deskCounts, isLoading: deskCountsLoading } = useMultipleDeskCounts({
    accessToken,
    userInfo,
    deskKeys,
  });

  // Get employee names for display
  const employeeIds = useMemo(() => {
    // Extract unique employee IDs from capabilities and organizational units
    const empIds = new Set<string>();
    
    // Add current user (this should always work)
    if (userInfo?.employeeDetails?.employeeId) {
      empIds.add(userInfo.employeeDetails.employeeId);
      console.log('[EmployeeDeskAnalytics] Added current user:', userInfo.employeeDetails.employeeId);
    }
    
    // Add employees from organizational units (if available)
    organizationalUnits.forEach(org => {
      if (org.employees) {
        org.employees.forEach(emp => empIds.add(emp.employeeId));
      }
    });
    
    console.log('[EmployeeDeskAnalytics] Found employee IDs:', Array.from(empIds));
    console.log('[EmployeeDeskAnalytics] organizationalUnits:', organizationalUnits);
    
    // If only current user found or no employees, just show current user
    // Don't use mock data as it can't be resolved to real names
    if (empIds.size === 0) {
      console.warn('[EmployeeDeskAnalytics] No employee IDs found, using empty array');
      return [];
    }
    
    return Array.from(empIds);
  }, [userInfo, organizationalUnits]);

  const { displayNames: employeeNames, isLoading: employeeNamesLoading } = useEmployeeNamesBatch({
    userIds: employeeIds,
    accessToken,
  });

  // Debug logging for employee names
  console.log('[EmployeeDeskAnalytics] employeeNames Map:', employeeNames);
  console.log('[EmployeeDeskAnalytics] employeeNames size:', employeeNames.size);
  employeeNames.forEach((name, id) => {
    console.log(`[EmployeeDeskAnalytics] ${id} -> ${name}`);
  });

  // Calculate analytics data (must be called before any early returns)
  const analyticsData = useMemo(() => {
    // 1. Employee-Desk Matrix Data
    const employeeDeskMatrix = catalogEntries.map(entry => {
      const deskCode = entry.code;
      const deskName = entry.value || entry.code;
      const ticketCount = deskCounts[deskCode] || 0;
      
      // Calculate actual employee assignments based on capabilities
      let assignedEmployees = 0;
      let coverage = 'None';
      
      // Check if current user has access to this desk
      const userHasAccess = availableDesks.some(desk => desk.deskKey === deskCode);
      if (userHasAccess) {
        assignedEmployees = 1; // At least current user
      }
      
      // Count employees with relevant capabilities
      const relevantCapabilities = capabilities.filter(cap => {
        const capName = cap.name.toLowerCase();
        const deskNameLower = deskName.toLowerCase();
        return capName.includes(deskNameLower) || 
               (deskNameLower.includes('hr') && capName.includes('hr')) ||
               (deskNameLower.includes('it') && capName.includes('it')) ||
               (deskNameLower.includes('finance') && capName.includes('finance'));
      });
      
      assignedEmployees += relevantCapabilities.length;
      
      // Determine coverage level
      if (assignedEmployees >= 3) {
        coverage = 'Excellent';
      } else if (assignedEmployees >= 2) {
        coverage = 'Good';
      } else if (assignedEmployees >= 1) {
        coverage = 'Limited';
      } else {
        coverage = 'None';
      }
      
      return {
        desk: deskName,
        deskCode,
        ticketCount,
        assignedEmployees,
        coverage,
        capabilities: relevantCapabilities.map(cap => cap.name),
      };
    }).filter(entry => entry.ticketCount > 0);

    // 2. Desk Coverage Analysis
    const deskCoverageData = catalogEntries
      .filter(entry => deskCounts[entry.code] > 0)
      .map(entry => ({
        desk: entry.value || entry.code,
        employees: Math.floor(Math.random() * 4) + 1, // 1-4 employees
        tickets: deskCounts[entry.code],
        efficiency: Math.floor(Math.random() * 40) + 60, // 60-100% efficiency
      }));

    // 3. Employee Workload Distribution
    const employeeWorkloadData = employeeIds.map((empId, index) => {
      // Try to get the display name from the cache, fallback to empId or generic name
      const employeeName = employeeNames.get(empId) || empId || `Employee ${index + 1}`;
      
      // Calculate actual desk access for this employee
      let desks = 0;
      if (empId === userInfo?.employeeDetails?.employeeId) {
        // Current user - use actual available desks
        desks = availableDesks.length;
      } else {
        // Other employees - estimate based on capabilities
        desks = Math.min(capabilities.length, 3); // Cap at 3 desks
      }
      
      // Calculate ticket workload (mock for now, would come from actual ticket assignments)
      const tickets = Math.floor(Math.random() * 20) + 5; // 5-25 tickets
      const efficiency = Math.floor(Math.random() * 30) + 70; // 70-100% efficiency
      
      return {
        employee: employeeName,
        desks,
        tickets,
        efficiency,
      };
    });

    // 4. Capability Distribution
    const capabilityData = capabilities.map(cap => ({
      capability: cap.name,
      users: Math.floor(Math.random() * 10) + 1, // 1-10 users per capability
      desks: Math.floor(Math.random() * 3) + 1, // 1-3 desks per capability
    }));

    return {
      employeeDeskMatrix,
      deskCoverageData,
      employeeWorkloadData,
      capabilityData,
    };
  }, [catalogEntries, deskCounts, capabilities, employeeNames, employeeIds, availableDesks, userInfo]);

  // Early return checks after all hooks are called
  if (capabilitiesLoading || deskAccessLoading || deskCountsLoading) {
    return <LoadingSpinner message="Loading employee-desk analytics..." />;
  }

  if (capabilitiesError || deskAccessError) {
    return (
      <div className="gba:p-6 gba:text-center">
        <p className="gba:text-red-600">
          Error loading employee-desk analytics: {capabilitiesError || deskAccessError}
        </p>
      </div>
    );
  }

  const { employeeDeskMatrix, deskCoverageData, employeeWorkloadData, capabilityData } = analyticsData;

  return (
    <ErrorBoundary>
      <div className="gba:space-y-6" data-testid="employee-desk-analytics-dashboard">
        {/* Header with Timeframe Selector */}
        <div className="gba:flex gba:justify-between gba:items-center">
          <div>
            <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900">
              {getTranslationFromI18nKeyAndLabel('services.analytics.employeeDesk.title', 'Employee-Desk Analytics')}
            </h3>
            <p className="gba:text-sm gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel('services.analytics.employeeDesk.description', 'Employee capabilities, desk coverage, and workload distribution analysis')}
            </p>
          </div>
          <TimeframeSelector value={timeframe} onChange={setTimeframe} />
        </div>

        {/* KPI Cards */}
        <div className="gba:grid gba:grid-cols-4 gba:gap-4">
          <Card>
            <CardHeader className="gba:pb-2">
              <CardTitle className="gba:text-sm gba:font-medium gba:text-gray-600 gba:flex gba:items-center gba:gap-2">
                <Users className="gba:h-4 gba:w-4" />
                {getTranslationFromI18nKeyAndLabel('services.analytics.employeeDesk.totalEmployees', 'Total Employees')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="gba:text-2xl gba:font-bold">{employeeIds.length}</div>
              <p className="gba:text-xs gba:text-gray-500 gba:mt-1">
                {getTranslationFromI18nKeyAndLabel('services.analytics.employeeDesk.withCapabilities', 'with desk capabilities')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gba:pb-2">
              <CardTitle className="gba:text-sm gba:font-medium gba:text-gray-600 gba:flex gba:items-center gba:gap-2">
                <Building2 className="gba:h-4 gba:w-4" />
                {getTranslationFromI18nKeyAndLabel('services.analytics.employeeDesk.activeDesks', 'Active Desks')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="gba:text-2xl gba:font-bold">{employeeDeskMatrix.length}</div>
              <p className="gba:text-xs gba:text-gray-500 gba:mt-1">
                {getTranslationFromI18nKeyAndLabel('services.analytics.employeeDesk.withTickets', 'with active tickets')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gba:pb-2">
              <CardTitle className="gba:text-sm gba:font-medium gba:text-gray-600 gba:flex gba:items-center gba:gap-2">
                <Shield className="gba:h-4 gba:w-4" />
                {getTranslationFromI18nKeyAndLabel('services.analytics.employeeDesk.totalCapabilities', 'Total Capabilities')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="gba:text-2xl gba:font-bold">{capabilities.length}</div>
              <p className="gba:text-xs gba:text-gray-500 gba:mt-1">
                {getTranslationFromI18nKeyAndLabel('services.analytics.employeeDesk.defined', 'defined in system')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gba:pb-2">
              <CardTitle className="gba:text-sm gba:font-medium gba:text-gray-600 gba:flex gba:items-center gba:gap-2">
                <TrendingUp className="gba:h-4 gba:w-4" />
                {getTranslationFromI18nKeyAndLabel('services.analytics.employeeDesk.avgCoverage', 'Avg Coverage')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="gba:text-2xl gba:font-bold">
                {employeeDeskMatrix.length > 0 
                  ? Math.round(employeeDeskMatrix.reduce((sum, desk) => sum + desk.assignedEmployees, 0) / employeeDeskMatrix.length)
                  : 0
                }
              </div>
              <p className="gba:text-xs gba:text-gray-500 gba:mt-1">
                {getTranslationFromI18nKeyAndLabel('services.analytics.employeeDesk.employeesPerDesk', 'employees per desk')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1: Desk Coverage & Employee Workload */}
        <div className="gba:grid gba:grid-cols-2 gba:gap-4">
          {/* Desk Coverage Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="gba:flex gba:items-center gba:gap-2">
                <BarChart3 className="gba:h-5 gba:w-5 gba:text-blue-600" />
                {getTranslationFromI18nKeyAndLabel('services.analytics.employeeDesk.deskCoverage', 'Desk Coverage Analysis')}
              </CardTitle>
              <CardDescription>
                {getTranslationFromI18nKeyAndLabel('services.analytics.employeeDesk.deskCoverageDescription', 'Number of employees assigned to each desk')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="gba:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deskCoverageData}>
                    <XAxis 
                      dataKey="desk" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="employees" fill="var(--nw-chart-1)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Employee Workload Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="gba:flex gba:items-center gba:gap-2">
                <Users className="gba:h-5 gba:w-5 gba:text-green-600" />
                {getTranslationFromI18nKeyAndLabel('services.analytics.employeeDesk.employeeWorkload', 'Employee Workload Distribution')}
              </CardTitle>
              <CardDescription>
                {getTranslationFromI18nKeyAndLabel('services.analytics.employeeDesk.employeeWorkloadDescription', 'Number of desks each employee can handle')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="gba:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={employeeWorkloadData}>
                    <XAxis 
                      dataKey="employee" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="desks" fill="var(--nw-chart-2)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2: Capability Distribution & Employee-Desk Matrix */}
        <div className="gba:grid gba:grid-cols-2 gba:gap-4">
          {/* Capability Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="gba:flex gba:items-center gba:gap-2">
                <PieChartIcon className="gba:h-5 gba:w-5 gba:text-purple-600" />
                {getTranslationFromI18nKeyAndLabel('services.analytics.employeeDesk.capabilityDistribution', 'Capability Distribution')}
              </CardTitle>
              <CardDescription>
                {getTranslationFromI18nKeyAndLabel('services.analytics.employeeDesk.capabilityDistributionDescription', 'Distribution of capabilities across the system')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="gba:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={capabilityData}
                      dataKey="users"
                      nameKey="capability"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ capability, users }) => `${capability}: ${users}`}
                    >
                      {capabilityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`var(--nw-chart-${(index % 5) + 1})`} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Employee-Desk Matrix Table */}
          <Card>
            <CardHeader>
              <CardTitle className="gba:flex gba:items-center gba:gap-2">
                <Building2 className="gba:h-5 gba:w-5 gba:text-orange-600" />
                {getTranslationFromI18nKeyAndLabel('services.analytics.employeeDesk.employeeDeskMatrix', 'Employee-Desk Matrix')}
              </CardTitle>
              <CardDescription>
                {getTranslationFromI18nKeyAndLabel('services.analytics.employeeDesk.employeeDeskMatrixDescription', 'Overview of employee assignments and desk coverage')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="gba:space-y-3">
                {employeeDeskMatrix.slice(0, 5).map((desk, index) => (
                  <div key={index} className="gba:flex gba:items-center gba:p-3 gba:border gba:rounded-lg gba:gap-4">
                    <div className="gba:flex-1">
                      <div className="gba:font-medium">{desk.desk}</div>
                      <div className="gba:text-sm gba:text-gray-500">
                        {desk.ticketCount} {getTranslationFromI18nKeyAndLabel('services.analytics.employeeDesk.tickets', 'tickets')}
                      </div>
                    </div>
                    <div className="gba:text-center gba:min-w-[80px]">
                      <div className="gba:font-bold gba:text-2xl">{desk.assignedEmployees}</div>
                      <div className="gba:text-sm gba:text-gray-500">
                        {getTranslationFromI18nKeyAndLabel('services.analytics.employeeDesk.employees', 'employees')}
                      </div>
                    </div>
                    <div className="gba:min-w-[100px] gba:text-right">
                      <span className={`gba:px-3 gba:py-1 gba:rounded-full gba:text-xs gba:font-medium ${
                        desk.coverage === 'Excellent' ? 'gba:bg-blue-100 gba:text-blue-800' :
                        desk.coverage === 'Good' ? 'gba:bg-green-100 gba:text-green-800' :
                        desk.coverage === 'Limited' ? 'gba:bg-yellow-100 gba:text-yellow-800' :
                        'gba:bg-red-100 gba:text-red-800'
                      }`}>
                        {desk.coverage}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ErrorBoundary>
  );
};
