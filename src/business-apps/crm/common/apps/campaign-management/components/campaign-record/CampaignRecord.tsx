import React from 'react';
import { PageLayout } from '@/components/layout/pageLayout';
import { useCampaignRecord, useCampaignKPIs } from './hooks';
import { 
  CampaignHeader, 
  CampaignKPIs, 
  CampaignChart, 
  CampaignEntitiesTable 
} from './components';
import { CampaignRecordProps } from './types';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { BarChartOutlined } from '@ant-design/icons';

const CampaignRecord: React.FC<CampaignRecordProps> = ({
  campaignId,
  onBack,
  ...props
}) => {
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

  return (
    <PageLayout
      headerIcon={<BarChartOutlined />}
      headerLabel={
        campaign?.name || 
        getTranslationFromI18nKeyAndLabel('campaign.record.title', 'Campaign Details')
      }
      contentContainer={
        <div className="gba:space-y-6" data-testid="campaign-record-container">
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
      }
      data-testid="campaign-record-page"
    />
  );
};

export default CampaignRecord;
