import React, { useState, useEffect, useCallback } from 'react';
// Removed PageLayout usage for this screen per requirement
import { Tabs } from 'antd';
import { useCampaignRecord, useCampaignKPIs, useCampaignAnalytics } from './hooks';
import { 
  CampaignKPIs, 
  CampaignChart, 
  CampaignEntitiesSection,
  CampaignHeader
} from './components';
import CampaignAnalyticsStatistics from './components/analytics/CampaignAnalyticsStatistics';
import CampaignConversionFunnel from './components/analytics/CampaignConversionFunnel';
import CampaignRevenueAnalysis from './components/analytics/CampaignRevenueAnalysis';
import CampaignTopPerformers from './components/analytics/CampaignTopPerformers';
import { CampaignRecordProps } from './types';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { EyeOutlined, LineChartOutlined } from '@ant-design/icons';
// dayjs no longer needed in this file after removing PageLayout inline info

interface CampaignRecordComponentProps extends CampaignRecordProps {}

const CampaignRecord: React.FC<CampaignRecordComponentProps> = ({
  campaignId,
  onBack,
  activeTab: initialActiveTab = 'overview',
  onTabChange,
  ...props
}) => {
  const [activeTab, setActiveTab] = useState(initialActiveTab);

  // Update local state when prop changes
  useEffect(() => {
    setActiveTab(initialActiveTab);
  }, [initialActiveTab]);

  // Handle tab change
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  }, [onTabChange]);

  // Fetch campaign record data
  const {
    campaign,
    isLoading: campaignLoading,
    error: campaignError
  } = useCampaignRecord(props, campaignId);

  // Fetch campaign KPIs data
  const {
    kpis,
    kpisWithTrends,
    isLoading: kpisLoading,
    error: kpisError,
    refetch: refetchKPIs
  } = useCampaignKPIs(props, campaignId);

  // Fetch campaign analytics data
  const {
    analyticsData,
    isLoading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics
  } = useCampaignAnalytics(props, campaignId);

  // Handle campaign error
  if (campaignError) {
    return (
      <div className="gba:p-8">
        <h1>Campaign Error</h1>
        <p>Error: {campaignError}</p>
        <p>Campaign ID: {campaignId}</p>
        <button onClick={onBack}>Back to List</button>
      </div>
    );
  }

  // Overview Tab Content
  const OverviewTab = () => (
    <div className="gba:space-y-6" data-testid="campaign-overview-container">
      {/* Campaign KPIs */}
      <div data-testid="campaign-kpis-section">
        <CampaignKPIs
          kpis={kpis}
          kpisWithTrends={kpisWithTrends}
          isLoading={kpisLoading}
          error={kpisError}
          onRetry={refetchKPIs}
        />
      </div>

      {/* Campaign Chart */}
      <div data-testid="campaign-chart-section">
        <CampaignChart
          campaignId={campaignId}
          campaign={campaign}
          {...props}
        />
      </div>

      {/* Campaign Entities Section */}
      <div className="gba:pb-6" data-testid="campaign-entities-section">
        <CampaignEntitiesSection
          campaignId={campaignId}
          {...props}
        />
      </div>
    </div>
  );

  // Analytics Tab Content
  const AnalyticsTab = () => (
    <div className="gba:space-y-8" data-testid="campaign-analytics-container">
      {/* Analytics Statistics */}
      <div data-testid="campaign-analytics-statistics-section">
        <CampaignAnalyticsStatistics
          metrics={analyticsData.metrics}
          isLoading={analyticsLoading}
          error={analyticsError}
          onRetry={refetchAnalytics}
        />
      </div>

      {/* Full-width layout: stack charts to use page width */}
      <div className="gba:flex gba:flex-col gba:gap-8" data-testid="campaign-analytics-fullwidth">
        <CampaignConversionFunnel
          funnelData={analyticsData.conversionFunnel}
          isLoading={analyticsLoading}
          error={analyticsError}
          onRetry={refetchAnalytics}
        />
        <CampaignRevenueAnalysis
          metrics={analyticsData.metrics}
          timelineData={analyticsData.timelineAnalysis}
          isLoading={analyticsLoading}
          error={analyticsError}
          onRetry={refetchAnalytics}
        />
      </div>

      {/* Top Performers */}
      <div data-testid="campaign-top-performers-section">
        <CampaignTopPerformers
          performers={analyticsData.topPerformers}
          isLoading={analyticsLoading}
          error={analyticsError}
          onRetry={refetchAnalytics}
        />
      </div>
    </div>
  );

  return (
    <div className="gba:w-full">
      <div className="gba:px-6 gba:pt-4 gba:pb-2">
        {onBack && (
          <button
            onClick={onBack}
            className="gba:flex gba:items-center gba:gap-2"
            style={{ color: 'var(--color-primary-600)' }}
            data-testid="campaign-record-back-link"
          >
            ← {getTranslationFromI18nKeyAndLabel('campaigns.header.back', 'Back to Campaigns')}
          </button>
        )}
      </div>

      {/* Header above tabs */}
      <div className="gba:px-6" data-testid="campaign-header-section">
        <CampaignHeader campaign={campaign} isLoading={campaignLoading} accessToken={props.accessToken} />
      </div>

      <div className="gba:px-6 gba:py-2" data-testid="campaign-record-container">
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          className="gba:mb-6"
          data-testid="campaign-record-tabs"
          items={[
            {
              key: 'overview',
              label: (
                <span className="gba:flex gba:items-center gba:gap-2" data-testid="campaign-overview-tab">
                  <EyeOutlined />
                  {getTranslationFromI18nKeyAndLabel('campaign.tabs.overview', 'Overview')}
                </span>
              ),
              children: (
                <div data-testid="campaign-overview-content">
                  <OverviewTab />
                </div>
              )
            },
            {
              key: 'analytics',
              label: (
                <span className="gba:flex gba:items-center gba:gap-2" data-testid="campaign-analytics-tab">
                  <LineChartOutlined />
                  {getTranslationFromI18nKeyAndLabel('campaign.tabs.analytics', 'Analytics')}
                </span>
              ),
              children: (
                <div data-testid="campaign-analytics-content">
                  <AnalyticsTab />
                </div>
              )
            }
          ]}
        />
      </div>
    </div>
  );
};

export default CampaignRecord;
