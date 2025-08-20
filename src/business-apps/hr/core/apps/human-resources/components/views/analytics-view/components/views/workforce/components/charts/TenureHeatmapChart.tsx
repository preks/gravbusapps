import React from 'react';
import { Card, Alert, Spinner, Badge } from '@newwork/nw-design-system';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

interface TenureDistributionItem {
  orgUnitId: string;
  orgUnitName: string;
  tenureRangeId: string;
  count: number;
}

interface TenureRange {
  id: string;
  label: string;
  minMonths: number;
  maxMonths: number;
}

interface OrganizationalUnit {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
}

interface TenureHeatmapChartProps {
  data: TenureDistributionItem[];
  orgUnits: OrganizationalUnit[];
  tenureRanges: TenureRange[];
  loading?: boolean;
  error?: string | null;
}

interface MatrixCell {
  orgUnitId: string;
  orgUnitName: string;
  tenureRangeId: string;
  tenureRangeLabel: string;
  count: number;
  color: string;
  intensity: number;
}

const TenureHeatmapChart: React.FC<TenureHeatmapChartProps> = ({
  data,
  orgUnits,
  tenureRanges,
  loading = false,
  error = null
}) => {
  const prefixDataTestId = 'TenureHeatmapChart';

  // Generate color based on intensity (0-1 scale)
  const getHeatmapColor = (intensity: number): string => {
    if (intensity === 0) return '#dbeafe'; // Light blue for zero
    
    // Smooth gradient from blue (min) to orange (max)
    const blue = { r: 219, g: 234, b: 254 }; // Light blue
    const orange = { r: 249, g: 115, b: 22 }; // Orange
    
    // Interpolate between blue and orange
    const r = Math.round(blue.r + (orange.r - blue.r) * intensity);
    const g = Math.round(blue.g + (orange.g - blue.g) * intensity);
    const b = Math.round(blue.b + (orange.b - blue.b) * intensity);
    
    return `rgb(${r}, ${g}, ${b})`;
  };

  // Create matrix data structure
  const createMatrixData = (): MatrixCell[][] => {
    if (!data.length || !orgUnits.length || !tenureRanges.length) return [];

    // Find max count for intensity calculation
    const maxCount = Math.max(...data.map(item => item.count));
    
    // Create a map for quick lookup
    const dataMap = new Map<string, number>();
    data.forEach(item => {
      const key = `${item.orgUnitId}-${item.tenureRangeId}`;
      dataMap.set(key, item.count);
    });

    // Create matrix: rows = tenure ranges, columns = org units (TRANSPOSED)
    const matrix: MatrixCell[][] = [];
    
    // Sort org units by name for consistent display
    const sortedOrgUnits = [...orgUnits].sort((a, b) => a.name.localeCompare(b.name));
    
    // Sort tenure ranges by minMonths for logical progression
    const sortedTenureRanges = [...tenureRanges].sort((a, b) => a.minMonths - b.minMonths);

    // Now iterate by tenure ranges first (rows), then org units (columns)
    sortedTenureRanges.forEach(tenureRange => {
      const row: MatrixCell[] = [];
      
      sortedOrgUnits.forEach(orgUnit => {
        const key = `${orgUnit.id}-${tenureRange.id}`;
        const count = dataMap.get(key) || 0;
        const intensity = maxCount > 0 ? count / maxCount : 0;
        
        row.push({
          orgUnitId: orgUnit.id,
          orgUnitName: orgUnit.name,
          tenureRangeId: tenureRange.id,
          tenureRangeLabel: tenureRange.label,
          count,
          color: getHeatmapColor(intensity),
          intensity
        });
      });
      
      matrix.push(row);
    });

    return matrix;
  };

  if (loading) {
    return (
      <Card className="gba:w-full gba:p-6 gba:shadow-sm" data-testid={`${prefixDataTestId}-loading`}>
        <div className="gba:mb-4">
          <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
            <h3 className="gba:text-lg gba:font-semibold gba:text-gray-800 gba:m-0">
              {getTranslationFromI18nKeyAndLabel('hr_analytics_tenure_heatmap', 'Tenure Distribution by Organizational Unit')}
            </h3>
            <Badge variant="outline" className="gba:text-xs">
              Loading...
            </Badge>
          </div>
          <p className="gba:text-gray-600 gba:text-sm">
            Shows distribution of employee tenure across organizational units using a visual heatmap
          </p>
        </div>
        <div className="gba:flex gba:justify-center gba:items-center gba:h-96">
          <Spinner className="gba:w-8 gba:h-8" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="gba:w-full gba:p-6 gba:shadow-sm" data-testid={`${prefixDataTestId}-error`}>
        <div className="gba:mb-4">
          <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
            <h3 className="gba:text-lg gba:font-semibold gba:text-gray-800 gba:m-0">
              {getTranslationFromI18nKeyAndLabel('hr_analytics_tenure_heatmap', 'Tenure Distribution by Organizational Unit')}
            </h3>
            <Badge variant="outline" className="gba:text-xs">
              Error
            </Badge>
          </div>
          <p className="gba:text-gray-600 gba:text-sm">
            Shows distribution of employee tenure across organizational units using a visual heatmap
          </p>
        </div>
        <Alert variant="destructive">
          {error}
        </Alert>
      </Card>
    );
  }

  const matrixData = createMatrixData();
  const sortedOrgUnits = [...orgUnits].sort((a, b) => a.name.localeCompare(b.name));
  const sortedTenureRanges = [...tenureRanges].sort((a, b) => a.minMonths - b.minMonths);

  if (!matrixData.length) {
    return (
      <Card className="gba:w-full gba:p-6 gba:shadow-sm" data-testid={`${prefixDataTestId}-no-data`}>
        <div className="gba:mb-4">
          <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
            <h3 className="gba:text-lg gba:font-semibold gba:text-gray-800 gba:m-0">
              {getTranslationFromI18nKeyAndLabel('hr_analytics_tenure_heatmap', 'Tenure Distribution by Organizational Unit')}
            </h3>
            <Badge variant="outline" className="gba:text-xs">
              No data
            </Badge>
          </div>
          <p className="gba:text-gray-600 gba:text-sm">
            Shows distribution of employee tenure across organizational units using a visual heatmap
          </p>
        </div>
        <div className="gba:flex gba:justify-center gba:items-center gba:h-96 gba:text-gray-500">
          {getTranslationFromI18nKeyAndLabel('hr_analytics_no_data', 'No tenure data available')}
        </div>
      </Card>
    );
  }

  return (
    <Card className="gba:w-full gba:p-6 gba:shadow-sm" data-testid={`${prefixDataTestId}-chart`}>
      <div className="gba:mb-6">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
          <h3 className="gba:text-lg gba:font-semibold gba:text-gray-800 gba:m-0">
            {getTranslationFromI18nKeyAndLabel('hr_analytics_tenure_heatmap', 'Tenure Distribution by Organizational Unit')}
          </h3>
          <Badge variant="outline" className="gba:text-xs">
            {data.length} data points
          </Badge>
        </div>
        <p className="gba:text-gray-600 gba:text-sm">
          Shows distribution of employee tenure across organizational units using a visual heatmap
        </p>
      </div>

      <div className="gba:overflow-x-auto">
        <div className="gba:min-w-fit">
          {/* Header Row - Organizational Units */}
          <div 
            className="gba:grid gba:gap-1 gba:mb-1"
            style={{ 
              gridTemplateColumns: `200px repeat(${sortedOrgUnits.length}, 60px)` 
            }}
          >
            {/* Empty top-left cell */}
            <div className="gba:h-16" />
            
            {/* Organizational unit headers */}
            {sortedOrgUnits.map(orgUnit => (
              <div 
                key={`header-${orgUnit.id}`}
                className="gba:h-16 gba:flex gba:items-center gba:justify-center gba:p-2"
              >
                <span 
                  className="gba:text-xs gba:font-medium gba:text-gray-700 gba:text-center gba:leading-tight gba:transform gba:-rotate-45"
                  style={{ writingMode: 'horizontal-tb' }}
                >
                  {orgUnit.name}
                </span>
              </div>
            ))}
          </div>

          {/* Matrix Rows */}
          {matrixData.map((row, rowIndex) => (
            <div 
              key={`row-${rowIndex}`}
              className="gba:grid gba:gap-1 gba:mb-1"
              style={{ 
                gridTemplateColumns: `200px repeat(${sortedOrgUnits.length}, 60px)` 
              }}
            >
              {/* Tenure Range Label */}
              <div className="gba:h-16 gba:flex gba:items-center gba:justify-end gba:px-3">
                <span 
                  className="gba:text-sm gba:font-medium gba:text-gray-700 gba:truncate gba:text-right"
                  title={row[0]?.tenureRangeLabel}
                >
                  {row[0]?.tenureRangeLabel}
                </span>
              </div>
              
              {/* Data Cells */}
              {row.map(cell => (
                <div
                  key={`cell-${cell.tenureRangeId}-${cell.orgUnitId}`}
                  className="gba:h-16 gba:w-16 gba:border gba:border-gray-300 gba:flex gba:items-center gba:justify-center gba:cursor-default gba:transition-all gba:duration-200 hover:gba:scale-105 hover:gba:shadow-md"
                  style={{ backgroundColor: cell.color }}
                  title={`${cell.tenureRangeLabel} - ${cell.orgUnitName}: ${cell.count} employees`}
                >
                  <span className="gba:text-sm gba:font-semibold gba:text-gray-800">
                    {cell.count > 0 ? cell.count : ''}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Color Scale Legend */}
      <div className="gba:mt-6 gba:flex gba:flex-col gba:items-center gba:gap-3">
        <span className="gba:text-sm gba:font-medium gba:text-gray-700">
          Employee Count Scale
        </span>
        <div className="gba:flex gba:items-center gba:gap-2">
          <span className="gba:text-xs gba:text-gray-500">Few</span>
          <div className="gba:flex gba:h-4">
            {[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map((intensity, index) => (
              <div
                key={`legend-${index}`}
                className="gba:w-8 gba:h-4 gba:border-r gba:border-gray-300 last:gba:border-r-0"
                style={{ backgroundColor: getHeatmapColor(intensity) }}
                title={`Intensity: ${Math.round(intensity * 100)}%`}
              />
            ))}
          </div>
          <span className="gba:text-xs gba:text-gray-500">Many</span>
        </div>
      </div>
    </Card>
  );
};

export default TenureHeatmapChart; 