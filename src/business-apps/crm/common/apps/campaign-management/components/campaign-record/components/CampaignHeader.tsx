import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Spinner } from '@newwork/nw-design-system';
import { ArrowLeftOutlined, CalendarOutlined, TagOutlined } from '@ant-design/icons';
import { CampaignHeaderProps } from '../types';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import dayjs from 'dayjs';

const CampaignHeader: React.FC<CampaignHeaderProps> = ({
  campaign,
  isLoading,
  onBack
}) => {
  // Helper function to format date
  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    return dayjs(dateString).format('DD MMM YYYY');
  };

  // Helper function to calculate campaign duration
  const calculateDuration = (startDate?: string, endDate?: string): string => {
    if (!startDate || !endDate) return '-';
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    const duration = end.diff(start, 'day');
    return `${duration} days`;
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
      <Card data-testid="campaign-header-loading">
        <CardContent className="gba:p-6">
          <div className="gba:flex gba:justify-center gba:items-center gba:h-32">
            <Spinner size="lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!campaign) {
    return (
      <Card data-testid="campaign-header-error">
        <CardContent className="gba:p-6">
          <div className="gba:text-center" style={{ color: 'var(--color-text-secondary)' }}>
            {getTranslationFromI18nKeyAndLabel('campaign.header.notFound', 'Campaign not found')}
          </div>
        </CardContent>
      </Card>
    );
  }

  const { status, color } = getCampaignStatus(campaign.startDate, campaign.endDate);

  return (
    <Card data-testid="campaign-header">
      <CardHeader className="gba:pb-0">
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-4">
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                data-testid="campaign-header-back-button"
                className="gba:p-2"
              >
                <ArrowLeftOutlined />
              </Button>
            )}
            <div>
              <CardTitle className="gba:text-2xl gba:font-bold gba:mb-2" data-testid="campaign-header-title">
                {campaign.name}
              </CardTitle>
              <div className="gba:flex gba:items-center gba:gap-4 gba:text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <div className="gba:flex gba:items-center gba:gap-1" data-testid="campaign-header-type">
                  <TagOutlined />
                  <span>{campaign.type?.value || 'Unknown Type'}</span>
                </div>
                <div className="gba:flex gba:items-center gba:gap-1" data-testid="campaign-header-duration">
                  <CalendarOutlined />
                  <span>{calculateDuration(campaign.startDate, campaign.endDate)}</span>
                </div>
                <div 
                  className="gba:px-3 gba:py-1 gba:rounded-full gba:text-xs gba:font-medium gba:shadow-sm"
                  style={{ 
                    backgroundColor: color, 
                    color: 'white',
                    border: `1px solid ${color}`,
                    minWidth: '60px',
                    textAlign: 'center'
                  }}
                  data-testid="campaign-header-status"
                >
                  {status}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="gba:pt-4">
        <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-3 gba:gap-6">
          {/* Start Date */}
          <div data-testid="campaign-header-start-date">
            <div className="gba:text-sm gba:font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {getTranslationFromI18nKeyAndLabel('campaign.header.startDate', 'Start Date')}
            </div>
            <div className="gba:text-lg gba:font-semibold gba:mt-1">
              {formatDate(campaign.startDate)}
            </div>
          </div>

          {/* End Date */}
          <div data-testid="campaign-header-end-date">
            <div className="gba:text-sm gba:font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {getTranslationFromI18nKeyAndLabel('campaign.header.endDate', 'End Date')}
            </div>
            <div className="gba:text-lg gba:font-semibold gba:mt-1">
              {formatDate(campaign.endDate)}
            </div>
          </div>

          {/* Duration */}
          <div data-testid="campaign-header-duration-detail">
            <div className="gba:text-sm gba:font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {getTranslationFromI18nKeyAndLabel('campaign.header.duration', 'Duration')}
            </div>
            <div className="gba:text-lg gba:font-semibold gba:mt-1">
              {calculateDuration(campaign.startDate, campaign.endDate)}
            </div>
          </div>
        </div>

        {/* Description */}
        {campaign.description && (
          <div className="gba:mt-6 gba:pt-4" style={{ borderTop: '1px solid var(--color-border-default)' }}>
            <div className="gba:text-sm gba:font-medium gba:mb-2" style={{ color: 'var(--color-text-primary)' }}>
              {getTranslationFromI18nKeyAndLabel('campaign.header.description', 'Description')}
            </div>
            <div 
              className="gba:text-base gba:leading-relaxed" 
              style={{ color: 'var(--color-text-secondary)' }}
              data-testid="campaign-header-description"
            >
              {campaign.description}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CampaignHeader;
