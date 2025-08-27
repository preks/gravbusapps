import React, { useMemo, useEffect, useState } from 'react';
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
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { getOverlapAggregates } from '../../../../utils/getOverlapAggregates';

interface OptimizedAbsenceTrendsProps extends BusinessAppContextProps {
  dashboardData: DashboardData;
  onMonthClick?: (month: string, year?: number) => void;
}

const colorPalette = {
  column: "#3498DB",
  totalLine: "#34495E" 
};

// Tooltip component that receives pre-fetched server metrics
const ServerBackedTooltip: React.FC<any> = ({ active, payload, label, absenceTypes, getTypeColor, monthAggMap }) => {
  if (!(active && payload && payload.length > 0)) return null;
  const monthData = payload[0].payload;
  const serverAgg = monthAggMap?.[String(label)] || null;
  const totalForMonth = (serverAgg?.totalRequests != null) ? serverAgg.totalRequests : (monthData.total || 0);
  const avgReqPerEmp = (serverAgg?.avgRequestsPerEmployee != null) ? serverAgg.avgRequestsPerEmployee : (monthData.trendLine || 0);
  const avgDaysPerReq = (serverAgg?.avgDaysPerRequest != null) ? serverAgg.avgDaysPerRequest : (monthData.avgDurationPerRequest || 0);
  const distinctEmployees = (serverAgg?.distinctEmployees != null) ? serverAgg.distinctEmployees : (monthData.uniqueEmployees || 0);

  return (
    <div className="gba:bg-white gba:p-3 gba:border gba:rounded gba:shadow">
      <p className="gba:font-medium gba:mb-2">{label}</p>
      <p className="gba:text-sm gba:text-gray-600 gba:mb-2">Total: {totalForMonth} absences</p>
      {absenceTypes.map((type: string) => {
        const count = monthData[type] || 0;
        if (count > 0) {
          return (
            <p key={type} className="gba:text-sm gba:flex gba:items-center gba:gap-2">
              <span className="gba:w-3 gba:h-3 gba:rounded gba:inline-block" style={{ backgroundColor: getTypeColor(type) }} />
              {type}: {count}
            </p>
          );
        }
        return null;
      })}
      <div className="gba:text-sm gba:text-gray-500 gba:mt-2 gba:border-t gba:pt-2">
        <p>Avg Requests per Employee: {avgReqPerEmp}</p>
        <p>Avg Duration per Request: {avgDaysPerReq} days</p>
        <p>Unique Employees: {distinctEmployees}</p>
      </div>
    </div>
  );
};

/**
 * 🚀 OPTIMIZED: Absence Trends that uses centralized dashboard data
 * Uses enhanced MonthlyTrendData[] with pre-calculated type breakdowns
 * No separate GraphQL requests - uses data from single dashboard query
 */
