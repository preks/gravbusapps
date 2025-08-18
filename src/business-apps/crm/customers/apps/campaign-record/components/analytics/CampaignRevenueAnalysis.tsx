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

  return (
    <div data-testid="campaign-revenue-analysis-container">
      {/* Charts */}
      <CampaignRevenueCharts
        metrics={metrics}
        timelineData={timelineData}
      />
    </div>
  );
};

export default CampaignRevenueAnalysis;
