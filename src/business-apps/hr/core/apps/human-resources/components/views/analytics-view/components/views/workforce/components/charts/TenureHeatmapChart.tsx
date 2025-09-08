import React, { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  IconAvatar,
} from "@newwork/nw-design-system";
import { ClockIcon } from "@phosphor-icons/react";
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { TenureDistributionItem, TenureRange, OrganizationalUnit } from '../../../../../hooks/useTenureByOrgUnit';

interface TenureHeatmapChartProps {
  data: TenureDistributionItem[];
  orgUnits: OrganizationalUnit[];
  tenureRanges: TenureRange[];
  loading?: boolean;
  error?: Error | null;
  moduleColor?: string;
}

/**
 * Tenure distribution heatmap chart component
 * 
 * Displays a heatmap showing employee tenure distribution across business units
 */
const TenureHeatmapChart: React.FC<TenureHeatmapChartProps> = ({ 
  data, 
  orgUnits, 
  tenureRanges, 
  loading = false, 
  error = null,
  moduleColor = "default" 
}) => {
  // Sort tenure ranges by their minMonths property
  const sortedTenureRanges = useMemo(() => {
    return [...tenureRanges].sort((a, b) => a.minMonths - b.minMonths);
  }, [tenureRanges]);

  // Sort org units alphabetically
  const sortedOrgUnits = useMemo(() => {
    return [...orgUnits].sort((a, b) => a.name.localeCompare(b.name));
  }, [orgUnits]);

  // Calculate statistics and prepare heatmap data
  const { maxCount, totalEmployees, avgPerCell, heatmapData } = useMemo(() => {
    const max = Math.max(...data.map(item => item.count));
    const total = data.reduce((sum, item) => sum + item.count, 0);
    const cellCount = sortedOrgUnits.length * sortedTenureRanges.length;
    const avg = total / Math.max(1, cellCount);

    // Create a lookup map for efficient data access
    const dataMap = new Map<string, number>();
    data.forEach(item => {
      const key = `${item.orgUnitId}-${item.tenureRangeId}`;
      dataMap.set(key, item.count);
    });

    return {
      maxCount: max,
      totalEmployees: total,
      avgPerCell: avg,
      heatmapData: dataMap
    };
  }, [data, sortedOrgUnits.length, sortedTenureRanges.length]);

  // Helper functions for heatmap rendering
  const getIntensity = (count: number) => {
    if (count === 0) return 0;
    return Math.min(1, count / Math.max(1, maxCount));
  };

  const getHeatmapColor = (intensity: number) => {
    if (intensity === 0) return "#F3F4F6";
    const alpha = Math.max(0.1, intensity);
    return `rgba(34, 197, 94, ${alpha})`; // Green color scheme for tenure
  };

  const getEmployeeCountForCell = (orgUnitId: string, tenureRangeId: string) => {
    const key = `${orgUnitId}-${tenureRangeId}`;
    return heatmapData.get(key) || 0;
  };

  if (loading) {
    return (
      <Card data-testid="tenure-heatmap-loading">
        <CardHeader className="gba:flex gba:items-center gba:gap-3">
          <IconAvatar
            icon={ClockIcon}
            variant={moduleColor as any}
            size="md"
            iconWeight="regular"
            decorative={true}
          />
          <div>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                'hr_analytics_tenure_distribution_by_organizational_unit', 
                'Tenure Distribution by Organizational Unit'
              )}
            </CardTitle>
            <CardDescription>
              {getTranslationFromI18nKeyAndLabel('hr_analytics_loading', 'Loading...')}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:items-center gba:justify-center gba:h-64">
            <div className="gba:animate-pulse gba:text-gray-500">
              {getTranslationFromI18nKeyAndLabel('hr_analytics_loading_tenure_data', 'Loading tenure data...')}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card data-testid="tenure-heatmap-error">
        <CardHeader className="gba:flex gba:items-center gba:gap-3">
          <IconAvatar
            icon={ClockIcon}
            variant="destructive"
            size="md"
            iconWeight="regular"
            decorative={true}
          />
          <div>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                'hr_analytics_tenure_distribution_by_organizational_unit', 
                'Tenure Distribution by Organizational Unit'
              )}
            </CardTitle>
            <CardDescription>
              {getTranslationFromI18nKeyAndLabel('hr_analytics_error', 'Error loading data')}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-64 gba:text-red-500">
            <p>{getTranslationFromI18nKeyAndLabel('hr_analytics_error_loading_tenure_data', 'Error loading tenure data')}</p>
            <p className="gba:text-sm gba:mt-2">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="tenure-heatmap-chart">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar
          icon={ClockIcon}
          variant={moduleColor as any}
          size="md"
          iconWeight="regular"
          decorative={true}
        />
        <div>
          <CardTitle>
            {getTranslationFromI18nKeyAndLabel(
              'hr_analytics_tenure_distribution_by_organizational_unit', 
              'Tenure Distribution by Organizational Unit'
            )}
          </CardTitle>
          <CardDescription>
            {getTranslationFromI18nKeyAndLabel(
              'hr_analytics_tenure_chart_description', 
              'Employee distribution across tenure ranges by organizational unit'
            )}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="gba:space-y-6">
          {/* Statistics Summary */}
          <div className="gba:grid gba:grid-cols-3 gba:gap-4 gba:text-sm gba:bg-gray-50 gba:p-4 gba:rounded-lg">
            <div className="gba:text-center">
              <div className="gba:font-bold gba:text-lg gba:text-gray-900">
                {totalEmployees}
              </div>
              <div className="gba:text-gray-600">
                {getTranslationFromI18nKeyAndLabel('hr_analytics_total_employees', 'Total Employees')}
              </div>
            </div>
            <div className="gba:text-center">
              <div className="gba:font-bold gba:text-lg gba:text-gray-900">
                {avgPerCell.toFixed(1)}
              </div>
              <div className="gba:text-gray-600">
                {getTranslationFromI18nKeyAndLabel('hr_analytics_avg_per_cell', 'Avg per Cell')}
              </div>
            </div>
            <div className="gba:text-center">
              <div className="gba:font-bold gba:text-lg gba:text-gray-900">
                {maxCount}
              </div>
              <div className="gba:text-gray-600">
                {getTranslationFromI18nKeyAndLabel('hr_analytics_max_in_cell', 'Max in Cell')}
              </div>
            </div>
          </div>

          {/* Heatmap Grid - Transposed: Org Units on X-axis, Tenure Ranges on Y-axis */}
          <div className="gba:overflow-x-auto gba:pt-4">
            <div className="gba:inline-block gba:min-w-full">
              {/* Header with organizational units */}
              <div 
                className="gba:grid gba:gap-1 gba:mb-2"
                style={{ 
                  gridTemplateColumns: `120px repeat(${sortedOrgUnits.length}, 100px)` 
                }}
              >
                <div className="gba:w-30"></div>
                {sortedOrgUnits.map((orgUnit) => (
                  <div 
                    key={orgUnit.id} 
                    className="gba:text-xs gba:text-gray-700 gba:text-center gba:font-medium gba:p-1 gba:truncate"
                    title={orgUnit.name}
                  >
                    {orgUnit.name}
                  </div>
                ))}
              </div>
              
              {/* Data rows - now iterating through tenure ranges */}
              {sortedTenureRanges.map((tenureRange) => (
                <div 
                  key={tenureRange.id} 
                  className="gba:grid gba:gap-1 gba:mb-1"
                  style={{ 
                    gridTemplateColumns: `120px repeat(${sortedOrgUnits.length}, 100px)` 
                  }}
                >
                  <div className="gba:text-xs gba:text-gray-700 gba:text-right gba:pr-2 gba:py-2 gba:font-medium gba:truncate">
                    {tenureRange.label}
                  </div>
                  {sortedOrgUnits.map((orgUnit) => {
                    const count = getEmployeeCountForCell(orgUnit.id, tenureRange.id);
                    const intensity = getIntensity(count);
                    return (
                      <div
                        key={`${tenureRange.id}-${orgUnit.id}`}
                        className="gba:w-24 gba:h-16 gba:rounded-md gba:border gba:border-gray-200 gba:relative gba:group gba:cursor-pointer gba:flex gba:items-center gba:justify-center gba:text-sm gba:font-medium gba:transition-all gba:duration-200 hover:gba:scale-105"
                        style={{ backgroundColor: getHeatmapColor(intensity) }}
                        title={`${tenureRange.label} - ${orgUnit.name}: ${count} employees`}
                        data-testid={`heatmap-cell-${tenureRange.id}-${orgUnit.id}`}
                      >
                        <span className={`gba:text-sm gba:font-bold ${intensity > 0.5 ? 'gba:text-white' : 'gba:text-gray-800'}`}>
                          {count > 0 ? count : ''}
                        </span>
                        <div className="gba:absolute gba:bottom-full gba:left-1/2 gba:transform gba:-translate-x-1/2 gba:mb-2 gba:px-3 gba:py-2 gba:bg-gray-900 gba:text-white gba:text-xs gba:rounded gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity gba:pointer-events-none gba:whitespace-nowrap gba:z-50">
                          <div className="gba:font-semibold">{tenureRange.label}</div>
                          <div>{orgUnit.name}</div>
                          <div>{count} {getTranslationFromI18nKeyAndLabel('hr_analytics_employees', 'employees')}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="gba:flex gba:items-center gba:justify-center gba:space-x-4 gba:text-xs gba:text-gray-600">
            <span>{getTranslationFromI18nKeyAndLabel('hr_analytics_fewer', 'Fewer')}</span>
            <div className="gba:flex gba:space-x-1">
              {[0, 0.2, 0.4, 0.6, 0.8, 1].map((intensity) => (
                <div 
                  key={intensity} 
                  className="gba:w-4 gba:h-4 gba:rounded-sm gba:border gba:border-gray-200" 
                  style={{ backgroundColor: getHeatmapColor(intensity) }} 
                />
              ))}
            </div>
            <span>{getTranslationFromI18nKeyAndLabel('hr_analytics_more', 'More')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TenureHeatmapChart;
