import React, { useMemo } from 'react';
import { Card, Typography, Spin, Empty, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Heatmap } from '@ant-design/charts';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { TenureDistributionItem, TenureRange, OrganizationalUnit } from '../../hooks/useTenureByOrgUnit';

const { Title } = Typography;

interface TenureHeatmapChartProps {
  data: TenureDistributionItem[];
  orgUnits: OrganizationalUnit[];
  tenureRanges: TenureRange[];
  loading?: boolean;
  error?: Error | null;
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
  error = null 
}) => {
  // Prepare data for the chart
  const chartData = useMemo(() => {
    return data.map(item => ({
      orgUnit: item.orgUnitName,
      tenureRange: tenureRanges.find(range => range.id === item.tenureRangeId)?.label || item.tenureRangeId,
      value: item.count,
      // Save original IDs for potential interactions
      orgUnitId: item.orgUnitId,
      tenureRangeId: item.tenureRangeId
    }));
  }, [data, tenureRanges]);

  // Sort tenure ranges by their minMonths property
  const sortedTenureRanges = useMemo(() => {
    return [...tenureRanges].sort((a, b) => a.minMonths - b.minMonths);
  }, [tenureRanges]);

  // Sort org units alphabetically
  const sortedOrgUnits = useMemo(() => {
    return [...orgUnits].sort((a, b) => a.name.localeCompare(b.name));
  }, [orgUnits]);

  // Config for the heatmap chart with direct value-to-size mapping
  const config = {
    data: chartData,
    autoFit: true,
    appendPadding: [70, 30, 100, 60], // Increased padding for better spacing
    xField: 'tenureRange',
    yField: 'orgUnit',
    colorField: 'value',
    sizeField: 'value', // Use the actual value directly for sizing
    // Enhanced color palette with higher contrast between steps
    color: ['#e6f7ff', '#bae7ff', '#91d5ff', '#69c0ff', '#40a9ff', '#1890ff', '#096dd9', '#0050b3', '#001d66'],
    shape: 'circle',
    // Configure dynamic sizing - increased for larger circles
    sizeRatio: 1.4, // Further increased size ratio for more prominent circles
    heatmapStyle: (datum: any) => {
      // Enhanced styling for better visibility
      return {
        fill: datum.color,
        stroke: '#000000',
        lineWidth: 5, // Thicker outline
        opacity: 1,
        shadowColor: 'rgba(0, 0, 0, 0.5)',
        shadowBlur: 8,
        shadowOffsetX: 2,
        shadowOffsetY: 2
      };
    },
    label: {
      style: {
        fill: '#fff',
        shadowBlur: 3,
        shadowColor: 'rgba(0, 0, 0, .45)',
        fontWeight: 'bold',
        fontSize: 24 // Increased font size for cell values
      },
      formatter: (datum: any) => datum.value > 0 ? `${datum.value}` : ''
    },
    legend: {
      position: 'bottom',
      itemName: {
        style: {
          fontSize: 24, // Increased from 22
          fontWeight: 600
        }
      },
      itemValue: {
        style: {
          fontSize: 22 // Increased from 20
        }
      },
      marker: {
        symbol: 'circle',
        style: {
          r: 20, // Increased circle size in legend
          lineWidth: 5
        }
      }
    },
    // Enhanced X-axis with stronger black labels
    xAxis: {
      title: {
        text: getTranslationFromI18nKeyAndLabel('hr_analytics_tenure_ranges', 'Tenure Ranges'),
        style: {
          fontSize: 26,
          fontWeight: 'bold',
          fill: '#000000'
        }
      },
      grid: {
        line: {
          style: {
            stroke: '#DDDDDD',
            lineWidth: 1
          }
        }
      },
      label: {
        autoRotate: false,
        style: {
          fontSize: 22,
          fontWeight: 600, // Bolder font
          fill: '#000000' // Force black color
        },
        formatter: (text: string) => {
          // Ensure text is rendered with dark color
          return `${text}`;
        }
      },
      line: {
        style: {
          stroke: '#000000',
          lineWidth: 2
        }
      },
    },
    // Enhanced Y-axis with stronger black labels
    yAxis: {
      title: {
        text: getTranslationFromI18nKeyAndLabel('hr_analytics_organizational_units', 'Organizational Units'),
        style: {
          fontSize: 26,
          fontWeight: 'bold',
          fill: '#000000'
        }
      },
      grid: {
        line: {
          style: {
            stroke: '#DDDDDD',
            lineWidth: 1
          }
        }
      },
      label: {
        style: {
          fontSize: 22,
          fontWeight: 600, // Bolder font
          fill: '#000000' // Force black color
        },
        formatter: (text: string) => {
          // Ensure text is rendered with dark color
          return `${text}`;
        }
      },
      line: {
        style: {
          stroke: '#000000',
          lineWidth: 2
        }
      },
    },
    meta: {
      orgUnit: {
        type: 'cat',
        values: sortedOrgUnits.map(ou => ou.name)
      },
      tenureRange: {
        type: 'cat',
        values: sortedTenureRanges.map(tr => tr.label)
      }
    },
    tooltip: {
      title: (datum: any) => `${datum.orgUnit} - ${datum.tenureRange}`,
      showTitle: true,
      showMarkers: true,
      domStyles: {
        'g2-tooltip': {
          padding: '20px', // Slightly larger padding
          fontSize: '24px', // Increased from 20px
          fontWeight: 600,
          boxShadow: '0 4px 12px rgba(0,0,0,.15), 0 8px 24px rgba(0,0,0,.12)'
        },
        'g2-tooltip-title': {
          fontWeight: 700,
          fontSize: '26px', // Increased from 22px
          marginBottom: '14px' // Slightly larger margin
        },
        'g2-tooltip-list-item': {
          fontSize: '24px', // Increased from 20px
          marginBottom: '12px' // Slightly larger margin
        }
      },
      formatter: (datum: any) => {
        return {
          name: getTranslationFromI18nKeyAndLabel('hr_analytics_employees', 'Employees'),
          value: datum.value
        };
      }
    },
    // These are not needed as they're defined in the enhanced configuration above
  };

  return (
    <Card 
      className="gba:shadow-lg gba:rounded-lg gba:mb-6 gba:overflow-hidden gba:border-0" 
      style={{ background: 'linear-gradient(to bottom, #ffffff, #f0f2f5)' }}
      title={
        <div className="gba:flex gba:justify-between gba:items-center">
          <div>
            <Title level={4} className="gba:m-0" style={{ fontSize: 20, fontWeight: 600 }}>
              {getTranslationFromI18nKeyAndLabel(
                'hr_analytics_tenure_distribution_by_organizational_unit', 
                'Tenure Distribution by Organizational Unit'
              )}
              <Tooltip 
                title={
                  <div style={{ fontSize: 14 }}>
                    <p>{getTranslationFromI18nKeyAndLabel(
                      'hr_analytics_tenure_chart_explanation', 
                      'This chart shows the distribution of employees across different tenure ranges for each organizational unit.'
                    )}</p>
                    <p>{getTranslationFromI18nKeyAndLabel(
                      'hr_analytics_tenure_chart_reading', 
                      'Darker colors indicate more employees in that category. The number in each cell shows the exact employee count.'
                    )}</p>
                  </div>
                }
              >
                <InfoCircleOutlined style={{ marginLeft: 10, fontSize: 18 }} />
              </Tooltip>
            </Title>
          </div>
        </div>
      }
      data-testid="tenure-heatmap-chart-card"
    >
      <div 
        className="gba:h-[1000px] gba:w-full gba:transition-all gba:duration-500" 
        style={{ 
          height: '1000px', 
          width: '100%', 
          position: 'relative', 
          margin: '0', 
          borderRadius: '12px',
          padding: '30px 20px',
          backgroundColor: '#ffffff', // White background for better contrast
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)', // Subtle shadow for depth
          border: '1px solid #e8e8e8' // Light border for definition
        }}>
        {loading ? (
          <div className="gba:h-full gba:flex gba:items-center gba:justify-center">
            <Spin size="large" />
          </div>
        ) : error ? (
          <div className="gba:h-full gba:flex gba:flex-col gba:items-center gba:justify-center gba:text-red-500">
            <p>
              {getTranslationFromI18nKeyAndLabel('hr_analytics_error_loading_tenure_data', 'Error loading tenure data')}
            </p>
            <p>{error.message}</p>
          </div>
        ) : chartData.length === 0 ? (
          <Empty 
            description={getTranslationFromI18nKeyAndLabel('hr_analytics_no_tenure_data', 'No tenure data available')}
            className="gba:h-full gba:flex gba:flex-col gba:items-center gba:justify-center" 
          />
        ) : (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <Heatmap 
              {...config} 
              data-testid="tenure-heatmap-chart"
            />
          </div>
        )}
      </div>
    </Card>
  );
};

export default TenureHeatmapChart;
