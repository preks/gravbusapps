import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Spinner, Alert, AlertDescription, Button } from '@newwork/nw-design-system';
import { 
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  Legend,
  Cell,
  Treemap
} from 'recharts';
import { ThunderboltOutlined, DotChartOutlined, BarChartOutlined, AppstoreOutlined } from '@ant-design/icons';
import { CampaignsAnalyticsComponentProps } from '../types/CampaignsAnalyticsTypes';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

const CampaignsRevenueEfficiency: React.FC<CampaignsAnalyticsComponentProps> = ({
  campaignComparisons = [],
  isLoading = false,
  error = null,
  onRetry
}) => {
  const [chartType, setChartType] = useState<'scatter' | 'composed' | 'treemap'>('scatter');

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount);
  };

  // Prepare efficiency data with better filtering
  const efficiencyData = campaignComparisons
    .filter(campaign => 
      campaign.totalRevenue > 0 && 
      campaign.leadsCount > 0 && 
      campaign.opportunitiesCount > 0
    )
    .map(campaign => ({
      name: campaign.campaignName.length > 20 
        ? campaign.campaignName.substring(0, 20) + '...' 
        : campaign.campaignName,
      fullName: campaign.campaignName,
      revenue: campaign.totalRevenue,
      winRate: campaign.winRate,
      conversionRate: campaign.conversionRate,
      leadsCount: campaign.leadsCount,
      opportunitiesCount: campaign.opportunitiesCount,
      wonOpportunitiesCount: campaign.wonOpportunitiesCount,
      // Efficiency metrics
      revenuePerLead: campaign.leadsCount > 0 ? campaign.totalRevenue / campaign.leadsCount : 0,
      revenuePerOpportunity: campaign.opportunitiesCount > 0 ? campaign.totalRevenue / campaign.opportunitiesCount : 0,
      revenuePerWonOpportunity: campaign.wonOpportunitiesCount > 0 ? campaign.totalRevenue / campaign.wonOpportunitiesCount : 0,
      // ROI efficiency score (combination of conversion and win rates)
      efficiencyScore: (campaign.conversionRate + campaign.winRate) / 2,
      // Size for bubble chart
      size: campaign.leadsCount,
      status: campaign.status,
    }))
    .sort((a, b) => b.efficiencyScore - a.efficiencyScore);

  // Treemap data - represent revenue contribution by campaign size
  const treemapData = efficiencyData.map((campaign, index) => ({
    name: campaign.name,
    fullName: campaign.fullName,
    size: campaign.revenue,
    value: campaign.revenue,
    fill: `hsl(${120 + (index * 30)}, 70%, 50%)`, // Dynamic colors
    revenuePerLead: campaign.revenuePerLead,
    efficiencyScore: campaign.efficiencyScore,
  }));

  // Custom tooltips
  const ScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="gba:bg-white gba:p-3 gba:border gba:rounded-lg gba:shadow-lg">
          <p className="gba:font-semibold gba:mb-2">{data.fullName}</p>
          <div className="gba:space-y-1">
            <p className="gba:text-sm">
              <span className="gba:text-green-600">Revenue/Lead:</span> {formatCurrency(data.revenuePerLead)}
            </p>
            <p className="gba:text-sm">
              <span className="gba:text-blue-600">Win Rate:</span> {data.winRate.toFixed(1)}%
            </p>
            <p className="gba:text-sm">
              <span className="gba:text-purple-600">Efficiency Score:</span> {data.efficiencyScore.toFixed(1)}%
            </p>
            <p className="gba:text-sm">
              <span className="gba:text-orange-600">Total Leads:</span> {data.leadsCount}
            </p>
            <p className="gba:text-sm">
              <span className="gba:text-red-600">Total Revenue:</span> {formatCurrency(data.revenue)}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const TreemapTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const totalRevenue = treemapData.reduce((sum, item) => sum + item.size, 0);
      const percentage = ((data.size / totalRevenue) * 100).toFixed(1);
      return (
        <div className="gba:bg-white gba:p-3 gba:border gba:rounded-lg gba:shadow-lg">
          <p className="gba:font-semibold gba:mb-2">{data.fullName}</p>
          <div className="gba:space-y-1">
            <p className="gba:text-sm">
              <span className="gba:text-green-600">Revenue:</span> {formatCurrency(data.size)} ({percentage}%)
            </p>
            <p className="gba:text-sm">
              <span className="gba:text-blue-600">Revenue/Lead:</span> {formatCurrency(data.revenuePerLead)}
            </p>
            <p className="gba:text-sm">
              <span className="gba:text-purple-600">Efficiency Score:</span> {data.efficiencyScore.toFixed(1)}%
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const ComposedTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="gba:bg-white gba:p-3 gba:border gba:rounded-lg gba:shadow-lg">
          <p className="gba:font-semibold gba:mb-2">{data.fullName}</p>
          <div className="gba:space-y-1">
            <p className="gba:text-sm">
              <span className="gba:text-green-600">Revenue/Lead:</span> {formatCurrency(data.revenuePerLead)}
            </p>
            <p className="gba:text-sm">
              <span className="gba:text-blue-600">Revenue/Opp:</span> {formatCurrency(data.revenuePerOpportunity)}
            </p>
            <p className="gba:text-sm">
              <span className="gba:text-purple-600">Efficiency Score:</span> {data.efficiencyScore.toFixed(1)}%
            </p>
            <p className="gba:text-sm">
              <span className="gba:text-orange-600">Total Revenue:</span> {formatCurrency(data.revenue)}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    switch (chartType) {
      case 'scatter':
        return (
          <div className="gba:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart data={efficiencyData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                <XAxis 
                  type="number" 
                  dataKey="revenuePerLead" 
                  name="Revenue per Lead"
                  tickFormatter={formatCurrency}
                  label={{ value: 'Revenue per Lead', position: 'insideBottom', offset: -10 }}
                />
                <YAxis 
                  type="number" 
                  dataKey="winRate" 
                  name="Win Rate"
                  label={{ value: 'Win Rate (%)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<ScatterTooltip />} />
                <Scatter 
                  name="Campaigns" 
                  dataKey="winRate" 
                  fill="#8B5CF6"
                >
                  {efficiencyData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={`hsl(${120 + (entry.efficiencyScore * 2)}, 70%, 50%)`}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        );

      case 'composed':
        return (
          <div className="gba:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={efficiencyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                />
                <YAxis yAxisId="revenue" orientation="left" tickFormatter={formatCurrency} />
                <YAxis yAxisId="score" orientation="right" domain={[0, 100]} />
                <Tooltip content={<ComposedTooltip />} />
                <Legend />
                <Bar 
                  yAxisId="revenue" 
                  dataKey="revenuePerLead" 
                  fill="#10B981" 
                  name="Revenue per Lead"
                  radius={[4, 4, 0, 0]}
                />
                <Line 
                  yAxisId="score" 
                  type="monotone" 
                  dataKey="efficiencyScore" 
                  stroke="#8B5CF6" 
                  strokeWidth={3}
                  name="Efficiency Score (%)"
                  dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        );

      case 'treemap':
        return (
          <div className="gba:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={treemapData}
                dataKey="size"
                aspectRatio={4/3}
                stroke="#fff"
                strokeWidth={2}
                content={({ root, depth, x, y, width, height, index, payload }) => {
                  if (depth === 1 && payload) {
                    return (
                      <g>
                        <rect
                          x={x}
                          y={y}
                          width={width}
                          height={height}
                          style={{
                            fill: payload.fill || '#8B5CF6',
                            stroke: '#fff',
                            strokeWidth: 2,
                            fillOpacity: 0.8
                          }}
                        />
                        {width > 50 && height > 30 && payload.name && (
                          <text
                            x={x + width / 2}
                            y={y + height / 2 - 10}
                            textAnchor="middle"
                            fill="#fff"
                            fontSize="12"
                            fontWeight="bold"
                          >
                            {payload.name}
                          </text>
                        )}
                        {width > 80 && height > 50 && payload.size && (
                          <text
                            x={x + width / 2}
                            y={y + height / 2 + 5}
                            textAnchor="middle"
                            fill="#fff"
                            fontSize="10"
                          >
                            {formatCurrency(payload.size)}
                          </text>
                        )}
                      </g>
                    );
                  }
                  return null;
                }}
              >
                <Tooltip content={<TreemapTooltip />} />
              </Treemap>
            </ResponsiveContainer>
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card data-testid="campaigns-revenue-efficiency-loading">
        <CardContent className="gba:p-6">
          <div className="gba:flex gba:justify-center gba:items-center gba:h-96">
            <Spinner size="lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card data-testid="campaigns-revenue-efficiency-error">
        <CardContent className="gba:p-6">
          <Alert variant="destructive">
            <AlertDescription>
              {getTranslationFromI18nKeyAndLabel('campaigns.analytics.revenueEfficiency.error', 'Error loading revenue efficiency data')}
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="gba:ml-2"
                >
                  {getTranslationFromI18nKeyAndLabel('common.retry', 'Retry')}
                </Button>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="campaigns-revenue-efficiency">
      <CardHeader>
        <div className="gba:flex gba:justify-between gba:items-center">
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <ThunderboltOutlined style={{ color: '#8B5CF6' }} />
            {getTranslationFromI18nKeyAndLabel('campaigns.analytics.revenueEfficiency.title', 'Revenue Efficiency Analysis')}
          </CardTitle>
          <div className="gba:flex gba:gap-2">
            <Button
              variant={chartType === 'scatter' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('scatter')}
              className="gba:flex gba:items-center gba:gap-1"
            >
              <DotChartOutlined />
              Scatter
            </Button>
            <Button
              variant={chartType === 'composed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('composed')}
              className="gba:flex gba:items-center gba:gap-1"
            >
              <BarChartOutlined />
              Composed
            </Button>
            <Button
              variant={chartType === 'treemap' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('treemap')}
              className="gba:flex gba:items-center gba:gap-1"
            >
              <AppstoreOutlined />
              Treemap
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="gba:p-6">
        {efficiencyData.length === 0 ? (
          <div className="gba:text-center gba:py-8" style={{ color: 'var(--color-text-secondary)' }}>
            {getTranslationFromI18nKeyAndLabel('campaigns.analytics.revenueEfficiency.noData', 'No efficiency data available - need campaigns with both leads and revenue')}
          </div>
        ) : treemapData.length === 0 && chartType === 'treemap' ? (
          <div className="gba:text-center gba:py-8" style={{ color: 'var(--color-text-secondary)' }}>
            {getTranslationFromI18nKeyAndLabel('campaigns.analytics.revenueEfficiency.noTreemapData', 'No treemap data available for visualization')}
          </div>
        ) : (
          <>
            {/* Efficiency Insights */}
            <div className="gba:mb-4 gba:p-4 gba:rounded-lg" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
              <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-4 gba:gap-4 gba:text-sm">
                <div className="gba:text-center">
                  <div className="gba:font-semibold" style={{ color: 'var(--color-success-600)' }}>
                    {efficiencyData.length > 0 ? formatCurrency(Math.max(...efficiencyData.map(c => c.revenuePerLead))) : '$0'}
                  </div>
                  <div style={{ color: 'var(--color-text-secondary)' }}>Best Revenue/Lead</div>
                </div>
                <div className="gba:text-center">
                  <div className="gba:font-semibold" style={{ color: 'var(--color-primary-600)' }}>
                    {efficiencyData.length > 0 ? Math.max(...efficiencyData.map(c => c.efficiencyScore)).toFixed(1) : '0.0'}%
                  </div>
                  <div style={{ color: 'var(--color-text-secondary)' }}>Top Efficiency Score</div>
                </div>
                <div className="gba:text-center">
                  <div className="gba:font-semibold" style={{ color: 'var(--color-warning-600)' }}>
                    {efficiencyData.length > 0 ? formatCurrency(efficiencyData.reduce((sum, c) => sum + c.revenuePerLead, 0) / efficiencyData.length) : '$0'}
                  </div>
                  <div style={{ color: 'var(--color-text-secondary)' }}>Avg Revenue/Lead</div>
                </div>
                <div className="gba:text-center">
                  <div className="gba:font-semibold" style={{ color: 'var(--color-purple-600)' }}>
                    {efficiencyData[0]?.name || 'N/A'}
                  </div>
                  <div style={{ color: 'var(--color-text-secondary)' }}>Most Efficient</div>
                </div>
              </div>
            </div>

            {renderChart()}

            {/* Chart explanation */}
            <div className="gba:mt-4 gba:text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {chartType === 'scatter' && (
                <p><strong>Scatter Plot:</strong> Revenue per Lead vs Win Rate. Color intensity indicates efficiency score. Top-right quadrant shows best performers.</p>
              )}
              {chartType === 'composed' && (
                <p><strong>Composed Chart:</strong> Green bars show revenue per lead (left axis), purple line shows efficiency score (right axis).</p>
              )}
              {chartType === 'treemap' && (
                <p><strong>Treemap:</strong> Rectangle size represents total revenue. Hover to see efficiency metrics for each campaign.</p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CampaignsRevenueEfficiency;
