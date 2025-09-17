import React from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { Card, CardContent, CardHeader, CardTitle } from 'antd';
import { Alert } from 'antd';

/**
 * Dashboard component for Service Desk overview
 * Provides high-level metrics and quick access to common tasks
 */
export interface DashboardProps extends BusinessAppContextProps {}

export const Dashboard: React.FC<DashboardProps> = ({
  accessToken,
  userInfo,
}) => {
  return (
    <div data-testid="service-desk-dashboard" className="gba:space-y-6">
      {/* Welcome Section */}
      <div className="gba:mb-6">
        <h2 className="gba:text-xl gba:font-semibold gba:mb-2">
          {getTranslationFromI18nKeyAndLabel(
            'services.dashboard.welcome.title',
            'Welcome to Service Desk'
          )}
        </h2>
        <p className="gba:text-gray-600">
          {getTranslationFromI18nKeyAndLabel(
            'services.dashboard.welcome.description',
            'Monitor service requests, track performance, and manage your desk operations.'
          )}
        </p>
      </div>

      {/* Placeholder Alert */}
      <Alert
        message={getTranslationFromI18nKeyAndLabel(
          'services.dashboard.placeholder.title',
          'Dashboard Under Development'
        )}
        description={getTranslationFromI18nKeyAndLabel(
          'services.dashboard.placeholder.description',
          'This dashboard will display key metrics, recent activity, and quick actions for service desk management.'
        )}
        type="info"
        showIcon
        className="gba:mb-6"
      />

      {/* Placeholder Cards Grid */}
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-6">
        {/* Quick Stats Card */}
        <Card 
          title={getTranslationFromI18nKeyAndLabel(
            'services.dashboard.quickStats.title',
            'Quick Stats'
          )}
          className="gba:shadow-sm"
          data-testid="dashboard-quick-stats"
        >
          <div className="gba:space-y-4">
            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-gray-600">
                {getTranslationFromI18nKeyAndLabel(
                  'services.dashboard.stats.openTickets',
                  'Open Tickets'
                )}
              </span>
              <span className="gba:font-semibold gba:text-lg">--</span>
            </div>
            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-gray-600">
                {getTranslationFromI18nKeyAndLabel(
                  'services.dashboard.stats.avgResponseTime',
                  'Avg Response Time'
                )}
              </span>
              <span className="gba:font-semibold gba:text-lg">--</span>
            </div>
            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-gray-600">
                {getTranslationFromI18nKeyAndLabel(
                  'services.dashboard.stats.satisfaction',
                  'Satisfaction Rate'
                )}
              </span>
              <span className="gba:font-semibold gba:text-lg">--</span>
            </div>
          </div>
        </Card>

        {/* Recent Activity Card */}
        <Card 
          title={getTranslationFromI18nKeyAndLabel(
            'services.dashboard.recentActivity.title',
            'Recent Activity'
          )}
          className="gba:shadow-sm"
          data-testid="dashboard-recent-activity"
        >
          <div className="gba:space-y-3">
            <div className="gba:text-center gba:py-8 gba:text-gray-500">
              {getTranslationFromI18nKeyAndLabel(
                'services.dashboard.recentActivity.placeholder',
                'Recent ticket activities will appear here'
              )}
            </div>
          </div>
        </Card>

        {/* Quick Actions Card */}
        <Card 
          title={getTranslationFromI18nKeyAndLabel(
            'services.dashboard.quickActions.title',
            'Quick Actions'
          )}
          className="gba:shadow-sm"
          data-testid="dashboard-quick-actions"
        >
          <div className="gba:space-y-3">
            <div className="gba:text-center gba:py-8 gba:text-gray-500">
              {getTranslationFromI18nKeyAndLabel(
                'services.dashboard.quickActions.placeholder',
                'Quick action buttons will be available here'
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Performance Overview */}
      <Card 
        title={getTranslationFromI18nKeyAndLabel(
          'services.dashboard.performance.title',
          'Performance Overview'
        )}
        className="gba:shadow-sm"
        data-testid="dashboard-performance"
      >
        <div className="gba:text-center gba:py-12 gba:text-gray-500">
          {getTranslationFromI18nKeyAndLabel(
            'services.dashboard.performance.placeholder',
            'Performance charts and metrics will be displayed here'
          )}
        </div>
      </Card>
    </div>
  );
};

