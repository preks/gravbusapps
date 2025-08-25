import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Checkbox } from '@newwork/nw-design-system';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PiChartLine, PiCalendar, PiEye } from 'react-icons/pi';

interface LeadLifecycleChartProps {
  data: any[];
  selectedTimeFilter: string;
  onTimeFilterChange: (filter: any) => void;
  visibleLines: any;
  onToggleLineVisibility: (key: string) => void;
  formatXAxisLabel: (value: string) => string;
  formatTooltip: (value: number, name: string) => any[];
}

const DATA_TEST_ID_PREFIX = 'LeadLifecycleChart';

export const LeadLifecycleChart: React.FC<LeadLifecycleChartProps> = ({
  data,
  selectedTimeFilter,
  onTimeFilterChange,
  visibleLines,
  onToggleLineVisibility,
  formatXAxisLabel,
  formatTooltip
}) => {
  const timeFilterOptions = [
    { key: 'month', label: 'Last Month' },
    { key: 'quarter', label: 'Last Quarter' },
    { key: 'sixMonths', label: 'Last 6 Months' },
    { key: 'year', label: 'Last Year' },
    { key: 'historical', label: 'Historical' }
  ];

  const lineOptions = [
    { key: 'leadsCreated', label: 'Leads Created', color: '#3B82F6' },
    { key: 'leadsConverted', label: 'Leads Converted', color: '#10B981' },
    { key: 'leadsLost', label: 'Leads Lost', color: '#EF4444' }
  ];

  return (
    <Card data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <PiChartLine size={20} />
            Lead Lifecycle Overview
          </CardTitle>
          <div className="gba:flex gba:items-center gba:gap-2">
            <PiCalendar size={16} className="gba:text-gray-500" />
            <div className="gba:flex gba:gap-1" data-testid={`${DATA_TEST_ID_PREFIX}-time-filters`}>
              {timeFilterOptions.map((option) => (
                <Button
                  key={option.key}
                  variant={selectedTimeFilter === option.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => onTimeFilterChange(option.key)}
                  data-testid={`${DATA_TEST_ID_PREFIX}-filter-${option.key}`}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Line Visibility Filters */}
        <div className="gba:mt-4 gba:border-t gba:pt-4">
          <div className="gba:flex gba:items-center gba:gap-6">
            <div className="gba:flex gba:items-center gba:gap-2">
              <PiEye size={16} className="gba:text-gray-500" />
              <span className="gba:text-sm gba:font-medium gba:text-gray-700">Show Lines:</span>
            </div>
            <div className="gba:flex gba:flex-wrap gba:gap-4" data-testid={`${DATA_TEST_ID_PREFIX}-line-filters`}>
              {lineOptions.map((line) => (
                <label
                  key={line.key}
                  className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer"
                  data-testid={`${DATA_TEST_ID_PREFIX}-line-filter-${line.key}`}
                >
                  <Checkbox
                    checked={visibleLines[line.key]}
                    onCheckedChange={() => onToggleLineVisibility(line.key)}
                  />
                  <div
                    className="gba:w-3 gba:h-3 gba:rounded"
                    style={{ backgroundColor: line.color }}
                  />
                  <span className="gba:text-sm gba:text-gray-700">{line.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="gba:text-center gba:p-8" data-testid={`${DATA_TEST_ID_PREFIX}-empty-state`}>
            <PiChartLine className="gba:mx-auto gba:h-12 gba:w-12 gba:text-gray-400" />
            <h3 className="gba:mt-2 gba:text-sm gba:font-medium gba:text-gray-900">No data available</h3>
            <p className="gba:mt-1 gba:text-sm gba:text-gray-500">
              No lead lifecycle data found for the selected time period.
            </p>
          </div>
        ) : (
          <div className="gba:h-80" data-testid={`${DATA_TEST_ID_PREFIX}-chart`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 20,
                }}
              >
                <XAxis 
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatXAxisLabel}
                  stroke="#666"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#666"
                />
                <Tooltip
                  formatter={formatTooltip}
                  labelFormatter={(label) => `Period: ${formatXAxisLabel(label)}`}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '12px' }}
                />
                
                {/* Leads Created - Blue */}
                {visibleLines.leadsCreated && (
                  <Area
                    type="monotone"
                    dataKey="leadsCreated"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.1}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                    name="Leads Created"
                  />
                )}
                
                {/* Leads Converted - Green */}
                {visibleLines.leadsConverted && (
                  <Area
                    type="monotone"
                    dataKey="leadsConverted"
                    stroke="#10B981"
                    fill="#10B981"
                    fillOpacity={0.1}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
                    name="Leads Converted"
                  />
                )}
                
                {/* Leads Lost - Red */}
                {visibleLines.leadsLost && (
                  <Area
                    type="monotone"
                    dataKey="leadsLost"
                    stroke="#EF4444"
                    fill="#EF4444"
                    fillOpacity={0.1}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, stroke: '#EF4444', strokeWidth: 2 }}
                    name="Leads Lost"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
export default LeadLifecycleChart;