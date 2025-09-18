import React from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { Clock } from 'lucide-react';
import { KPISection } from './KPISection';
import { ChartsSection } from './ChartsSection';
import { ActivityFeed } from './ActivityFeed';
import { QuickActions } from './QuickActions';

/**
 * Service Desk Dashboard - Main dashboard component providing overview of service desk operations
 * Features real-time KPI metrics, interactive charts, activity feed, and quick actions
 */
export interface DashboardProps extends BusinessAppContextProps {}

export const Dashboard: React.FC<DashboardProps> = ({
  accessToken,
  userInfo,
}) => {
  // Handle navigation for quick actions
  const handleNavigation = (path: string) => {
    console.log(`Navigate to: ${path}`);
    // TODO: Implement actual navigation based on routing system
  };
  return (
    <div 
      className="gba:p-6 gba:min-h-screen gba:bg-background" 
      data-testid="service-desk-dashboard"
    >
      {/* Header Section */}
      <div className="gba:mb-8">
        <h1 className="gba:text-3xl gba:font-bold gba:text-foreground gba:mb-2">
          {getTranslationFromI18nKeyAndLabel(
            'services.dashboard.title',
            'Service Desk Dashboard'
          )}
        </h1>
        <p className="gba:text-lg gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel(
            'services.dashboard.subtitle',
            'Monitor performance, track requests, and manage your service operations'
          )}
        </p>
      </div>

      {/* Main Dashboard Grid Layout */}
      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:lg:grid-cols-12">
        
        {/* KPI Metrics Section */}
        <div className="gba:lg:col-span-12">
          <KPISection 
            accessToken={accessToken}
            userInfo={userInfo}
          />
        </div>

        {/* Charts & Activity Grid */}
        <div className="gba:lg:col-span-12">
          <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-3 gba:gap-6 gba:items-start">
            
            {/* Left Column - Charts Section (2/3 width) */}
            <div className="gba:lg:col-span-2">
              <ChartsSection 
                accessToken={accessToken}
                userInfo={userInfo}
              />
            </div>

            {/* Right Column - Activity & Actions (1/3 width) */}
            <div className="gba:lg:col-span-1 gba:space-y-6">
              
              {/* Right Column Header */}
              <div>
                <h2 className="gba:text-xl gba:font-semibold gba:text-foreground gba:mb-2">
                  {getTranslationFromI18nKeyAndLabel(
                    'services.dashboard.activity.section_title',
                    'Activity & Actions'
                  )}
                </h2>
                <p className="gba:text-sm gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'services.dashboard.activity.section_description',
                    'Real-time updates and quick access to common tasks'
                  )}
                </p>
              </div>

              {/* Activity Feed */}
              <ActivityFeed 
                accessToken={accessToken}
                userInfo={userInfo}
              />

              {/* Quick Actions */}
              <QuickActions 
                accessToken={accessToken}
                userInfo={userInfo}
                onNavigate={handleNavigation}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="gba:mt-8 gba:text-center">
          <p className="gba:text-sm gba:text-muted-foreground gba:flex gba:items-center gba:justify-center gba:gap-2">
            <Clock className="gba:h-4 gba:w-4" />
            {getTranslationFromI18nKeyAndLabel(
              'services.dashboard.footer',
              'Dashboard updates in real-time with live service desk data'
            )}
          </p>
      </div>
    </div>
  );
};
