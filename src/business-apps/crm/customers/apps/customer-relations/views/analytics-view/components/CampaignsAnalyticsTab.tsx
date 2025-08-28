import React from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCampaignsAnalytics } from './campaigns-analytics';
import CampaignsAnalyticsStatistics from './campaigns-analytics/components/CampaignsAnalyticsStatistics';
import CampaignsPerformanceComparison from './campaigns-analytics/components/CampaignsPerformanceComparison';
import CampaignsTimelineAnalysis from './campaigns-analytics/components/CampaignsTimelineAnalysis';
import CampaignsTopPerformers from './campaigns-analytics/components/CampaignsTopPerformers';
import CampaignsRevenueAnalysis from './campaigns-analytics/components/CampaignsRevenueAnalysis';
import CampaignsRevenueEfficiency from './campaigns-analytics/components/CampaignsRevenueEfficiency';

export interface CampaignsAnalyticsTabProps extends BusinessAppContextProps {}

export const CampaignsAnalyticsTab: React.FC<CampaignsAnalyticsTabProps> = (props) => {
  // Campaigns analytics data
  const {
    analyticsData,
    isLoading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics
  } = useCampaignsAnalytics(props);

  return (
    <div className="gba:space-y-6" data-testid="campaigns-analytics-tab">
      {/* Analytics Statistics */}
      <CampaignsAnalyticsStatistics
        metrics={analyticsData.metrics}
        isLoading={analyticsLoading}
        error={analyticsError}
        onRetry={refetchAnalytics}
      />

      {/* Performance Comparison & Timeline Analysis */}
      <div className="gba:grid gba:grid-cols-1 xl:gba:grid-cols-3 gba:gap-6">
        <div className="gba:col-span-2">
          <CampaignsTimelineAnalysis
            timelineAnalysis={analyticsData.timelineAnalysis}
            isLoading={analyticsLoading}
            error={analyticsError}
            onRetry={refetchAnalytics}
          />
        </div>
        <div className="gba:col-span-1">
          <CampaignsPerformanceComparison
            campaignComparisons={analyticsData.campaignComparisons}
            isLoading={analyticsLoading}
            error={analyticsError}
            onRetry={refetchAnalytics}
          />
        </div>
      </div>

      {/* Revenue Analysis & Efficiency */}
      <div className="gba:grid gba:grid-cols-1 xl:gba:grid-cols-3 gba:gap-6">
        <div className="gba:col-span-2">
          <CampaignsRevenueAnalysis
            campaignComparisons={analyticsData.campaignComparisons}
            isLoading={analyticsLoading}
            error={analyticsError}
            onRetry={refetchAnalytics}
          />
        </div>
        <div className="gba:col-span-1">
          <CampaignsRevenueEfficiency
            campaignComparisons={analyticsData.campaignComparisons}
            isLoading={analyticsLoading}
            error={analyticsError}
            onRetry={refetchAnalytics}
          />
        </div>
      </div>

      {/* Top Performers */}
      <CampaignsTopPerformers
        topCampaigns={analyticsData.topCampaigns}
        topEmployees={analyticsData.topEmployees}
        isLoading={analyticsLoading}
        error={analyticsError}
        onRetry={refetchAnalytics}
      />
    </div>
  );
};
