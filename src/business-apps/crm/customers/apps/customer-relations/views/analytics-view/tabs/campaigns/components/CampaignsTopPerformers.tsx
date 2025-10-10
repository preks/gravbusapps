import React, { useState } from 'react'
import { Alert, AlertDescription, Button } from '@newwork/nw-design-system'
import {
  UserOutlined,
  DollarOutlined,
  ContactsOutlined,
  BankOutlined,
  TrophyOutlined,
  BarChartOutlined
} from '@ant-design/icons'
import { Tabs } from 'antd'
import { CampaignsAnalyticsComponentProps } from '../types/CampaignsAnalyticsTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

const CampaignsTopPerformers: React.FC<CampaignsAnalyticsComponentProps> = ({
  topCampaigns = [],
  topEmployees = [],
  isLoading = false,
  error = null,
  onRetry
}) => {
  const [activeTab, setActiveTab] = useState('employees')

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount)
  }

  const getPercentage = (converted: number, total: number): number => {
    return total > 0 ? Math.round((converted / total) * 100) : 0
  }
  const formatPercentage = (value: number): string => {
    const v = Number.isFinite(value) ? value : 0
    return `${Math.round(v)}%`
  }

  // Get rank icon and color
  /* const getRankDisplay = (rank: number) => {
    if (rank === 1) {
      return { icon: <TrophyOutlined />, color: '#FFD700', bgColor: '#FFF7E6' };
    } else if (rank === 2) {
      return { icon: <StarOutlined />, color: '#C0C0C0', bgColor: '#F6F6F6' };
    } else if (rank === 3) {
      return { icon: <StarOutlined />, color: '#CD7F32', bgColor: '#FFF2E6' };
    } else {
      return { icon: <span className="gba:font-bold">#{rank}</span>, color: 'var(--color-text-secondary)', bgColor: 'var(--color-surface-secondary)' };
    }
  }; */

  // Map employee analytics item into the performer UI model used in record view
  const mapEmployeeToPerformer = (e: any) => ({
    employeeId: e.employeeId,
    employeeName: e.employeeName,
    leads: { total: e.leadsCount || 0, converted: e.convertedLeadsCount || 0 },
    opportunities: { total: e.opportunitiesCount || 0, won: e.wonOpportunitiesCount || 0 },
    contacts: { total: e.contactsCount || 0 },
    accounts: { total: e.accountsCount || 0 },
    revenue: e.totalRevenue || 0
  })
  // NOTE: Advanced cards kept for future use (commented out to avoid linter warnings)
  /*
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
  */

  if (isLoading) {
    return (
      <div className="gba:p-8 gba:text-center" data-testid="campaigns-top-performers-loading">
        <div
          className="gba:animate-spin gba:rounded-full gba:h-8 gba:w-8 gba:border-b-2 gba:mx-auto gba:mb-4"
          style={{ borderColor: 'var(--color-primary-500)' }}
        />
        <p style={{ color: 'var(--color-text-secondary)' }}>
          {getTranslationFromI18nKeyAndLabel('campaigns.analytics.topPerformers.loading', 'Loading top performers...')}
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="gba:p-6 gba:rounded-lg gba:shadow-md"
        style={{ backgroundColor: 'var(--color-surface-primary)' }}
        data-testid="campaigns-top-performers-error"
      >
        <Alert variant="destructive">
          <AlertDescription>
            <div className="gba:flex gba:items-center gba:justify-between">
              <div>
                <div className="gba:font-semibold gba:mb-1">
                  {getTranslationFromI18nKeyAndLabel(
                    'campaigns.analytics.topPerformers.errorTitle',
                    'Error Loading Top Performers'
                  )}
                </div>
                <div>{error}</div>
              </div>
              {onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry}>
                  {getTranslationFromI18nKeyAndLabel('common.retry', 'Retry')}
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // UI matching record view with tabs
  const performers = (topEmployees || []).map(mapEmployeeToPerformer)

  // Build tabs for Top Campaigns and Top Employees
  return (
    <div data-testid="campaigns-top-performers-tabs">
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
              <div
                className="gba:space-y-6 gba:bg-white gba:pb-6"
                style={{ maxHeight: '480px', overflowY: 'auto', overflowX: 'hidden' }}
                data-testid="top-campaigns-list"
              >
                {topCampaigns && topCampaigns.length > 0 ? (
                  topCampaigns.slice(0, 5).map((c, index) => (
                    <div
                      key={c.campaignId}
                      className="gba:p-4 gba:rounded-lg"
                      style={{
                        backgroundColor: 'var(--color-surface-primary)',
                        boxShadow: 'var(--shadow-md)',
                        border: 'var(--border-width-thin) solid var(--color-border-default)'
                      }}
                      data-testid={`analytics-top-campaign-${index}`}
                    >
                      <div className="gba:flex gba:items-center gba:justify-between">
                        <div className="gba:flex gba:items-center gba:gap-3">
                          {index === 0 && (
                            <TrophyOutlined className="gba:text-lg" style={{ color: 'var(--color-warning-500)' }} />
                          )}
                          <div>
                            <h4
                              className="gba:text-sm gba:font-semibold"
                              style={{ color: 'var(--color-text-primary)' }}
                            >
                              {c.campaignName}
                            </h4>
                            <span
                              className="gba:text-xs gba:px-2 gba:py-0.5 gba:rounded-full gba:font-medium"
                              style={{
                                backgroundColor: 'var(--color-surface-secondary)',
                                color: 'var(--color-text-primary)'
                              }}
                            >
                              #{index + 1}
                            </span>
                            <div className="gba:text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                              {c.campaignType} • {c.status}
                            </div>
                          </div>
                        </div>
                        <div className="gba:flex gba:items-center gba:gap-6">
                          <div className="gba:text-center">
                            <div className="gba:flex gba:items-center gba:justify-center gba:gap-1 gba:mb-1">
                              <UserOutlined className="gba:text-xs" style={{ color: 'var(--color-primary-500)' }} />
                              <span
                                className="gba:text-xs gba:font-medium"
                                style={{ color: 'var(--color-text-secondary)' }}
                              >
                                Leads
                              </span>
                            </div>
                            <div className="gba:text-sm gba:font-bold" style={{ color: 'var(--color-text-primary)' }}>
                              {c.leadsCount || 0}
                            </div>
                            <div className="gba:text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                              Conv: {formatPercentage(c.conversionRate || 0)}
                            </div>
                          </div>
                          <div className="gba:text-center">
                            <div className="gba:flex gba:items-center gba:justify-center gba:gap-1 gba:mb-1">
                              <DollarOutlined className="gba:text-xs" style={{ color: 'var(--color-success-500)' }} />
                              <span
                                className="gba:text-xs gba:font-medium"
                                style={{ color: 'var(--color-text-secondary)' }}
                              >
                                Opps
                              </span>
                            </div>
                            <div className="gba:text-sm gba:font-bold" style={{ color: 'var(--color-text-primary)' }}>
                              {c.opportunitiesCount || 0}
                            </div>
                            <div className="gba:text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                              {c.wonOpportunitiesCount || 0}/{c.opportunitiesCount || 0} (
                              {getPercentage(c.wonOpportunitiesCount || 0, c.opportunitiesCount || 0)}%)
                            </div>
                          </div>
                          <div className="gba:text-center">
                            <div className="gba:flex gba:items-center gba:justify-center gba:gap-1 gba:mb-1">
                              <ContactsOutlined className="gba:text-xs" style={{ color: 'var(--color-warning-500)' }} />
                              <span
                                className="gba:text-xs gba:font-medium"
                                style={{ color: 'var(--color-text-secondary)' }}
                              >
                                Contacts
                              </span>
                            </div>
                            <div className="gba:text-sm gba:font-bold" style={{ color: 'var(--color-text-primary)' }}>
                              {c.contactsCount || 0}
                            </div>
                          </div>
                          <div className="gba:text-center">
                            <div className="gba:flex gba:items-center gba:justify-center gba:gap-1 gba:mb-1">
                              <BankOutlined className="gba:text-xs" style={{ color: 'var(--color-info-500)' }} />
                              <span
                                className="gba:text-xs gba:font-medium"
                                style={{ color: 'var(--color-text-secondary)' }}
                              >
                                Accounts
                              </span>
                            </div>
                            <div className="gba:text-sm gba:font-bold" style={{ color: 'var(--color-text-primary)' }}>
                              {c.accountsCount || 0}
                            </div>
                          </div>
                          <div
                            className="gba:text-center gba:pl-4 gba:border-l"
                            style={{ borderColor: 'var(--color-border-default)' }}
                          >
                            <div className="gba:text-xs gba:mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                              Revenue
                            </div>
                            <div className="gba:text-lg gba:font-bold" style={{ color: 'var(--color-success-600)' }}>
                              {formatCurrency(c.totalRevenue || 0)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div
                    className="gba:p-8 gba:text-center gba:rounded-lg"
                    style={{ backgroundColor: 'var(--color-surface-secondary)' }}
                  >
                    <BarChartOutlined className="gba:text-3xl gba:mb-2" />
                    <div style={{ color: 'var(--color-text-secondary)' }}>
                      {getTranslationFromI18nKeyAndLabel(
                        'campaigns.analytics.topPerformers.noCampaigns',
                        'No campaign performance data available'
                      )}
                    </div>
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
              <div
                className="gba:space-y-6"
                style={{ maxHeight: '480px', overflowY: 'auto', overflowX: 'hidden' }}
                data-testid="top-employees-list"
              >
                {performers && performers.length > 0 ? (
                  performers.map((performer: any, index: number) => (
                    <div
                      key={performer.employeeId}
                      className="gba:p-4 gba:rounded-lg"
                      style={{
                        backgroundColor: '#fff',
                        boxShadow: 'var(--shadow-md)',
                        border: 'var(--border-width-thin) solid var(--color-border-default)'
                      }}
                      data-testid={`analytics-top-performer-${index}`}
                    >
                      <div className="gba:flex gba:items-center gba:justify-between">
                        <div className="gba:flex gba:items-center gba:gap-3">
                          {index === 0 && (
                            <TrophyOutlined className="gba:text-lg" style={{ color: 'var(--color-warning-500)' }} />
                          )}
                          <div>
                            <h4
                              className="gba:text-sm gba:font-semibold"
                              style={{ color: 'var(--color-text-primary)' }}
                            >
                              {performer.employeeName}
                            </h4>
                            <span
                              className="gba:text-xs gba:px-2 gba:py-0.5 gba:rounded-full gba:font-medium"
                              style={{
                                backgroundColor: 'var(--color-surface-secondary)',
                                color: 'var(--color-text-primary)'
                              }}
                            >
                              #{index + 1}
                            </span>
                          </div>
                        </div>
                        <div className="gba:flex gba:items-center gba:gap-6">
                          <div className="gba:text-center">
                            <div className="gba:flex gba:items-center gba:justify-center gba:gap-1 gba:mb-1">
                              <UserOutlined className="gba:text-xs" style={{ color: 'var(--color-primary-500)' }} />
                              <span
                                className="gba:text-xs gba:font-medium"
                                style={{ color: 'var(--color-text-secondary)' }}
                              >
                                Leads
                              </span>
                            </div>
                            <div className="gba:text-sm gba:font-bold" style={{ color: 'var(--color-text-primary)' }}>
                              {performer.leads.total}
                            </div>
                            <div className="gba:text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                              {performer.leads.converted}/{performer.leads.total} (
                              {getPercentage(performer.leads.converted, performer.leads.total)}%)
                            </div>
                          </div>
                          <div className="gba:text-center">
                            <div className="gba:flex gba:items-center gba:justify-center gba:gap-1 gba:mb-1">
                              <DollarOutlined className="gba:text-xs" style={{ color: 'var(--color-success-500)' }} />
                              <span
                                className="gba:text-xs gba:font-medium"
                                style={{ color: 'var(--color-text-secondary)' }}
                              >
                                Opps
                              </span>
                            </div>
                            <div className="gba:text-sm gba:font-bold" style={{ color: 'var(--color-text-primary)' }}>
                              {performer.opportunities.total}
                            </div>
                            <div className="gba:text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                              {performer.opportunities.won}/{performer.opportunities.total} (
                              {getPercentage(performer.opportunities.won, performer.opportunities.total)}%)
                            </div>
                          </div>
                          <div className="gba:text-center">
                            <div className="gba:flex gba:items-center gba:justify-center gba:gap-1 gba:mb-1">
                              <ContactsOutlined className="gba:text-xs" style={{ color: 'var(--color-warning-500)' }} />
                              <span
                                className="gba:text-xs gba:font-medium"
                                style={{ color: 'var(--color-text-secondary)' }}
                              >
                                Contacts
                              </span>
                            </div>
                            <div className="gba:text-sm gba:font-bold" style={{ color: 'var(--color-text-primary)' }}>
                              {performer.contacts.total}
                            </div>
                          </div>
                          <div className="gba:text-center">
                            <div className="gba:flex gba:items-center gba:justify-center gba:gap-1 gba:mb-1">
                              <BankOutlined className="gba:text-xs" style={{ color: 'var(--color-info-500)' }} />
                              <span
                                className="gba:text-xs gba:font-medium"
                                style={{ color: 'var(--color-text-secondary)' }}
                              >
                                Accounts
                              </span>
                            </div>
                            <div className="gba:text-sm gba:font-bold" style={{ color: 'var(--color-text-primary)' }}>
                              {performer.accounts.total}
                            </div>
                          </div>
                          <div
                            className="gba:text-center gba:pl-4 gba:border-l"
                            style={{ borderColor: 'var(--color-border-default)' }}
                          >
                            <div className="gba:text-xs gba:mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                              Won Revenue
                            </div>
                            <div className="gba:text-lg gba:font-bold" style={{ color: 'var(--color-success-600)' }}>
                              {formatCurrency(performer.revenue)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div
                    className="gba:p-8 gba:text-center gba:rounded-lg"
                    style={{ backgroundColor: 'var(--color-surface-secondary)' }}
                  >
                    <UserOutlined className="gba:text-3xl gba:mb-2" />
                    <div style={{ color: 'var(--color-text-secondary)' }}>
                      {getTranslationFromI18nKeyAndLabel(
                        'campaigns.analytics.topPerformers.noEmployees',
                        'No employee performance data available'
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          }
        ]}
      />
    </div>
  )
}

export default CampaignsTopPerformers
