import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Alert,
  Spinner,
  Checkbox
} from '@newwork/nw-design-system';
import { PiChartLine, PiEye } from 'react-icons/pi';
import { useCampaignChart } from '../hooks';
import { CampaignChartProps, ChartTimeFilter } from '../types';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

const DATA_TEST_ID_PREFIX = 'CampaignChart';

const CampaignChart: React.FC<CampaignChartProps> = ({
  campaignId,
  campaign,
  ...props
}) => {
  // Line visibility state
  const [visibleLines, setVisibleLines] = useState({
    totalLeads: true,
    totalAccounts: true,
    totalContacts: true,
    totalOpportunities: true
  });

  const {
    chartData,
    isLoading,
    error,
    timeFilter,
    setTimeFilter,
    refetch
  } = useCampaignChart(props, campaignId, campaign);

  const timeFilterOptions = [
    { key: 'daily' as ChartTimeFilter, label: 'Daily' },
    { key: 'weekly' as ChartTimeFilter, label: 'Weekly' },
    { key: 'monthly' as ChartTimeFilter, label: 'Monthly' },
    { key: 'yearly' as ChartTimeFilter, label: 'Yearly' }
  ];

  const lineOptions = [
    { key: 'totalLeads' as keyof typeof visibleLines, label: 'Total Leads', color: '#3B82F6' },
    { key: 'totalAccounts' as keyof typeof visibleLines, label: 'Total Accounts', color: '#52c41a' },
    { key: 'totalContacts' as keyof typeof visibleLines, label: 'Total Contacts', color: '#722ed1' },
    { key: 'totalOpportunities' as keyof typeof visibleLines, label: 'Total Opportunities', color: '#fa8c16' }
  ];

  // Toggle line visibility
  const toggleLineVisibility = (lineKey: keyof typeof visibleLines) => {
    setVisibleLines(prev => ({
      ...prev,
      [lineKey]: !prev[lineKey]
    }));
  };

  // Custom tooltip formatter
  const formatTooltip = (value: any, name: string) => {
    const labelMap: Record<string, string> = {
      totalLeads: 'Total Leads',
      totalAccounts: 'Total Accounts',
      totalContacts: 'Total Contacts',
      totalOpportunities: 'Total Opportunities'
    };
    
    return [value, labelMap[name] || name];
  };

  // Custom label formatter for X-axis
  const formatXAxisLabel = (value: string) => {
    if (timeFilter === 'daily') {
      return value;
    } else if (timeFilter === 'weekly') {
      return value;
    } else if (timeFilter === 'monthly') {
      return value;
    } else {
      return value;
    }
  };

  if (isLoading) {
    return (
      <Card data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <PiChartLine size={20} />
            {getTranslationFromI18nKeyAndLabel('campaign.chart.title', 'Campaign Performance Trends')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:justify-center gba:p-8" data-testid={`${DATA_TEST_ID_PREFIX}-loading`}>
            <Spinner size="lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <PiChartLine size={20} />
            {getTranslationFromI18nKeyAndLabel('campaign.chart.title', 'Campaign Performance Trends')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert
            variant="destructive"
            data-testid={`${DATA_TEST_ID_PREFIX}-error`}
          >
            <div className="gba:flex gba:items-center gba:justify-between">
              <div>
                <h4 className="gba:text-sm gba:font-medium">
                  {getTranslationFromI18nKeyAndLabel('campaign.chart.error.title', 'Error Loading Chart')}
                </h4>
                <p className="gba:text-sm gba:text-muted-foreground">
                  {error || getTranslationFromI18nKeyAndLabel('campaign.chart.error.message', 'Failed to load campaign trends data')}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={refetch}
                data-testid={`${DATA_TEST_ID_PREFIX}-retry-button`}
              >
                {getTranslationFromI18nKeyAndLabel('campaign.chart.retry', 'Retry')}
              </Button>
            </div>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <PiChartLine size={20} />
            {getTranslationFromI18nKeyAndLabel('campaign.chart.title', 'Campaign Performance Trends')}
          </CardTitle>
          <div className="gba:flex gba:items-center gba:gap-2">
            <div className="gba:flex gba:gap-1" data-testid={`${DATA_TEST_ID_PREFIX}-time-filters`}>
              {timeFilterOptions.map((option) => (
                <Button
                  key={option.key}
                  variant={timeFilter === option.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeFilter(option.key)}
                  data-testid={`${DATA_TEST_ID_PREFIX}-filter-${option.key}`}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Line Visibility Filters */}
        <div className="gba:mt-4" style={{ borderTop: '1px solid var(--color-border-default)', paddingTop: '16px' }}>
          <div className="gba:flex gba:items-center gba:gap-6">
            <div className="gba:flex gba:items-center gba:gap-2">
              <PiEye size={16} style={{ color: 'var(--color-text-secondary)' }} />
              <span className="gba:text-sm gba:font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {getTranslationFromI18nKeyAndLabel('campaign.chart.showLines', 'Show Lines:')}
              </span>
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
                    onCheckedChange={() => toggleLineVisibility(line.key)}
                  />
                  <div
                    className="gba:w-3 gba:h-3 gba:rounded"
                    style={{ backgroundColor: line.color }}
                  />
                  <span className="gba:text-sm" style={{ color: 'var(--color-text-primary)' }}>
                    {line.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!chartData?.data || chartData.data.length === 0 ? (
          <div className="gba:text-center gba:p-8" data-testid={`${DATA_TEST_ID_PREFIX}-empty-state`}>
            <PiChartLine className="gba:mx-auto gba:h-12 gba:w-12" style={{ color: 'var(--color-text-secondary)' }} />
            <h3 className="gba:mt-2 gba:text-sm gba:font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {getTranslationFromI18nKeyAndLabel('campaign.chart.noData.title', 'No data available')}
            </h3>
            <p className="gba:mt-1 gba:text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {getTranslationFromI18nKeyAndLabel('campaign.chart.noData.message', 'No campaign data found for the selected time period.')}
            </p>
          </div>
        ) : (
          <div className="gba:h-80" data-testid={`${DATA_TEST_ID_PREFIX}-chart`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData.data}
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
                
                {/* Total Leads - Blue */}
                {visibleLines.totalLeads && (
                  <Area
                    type="monotone"
                    dataKey="totalLeads"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.1}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                    name="Total Leads"
                  />
                )}
                
                {/* Total Accounts - Green */}
                {visibleLines.totalAccounts && (
                  <Area
                    type="monotone"
                    dataKey="totalAccounts"
                    stroke="#52c41a"
                    fill="#52c41a"
                    fillOpacity={0.1}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, stroke: '#52c41a', strokeWidth: 2 }}
                    name="Total Accounts"
                  />
                )}
                
                {/* Total Contacts - Purple */}
                {visibleLines.totalContacts && (
                  <Area
                    type="monotone"
                    dataKey="totalContacts"
                    stroke="#722ed1"
                    fill="#722ed1"
                    fillOpacity={0.1}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, stroke: '#722ed1', strokeWidth: 2 }}
                    name="Total Contacts"
                  />
                )}
                
                {/* Total Opportunities - Orange */}
                {visibleLines.totalOpportunities && (
                  <Area
                    type="monotone"
                    dataKey="totalOpportunities"
                    stroke="#fa8c16"
                    fill="#fa8c16"
                    fillOpacity={0.1}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, stroke: '#fa8c16', strokeWidth: 2 }}
                    name="Total Opportunities"
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

export default CampaignChart;