const OptimizedAbsenceTrends: React.FC<OptimizedAbsenceTrendsProps> = ({ 
  dashboardData,
  onMonthClick,
  accessToken
}) => {
  const { monthlyData, isLoading, error } = dashboardData;
  const graphQLClient = useGraphQLClient(accessToken);

  // Prefetch server-backed monthly aggregates for every displayed month
  const [monthAggMap, setMonthAggMap] = useState<Record<string, any>>({});
  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      try {
        const tasks = monthlyData.map(async (md: any) => {
          const label = md.month as string; // e.g., "May" or "Dec 2025"
          // Parse month and optional year
          const m = label.match(/^(\w{3})(?:\s(\d{4}))?$/);
          if (!m) return null;
          const short = m[1];
          const year = m[2] ? parseInt(m[2]) : new Date().getUTCFullYear();
          const mapIdx: Record<string, number> = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
          const mi = mapIdx[short];
          if (mi == null) return null;
          const startIso = new Date(Date.UTC(year, mi, 1, 0, 0, 0, 0)).toISOString();
          const endIso = new Date(Date.UTC(year, mi + 1, 0, 23, 59, 59, 999)).toISOString();
          const agg = await getOverlapAggregates(graphQLClient, { startIso, endIso });
          return { label, agg };
        });
        const results = await Promise.all(tasks);
        if (!isMounted) return;
        const map: Record<string, any> = {};
        results.forEach((r) => { if (r && r.agg) map[r.label] = r.agg; });
        setMonthAggMap(map);
      } catch {
        // ignore
      }
    };
    run();
    return () => { isMounted = false; };
  }, [graphQLClient, monthlyData]);

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
          month: monthData.month,
          // Override visible metrics with server-backed ones when available
          total: monthAggMap[monthData.month]?.totalRequests ?? monthData.total,
          uniqueEmployees: monthAggMap[monthData.month]?.distinctEmployees ?? monthData.uniqueEmployees,
          avgRequestsPerEmployee: monthAggMap[monthData.month]?.avgRequestsPerEmployee ?? monthData.avgRequestsPerEmployee,
          avgDurationPerRequest: monthAggMap[monthData.month]?.avgDaysPerRequest ?? monthData.avgDurationPerRequest,
          totalDuration: monthAggMap[monthData.month]?.totalDays ?? monthData.totalDuration
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
  }, [monthlyData, monthAggMap]);

  // Header metrics
  // - Total Absences: match KPI (server aggregate count)
  // - Total Days: distinct effectiveDays across the filter (secondary line)
  const { totalAbsenceRequests, totalAbsenceDays, averagePerMonth } = useMemo(() => {
    const distinctTotalDays = (dashboardData.rawAbsences || []).reduce(
      (sum: number, a: any) => sum + (Number(a.effectiveDays) || 0),
      0
    );
    const nonZeroMonths = chartData.filter(month => month.total > 0).length;
    const avg = nonZeroMonths > 0 ? Math.round(distinctTotalDays / nonZeroMonths) : 0;
    return { 
      totalAbsenceRequests: dashboardData.totalAbsences || 0,
      totalAbsenceDays: distinctTotalDays, 
      averagePerMonth: avg 
    };
  }, [dashboardData.totalAbsences, dashboardData.rawAbsences, chartData]);

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
              {totalAbsenceRequests}
            </div>
            <div className="gba:text-sm gba:text-gray-600">
              Total Absences (Current Filter)
            </div>
            <div className="gba:text-xs gba:text-gray-500">
              Total Days: {totalAbsenceDays}
            </div>
          </div>
          
          <div className="gba:text-left">
            <div className="gba:text-lg gba:font-semibold gba:text-blue-600">
              Avg: {averagePerMonth} days/month
            </div>
            <div className="gba:text-xs gba:text-gray-500">
              Based on {chartData.filter(m => m.total > 0).length} active months
            </div>
            <div className="gba:text-xs gba:text-gray-500">
              Note: Monthly totals are overlap-based. A single request can appear in multiple months.
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
                  
                  // Handle month labels that might include year (e.g., "Dec 2024", "Jan 2025")
                  let monthPart = monthLabel;
                  let yearPart = new Date().getFullYear();
                  
                  // Check if the label includes a year
                  const yearMatch = monthLabel.match(/(\w+)\s+(\d{4})/);
                  if (yearMatch) {
                    monthPart = yearMatch[1]; // Extract month part ("Dec")
                    yearPart = parseInt(yearMatch[2]); // Extract year part (2024)
                  }
                  
                  // Convert short month to full month name
                  const monthMap: Record<string, string> = {
                    'Jan': 'January', 'Feb': 'February', 'Mar': 'March', 'Apr': 'April',
                    'May': 'May', 'Jun': 'June', 'Jul': 'July', 'Aug': 'August',
                    'Sep': 'September', 'Oct': 'October', 'Nov': 'November', 'Dec': 'December'
                  };
                  
                  const fullMonth = monthMap[monthPart] || monthPart;
                  onMonthClick(fullMonth, yearPart);
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
              <Tooltip content={<ServerBackedTooltip absenceTypes={absenceTypes} getTypeColor={getTypeColor} monthAggMap={monthAggMap} data-testid="absence-trends-tooltip" />} />
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