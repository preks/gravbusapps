import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card } from '@newwork/nw-design-system';
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { CampaignAnalyticsMetrics, CampaignTimelineAnalysis } from '../../queries/CampaignAnalyticsQueries';

interface CampaignRevenueChartsProps {
  metrics: CampaignAnalyticsMetrics | null;
  timelineData: CampaignTimelineAnalysis | null;
}

const CampaignRevenueCharts: React.FC<CampaignRevenueChartsProps> = ({
  metrics,
  timelineData
}) => {
  // State for line visibility in cumulative growth chart
  const [visibleLines, setVisibleLines] = useState({
    leads: true,
    accounts: true,
    contacts: true,
    opportunities: true
  });

  // Toggle line visibility
  const toggleLineVisibility = (lineKey: keyof typeof visibleLines) => {
    setVisibleLines(prev => ({
      ...prev,
      [lineKey]: !prev[lineKey]
    }));
  };

  // Format currency values
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount);
  };

  // Prepare revenue breakdown data for pie chart
  const wonRevenue = metrics?.revenueMetrics.wonRevenue || 0;
  const totalPipeline = metrics?.revenueMetrics.totalPipeline || 0;
  
  // Won Revenue is part of Claimable Revenue, so show them as parts of the whole
  const remainingClaimable = Math.max(0, totalPipeline - wonRevenue);
  
  const revenueBreakdownData = [
    {
      name: 'Won Revenue',
      value: wonRevenue,
      color: '#52c41a'
    },
    {
      name: 'Remaining Claimable',
      value: remainingClaimable,
      color: '#1890ff'
    }
  ].filter(item => item.value > 0);

  // Legend data includes the total claimable revenue for context
  const revenueLegendData = [
    {
      name: 'Claimable Revenue',
      value: totalPipeline,
      color: '#f59e0b', // Amber/gold color representing potential/opportunity
      isTotal: true
    },
    {
      name: 'Won Revenue',
      value: wonRevenue,
      color: '#52c41a',
      isTotal: false
    },
    ...( remainingClaimable > 0 ? [{
      name: 'Remaining Claimable',
      value: remainingClaimable,
      color: '#1890ff',
      isTotal: false
    }] : [])
  ];

  // Prepare entity type distribution for pie chart
  const entityDistributionData = [
    {
      name: 'Leads',
      value: metrics?.totalEntities.leads || 0,
      color: '#1890ff'
    },
    {
      name: 'Accounts',
      value: metrics?.totalEntities.accounts || 0,
      color: '#52c41a'
    },
    {
      name: 'Contacts',
      value: metrics?.totalEntities.contacts || 0,
      color: '#fa8c16'
    },
    {
      name: 'Opportunities',
      value: metrics?.totalEntities.opportunities || 0,
      color: '#722ed1'
    }
  ].filter(item => item.value > 0);

  // Prepare cumulative timeline data for line chart
  const timelineChartData = timelineData?.entityCreationTimeline.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    fullDate: item.date,
    cumulativeLeads: item.cumulativeLeads,
    cumulativeAccounts: item.cumulativeAccounts,
    cumulativeContacts: item.cumulativeContacts,
    cumulativeOpportunities: item.cumulativeOpportunities,
    cumulativeRevenue: item.cumulativeRevenue
  })) || [];

  // Custom tooltip for pie charts
  const renderPieTooltip = (value: any, name: any) => {
    return [
      typeof value === 'number' && name.includes('Revenue') 
        ? formatCurrency(value) 
        : value.toLocaleString(),
      name
    ];
  };

  // Custom tooltip for line chart
  const renderLineTooltip = (value: any, name: any, props: any) => {
    const nameMap: Record<string, string> = {
      'cumulativeLeads': 'Cumulative Leads',
      'cumulativeAccounts': 'Cumulative Accounts',
      'cumulativeContacts': 'Cumulative Contacts',
      'cumulativeOpportunities': 'Cumulative Opportunities'
    };
    return [value.toLocaleString(), nameMap[name] || name];
  };

  return (
    <div className="gba:space-y-6" data-testid="campaign-revenue-charts-container">
      {/* Grid layout for all 4 charts */}
      <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6">
        
        {/* Chart 1: Revenue Breakdown Pie Chart */}
        <Card className="gba:p-6" data-testid="revenue-breakdown-chart">
          <h4 className="gba:text-md gba:font-semibold gba:mb-4" style={{ color: 'var(--color-text-primary)' }}>
            Revenue Breakdown
          </h4>
          
          {revenueBreakdownData.length > 0 ? (
            <div className="gba:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueBreakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {revenueBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={renderPieTooltip}
                    contentStyle={{
                      backgroundColor: 'var(--color-surface-primary)',
                      border: '1px solid var(--color-border-default)',
                      borderRadius: 'var(--border-radius-sm)',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="gba:h-64 gba:flex gba:items-center gba:justify-center">
              <p style={{ color: 'var(--color-text-secondary)' }}>No revenue data available</p>
            </div>
          )}

                     {/* Revenue Legend */}
           <div className="gba:mt-4 gba:space-y-2">
             {revenueLegendData.map((item, index) => (
               <div key={index} className="gba:flex gba:items-center gba:justify-between">
                 <div className="gba:flex gba:items-center gba:gap-2">
                   <div 
                     className="gba:w-3 gba:h-3 gba:rounded-full"
                     style={{ backgroundColor: item.color }}
                   ></div>
                   <span 
                     className={`gba:text-sm ${item.isTotal ? 'gba:font-semibold' : ''}`}
                     style={{ color: 'var(--color-text-primary)' }}
                   >
                     {item.name}
                   </span>
                 </div>
                 <span 
                   className={`gba:text-sm ${item.isTotal ? 'gba:font-bold' : 'gba:font-medium'}`}
                   style={{ color: 'var(--color-text-primary)' }}
                 >
                   {formatCurrency(item.value)}
                 </span>
               </div>
             ))}
           </div>
        </Card>

        {/* Chart 2: Entity Distribution Pie Chart */}
        <Card className="gba:p-6" data-testid="entity-distribution-chart">
          <h4 className="gba:text-md gba:font-semibold gba:mb-4" style={{ color: 'var(--color-text-primary)' }}>
            Entity Distribution
          </h4>
          
          {entityDistributionData.length > 0 ? (
            <div className="gba:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={entityDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {entityDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={renderPieTooltip}
                    contentStyle={{
                      backgroundColor: 'var(--color-surface-primary)',
                      border: '1px solid var(--color-border-default)',
                      borderRadius: 'var(--border-radius-sm)',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="gba:h-64 gba:flex gba:items-center gba:justify-center">
              <p style={{ color: 'var(--color-text-secondary)' }}>No entity data available</p>
            </div>
          )}

          {/* Entity Legend */}
          <div className="gba:mt-4 gba:space-y-2">
            {entityDistributionData.map((item, index) => (
              <div key={index} className="gba:flex gba:items-center gba:justify-between">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <div 
                    className="gba:w-3 gba:h-3 gba:rounded-full"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="gba:text-sm" style={{ color: 'var(--color-text-primary)' }}>
                    {item.name}
                  </span>
                </div>
                <span className="gba:text-sm gba:font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {item.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Second row for timeline and additional chart */}
      <div className="gba:grid gba:grid-cols-1 gba:gap-6">
                       {/* Chart 3: Cumulative Growth Timeline */}
               {timelineChartData.length > 0 ? (
                 <Card className="gba:p-6" data-testid="cumulative-growth-chart">
                   <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
              <h4 className="gba:text-md gba:font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Cumulative Entity Growth
              </h4>
              
              {/* Line Visibility Filters */}
              <div className="gba:flex gba:items-center gba:gap-4">
                <div className="gba:flex gba:items-center gba:gap-1">
                  <EyeOutlined style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }} />
                  <span className="gba:text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Show Lines:
                  </span>
                </div>
                
                <div className="gba:flex gba:items-center gba:gap-3">
                  {[
                    { key: 'leads', label: 'Total Leads', color: '#1890ff' },
                    { key: 'accounts', label: 'Total Accounts', color: '#52c41a' },
                    { key: 'contacts', label: 'Total Contacts', color: '#fa8c16' },
                    { key: 'opportunities', label: 'Total Opportunities', color: '#722ed1' }
                  ].map(({ key, label, color }) => (
                    <div
                      key={key}
                      className="gba:flex gba:items-center gba:gap-1 gba:cursor-pointer gba:select-none"
                      onClick={() => toggleLineVisibility(key as keyof typeof visibleLines)}
                      data-testid={`toggle-${key}-line`}
                    >
                      <input
                        type="checkbox"
                        checked={visibleLines[key as keyof typeof visibleLines]}
                        onChange={() => toggleLineVisibility(key as keyof typeof visibleLines)}
                        className="gba:w-3 gba:h-3"
                        style={{ accentColor: color }}
                      />
                      <div
                        className="gba:w-3 gba:h-3 gba:rounded-full"
                        style={{ backgroundColor: color }}
                      ></div>
                      <span className="gba:text-xs" style={{ color: 'var(--color-text-primary)' }}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="gba:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-default)" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    stroke="var(--color-text-secondary)"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="var(--color-text-secondary)"
                    tickFormatter={(value) => Math.floor(value).toString()}
                    domain={[0, 'dataMax']}
                    allowDecimals={false}
                  />
                  <Tooltip
                    formatter={renderLineTooltip}
                    labelFormatter={(label) => `Date: ${label}`}
                    contentStyle={{
                      backgroundColor: 'var(--color-surface-primary)',
                      border: '1px solid var(--color-border-default)',
                      borderRadius: 'var(--border-radius-sm)',
                      fontSize: '12px'
                    }}
                  />
                  {visibleLines.leads && (
                    <Line 
                      type="monotone" 
                      dataKey="cumulativeLeads" 
                      stroke="#1890ff" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="Leads"
                    />
                  )}
                  {visibleLines.accounts && (
                    <Line 
                      type="monotone" 
                      dataKey="cumulativeAccounts" 
                      stroke="#52c41a" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="Accounts"
                    />
                  )}
                  {visibleLines.contacts && (
                    <Line 
                      type="monotone" 
                      dataKey="cumulativeContacts" 
                      stroke="#fa8c16" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="Contacts"
                    />
                  )}
                  {visibleLines.opportunities && (
                    <Line 
                      type="monotone" 
                      dataKey="cumulativeOpportunities" 
                      stroke="#722ed1" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="Opportunities"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        ) : (
          <Card className="gba:p-6" data-testid="cumulative-growth-chart-empty">
            <h4 className="gba:text-md gba:font-semibold gba:mb-4" style={{ color: 'var(--color-text-primary)' }}>
              Cumulative Entity Growth
            </h4>
            <div className="gba:h-80 gba:flex gba:items-center gba:justify-center">
              <p style={{ color: 'var(--color-text-secondary)' }}>No timeline data available</p>
            </div>
          </Card>
        )}

        {/* Chart 4: Revenue Performance Timeline */}
        <Card className="gba:p-6" data-testid="revenue-performance-chart">
          <h4 className="gba:text-md gba:font-semibold gba:mb-4" style={{ color: 'var(--color-text-primary)' }}>
            Revenue Performance Over Time
          </h4>
          
          {timelineChartData.length > 0 ? (
            <div className="gba:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-default)" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    stroke="var(--color-text-secondary)"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="var(--color-text-secondary)"
                    tickFormatter={(value) => formatCurrency(value)}
                    domain={[0, 'dataMax']}
                  />
                  <Tooltip
                    formatter={(value: any, name: any) => [formatCurrency(Number(value)), 'Revenue']}
                    labelFormatter={(label) => `Date: ${label}`}
                    contentStyle={{
                      backgroundColor: 'var(--color-surface-primary)',
                      border: '1px solid var(--color-border-default)',
                      borderRadius: 'var(--border-radius-sm)',
                      fontSize: '12px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cumulativeRevenue" 
                    stroke="#52c41a" 
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#52c41a' }}
                    name="Revenue"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="gba:h-80 gba:flex gba:items-center gba:justify-center">
              <p style={{ color: 'var(--color-text-secondary)' }}>No timeline data available</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default CampaignRevenueCharts;
