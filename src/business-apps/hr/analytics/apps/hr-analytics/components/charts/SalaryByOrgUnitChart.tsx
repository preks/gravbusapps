import React from 'react';
import { Card, Typography, Spin, Empty, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Bar } from '@ant-design/plots';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { OrganizationalUnitSalary } from '../../hooks/useSalaryByOrgUnit';

const { Title } = Typography;

interface SalaryByOrgUnitChartProps {
  data: OrganizationalUnitSalary[];
  loading?: boolean;
  error?: Error | null;
}

/**
 * Horizontal bar chart component to display average salary by organizational unit
 * Shows bars sorted by average salary in descending order
 */
const SalaryByOrgUnitChart: React.FC<SalaryByOrgUnitChartProps> = ({
  data,
  loading = false,
  error = null
}) => {
  // Transform data for the bar chart
  const chartData = React.useMemo(() => {
    // Add validation to prevent rendering issues
    const validData = data.filter(item => 
      typeof item.name === 'string' && 
      typeof item.averageSalary === 'number' && 
      !isNaN(item.averageSalary)
    );
    
    // Log if we filtered out any invalid data
    if (validData.length !== data.length) {
      console.warn(`[SalaryByOrgUnitChart] Filtered out ${data.length - validData.length} items with invalid data format`);
    }
    
    // Return properly formatted data for display
    return validData.map(item => ({
      orgUnit: item.name, // This will be shown on the Y-axis
      salary: item.averageSalary,
      count: item.employeeCount,
      // Format for display
      formattedSalary: `$${item.averageSalary.toLocaleString()}`
    }));
  }, [data]);
  
  // Log the data to ensure it's properly formatted
  React.useEffect(() => {
    console.log('[SalaryByOrgUnitChart] Chart data:', chartData);
  }, [chartData]);

  // Config for the horizontal bar chart
  const config = {
    // Add padding for the chart
    appendPadding: [40, 30, 20, 30],
    data: chartData,
    // For vertical bar chart - X is the category (org unit), Y is the value (salary)
    xField: 'orgUnit',
    yField: 'salary',
    // Use a consistent blue color
    color: '#1890ff',
    seriesField: undefined,
    // Bar styling for vertical bars
    barStyle: {
      radius: [4, 4, 0, 0], // Rounded corners only on top
      fillOpacity: 0.85,
      stroke: '#0c77d6',
      lineWidth: 1,
    },
    // Configure X-axis for organization unit names
    xAxis: {
      label: {
        // Prevent auto-hiding and truncation of labels
        autoHide: false,
        autoEllipsis: false,
        autoRotate: true,
        rotate: 45,
        style: {
          fill: '#262626',
          fontSize: 12,
          fontWeight: 500,
        },
      },
      grid: null,
      line: null,
      title: null,
    },
    // Configuration for y-axis to show salary values
    yAxis: {
      // Show grid lines for better readability of values
      grid: {
        line: {
          style: {
            stroke: '#f0f0f0',
            lineWidth: 1,
            lineDash: [4, 5],
          },
        },
      },
      label: {
        formatter: (value: number) => `$${value.toLocaleString()}`,
        style: {
          fill: '#262626',
          fontSize: 12,
          fontWeight: 500,
        },
      },
      title: null,
    },
    // Place salary values at the top of each bar
    label: {
      position: 'top',
      style: {
        fill: '#000000',
        fontSize: 14,
        fontWeight: 500,
      },
      formatter: (item: any) => `$${item.salary.toLocaleString()}`,
      offsetY: -5,
    },
    // Interactions for hover effects
    // (Defined once at the end of the config object)
    // Adjust bar width for better appearance
    minBarWidth: 20,
    maxBarWidth: 30,
    tooltip: {
      title: (datum: any) => datum.orgUnit,
      formatter: (datum: any) => {
        // Ensure tooltip displays correct data for the switched axes
        return [
          { 
            name: getTranslationFromI18nKeyAndLabel('hr_analytics_average_salary', 'Average Salary'), 
            value: `$${datum.salary.toLocaleString()}` 
          },
          { 
            name: getTranslationFromI18nKeyAndLabel('hr_analytics_employee_count', 'Employee Count'), 
            value: datum.count 
          }
        ];
      },
      domStyles: {
        'g2-tooltip': {
          backgroundColor: '#fff',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
          padding: '12px 16px',
          fontSize: '16px',
          borderRadius: '4px',
          border: '1px solid #eaeaea'
        },
        'g2-tooltip-title': {
          fontWeight: '700',
          fontSize: '18px',
          color: '#000',
          marginBottom: '10px',
          borderBottom: '1px solid #f0f0f0',
          paddingBottom: '6px'
        },
        'g2-tooltip-list': {
          paddingLeft: '0'
        },
        'g2-tooltip-list-item': {
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '4px',
          alignItems: 'center',
          fontSize: '15px'
        },
        'g2-tooltip-marker': {
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          display: 'inline-block',
          marginRight: '6px'
        },
        'g2-tooltip-value': {
          marginLeft: '12px',
          fontWeight: '600',
          fontSize: '16px'
        }
      }
    },
    interactions: [
      { type: 'element-active' }
    ]
  };

  return (
    <Card
      title={
        <div>
          <Title level={4} style={{ margin: 0 }}>
            {getTranslationFromI18nKeyAndLabel('hr_analytics_salary_by_org_unit', 'Average Salary by Organizational Unit')}
          </Title>
          <Tooltip title={getTranslationFromI18nKeyAndLabel(
            'hr_analytics_salary_by_org_unit_tooltip', 
            'Displays the average salary for employees in each organizational unit, sorted from highest to lowest'
          )}>
            <InfoCircleOutlined className="gba:ml-2" />
          </Tooltip>
        </div>
      }
      className="gba:shadow-lg gba:rounded-lg gba:mt-4 gba:mb-6 gba:overflow-hidden gba:border-0"
      style={{ background: 'linear-gradient(to bottom, #ffffff, #f0f2f5)' }}
      data-testid="salary-by-org-unit-chart"
    >
      <div 
        className="gba:flex gba:flex-col gba:w-full gba:transition-all gba:duration-500"
        style={{ 
          width: '100%', 
          position: 'relative',
          margin: '0',
          borderRadius: '12px',
          padding: '20px',
          backgroundColor: '#ffffff',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e8e8e8'
        }}
        data-testid="salary-by-org-unit-chart-container"
      >
        {/* Chart container with fixed height for vertical bar chart */}
        <div 
          className="gba:w-full gba:min-h-[400px]" 
          style={{ 
            height: '500px', // Fixed height for vertical bars
            position: 'relative',
            overflow: 'visible' // Critical for ensuring labels don't get cut off
          }} 
          data-testid="salary-by-org-unit-chart-height-container">
          {loading ? (
            <div className="gba:h-full gba:flex gba:items-center gba:justify-center">
              <Spin size="large" data-testid="salary-by-org-unit-chart-loading" />
            </div>
          ) : error ? (
            <div className="gba:h-full gba:flex gba:items-center gba:justify-center gba:text-red-500">
              <div data-testid="salary-by-org-unit-chart-error">
                {getTranslationFromI18nKeyAndLabel('hr_analytics_error_message', 'Error loading data')}
              </div>
            </div>
          ) : data.length === 0 ? (
            <div className="gba:h-full gba:flex gba:items-center gba:justify-center">
              <Empty
                description={getTranslationFromI18nKeyAndLabel('hr_analytics_no_data', 'No data available')}
                data-testid="salary-by-org-unit-chart-empty"
              />
            </div>
          ) : (
            <Bar {...config} data-testid="salary-by-org-unit-chart-rendered" />
          )}
        </div>
      </div>
    </Card>
  );
};

export default SalaryByOrgUnitChart;
