import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Alert, Card } from '@newwork/nw-design-system';
import { CampaignConversionFunnel } from '../../queries/CampaignAnalyticsQueries';

interface CampaignConversionFunnelProps {
  funnelData: CampaignConversionFunnel | null;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const CampaignConversionFunnelComponent: React.FC<CampaignConversionFunnelProps> = ({
  funnelData,
  isLoading = false,
  error = null,
  onRetry
}) => {
  if (isLoading) {
    return (
      <div className="gba:p-8 gba:text-center" data-testid="funnel-loading">
        <div className="gba:animate-spin gba:rounded-full gba:h-8 gba:w-8 gba:border-b-2 gba:mx-auto gba:mb-4" 
             style={{ borderColor: 'var(--color-primary-500)' }}>
        </div>
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading conversion funnel...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        variant="destructive"
        title="Error Loading Conversion Funnel"
        description={error}
        action={
          onRetry && (
            <button 
              onClick={onRetry}
              className="gba:px-3 gba:py-1 gba:text-sm gba:rounded"
              style={{ 
                backgroundColor: 'var(--color-primary-500)', 
                color: 'var(--color-on-primary)' 
              }}
              data-testid="funnel-retry-button"
            >
              Retry
            </button>
          )
        }
        data-testid="funnel-error-alert"
      />
    );
  }

  if (!funnelData || !funnelData.stages || funnelData.stages.length === 0) {
    return (
      <div className="gba:p-8 gba:text-center" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          No conversion funnel data available.
        </p>
      </div>
    );
  }

  // Colors for funnel stages
  const stageColors = ['#8884d8', '#1890ff', '#52c41a', '#fa8c16', '#722ed1', '#eb2f96'];

  // Format tooltip
  const formatTooltip = (value: any, name: any, props: any) => {
    return [
      <div key="tooltip-content">
        <div>Count: {value}</div>
      </div>,
      'Funnel Stage'
    ];
  };

  return (
    <Card className="gba:p-6" data-testid="campaign-conversion-funnel-container">
      {/* Header */}
      <div className="gba:mb-6">
        <h3 className="gba:text-lg gba:font-semibold gba:mb-2" style={{ color: 'var(--color-text-primary)' }}>
          Conversion Funnel
        </h3>
        <p className="gba:text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Lead progression through the sales funnel
        </p>
      </div>

      {/* Funnel Chart */}
      <div className="gba:h-80 gba:mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={funnelData.stages}
            margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
            maxBarSize={60}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-default)" />
            <XAxis 
              dataKey="stage" 
              tick={{ fontSize: 12 }}
              stroke="var(--color-text-secondary)"
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="var(--color-text-secondary)"
              tickFormatter={(value) => Math.floor(value).toString()}
              domain={[0, 'dataMax']}
              allowDecimals={false}
            />
            <Tooltip
              formatter={formatTooltip}
              contentStyle={{
                backgroundColor: 'var(--color-surface-primary)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 'var(--border-radius-sm)',
                fontSize: '12px'
              }}
              data-testid="funnel-tooltip"
            />
            <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]} maxBarSize={60}>
              {funnelData.stages.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={stageColors[index % stageColors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Funnel Statistics - KPI Style */}
      <div className="gba:grid gba:grid-cols-2 gba:md:grid-cols-3 gba:lg:grid-cols-6 gba:gap-4" data-testid="funnel-kpi-cards">
        {funnelData.stages.map((stage, index) => (
          <div 
            key={stage.stage}
            className="gba:text-center gba:p-4"
            style={{ 
              backgroundColor: 'var(--color-surface-secondary)', 
              borderRadius: 'var(--border-radius-md)',
              border: '1px solid var(--color-border-default)'
            }}
            data-testid={`funnel-kpi-${index}`}
          >
            <div className="gba:flex gba:items-center gba:justify-center gba:mb-2">
              <div 
                className="gba:w-3 gba:h-3 gba:rounded-full gba:mr-2"
                style={{ backgroundColor: stageColors[index % stageColors.length] }}
              ></div>
              <h4 className="gba:text-sm gba:font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {stage.stage}
              </h4>
            </div>
            <div className="gba:text-2xl gba:font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {stage.count.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default CampaignConversionFunnelComponent;
