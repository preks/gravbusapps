import React from 'react';
import { Spinner } from '@newwork/nw-design-system';
import { CalendarOutlined, TagOutlined } from '@ant-design/icons';
import { Badge } from '@newwork/nw-design-system';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { CampaignHeaderProps } from '../types';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import dayjs from 'dayjs';

const CampaignHeader: React.FC<CampaignHeaderProps> = ({ campaign, isLoading, accessToken }) => {
  // (no single-date display in header)

  // Helper function to calculate campaign duration
  const calculateDuration = (startDate?: string, endDate?: string): string => {
    if (!startDate || !endDate) return '-';
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    const duration = end.diff(start, 'day');
    return `${duration} days`;
  };

  // Helper to format date range
  const formatDateRange = (startDate?: string, endDate?: string): string => {
    if (!startDate || !endDate) return '-';
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    const left = start.format('DD MMM');
    const right = end.format('DD MMM YYYY');
    return `${left} – ${right}`;
  };

  // Helper function to get campaign status
  const getCampaignStatus = (startDate?: string, endDate?: string): { status: string; color: string } => {
    if (!startDate || !endDate) return { status: 'Unknown', color: '#6B7280' };
    
    const now = dayjs();
    const start = dayjs(startDate);
    const end = dayjs(endDate);

    if (now.isBefore(start)) {
      return { status: 'Upcoming', color: '#F59E0B' };
    } else if (now.isAfter(end)) {
      return { status: 'Completed', color: '#10B981' };
    } else {
      return { status: 'Active', color: '#3B82F6' };
    }
  };

  if (isLoading) {
    return (
      <div className="gba:p-6" data-testid="campaign-header-loading" style={{ backgroundColor: 'white', borderRadius: '8px' }}>
        <div className="gba:flex gba:justify-center gba:items-center gba:h-32">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="gba:p-6" data-testid="campaign-header-error" style={{ backgroundColor: 'white', borderRadius: '8px' }}>
        <div className="gba:text-center" style={{ color: 'var(--color-text-secondary)' }}>
          {getTranslationFromI18nKeyAndLabel('campaign.header.notFound', 'Campaign not found')}
        </div>
      </div>
    );
  }

  const statusInfo = getCampaignStatus(campaign.startDate, campaign.endDate);

  return (
    <div className="gba:account-header" style={{ marginBottom: '24px', backgroundColor: 'white', borderRadius: '8px', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }} data-testid="campaign-header-title">
              {campaign.name}
            </div>
            <div style={{ color: '#8c8c8c', fontSize: '14px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px', flexWrap: 'nowrap' }}>
              <span className="gba:flex gba:items-center gba:gap-2">
                <TagOutlined />
                {campaign.type?.value || 'Unknown Type'}
              </span>
              <span className="gba:flex gba:items-center gba:gap-2">
                <CalendarOutlined />
                {calculateDuration(campaign.startDate, campaign.endDate)}
              </span>
              <span className="gba:flex gba:items-center gba:gap-2">
                <CalendarOutlined />
                {formatDateRange(campaign.startDate, campaign.endDate)}
              </span>
              <Badge
                variant={statusInfo.status === 'Active' ? 'success' : statusInfo.status === 'Upcoming' ? 'pending' : statusInfo.status === 'Completed' ? 'default' : 'secondary'}
                data-testid="campaign-header-status-badge"
              >
                {statusInfo.status}
              </Badge>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {accessToken && (
            <AppActionButton
              data-testid="campaign-record-action-button"
              contextsArray={[]}
              staticFlowData={[]}
              prefixDataTestId="campaign-record-action"
              accessToken={accessToken}
              emptyStateBehavior="enable"
              deferMainContextRequestsUntilClick
            >
              Actions
            </AppActionButton>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignHeader;
