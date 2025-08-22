import React, { useState, useEffect, useCallback, useMemo } from 'react';
// Removed PageLayout usage for this screen per requirement
import { Tabs } from 'antd';
import { useCampaignRecord, useCampaignKPIs, useCampaignAnalytics } from './hooks';
import { 
  CampaignKPIs as CampaignKPIsComponent, 
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
import { navigateTo } from '@/common/utils/navigationUtils';
import { Eye, ChartLine, ArrowLeft } from '@phosphor-icons/react';
// dayjs no longer needed in this file after removing PageLayout inline info

interface CampaignRecordComponentProps extends CampaignRecordProps {}

const CampaignRecord: React.FC<CampaignRecordComponentProps> = ({
  campaignId: propCampaignId,
  source: propSource,
  onBack,
  activeTab: initialActiveTab = 'overview',
  onTabChange,
  ...props
}) => {
  const [activeTab, setActiveTab] = useState(initialActiveTab);

  // Get campaignId from props or URL parameters
  const getCampaignIdFromUrl = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('campaignId');
  }, []);
  
  // Get source parameter for proper back navigation
  const source = useMemo(() => {
    return propSource || new URLSearchParams(window.location.search).get('source');
  }, [propSource]);
  
  const campaignId = propCampaignId || getCampaignIdFromUrl();

  // Back button functionality
  const getBackButtonText = () => {
    return 'Back to Campaigns';
  };

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    } else {
      // Navigate back based on source parameter (similar to other record components)
      switch (source) {
        case 'customer-relations':
        default:
          navigateTo('/platform/crm/customer-relations?view=campaigns');
          break;
      }
    }
  }, [onBack, source]);

  // Handle missing campaignId
  if (!campaignId) {
    return (
      <div data-testid="campaign-record-error" style={{ padding: '24px', textAlign: 'center' }}>
        <h2>Campaign Not Found</h2>
        <p>No campaign ID provided. Please navigate back to the campaign list.</p>
        <button 
          onClick={handleBack} 
          style={{ 
            marginTop: '16px', 
            padding: '8px 16px',
            backgroundColor: '#1890ff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {getBackButtonText()}
        </button>
      </div>
    );
  }

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
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-center">
          <p className="gba:text-red-500 gba:text-lg">{campaignError || 'Campaign not found'}</p>
          <p className="gba:text-gray-600">Campaign ID: {campaignId}</p>
          <button
            onClick={handleBack}
            className="gba:mt-4 gba:px-4 gba:py-2 gba:bg-blue-500 gba:text-white gba:rounded gba:hover:bg-blue-600"
            data-testid="campaign-error-back-button"
          >
            {getBackButtonText()}
          </button>
        </div>
      </div>
    );
  }

  // Overview Tab Content
  const OverviewTab = () => (
    <div className="gba:space-y-6" data-testid="campaign-overview-container">
      {/* Campaign KPIs */}
      <div data-testid="campaign-kpis-section">
                    <CampaignKPIsComponent
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
    <div className="gba:w-full" style={{ backgroundColor: 'white', padding: '16px' }}>
      {/* Back navigation */}
      <div className="gba:back-navigation" style={{ marginBottom: '16px' }}>
        <button
          onClick={handleBack}
          className="gba:flex gba:items-center gba:text-blue-500 gba:hover:text-blue-600"
          data-testid="campaign-record-back-button"
        >
          <ArrowLeft className="gba:mr-2" />
          <span>{getBackButtonText()}</span>
        </button>
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
                  <Eye />
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
                  <ChartLine />
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
