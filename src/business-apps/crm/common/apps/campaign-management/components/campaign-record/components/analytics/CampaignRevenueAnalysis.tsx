import React from 'react';
import { Alert } from '@newwork/nw-design-system';
import { CampaignAnalyticsMetrics, CampaignTimelineAnalysis } from '../../queries/CampaignAnalyticsQueries';
import CampaignRevenueCharts from './CampaignRevenueCharts';

interface CampaignRevenueAnalysisProps {
  metrics: CampaignAnalyticsMetrics | null;
  timelineData: CampaignTimelineAnalysis | null;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const CampaignRevenueAnalysis: React.FC<CampaignRevenueAnalysisProps> = ({
  metrics,
  timelineData,
  isLoading = false,
  error = null,
  onRetry
}) => {
  if (isLoading) {
    return (
      <div className="gba:p-8 gba:text-center" data-testid="revenue-analysis-loading">
        <div className="gba:animate-spin gba:rounded-full gba:h-8 gba:w-8 gba:border-b-2 gba:mx-auto gba:mb-4" 
             style={{ borderColor: 'var(--color-primary-500)' }}>
        </div>
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading revenue analysis...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        variant="destructive"
        title="Error Loading Revenue Analysis"
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
              data-testid="revenue-analysis-retry-button"
            >
              Retry
            </button>
          )
        }
        data-testid="revenue-analysis-error-alert"
      />
    );
  }

  // Format currency values
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount);
  };

  return (
    <div className="gba:space-y-6" data-testid="campaign-revenue-analysis-container">
      {/* Header */}
      <div>
        <h3 className="gba:text-lg gba:font-semibold gba:mb-2" style={{ color: 'var(--color-text-primary)' }}>
          Revenue & Growth Analysis
        </h3>
        <p className="gba:text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Revenue performance and entity growth trends over time
        </p>
      </div>

      {/* Charts */}
      <CampaignRevenueCharts
        metrics={metrics}
        timelineData={timelineData}
      />

      {/* Key Insights */}
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4">
        <div 
          className="gba:p-4" 
          style={{ 
            backgroundColor: 'var(--color-surface-secondary)', 
            borderRadius: 'var(--border-radius-md)' 
          }}
        >
          <h4 className="gba:text-sm gba:font-semibold gba:mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Revenue Performance
          </h4>
          <div className="gba:text-lg gba:font-bold gba:mb-1" style={{ color: 'var(--color-success-500)' }}>
            {formatCurrency(metrics?.revenueMetrics.wonRevenue || 0)}
          </div>
          <p className="gba:text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Total won revenue
          </p>
        </div>
        
        <div 
          className="gba:p-4" 
          style={{ 
            backgroundColor: 'var(--color-surface-secondary)', 
            borderRadius: 'var(--border-radius-md)' 
          }}
        >
          <h4 className="gba:text-sm gba:font-semibold gba:mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Win Rate
          </h4>
          <div className="gba:text-lg gba:font-bold gba:mb-1" style={{ color: 'var(--color-primary-500)' }}>
            {(metrics?.revenueMetrics.winRate || 0).toFixed(1)}%
          </div>
          <p className="gba:text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Opportunity win rate
          </p>
        </div>
        
        <div 
          className="gba:p-4" 
          style={{ 
            backgroundColor: 'var(--color-surface-secondary)', 
            borderRadius: 'var(--border-radius-md)' 
          }}
        >
          <h4 className="gba:text-sm gba:font-semibold gba:mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Avg Deal Size
          </h4>
          <div className="gba:text-lg gba:font-bold gba:mb-1" style={{ color: 'var(--color-warning-500)' }}>
            {formatCurrency(metrics?.revenueMetrics.averageDealSize || 0)}
          </div>
          <p className="gba:text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Average opportunity value
          </p>
        </div>
      </div>
    </div>
  );
};

export default CampaignRevenueAnalysis;
