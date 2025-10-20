import React, { useMemo } from 'react'
import { TabComponentProps } from '../../../types'
import { DashboardData } from '../../../types'

import PersonalKeyInsightsSection from '../../../../personal-absences/components/KeyInsightsSection'
import OrgWorkPatternsPanel from './OrgWorkPatternsPanel'
import { OrgYearComparisonCard } from './OrgYearComparisonCard'
import { StatisticsDataProvider, useStatisticsData } from './StatisticsDataProvider'
import dayjs from 'dayjs'
import { Card, CardHeader, CardTitle, CardContent } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

interface AbsenceListCardAbsence {
  type: string
  status: string
  title: string
  startDate: string
  endDate: string
  duration: string
  description: string
  requestedInfo: string
  icon?: React.ReactNode
  typeColor?: string
  statusColor?: string
  requestDate?: string
}

const StatisticsContent: React.FC<{ dashboardData: DashboardData }> = ({ dashboardData }) => {
  const { data, isLoading, error } = useStatisticsData()
  const userLocale = getCurrentActiveUserLocale() ?? 'en-US'
  const currentYear = dayjs().year()

  const getTranslatedLeaveTypeName = (typeName: string): string => {
    const matchingAbsence = dashboardData?.rawAbsences?.find(
      (absence: any) => absence.typeName === typeName || absence.groupName === typeName
    )

    if (matchingAbsence?.type?.translations) {
      const translation = matchingAbsence.type.translations.find((t: any) => t.localeCode === userLocale)
      return translation?.value || matchingAbsence.type.value || typeName
    }

    return typeName
  }

  const absences: AbsenceListCardAbsence[] = useMemo(() => {
    const items = dashboardData?.rawAbsences || []
    return items.map((a: any) => ({
      type: a.typeName || a.groupName || '',
      status: a.status || '',
      title: a.typeName || a.groupName || 'Absence',
      startDate: a.startDate,
      endDate: a.endDate,
      duration: String(Number(a.effectiveDays) || 0),
      description: a.employeeName ? `Employee: ${a.employeeName}` : '',
      requestedInfo: a.createdAt || ''
    }))
  }, [dashboardData?.rawAbsences])

  if (isLoading) {
    return <div>Loading statistics...</div>
  }

  if (error) {
    return <div>Error loading statistics: {error}</div>
  }

  if (!data) {
    return <div>No statistics data available</div>
  }

  return (
    <div className="gba:statisticsRoot" data-testid="backoffice-statistics-tab">
      <div className="gba:pb-6" data-testid="backoffice-statistics-key-insights">
        <PersonalKeyInsightsSection
          absences={absences as any[]}
          overrides={{
            plannedPct: data.keyStats.plannedPct,
            unplannedPct: data.keyStats.unplannedPct,
            avgDaysPerRequest: data.keyStats.avgDaysPerRequest,
            approvalRatePct: data.keyStats.approvalRatePct,
            vacationCount: data.keyStats.vacationCount,
            sickCount: data.keyStats.sickCount
          }}
          disableLocalCalc
        />
      </div>
      {/* Work Patterns and Monthly Patterns side by side (custom panel) */}
      <div className="gba:statisticsSection" data-testid="backoffice-statistics-workpatterns-grid">
        <OrgWorkPatternsPanel absences={absences as any[]} accessToken={undefined} />
      </div>
      {/* Year comparison + Leave Type Distribution side by side */}
      <div
        className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4"
        data-testid="backoffice-statistics-yoy-and-leave-grid"
      >
        <div className="gba:statisticsSection" data-testid="backoffice-statistics-year-comparison">
          <OrgYearComparisonCard absences={absences as any[]} accessToken={undefined} />
        </div>
        <div className="gba:statisticsSection" data-testid="backoffice-statistics-leave-type-distribution">
          <Card>
            <CardHeader className="gba:pb-2">
              <CardTitle className="gba:text-sm">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_hub.leave_type_title',
                  `Leave Type Distribution by Year (${currentYear})`,
                  { year: currentYear }
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="gba:pt-0">
              <div className="gba:flex gba:flex-col gba:gap-2.5">
                {Object.keys(data.typeCounts).length === 0 ? (
                  <div className="gba:text-sm gba:text-destructive">No data</div>
                ) : (
                  (() => {
                    const maxVal = Math.max(...Object.values(data.typeCounts))
                    return Object.entries(data.typeCounts).map(([type, cnt]) => {
                      const pct = maxVal > 0 ? Math.max(4, Math.round((Number(cnt) / maxVal) * 100)) : 0
                      const translatedType = getTranslatedLeaveTypeName(type)
                      return (
                        <div key={type} className="gba:flex gba:items-center">
                          <div className="gba:w-28 gba:text-sm gba:text-foreground">{translatedType}</div>
                          <div className="gba:flex-1 gba:px-3">
                            <div className="gba:bg-muted gba:rounded">
                              <div
                                style={{
                                  width: `${pct}%`,
                                  height: 10,
                                  background: 'var(--nw-chart-4)',
                                  borderRadius: 6
                                }}
                              />
                            </div>
                          </div>
                          <div className="gba:w-20 gba:text-right gba:text-sm gba:text-foreground">{cnt}</div>
                        </div>
                      )
                    })
                  })()
                )}
              </div>
              <div
                className="gba:mt-2 gba:text-xs gba:text-muted-foreground"
                data-testid="leave-type-distribution-status-note"
              >
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_hub.statuses_considered_approved',
                  'Statuses considered: Approved'
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export const StatisticsTab: React.FC<TabComponentProps & { dashboardData: DashboardData }> = ({
  dashboardData,
  accessToken
}) => {
  // Fixed AbsenceGroup IDs provided by admin (parentEntryId values)
  const FIXED_VACATION_GROUP_ID = 'AbsenceGroup:v1:RECR'
  const FIXED_SICK_GROUP_ID = 'AbsenceGroup:v1:HEALTH'

  const typeNames = useMemo(() => {
    const set = new Set<string>()
    ;(dashboardData?.rawAbsences || []).forEach((a: any) => {
      if (a.typeName) set.add(a.typeName)
    })
    return Array.from(set)
  }, [dashboardData?.rawAbsences])

  return (
    <StatisticsDataProvider
      accessToken={accessToken}
      typeNames={typeNames}
      vacationGroupIds={[FIXED_VACATION_GROUP_ID]}
      sickGroupIds={[FIXED_SICK_GROUP_ID]}
    >
      <StatisticsContent dashboardData={dashboardData} />
    </StatisticsDataProvider>
  )
}
