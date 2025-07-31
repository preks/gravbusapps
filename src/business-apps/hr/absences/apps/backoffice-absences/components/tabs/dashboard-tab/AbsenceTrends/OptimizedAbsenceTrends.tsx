import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { BusinessAppContextProps } from '../../../../../../../../../common/BusinessAppContext';
import { DashboardData } from '../../../../types';

interface OptimizedAbsenceTrendsProps extends BusinessAppContextProps {
  dashboardData: DashboardData;
  onMonthClick?: (month: string, year?: number) => void;
}

const colorPalette = {
  column: "#3498DB",
  totalLine: "#34495E" 
};

/**
 * 🚀 OPTIMIZED: Absence Trends that uses centralized dashboard data
 * Uses enhanced MonthlyTrendData[] with pre-calculated type breakdowns
 * No separate GraphQL requests - uses data from single dashboard query
 */
const OptimizedAbsenceTrends: React.FC<OptimizedAbsenceTrendsProps> = ({ 
  dashboardData,
  onMonthClick
}) => {
  const { monthlyData, isLoading, error } = dashboardData;

      // Transform enhanced monthly trends into chart data
    const chartData = useMemo(() => {
      // First get all unique absence types to ensure consistent ordering
      const allTypes = new Set<string>();
      monthlyData.forEach((monthData: any) => {
        Object.keys(monthData.typeBreakdown).forEach(type => {
          if (type !== 'Unknown' && type.trim() !== '') {
            allTypes.add(type);
          }
        });
      });
    
    // Define the desired order
    const desiredOrder = ['Vacation', 'Sick Leave', 'Special Leave', 'Work Leave'];
    const orderedTypes: string[] = [];
    
    // Add types in the desired order if they exist in the data
    desiredOrder.forEach(type => {
      if (allTypes.has(type)) {
        orderedTypes.push(type);
      }
    });
    
    // Add any remaining types not in the desired order
    allTypes.forEach(type => {
      if (!orderedTypes.includes(type)) {
        orderedTypes.push(type);
      }
    });

          // Convert MonthlyTrendData[] to chart format with consistent ordering
      const chartItems = monthlyData.map((monthData: any) => {
        // ✅ FIX: Use full month name (includes year when multiple years exist)
        // Don't truncate - monthData.month is already properly formatted
        
        // Create chart item with month and all absence types in the correct order
        const chartItem: any = {
          month: monthData.month, // Use full month name: "Dec 2024", "Dec 2025", etc.
          total: monthData.total,
          // PRESERVE THE NEW FIELDS HERE!
          uniqueEmployees: monthData.uniqueEmployees,
          avgRequestsPerEmployee: monthData.avgRequestsPerEmployee,
          avgDurationPerRequest: monthData.avgDurationPerRequest,
          totalDuration: monthData.totalDuration
        };
        
        // Add each absence type in the desired order (0 if not present)
        orderedTypes.forEach(type => {
          chartItem[type] = monthData.typeBreakdown[type] || 0;
        });
        

        
        return chartItem;
      });

    // Calculate trend line as average requests per employee for EACH month
    const trendData = chartItems.map((item) => {
      // Use the pre-calculated average requests per employee from dashboard data
      const avgPerEmployee = item.avgRequestsPerEmployee || 0;
      
      return {
        ...item,
        trendLine: avgPerEmployee, // Already rounded in dashboard data
        avgDurationPerRequest: item.avgDurationPerRequest || 0,
        uniqueEmployees: item.uniqueEmployees || 0
      };
    });

    return trendData;
  }, [monthlyData]);

  // Calculate totals for header display
  const { totalAbsenceDays, averagePerMonth } = useMemo(() => {
    const total = chartData.reduce((sum, month) => sum + (month.total || 0), 0);
    const nonZeroMonths = chartData.filter(month => month.total > 0).length;
    const avg = nonZeroMonths > 0 ? Math.round(total / nonZeroMonths) : 0;
    
    return {
      totalAbsenceDays: total,
      averagePerMonth: avg
    };
  }, [chartData]);

  // Get absence types in the correct order from chart data
  const absenceTypes = useMemo(() => {
    if (chartData.length === 0) return [];
    
    // Extract absence type keys from the first chart item (excluding month, total, trendLine, and raw data fields)
    const firstItem = chartData[0];
    const types = Object.keys(firstItem).filter(key => 
      key !== 'month' && 
      key !== 'total' && 
      key !== 'trendLine' &&
      key !== 'uniqueEmployees' &&
      key !== 'avgRequestsPerEmployee' &&
      key !== 'avgDurationPerRequest' &&
      key !== 'totalDuration'
    );
    
         return types;
  }, [chartData]);

  // Generate colors using the exact same mapping as AbsenceList component
  const getTypeColor = (typeName: string) => {
    // EXACT same colors as used in AbsenceList component
    const groupColors: Record<string, string> = {
      'Sick Leave': '#f87171',   // Red (from AbsenceList)
      'Vacation': '#10b981',     // Green (from AbsenceList)
      'Special Leave': '#8b5cf6', // Purple (from AbsenceList)
      'Work Leave': '#f59e0b',   // Orange (from AbsenceList)
    };
    
    // Return specific color if mapped, otherwise use gray fallback
    return groupColors[typeName] || '#6b7280';
  };

  if (isLoading) {
    return (
      <Card data-testid="optimized-absence-trends-loading">
        <CardHeader>
          <CardTitle>Absence Trends (Optimized)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
            <div className="gba:text-gray-500">Loading optimized trends data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card data-testid="optimized-absence-trends-error">
        <CardHeader>
          <CardTitle>Absence Trends (Optimized)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:text-red-500 gba:text-center gba:py-8">
            Error loading trends: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="optimized-absence-trends-container">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <span>Absence Trends</span>
        </CardTitle>
        
        {/* Header with totals - LEFT ALIGNED */}
        <div className="gba:flex gba:flex-col gba:items-start gba:gap-4 gba:mt-4">
          <div>
            <div className="gba:text-3xl gba:font-bold gba:text-gray-900">
              {totalAbsenceDays}
            </div>
            <div className="gba:text-sm gba:text-gray-600">
              Total Absence Days (Last 12 Months)
            </div>
          </div>
          
          <div className="gba:text-left">
            <div className="gba:text-lg gba:font-semibold gba:text-blue-600">
              Avg: {averagePerMonth} days/month
            </div>
            <div className="gba:text-xs gba:text-gray-500">
              Based on {chartData.filter(m => m.total > 0).length} active months
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div style={{ width: '100%', height: 400, cursor: 'pointer' }}>
          <ResponsiveContainer>
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              onClick={(data) => {
                if (data && data.activeLabel && onMonthClick) {
                  const monthLabel = data.activeLabel as string;
                  // Convert short month back to full month name
                  const monthMap: Record<string, string> = {
                    'Jan': 'January', 'Feb': 'February', 'Mar': 'March', 'Apr': 'April',
                    'May': 'May', 'Jun': 'June', 'Jul': 'July', 'Aug': 'August',
                    'Sep': 'September', 'Oct': 'October', 'Nov': 'November', 'Dec': 'December'
                  };
                  const fullMonth = monthMap[monthLabel] || monthLabel;
                  onMonthClick(fullMonth, new Date().getFullYear());
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length > 0) {
                    const monthData = payload[0].payload;
                    const totalForMonth = monthData.total || 0;
                    
                    return (
                      <div className="gba:bg-white gba:p-3 gba:border gba:rounded gba:shadow">
                        <p className="gba:font-medium gba:mb-2">{label}</p>
                        <p className="gba:text-sm gba:text-gray-600 gba:mb-2">
                          Total: {totalForMonth} absences
                        </p>
                        {absenceTypes.map((type) => {
                          const count = monthData[type] || 0;
                          if (count > 0) {
                            return (
                              <p key={type} className="gba:text-sm gba:flex gba:items-center gba:gap-2">
                                <span 
                                  className="gba:w-3 gba:h-3 gba:rounded gba:inline-block"
                                  style={{ backgroundColor: getTypeColor(type) }}
                                />
                                {type}: {count}
                              </p>
                            );
                          }
                          return null;
                        })}
                        {payload.find(p => p.dataKey === 'trendLine') && (
                          <div className="gba:text-sm gba:text-gray-500 gba:mt-2 gba:border-t gba:pt-2">
                            <p>Avg Requests per Employee: {monthData.trendLine}</p>
                            <p>Avg Duration per Request: {monthData.avgDurationPerRequest} days</p>
                            <p>Unique Employees: {monthData.uniqueEmployees}</p>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend 
                content={() => {
                  return (
                    <div className="gba:flex gba:flex-wrap gba:justify-center gba:gap-4 gba:mt-4">
                      {absenceTypes.map((type) => (
                        <div key={type} className="gba:flex gba:items-center gba:gap-2">
                          <span 
                            className="gba:w-3 gba:h-3 gba:rounded" 
                            style={{ backgroundColor: getTypeColor(type) }}
                          />
                          <span className="gba:text-sm">{type}</span>
                        </div>
                      ))}
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <span 
                          className="gba:w-3 gba:h-3 gba:rounded" 
                          style={{ backgroundColor: colorPalette.totalLine }}
                        />
                        <span className="gba:text-sm">Trend Line (avg requests per employee)</span>
                      </div>
                    </div>
                  );
                }}
              />
              
              {/* Individual absence type bars (stacked) - CORRECT ORDER FOR STACKING */}
              {/* Render in exact order for proper stacking: bottom to top */}
              <Bar
                dataKey="Vacation"
                stackId="types"
                fill={getTypeColor("Vacation")}
                name="Vacation"
              />
              <Bar
                dataKey="Sick Leave"
                stackId="types"
                fill={getTypeColor("Sick Leave")}
                name="Sick Leave"
              />
              <Bar
                dataKey="Special Leave"
                stackId="types"
                fill={getTypeColor("Special Leave")}
                name="Special Leave"
              />
              <Bar
                dataKey="Work Leave"
                stackId="types"
                fill={getTypeColor("Work Leave")}
                name="Work Leave"
              />
              
              {/* Trend line - ADDED */}
              <Line 
                type="monotone"
                dataKey="trendLine"
                stroke={colorPalette.totalLine}
                strokeWidth={3}
                dot={{ fill: colorPalette.totalLine, strokeWidth: 2, r: 4 }}
                name="Trend Line (avg requests per employee)"
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        {/* Enhanced summary info */}
        <div className="gba:mt-6 gba:space-y-3">
          <div className="gba:flex gba:flex-wrap gba:gap-4 gba:text-sm">
            <div>
              🎯 Peak month: {chartData.reduce((max, month) => month.total > max.total ? month : max, chartData[0] || {}).month || 'N/A'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OptimizedAbsenceTrends; 