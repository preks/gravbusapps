import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Spinner, Alert, AlertDescription, Button } from '@newwork/nw-design-system';
import { Tabs } from 'antd';
import { TrophyOutlined, UserOutlined, DollarOutlined, StarOutlined, BarChartOutlined } from '@ant-design/icons';
import { CampaignsAnalyticsComponentProps } from '../types/CampaignsAnalyticsTypes';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

const CampaignsTopPerformers: React.FC<CampaignsAnalyticsComponentProps> = ({
  topCampaigns = [],
  topEmployees = [],
  isLoading = false,
  error = null,
  onRetry
}) => {
  const [activeTab, setActiveTab] = useState('campaigns');

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  // Get rank icon and color
  const getRankDisplay = (rank: number) => {
    if (rank === 1) {
      return { icon: <TrophyOutlined />, color: '#FFD700', bgColor: '#FFF7E6' };
    } else if (rank === 2) {
      return { icon: <StarOutlined />, color: '#C0C0C0', bgColor: '#F6F6F6' };
    } else if (rank === 3) {
      return { icon: <StarOutlined />, color: '#CD7F32', bgColor: '#FFF2E6' };
    } else {
      return { icon: <span className="gba:font-bold">#{rank}</span>, color: 'var(--color-text-secondary)', bgColor: 'var(--color-surface-secondary)' };
    }
  };

  // Campaign performer card component
  const CampaignPerformerCard = ({ campaign, index }: { campaign: any; index: number }) => {
    const rankDisplay = getRankDisplay(campaign.rank);
    
    return (
      <div
        key={campaign.campaignId}
        className="gba:p-4 gba:border gba:rounded-lg gba:mb-3"
        style={{
          borderColor: 'var(--color-border-default)',
          backgroundColor: index === 0 ? rankDisplay.bgColor : 'var(--color-surface-primary)'
        }}
        data-testid={`top-campaign-${campaign.rank}`}
      >
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div
              className="gba:w-8 gba:h-8 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-sm gba:font-bold"
              style={{
                backgroundColor: rankDisplay.bgColor,
                color: rankDisplay.color
              }}
            >
              {rankDisplay.icon}
            </div>
            <div>
              <h4 className="gba:font-semibold gba:text-base" style={{ color: 'var(--color-text-primary)' }}>
                {campaign.campaignName}
              </h4>
              <p className="gba:text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {campaign.campaignType} • {campaign.status}
              </p>
            </div>
          </div>
          <div className="gba:text-right">
            <div className="gba:font-bold gba:text-lg" style={{ color: 'var(--color-success-600)' }}>
              {formatCurrency(campaign.totalRevenue)}
            </div>
            <div className="gba:text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Revenue
            </div>
          </div>
        </div>
        
        <div className="gba:grid gba:grid-cols-2 gba:gap-4 gba:text-sm">
          <div>
            <div className="gba:flex gba:justify-between">
              <span style={{ color: 'var(--color-text-secondary)' }}>Leads:</span>
              <span className="gba:font-medium">{campaign.leadsCount}</span>
            </div>
            <div className="gba:flex gba:justify-between">
              <span style={{ color: 'var(--color-text-secondary)' }}>Accounts:</span>
              <span className="gba:font-medium">{campaign.accountsCount}</span>
            </div>
            <div className="gba:flex gba:justify-between">
              <span style={{ color: 'var(--color-text-secondary)' }}>Contacts:</span>
              <span className="gba:font-medium">{campaign.contactsCount}</span>
            </div>
          </div>
          <div>
            <div className="gba:flex gba:justify-between">
              <span style={{ color: 'var(--color-text-secondary)' }}>Opportunities:</span>
              <span className="gba:font-medium">{campaign.opportunitiesCount}</span>
            </div>
            <div className="gba:flex gba:justify-between">
              <span style={{ color: 'var(--color-text-secondary)' }}>Won:</span>
              <span className="gba:font-medium">{campaign.wonOpportunitiesCount}</span>
            </div>
            <div className="gba:flex gba:justify-between">
              <span style={{ color: 'var(--color-text-secondary)' }}>Win Rate:</span>
              <span className="gba:font-medium">{formatPercentage(campaign.winRate)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Employee performer card component
  const EmployeePerformerCard = ({ employee, index }: { employee: any; index: number }) => {
    const rankDisplay = getRankDisplay(employee.rank);
    
    return (
      <div
        key={employee.employeeId}
        className="gba:p-4 gba:border gba:rounded-lg gba:mb-3"
        style={{
          borderColor: 'var(--color-border-default)',
          backgroundColor: index === 0 ? rankDisplay.bgColor : 'var(--color-surface-primary)'
        }}
        data-testid={`top-employee-${employee.rank}`}
      >
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div
              className="gba:w-8 gba:h-8 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-sm gba:font-bold"
              style={{
                backgroundColor: rankDisplay.bgColor,
                color: rankDisplay.color
              }}
            >
              {rankDisplay.icon}
            </div>
            <div>
              <h4 className="gba:font-semibold gba:text-base" style={{ color: 'var(--color-text-primary)' }}>
                {employee.employeeName}
              </h4>
              <p className="gba:text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {employee.campaignsCount} campaigns managed
              </p>
            </div>
          </div>
          <div className="gba:text-right">
            <div className="gba:font-bold gba:text-lg" style={{ color: 'var(--color-success-600)' }}>
              {formatCurrency(employee.totalRevenue)}
            </div>
            <div className="gba:text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Total Revenue
            </div>
          </div>
        </div>
        
        <div className="gba:grid gba:grid-cols-2 gba:gap-4 gba:text-sm">
          <div>
            <div className="gba:flex gba:justify-between">
              <span style={{ color: 'var(--color-text-secondary)' }}>Leads:</span>
              <span className="gba:font-medium">{employee.leadsCount}</span>
            </div>
            <div className="gba:flex gba:justify-between">
              <span style={{ color: 'var(--color-text-secondary)' }}>Accounts:</span>
              <span className="gba:font-medium">{employee.accountsCount}</span>
            </div>
            <div className="gba:flex gba:justify-between">
              <span style={{ color: 'var(--color-text-secondary)' }}>Contacts:</span>
              <span className="gba:font-medium">{employee.contactsCount}</span>
            </div>
          </div>
          <div>
            <div className="gba:flex gba:justify-between">
              <span style={{ color: 'var(--color-text-secondary)' }}>Opportunities:</span>
              <span className="gba:font-medium">{employee.opportunitiesCount}</span>
            </div>
            <div className="gba:flex gba:justify-between">
              <span style={{ color: 'var(--color-text-secondary)' }}>Won:</span>
              <span className="gba:font-medium">{employee.wonOpportunitiesCount}</span>
            </div>
            <div className="gba:flex gba:justify-between">
              <span style={{ color: 'var(--color-text-secondary)' }}>Avg Win Rate:</span>
              <span className="gba:font-medium">{formatPercentage(employee.averageWinRate)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card data-testid="campaigns-top-performers-loading">
        <CardContent className="gba:p-6">
          <div className="gba:flex gba:justify-center gba:items-center gba:h-96">
            <Spinner size="lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card data-testid="campaigns-top-performers-error">
        <CardContent className="gba:p-6">
          <Alert variant="destructive">
            <AlertDescription>
              {getTranslationFromI18nKeyAndLabel('campaigns.analytics.topPerformers.error', 'Error loading top performers data')}
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="gba:ml-2"
                >
                  {getTranslationFromI18nKeyAndLabel('common.retry', 'Retry')}
                </Button>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="campaigns-top-performers">
      <CardHeader>
        <CardTitle>
          {getTranslationFromI18nKeyAndLabel('campaigns.analytics.topPerformers.title', 'Top Performers')}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:p-6">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              label: (
                <span>
                  <BarChartOutlined />
                  {getTranslationFromI18nKeyAndLabel('campaigns.analytics.topPerformers.campaigns', 'Top Campaigns')}
                </span>
              ),
              key: 'campaigns',
              children: (
                <div data-testid="top-campaigns-list">
                  {topCampaigns.length === 0 ? (
                    <div className="gba:text-center gba:py-8" style={{ color: 'var(--color-text-secondary)' }}>
                      {getTranslationFromI18nKeyAndLabel('campaigns.analytics.topPerformers.noCampaigns', 'No campaign performance data available')}
                    </div>
                  ) : (
                    <div className="gba:max-h-80 gba:overflow-y-auto">
                      {topCampaigns.slice(0, 5).map((campaign, index) => (
                        <CampaignPerformerCard 
                          key={campaign.campaignId} 
                          campaign={campaign} 
                          index={index} 
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            },
            {
              label: (
                <span>
                  <UserOutlined />
                  {getTranslationFromI18nKeyAndLabel('campaigns.analytics.topPerformers.employees', 'Top Employees')}
                </span>
              ),
              key: 'employees',
              children: (
                <div data-testid="top-employees-list">
                  {topEmployees.length === 0 ? (
                    <div className="gba:text-center gba:py-8" style={{ color: 'var(--color-text-secondary)' }}>
                      {getTranslationFromI18nKeyAndLabel('campaigns.analytics.topPerformers.noEmployees', 'No employee performance data available')}
                    </div>
                  ) : (
                    <div className="gba:max-h-80 gba:overflow-y-auto">
                      {topEmployees.slice(0, 5).map((employee, index) => (
                        <EmployeePerformerCard 
                          key={employee.employeeId} 
                          employee={employee} 
                          index={index} 
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            },
          ]}
        />
      </CardContent>
    </Card>
  );
};

export default CampaignsTopPerformers;
