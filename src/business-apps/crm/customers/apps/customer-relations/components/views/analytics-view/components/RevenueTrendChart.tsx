import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Checkbox, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { DollarCircleOutlined } from '@ant-design/icons';
import { PiChartLine, PiCalendar, PiEye } from 'react-icons/pi';
import { RevenueTrendData, TimeFilter } from '../hooks/useRevenueTrends';
import { usePipelines } from '../hooks/usePipelines';

interface RevenueTrendChartProps {
  data: RevenueTrendData[];
  isLoading?: boolean;
  accessToken: string;
  selectedPipelineId?: string;
  onPipelineChange?: (pipelineId: string | undefined) => void;
  selectedTimeFilter?: TimeFilter;
  onTimeFilterChange?: (timeFilter: TimeFilter) => void;
}

export const RevenueTrendChart: React.FC<RevenueTrendChartProps> = ({ 
  data, 
  isLoading, 
  accessToken,
  selectedPipelineId,
  onPipelineChange,
  selectedTimeFilter = 'sixMonths',
  onTimeFilterChange
}) => {
  // Line visibility state for data filters
  const [visibleLines, setVisibleLines] = useState({
    pipelineRevenue: true,
    wonRevenue: true
  });

  // Get pipelines for selector
  const { pipelines, isLoading: pipelinesLoading } = usePipelines(accessToken);

  // Time filter options
  const timeFilterOptions = [
    { key: 'month' as TimeFilter, label: 'Last Month' },
    { key: 'quarter' as TimeFilter, label: 'Last Quarter' },
    { key: 'sixMonths' as TimeFilter, label: 'Last 6 Months' },
    { key: 'year' as TimeFilter, label: 'Last Year' },
    { key: 'historical' as TimeFilter, label: 'Historical' }
  ];

  // Line options for data filters
  const lineOptions = [
    { key: 'pipelineRevenue' as keyof typeof visibleLines, label: 'Pipeline Revenue', color: '#F59E0B' },
    { key: 'wonRevenue' as keyof typeof visibleLines, label: 'Won Revenue', color: '#10B981' }
  ];

  // Toggle line visibility
  const toggleLineVisibility = (lineKey: keyof typeof visibleLines) => {
    setVisibleLines(prev => ({
      ...prev,
      [lineKey]: !prev[lineKey]
    }));
  };

  // Handle pipeline selection
  const handlePipelineChange = (value: string) => {
    const pipelineId = value === 'all' ? undefined : value;
    onPipelineChange?.(pipelineId);
  };

  // Handle time filter change
  const handleTimeFilterChange = (timeFilter: TimeFilter) => {
    onTimeFilterChange?.(timeFilter);
  };

  if (isLoading) {
    return (
      <Card data-testid="revenue-trend-chart-loading">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <DollarCircleOutlined />
            Revenue Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:items-center gba:justify-center gba:h-80">
            <div className="gba:animate-pulse gba:text-gray-500">Loading revenue trends...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  };

  const formatTooltipCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Get current filter label
  const currentFilterLabel = timeFilterOptions.find(option => option.key === selectedTimeFilter)?.label || 'Last 6 Months';

  return (
    <Card data-testid="revenue-trend-chart">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <DollarCircleOutlined />
            Revenue Trends ({currentFilterLabel})
            {selectedPipelineId && (
              <span className="gba:text-sm gba:font-normal gba:text-gray-500">
                - {pipelines.find(p => p.id === selectedPipelineId)?.name || 'Selected Pipeline'}
              </span>
            )}
          </CardTitle>
          
          {/* Pipeline Selector */}
          <div className="gba:flex gba:items-center gba:gap-4">
            <div className="gba:min-w-48">
              <Select
                value={selectedPipelineId || 'all'}
                onValueChange={handlePipelineChange}
                disabled={pipelinesLoading}
              >
                <SelectTrigger data-testid="revenue-pipeline-selector">
                  <SelectValue placeholder="Select pipeline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Pipelines</SelectItem>
                  {pipelines.map((pipeline) => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Time Filter Buttons */}
            <div className="gba:flex gba:items-center gba:gap-2">
              <PiCalendar size={16} className="gba:text-gray-500" />
              <div className="gba:flex gba:gap-1" data-testid="revenue-time-filters">
                {timeFilterOptions.map((option) => (
                  <Button
                    key={option.key}
                    variant={selectedTimeFilter === option.key ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleTimeFilterChange(option.key)}
                    data-testid={`revenue-filter-${option.key}`}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Data Visibility Filters */}
        <div className="gba:mt-4 gba:border-t gba:pt-4">
          <div className="gba:flex gba:items-center gba:gap-6">
            <div className="gba:flex gba:items-center gba:gap-2">
              <PiEye size={16} className="gba:text-gray-500" />
              <span className="gba:text-sm gba:font-medium gba:text-gray-700">Show Data:</span>
            </div>
            <div className="gba:flex gba:flex-wrap gba:gap-4" data-testid="revenue-line-filters">
              {lineOptions.map((line) => (
                <label
                  key={line.key}
                  className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer"
                  data-testid={`revenue-line-filter-${line.key}`}
                >
                  <Checkbox
                    checked={visibleLines[line.key]}
                    onCheckedChange={() => toggleLineVisibility(line.key)}
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
          <div className="gba:text-center gba:p-8" data-testid="revenue-trend-chart-empty-state">
            <PiChartLine className="gba:mx-auto gba:h-12 gba:w-12 gba:text-gray-400" />
            <h3 className="gba:mt-2 gba:text-sm gba:font-medium gba:text-gray-900">No data available</h3>
            <p className="gba:mt-1 gba:text-sm gba:text-gray-500">
              No revenue data found for the selected time period and pipeline.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="pipelineRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="wonRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="month" 
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
              />
              <YAxis 
                stroke="#6B7280"
                fontSize={12}
                tickFormatter={formatCurrency}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value: number, name: string) => [
                  formatTooltipCurrency(value),
                  name === 'pipelineRevenue' ? 'Pipeline Revenue' : 'Won Revenue'
                ]}
                labelStyle={{ color: '#374151' }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => 
                  value === 'pipelineRevenue' ? 'Pipeline Revenue' : 'Won Revenue'
                }
              />
              
              {/* Pipeline Revenue Area */}
              {visibleLines.pipelineRevenue && (
                <Area
                  type="monotone"
                  dataKey="pipelineRevenue"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  fill="url(#pipelineRevenueGradient)"
                  name="pipelineRevenue"
                />
              )}
              
              {/* Won Revenue Area */}
              {visibleLines.wonRevenue && (
                <Area
                  type="monotone"
                  dataKey="wonRevenue"
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="url(#wonRevenueGradient)"
                  name="wonRevenue"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};