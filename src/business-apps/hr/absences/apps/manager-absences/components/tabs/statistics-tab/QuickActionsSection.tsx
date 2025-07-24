import React from "react";
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { Card, CardContent } from '@newwork/nw-design-system';
import { PiCalendar } from 'react-icons/pi';

interface QuickActionsSectionProps {
  data: any;
  onNavigateToWorkLifeBalance?: () => void;
  onNavigateToTeamCoverage?: () => void;
}

export const QuickActionsSection: React.FC<QuickActionsSectionProps> = ({ data, onNavigateToWorkLifeBalance, onNavigateToTeamCoverage }) => {
  const statistics = data || {};
  
  return (
    <div className="gba:mb-6" data-testid="quick-actions-section">
      <h3 className="gba:text-lg gba:font-semibold gba:mb-4 gba:text-gray-800" data-testid="quick-actions-title">
        Quick Actions
      </h3>
      
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-4">
        {/* Average Work Streak Card */}
        <Card 
          className="gba:shadow-sm gba:border gba:border-gray-200 gba:cursor-pointer gba:hover:shadow-md gba:transition-shadow" 
          data-testid="average-work-streak-card"
          onClick={onNavigateToWorkLifeBalance}
        >
          <CardContent className="gba:p-4">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div>
                <div className="gba:text-sm gba:text-gray-600 gba:mb-1" data-testid="average-work-streak-label">
                  Average Work Streak
                </div>
                <div className="gba:text-2xl gba:font-bold gba:text-blue-600" data-testid="average-work-streak-value">
                  {statistics.averageWorkStreak || '0.0'} days
                </div>
                <div className="gba:text-xs gba:text-gray-500 gba:mt-1" data-testid="average-work-streak-description">
                  Days without absence (excl. work leave)
                </div>
              </div>
              <div className="gba:text-blue-500">
                <PiCalendar className="gba:text-2xl" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Team Coverage Optimizer */}
        <Card 
          className="gba:shadow-sm gba:border gba:border-gray-200 gba:cursor-pointer gba:hover:shadow-md gba:transition-shadow" 
          data-testid="team-coverage-optimizer-card"
          onClick={onNavigateToTeamCoverage}
        >
          <CardContent className="gba:p-4">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div>
                <div className="gba:text-sm gba:text-gray-600 gba:mb-1">
                  Team Coverage Optimizer
                </div>
                <div className="gba:text-2xl gba:font-bold gba:text-blue-600">
                  Optimize
                </div>
                <div className="gba:text-xs gba:text-gray-500 gba:mt-1">
                  Team coverage and scheduling
                </div>
              </div>
              <div className="gba:text-blue-500">
                <PiCalendar className="gba:text-2xl" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className="gba:shadow-sm gba:border gba:border-gray-200 gba:opacity-50" 
          data-testid="quick-action-placeholder-2"
        >
          <CardContent className="gba:p-4">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div>
                <div className="gba:text-sm gba:text-gray-600 gba:mb-1">
                  Quick Action 3
                </div>
                <div className="gba:text-2xl gba:font-bold gba:text-gray-400">
                  Coming Soon
                </div>
                <div className="gba:text-xs gba:text-gray-500 gba:mt-1">
                  Additional quick actions
                </div>
              </div>
              <div className="gba:text-gray-400">
                <PiCalendar className="gba:text-2xl" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 