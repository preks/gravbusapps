import React, { useState } from 'react';
import { PageLayout } from '@/components/layout/pageLayout';
import { Tabs } from 'antd';
import { useCampaignRecord, useCampaignKPIs, useCampaignAnalytics } from './hooks';
import { 
  CampaignHeader, 
  CampaignKPIs, 
  CampaignChart, 
  CampaignEntitiesTable
} from './components';
import CampaignAnalyticsStatistics from './components/analytics/CampaignAnalyticsStatistics';
import CampaignConversionFunnel from './components/analytics/CampaignConversionFunnel';
import CampaignRevenueAnalysis from './components/analytics/CampaignRevenueAnalysis';
import CampaignTopPerformers from './components/analytics/CampaignTopPerformers';
import { CampaignRecordProps } from './types';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { BarChartOutlined, EyeOutlined, LineChartOutlined } from '@ant-design/icons';

const CampaignRecord: React.FC<CampaignRecordProps> = ({
  campaignId,
  onBack,
  ...props
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch campaign record data
  const {
    campaign,
    isLoading: campaignLoading,
    error: campaignError,
    refetch: refetchCampaign
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
      {/* Campaign Header */}
      <div data-testid="campaign-header-section">
        <CampaignHeader
          campaign={campaign}
          isLoading={campaignLoading}
          onBack={onBack}
        />
      </div>

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

      {/* Campaign Entities Table */}
      <div data-testid="campaign-entities-section">
        <div className="gba:mb-4">
          <h2 className="gba:text-xl gba:font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {getTranslationFromI18nKeyAndLabel('campaign.record.entities.title', 'Campaign Entities')}
          </h2>
          <p className="gba:text-sm gba:mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {getTranslationFromI18nKeyAndLabel('campaign.record.entities.description', 'Leads, accounts, contacts, and opportunities associated with this campaign')}
          </p>
        </div>
        <CampaignEntitiesTable
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

      {/* Two-column layout for charts */}
      <div className="gba:grid gba:grid-cols-1 gba:xl:grid-cols-2 gba:gap-8">
        {/* Conversion Funnel */}
        <div data-testid="campaign-conversion-funnel-section">
          <CampaignConversionFunnel
            funnelData={analyticsData.conversionFunnel}
            isLoading={analyticsLoading}
            error={analyticsError}
            onRetry={refetchAnalytics}
          />
        </div>

        {/* Revenue Analysis */}
        <div data-testid="campaign-revenue-analysis-section">
          <CampaignRevenueAnalysis
            metrics={analyticsData.metrics}
            timelineData={analyticsData.timelineAnalysis}
            isLoading={analyticsLoading}
            error={analyticsError}
            onRetry={refetchAnalytics}
          />
        </div>
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
    <PageLayout
      headerIcon={<BarChartOutlined />}
      headerLabel={
        campaign?.name || 
        getTranslationFromI18nKeyAndLabel('campaign.record.title', 'Campaign Details')
      }
      contentContainer={
        <div data-testid="campaign-record-container">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
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
      }
      data-testid="campaign-record-page"
    />
  );
};

export default CampaignRecord;
