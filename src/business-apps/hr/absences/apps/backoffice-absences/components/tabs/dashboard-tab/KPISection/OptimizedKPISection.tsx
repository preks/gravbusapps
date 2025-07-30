import React from 'react';
import { Card } from "@newwork/nw-design-system";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { RiBarChartLine, RiPieChart2Line, RiBarChart2Line } from "@remixicon/react";
import { BusinessAppContextProps } from '../../../../../../../../../common/BusinessAppContext';
import { DashboardData } from '../../../../types';
import { WidgetGroup, WidgetItem } from '../../../../../../../../../components/widget-group';
import { PiUsers, PiClock, PiCalendar, PiPercent } from 'react-icons/pi';

interface OptimizedKPISectionProps extends BusinessAppContextProps {
  dashboardData: DashboardData;
}

/**
 * 🚀 OPTIMIZED: Comprehensive KPI Section with all visualizations
 * Uses centralized dashboard data with pre-calculated aggregations
 * No separate GraphQL requests - single efficient data source
 */
export const OptimizedKPISection: React.FC<OptimizedKPISectionProps> = ({ 
  dashboardData 
}) => {
  const {
    totalAbsences,
    pendingAbsences,
    averageDuration,
    approvalRate,
    departmentStats,
    statusBreakdown,
    entitlements,
    isLoading,
    error
  } = dashboardData;

  // Color palettes for consistency with original KPISection
  const statusColors: {[key: string]: string} = {
    'PENDING': '#fbbf24',   
    'APPROVED': '#52c41a',
    'REJECTED': '#f87171'   
  };
  
  const colorPalette = [
    "#fb7185",
    "#34d399", 
    "#a78bfa",
    "#38bdf8",
    "#fbbf24",
    "#8b5cf6",
  ];

  // Transform data for visualizations
  const departmentChartData = departmentStats.map(dept => ({
    department: dept.name.length > 15 ? `${dept.name.substring(0, 15)}...` : dept.name,
    fullName: dept.name,
    absences: dept.totalDays,
    uniqueEmployees: dept.uniqueEmployees,
    avgDaysPerEmployee: dept.avgDaysPerEmployee,
    avgRequestsPerEmployee: dept.avgRequestsPerEmployee,
    totalRequests: dept.totalRequests
  }));

  const pieChartData = statusBreakdown.map((status, index) => ({
    name: status.status,
    value: status.totalDays,
    status: status.status,
    count: status.count,
    percentage: status.percentage
  }));

  // Enhanced KPI widgets with all metrics
  const widgets: WidgetItem[] = [
    {
      key: 'total-absences',
      title: 'Total Absences',
      value: totalAbsences,
      prefix: <PiUsers />,
      color: '#1890ff',
      description: 'All absences this year',
      span: { xs: 24, sm: 12, lg: 6 }
    },
    {
      key: 'average-duration',
      title: 'Avg Duration',
      value: averageDuration,
      suffix: 'days',
      precision: 1,
      prefix: <PiCalendar />,
      color: '#52c41a',
      description: 'Average absence length',
      span: { xs: 24, sm: 12, lg: 6 }
    },
    {
      key: 'approval-rate',
      title: 'Approval Rate',
      value: approvalRate,
      suffix: '%',
      prefix: <PiPercent />,
      color: '#722ed1',
      description: 'Approved vs total requests',
      span: { xs: 24, sm: 12, lg: 6 }
    },
    {
      key: 'pending-review',
      title: 'Pending Review',
      value: pendingAbsences,
      prefix: <PiClock />,
      color: '#fa8c16',
      description: 'Awaiting approval',
      span: { xs: 24, sm: 12, lg: 6 }
    }
  ];

  const totalAbsenceDays = pieChartData.reduce((sum, entry) => sum + entry.value, 0);

  if (isLoading) {
    return (
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4" data-testid="optimized-kpi-section-loading">
        <div>Loading KPI widgets...</div>
        <div>Loading department chart...</div>
        <div>Loading pie chart...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gba:text-red-600 gba:p-4" data-testid="optimized-kpi-section-error">
        Error loading KPI data: {error}
      </div>
    );
  }

  return (
    <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4" data-testid="optimized-kpi-section-container">
      
      {/* Enhanced KPI Widgets */}
      <div className="gba:col-span-full" data-testid="kpi-widgets">
        <WidgetGroup
          widgets={widgets}
          isLoading={isLoading}
          error={error}
          skeletonCount={4}
          emptyText="No KPI data available."
          data-testid="optimized-kpi-widgets"
        />
      </div>

      {/* Department Absences Bar Chart */}
      <Card className="gba:hover:shadow-md gba:transition-shadow gba:p-4" data-testid="department-chart-card">
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
          <RiBarChartLine className="gba:text-blue-600" size={20} />
          <div>
            <h5 className="gba:text-sm gba:font-medium gba:m-0">Top Departments</h5>
            <p className="gba:text-xs gba:text-muted-foreground">
              Absence days by department (with avg per employee)
            </p>
          </div>
        </div>
        <div className="gba:h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={departmentChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="department" 
                angle={-45} 
                textAnchor="end" 
                height={80}
                fontSize={12}
              />
              <YAxis fontSize={12} />
              <RechartsTooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    const data = payload[0].payload;
                    return (
                      <div className="gba:bg-white gba:p-3 gba:border gba:rounded gba:shadow gba:min-w-[200px]">
                        <p className="gba:font-medium gba:mb-2">{data.fullName}</p>
                        <div className="gba:space-y-1 gba:text-sm">
                          <p className="gba:text-blue-600">
                            📊 {data.absences} total absence days
                          </p>
                          <p className="gba:text-purple-600">
                            👥 {data.uniqueEmployees} employees
                          </p>
                          <p className="gba:text-green-600">
                            📈 {data.avgDaysPerEmployee} avg days/employee
                          </p>
                          <p className="gba:text-orange-600">
                            📋 {data.avgRequestsPerEmployee} avg requests/employee
                          </p>
                          <p className="gba:text-gray-600 gba:text-xs gba:mt-2">
                            Total: {data.totalRequests} requests
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="absences" fill="#3498db" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Status Breakdown Pie Chart */}
      <Card className="gba:hover:shadow-md gba:transition-shadow gba:p-4" data-testid="status-pie-chart-card">
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
          <RiPieChart2Line className="gba:text-green-600" size={20} />
          <div>
            <h5 className="gba:text-sm gba:font-medium gba:m-0">Status Breakdown</h5>
            <p className="gba:text-xs gba:text-muted-foreground">
              Absence approval status
            </p>
          </div>
        </div>
        <div className="gba:h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieChartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={70}
              >
                {pieChartData.map((entry, index) => (
                  <Cell 
                    key={index} 
                    fill={statusColors[entry.status] || '#94a3b8'} 
                  />
                ))}
              </Pie>
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    const entry = payload[0].payload;
                    const percent = totalAbsenceDays > 0 
                      ? Math.round((entry.value / totalAbsenceDays) * 100) 
                      : 0;
                    
                    return (
                      <div className="gba:bg-white gba:p-3 gba:border gba:rounded gba:shadow">
                        <p className="gba:font-medium">{entry.name}</p>
                        <p>Count: {entry.count} absences</p>
                        <p>Days: {entry.value} total days</p>
                        <p>Share: {percent}% of total</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="gba:flex gba:flex-wrap gba:gap-3 gba:mt-2 gba:justify-center">
          {pieChartData.map((entry) => {
            const percent = totalAbsenceDays > 0
              ? Math.round((Number(entry.value) / totalAbsenceDays) * 100)
              : 0;
            return (
              <span
                key={entry.name}
                className="gba:flex gba:items-center gba:gap-2"
              >
                <span
                  className="gba:w-3 gba:h-3 gba:rounded gba:inline-block"
                  style={{ backgroundColor: statusColors[entry.status] || '#94a3b8' }}
                />
                <span className="gba:text-xs">
                  {entry.name}: {percent}%
                </span>
              </span>
            );
          })}
        </div>
      </Card>

      {/* 🏖️ Vacation Entitlements Analytics Card */}
      <Card className="gba:hover:shadow-md gba:transition-shadow gba:p-4" data-testid="entitlements-card">
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
          <RiBarChart2Line className="gba:text-purple-600" size={20} />
          <div>
            <h5 className="gba:text-sm gba:font-medium gba:m-0">Vacation Entitlements Analytics</h5>
            <p className="gba:text-xs gba:text-muted-foreground">
              Current year vacation data from {entitlements.totalActiveEmployees} active employees
            </p>
          </div>
        </div>
        
        <div className="gba:space-y-3">
          {/* Key Metrics */}
          <div className="gba:grid gba:grid-cols-2 gba:gap-3 gba:mb-4">
            <div className="gba:text-center gba:p-2 gba:bg-blue-50 gba:rounded">
              <div className="gba:text-lg gba:font-bold gba:text-blue-600">
                {entitlements.averageVacationPerEmployee}
              </div>
              <div className="gba:text-xs gba:text-gray-600">Avg Vacation Days</div>
            </div>
            <div className="gba:text-center gba:p-2 gba:bg-green-50 gba:rounded">
              <div className="gba:text-lg gba:font-bold gba:text-green-600">
                {entitlements.totalActiveEmployees}
              </div>
              <div className="gba:text-xs gba:text-gray-600">Active Employees</div>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="gba:flex gba:justify-between gba:items-center">
            <span className="gba:text-sm gba:text-gray-600">Avg Available per Employee</span>
            <span className="gba:font-medium gba:text-blue-600">{entitlements.averageAvailable} days</span>
          </div>
          
          <div className="gba:flex gba:justify-between gba:items-center">
            <span className="gba:text-sm gba:text-gray-600">Avg Used per Employee</span>
            <span className="gba:font-medium gba:text-orange-600">{entitlements.averageUsed} days</span>
          </div>
          
          <div className="gba:flex gba:justify-between gba:items-center">
            <span className="gba:text-sm gba:text-gray-600">Total Vacation Entitlement</span>
            <span className="gba:font-medium gba:text-purple-600">{entitlements.averageVacationPerEmployee} days</span>
          </div>

          {/* Real data indicator */}
          <div className="gba:text-xs gba:text-center gba:text-gray-500 gba:border-t gba:pt-2">
            ✅ Real vacation data from active employees (current year only)
          </div>
        </div>
      </Card>

      {/* 📊 Vacation Liability & Impact Card */}
      <Card className="gba:hover:shadow-md gba:transition-shadow gba:p-4" data-testid="vacation-liability-card">
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
          <div className="gba:text-orange-600 gba:text-lg">📊</div>
          <div>
            <h5 className="gba:text-sm gba:font-medium gba:m-0">Vacation Liability & Financial Impact</h5>
            <p className="gba:text-xs gba:text-muted-foreground">
              Outstanding vacation days and financial implications
            </p>
          </div>
        </div>
        
        <div className="gba:space-y-4">
          {/* Top metrics grid */}
          <div className="gba:grid gba:grid-cols-2 gba:gap-3">
            <div className="gba:text-center gba:p-3 gba:bg-red-50 gba:rounded">
              <div className="gba:text-xl gba:font-bold gba:text-red-600">
                {(entitlements.averageAvailable * entitlements.totalActiveEmployees).toFixed(0)}
              </div>
              <div className="gba:text-xs gba:text-gray-600">Remaining Days Total</div>
            </div>
            <div className="gba:text-center gba:p-3 gba:bg-amber-50 gba:rounded">
              <div className="gba:text-xl gba:font-bold gba:text-amber-600">
                TBD
              </div>
              <div className="gba:text-xs gba:text-gray-600">Financial Impact</div>
            </div>
          </div>

          {/* Detailed breakdown */}
          <div className="gba:space-y-2">
            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:text-gray-600">Avg Remaining per Employee</span>
              <span className="gba:font-medium gba:text-red-600">{entitlements.averageAvailable} days</span>
            </div>
            
            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:text-gray-600">Total Active Employees</span>
              <span className="gba:font-medium gba:text-blue-600">{entitlements.totalActiveEmployees}</span>
            </div>
            
            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:text-gray-600">Estimated Cost per Day</span>
              <span className="gba:font-medium gba:text-amber-600">TBD</span>
            </div>
            
            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:text-gray-600">Total Liability Estimate</span>
              <span className="gba:font-medium gba:text-amber-600">TBD</span>
            </div>
          </div>

          {/* Calculation note */}
          <div className="gba:bg-amber-50 gba:border gba:border-amber-200 gba:rounded gba:p-3">
            <div className="gba:text-xs gba:text-amber-800">
              💰 Financial calculations coming soon - will include average salary costs and vacation liability estimates
            </div>
          </div>
        </div>
      </Card>

    </div>
  );
}; 