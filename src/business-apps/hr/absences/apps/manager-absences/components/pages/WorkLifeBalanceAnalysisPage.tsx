import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Card, Badge, Button } from '@newwork/nw-design-system'
import { PiArrowLeft } from 'react-icons/pi'
import { useEmployeeWorkLifeBalance } from '../../hooks/useEmployeeWorkLifeBalance'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface WorkLifeBalanceAnalysisPageProps extends BusinessAppContextProps {
  onNavigateBack: () => void
}

export const WorkLifeBalanceAnalysisPage: React.FC<WorkLifeBalanceAnalysisPageProps> = ({
  onNavigateBack,
  ...props
}) => {
  const { employees, isLoading, error } = useEmployeeWorkLifeBalance(props)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'success'
      case 'good':
        return 'default'
      case 'needs-attention':
        return 'destructive'
      default:
        return 'default'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'excellent':
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_manager.statistics_tab.excellent',
          'Excellent'
        )
      case 'good':
        return getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_manager.statistics_tab.good', 'Good')
      case 'needs-attention':
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_manager.statistics_tab.needs_attention',
          'Needs Attention'
        )
      default:
        return getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.unknown_type', 'Unknown')
    }
  }

  if (isLoading) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid="work-life-balance-loading">
        {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.loading', 'Loading...')}
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6 gba:text-center gba:text-destructive" data-testid="work-life-balance-error">
        {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.error', 'Error:')} {error}
      </div>
    )
  }

  return (
    <div className="gba:min-h-screen gba:bg-primary-foreground" data-testid="work-life-balance-analysis-page">
      {/* Header */}
      <div className="gba:bg-primary-foreground gba:border-b gba:border gba:px-6 gba:py-4">
        <div className="gba:space-y-4">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={onNavigateBack}
            className="gba:flex gba:items-center gba:gap-2"
            data-testid="work-life-balance-back-button"
          >
            <PiArrowLeft className="gba:text-lg" />
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_manager.statistics_tab.back_to_statistics',
              'Back to Statistics'
            )}
          </Button>

          {/* Title and Subtitle */}
          <div>
            <h1 className="gba:text-2xl gba:font-bold gba:text-foreground" data-testid="work-life-balance-title">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_manager.statistics_tab.individual_work_life_balance_analysis',
                'Individual Work-Life Balance Analysis'
              )}
            </h1>
            <p className="gba:text-muted-foreground gba:mt-1" data-testid="work-life-balance-subtitle">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_manager.statistics_tab.detailed_breakdown_indicators',
                "Detailed breakdown of each team member's work patterns and wellness indicators"
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="gba:p-6">
        <div className="gba:space-y-4">
          {employees.map((employee: any) => (
            <Card key={employee.id} className="gba:shadow-sm" data-testid={`employee-card-${employee.id}`}>
              <div className="gba:flex gba:items-center gba:justify-between gba:p-4">
                {/* Employee Info */}
                <div className="gba:flex gba:items-center gba:gap-4">
                  <div
                    className="gba:w-12 gba:h-12 gba:rounded-full gba:bg-info-secondary gba:flex gba:items-center gba:justify-center gba:text-info gba:font-semibold"
                    data-testid={`employee-avatar-${employee.id}`}
                  >
                    {employee.initials}
                  </div>
                  <div>
                    <h3 className="gba:font-semibold gba:text-foreground" data-testid={`employee-name-${employee.id}`}>
                      {employee.name}
                    </h3>
                    <Badge
                      variant={getStatusColor(employee.status)}
                      className="gba:mt-1"
                      data-testid={`employee-status-${employee.id}`}
                    >
                      {getStatusText(employee.status)}
                    </Badge>
                  </div>
                </div>

                {/* Metrics */}
                <div className="gba:flex gba:gap-4">
                  {/* Average Streak */}
                  <div className="gba:text-center gba:min-w-[80px]" data-testid={`employee-avg-streak-${employee.id}`}>
                    <div className="gba:text-2xl gba:font-bold gba:text-foreground">{employee.avgStreak}</div>
                    <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:absence_management_hub_manager.statistics_tab.avg_streak',
                        'Avg Streak'
                      )}
                    </div>
                  </div>

                  {/* Longest Streak */}
                  <div
                    className="gba:text-center gba:min-w-[80px]"
                    data-testid={`employee-longest-streak-${employee.id}`}
                  >
                    <div className="gba:text-2xl gba:font-bold gba:text-foreground">{employee.longestStreak}</div>
                    <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:absence_management_hub_manager.statistics_tab.longest_streak',
                        'Longest Streak'
                      )}
                    </div>
                  </div>

                  {/* Average Break */}
                  <div className="gba:text-center gba:min-w-[80px]" data-testid={`employee-avg-break-${employee.id}`}>
                    <div className="gba:text-2xl gba:font-bold gba:text-foreground">{employee.avgBreak}</div>
                    <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:absence_management_hub_manager.statistics_tab.avg_break',
                        'Avg Break'
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
