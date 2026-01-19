import React from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { Card, CardContent } from '@newwork/nw-design-system'
import { PiCalendar } from 'react-icons/pi'

interface QuickActionsSectionProps {
  data: any
  onNavigateToWorkLifeBalance?: () => void
  onNavigateToTeamCoverage?: () => void
}

export const QuickActionsSection: React.FC<QuickActionsSectionProps> = ({
  data,
  onNavigateToWorkLifeBalance,
  onNavigateToTeamCoverage
}) => {
  const statistics = data || {}

  return (
    <div className="gba:mb-6" data-testid="quick-actions-section">
      <h3 className="gba:text-lg gba:font-semibold gba:mb-4 gba:text-foreground" data-testid="quick-actions-title">
        {getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.quick_actions', 'Quick Actions')}
      </h3>

      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-4">
        {/* Average Work Streak Card */}
        <Card
          className="gba:shadow-sm gba:border gba:cursor-pointer gba:hover:shadow-md gba:transition-shadow"
          data-testid="average-work-streak-card"
          onClick={onNavigateToWorkLifeBalance}
        >
          <CardContent className="gba:p-4">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div>
                <div className="gba:text-sm gba:text-muted-foreground gba:mb-1" data-testid="average-work-streak-label">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.average_work_streak', 'Average Work Streak')}
                </div>
                <div className="gba:text-2xl gba:font-bold gba:text-info" data-testid="average-work-streak-value">
                  {statistics.averageWorkStreak || '0.0'}{' '}
                  {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.days', 'days')}
                </div>
                <div
                  className="gba:text-xs gba:text-muted-foreground gba:mt-1"
                  data-testid="average-work-streak-description"
                >
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:absence_hub.days_without_absence',
                    'Days without absence (excl. work leave)'
                  )}
                </div>
              </div>
              <div className="gba:text-info">
                <PiCalendar className="gba:text-2xl" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Coverage Optimizer */}
        <Card
          className="gba:shadow-sm gba:border gba:cursor-pointer gba:hover:shadow-md gba:transition-shadow"
          data-testid="team-coverage-optimizer-card"
          onClick={onNavigateToTeamCoverage}
        >
          <CardContent className="gba:p-4">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div>
                <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:absence_hub.team_coverage_optimizer',
                    'Team Coverage Optimizer'
                  )}
                </div>
                <div className="gba:text-2xl gba:font-bold gba:text-info">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.optimize', 'Optimize')}
                </div>
                <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:absence_hub.team_coverage_and_scheduling',
                    'Team coverage and scheduling'
                  )}
                </div>
              </div>
              <div className="gba:text-info">
                <PiCalendar className="gba:text-2xl" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="gba:shadow-sm gba:border gba:opacity-50" data-testid="quick-action-placeholder-2">
          <CardContent className="gba:p-4">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div>
                <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.quick_action_3', 'Quick Action 3')}
                </div>
                <div className="gba:text-2xl gba:font-bold gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.coming_soon', 'Coming Soon')}
                </div>
                <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:absence_hub.additional_quick_actions',
                    'Additional quick actions'
                  )}
                </div>
              </div>
              <div className="gba:text-muted-foreground">
                <PiCalendar className="gba:text-2xl" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
