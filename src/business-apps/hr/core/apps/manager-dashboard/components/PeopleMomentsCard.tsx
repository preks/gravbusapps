import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@newwork/nw-design-system'
import { Cake, Trophy } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface Birthday {
  id: string
  firstName?: string
  lastName?: string
  birthDate?: string
}

interface Anniversary {
  id: string
  firstName?: string
  lastName?: string
  joinDate?: string
  yearsOfService?: number
}

interface PeopleMomentsCardProps {
  upcomingBirthdays: Birthday[]
  upcomingAnniversaries: Anniversary[]
  loadingBirthdays: boolean
  loadingAnniversaries: boolean
  onNavigateToInsights: (tab: 'birthdays' | 'anniversaries') => void
}

const LoadingSkeleton: React.FC = () => (
  <div className="gba:space-y-2">
    <div className="gba:h-4 gba:bg-muted gba:rounded gba:animate-pulse" />
    <div className="gba:h-4 gba:bg-muted gba:rounded gba:animate-pulse gba:w-2/3" />
  </div>
)

const getCountSummary = (
  count: number,
  singularLabel: string,
  pluralLabel: string,
  emptyKey: string,
  emptyFallback: string,
  periodKey: string,
  periodFallback: string
) => {
  if (count === 0) {
    return getTranslationFromI18nKeyAndLabel(emptyKey, emptyFallback)
  }

  const noun = count === 1 ? singularLabel : pluralLabel
  const period = getTranslationFromI18nKeyAndLabel(periodKey, periodFallback)
  return `${count} ${noun} ${period}`
}

export const PeopleMomentsCard: React.FC<PeopleMomentsCardProps> = ({
  upcomingBirthdays,
  upcomingAnniversaries,
  loadingBirthdays,
  loadingAnniversaries,
  onNavigateToInsights
}) => {
  return (
    <Card data-testid="people-moments-card">
      <CardHeader>
        <CardTitle className="gba:text-base gba:font-semibold">
          {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.people_moments', 'People & Moments')}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-4">
        {/* Birthdays */}
        <button
          type="button"
          onClick={() => onNavigateToInsights('birthdays')}
          className="gba:w-full gba:text-left gba:p-0 gba:bg-transparent gba:border-0 gba:cursor-pointer hover:gba:bg-muted/50 gba:rounded-lg gba:transition-colors gba:p-3 gba:-mx-3"
          data-testid="people-moments-birthdays"
        >
          <div className="gba:flex gba:items-start gba:gap-3">
            <span className="gba:inline-flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:rounded-full gba:bg-success/10 gba:flex-shrink-0">
              <Cake size={16} className="gba:text-success" />
            </span>
            <div className="gba:flex-1">
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
                <span className="gba:text-sm gba:font-medium gba:text-foreground">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.birthday', 'Birthday')}
                </span>
                <Badge variant="secondary" size="sm">
                  {upcomingBirthdays.length}
                </Badge>
              </div>
              {loadingBirthdays ? (
                <LoadingSkeleton />
              ) : (
                <div className="gba:text-xs gba:text-muted-foreground">
                  {getCountSummary(
                    upcomingBirthdays.length,
                    'birthday',
                    'birthdays',
                    'master-data:hr.manager_dashboard.no_birthdays_this_month',
                    'No birthdays this month',
                    'master-data:hr.manager_dashboard.this_month',
                    'this month'
                  )}
                </div>
              )}
            </div>
          </div>
        </button>

        {/* Work Anniversaries */}
        <button
          type="button"
          onClick={() => onNavigateToInsights('anniversaries')}
          className="gba:w-full gba:text-left gba:p-0 gba:bg-transparent gba:border-0 gba:cursor-pointer hover:gba:bg-muted/50 gba:rounded-lg gba:transition-colors gba:p-3 gba:-mx-3"
          data-testid="people-moments-anniversaries"
        >
          <div className="gba:flex gba:items-start gba:gap-3">
            <span className="gba:inline-flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:rounded-full gba:bg-primary/10 gba:flex-shrink-0">
              <Trophy size={16} className="gba:text-primary" />
            </span>
            <div className="gba:flex-1">
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
                <span className="gba:text-sm gba:font-medium gba:text-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'master-data:hr.manager_dashboard.work_anniversary',
                    'Work anniversary'
                  )}
                </span>
                <Badge variant="secondary" size="sm">
                  {upcomingAnniversaries.length}
                </Badge>
              </div>
              {loadingAnniversaries ? (
                <LoadingSkeleton />
              ) : (
                <div className="gba:text-xs gba:text-muted-foreground">
                  {getCountSummary(
                    upcomingAnniversaries.length,
                    'anniversary',
                    'anniversaries',
                    'master-data:hr.manager_dashboard.no_anniversaries_this_week',
                    'No anniversaries this week',
                    'master-data:hr.manager_dashboard.this_week',
                    'this week'
                  )}
                </div>
              )}
            </div>
          </div>
        </button>
      </CardContent>
    </Card>
  )
}
