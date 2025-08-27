import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Checkbox } from '@newwork/nw-design-system';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PiChartLine, PiCalendar, PiEye } from 'react-icons/pi';

export type TimeFilter = 'month' | 'quarter' | 'sixMonths' | 'year' | 'historical';

interface AccountLifecycleChartProps {
  data: any[];
  selectedTimeFilter: TimeFilter;
  onTimeFilterChange: (filter: TimeFilter) => void;
  visibleLines: any;
  onToggleLineVisibility: (key: string) => void;
  formatXAxisLabel: (value: string) => string;
  formatTooltip: (value: any, name: string) => any[];
}

const DATA_TEST_ID_PREFIX = 'account-lifecycle-overview';

export const AccountLifecycleChart: React.FC<AccountLifecycleChartProps> = ({
  data,
  selectedTimeFilter,
  onTimeFilterChange,
  visibleLines,
  onToggleLineVisibility,
  formatXAxisLabel,
  formatTooltip
}) => {
  const timeFilterOptions = [
    { key: 'month' as TimeFilter, label: 'Last Month' },
    { key: 'quarter' as TimeFilter, label: 'Last Quarter' },
    { key: 'sixMonths' as TimeFilter, label: 'Last 6 Months' },
    { key: 'year' as TimeFilter, label: 'Last Year' },
    { key: 'historical' as TimeFilter, label: 'Historical' }
  ];

  const lineOptions = [
    { key: 'accountsCreated', label: 'Accounts Created', color: '#3B82F6' },
    { key: 'accountsWithOpportunities', label: 'Accounts with Opportunities', color: '#10B981' },
    { key: 'accountsActive', label: 'Active Accounts', color: '#F59E0B' }
  ];

  return (
    <Card data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <PiChartLine size={20} />
            Account Lifecycle Overview
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
              No account lifecycle data found for the selected time period.
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
                
                {/* Accounts Created - Blue */}
                {visibleLines.accountsCreated && (
                  <Area
                    type="monotone"
                    dataKey="accountsCreated"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.1}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                    name="Accounts Created"
                  />
                )}
                
                {/* Accounts with Opportunities - Green */}
                {visibleLines.accountsWithOpportunities && (
                  <Area
                    type="monotone"
                    dataKey="accountsWithOpportunities"
                    stroke="#10B981"
                    fill="#10B981"
                    fillOpacity={0.1}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
                    name="Accounts with Opportunities"
                  />
                )}
                
                {/* Active Accounts - Orange */}
                {visibleLines.accountsActive && (
                  <Area
                    type="monotone"
                    dataKey="accountsActive"
                    stroke="#F59E0B"
                    fill="#F59E0B"
                    fillOpacity={0.1}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, stroke: '#F59E0B', strokeWidth: 2 }}
                    name="Active Accounts"
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
export default AccountLifecycleChart;