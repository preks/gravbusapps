import React, { useMemo } from 'react'
import { TabComponentProps } from '../../../types'
import { DashboardData } from '../../../types'

import PersonalKeyInsightsSection from '../../../../personal-absences/components/KeyInsightsSection'
import type { AbsenceListCardAbsence } from '../../../../personal-absences/types/absenceTypes'
import OrgWorkPatternsPanel from './OrgWorkPatternsPanel'
import { OrgYearComparisonCard } from './OrgYearComparisonCard'
import { StatisticsDataProvider, useStatisticsData } from './StatisticsDataProvider'
import dayjs from 'dayjs'
import { Card, CardHeader, CardTitle, CardContent, Progress } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { useAbsenceTypeCatalog } from '../../../../personal-absences/hooks/useAbsenceTypeCatalog'

const StatisticsContent: React.FC<{ dashboardData: DashboardData; accessToken?: string }> = ({
  dashboardData,
  accessToken
}) => {
  const { data, error } = useStatisticsData()
  const userLocale = getCurrentActiveUserLocale() ?? 'en-US'
  const currentYear = dayjs().year()
  const { mapType } = useAbsenceTypeCatalog(accessToken)

  const getTranslatedLeaveTypeName = (typeRefOrName: string): string => {
    const mapped = mapType(typeRefOrName)
    if (mapped?.label) return mapped.label
    // Fallback: try raw absences pool
    const matchingAbsence = dashboardData?.rawAbsences?.find(
      (absence: any) => absence.typeName === typeRefOrName || absence.groupName === typeRefOrName
    )
    if (matchingAbsence?.type?.translations) {
      const translation = matchingAbsence.type.translations.find((t: any) => t.localeCode === userLocale)
      return translation?.value || matchingAbsence.type.value || typeRefOrName
    }
    return typeRefOrName
  }

  const absences: AbsenceListCardAbsence[] = useMemo(() => {
    const items = dashboardData?.rawAbsences || []
    return items.map((a: any) => {
      const typeRef = a?.type?.id || a?.type?.parentEntryId || a?.type?.value || a.typeName || a.groupName || ''
      const mapped = mapType(typeRef)
      let statusColor = 'var(--nw-muted-foreground)'
      const statusUpper = String(a.status || '').toUpperCase()
      if (statusUpper === 'APPROVED') {
        statusColor = 'var(--nw-success)'
      } else if (statusUpper === 'PENDING') {
        statusColor = 'var(--nw-warning)'
      } else if (statusUpper === 'REJECTED') {
        statusColor = 'var(--nw-destructive)'
      }

      return {
        type: a.typeName || a.groupName || '',
        status: a.status || '',
        title: a.typeName || a.groupName || 'Absence',
        startDate: a.startDate,
        endDate: a.endDate,
        duration: String(Number(a.effectiveDays) || 0),
        description: a.employeeName ? `Employee: ${a.employeeName}` : '',
        requestedInfo: a.createdAt || '',
        icon: <></>,
        typeColor: mapped?.color || 'var(--nw-chart-4)',
        statusColor,
        requestDate: a.createdAt || ''
      }
    })
  }, [dashboardData?.rawAbsences])

  const distributionEntries = useMemo(() => {
    const items = dashboardData?.rawAbsences || []
    const currentYearOnly = items.filter(
      a => String(a.status || '').toUpperCase() === 'APPROVED' && dayjs(a.startDate).year() === currentYear
    )
    const counts: Record<string, number> = {}
    currentYearOnly.forEach(a => {
      // Prefer stable identifiers so catalog mapping resolves: id -> parentEntryId -> value/name
      const key = a?.type?.id || a?.type?.parentEntryId || a.typeName || a.groupName || a?.type?.value || 'UNKNOWN'
      counts[key] = (counts[key] || 0) + 1
    })
    const entries = Object.entries(counts).map(([key, count]) => ({
      key,
      label: getTranslatedLeaveTypeName(key),
      count
    }))
    entries.sort((a, b) => b.count - a.count)
    return entries
  }, [dashboardData?.rawAbsences, currentYear, mapType, userLocale])

  // Do not block rendering while loading; we still show local calculations
  if (error) {
    return <div>Error loading statistics: {error}</div>
  }

  if (!data) {
    // We can still render local panels (work patterns, YOY, distribution) without provider
    // so do not early-return here; proceed to render with defaults
  }

  return (
    <div className="gba:statisticsRoot" data-testid="backoffice-statistics-tab">
      <div className="gba:pb-6" data-testid="backoffice-statistics-key-insights">
        {data?.keyStats ? (
          <PersonalKeyInsightsSection
            absences={absences}
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
        ) : (
          <PersonalKeyInsightsSection absences={absences} />
        )}
      </div>
      {/* Work Patterns and Monthly Patterns side by side (custom panel) */}
      <div className="gba:statisticsSection" data-testid="backoffice-statistics-workpatterns-grid">
        <OrgWorkPatternsPanel absences={absences} accessToken={undefined} />
      </div>
      {/* Year comparison + Leave Type Distribution side by side */}
      <div
        className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4"
        data-testid="backoffice-statistics-yoy-and-leave-grid"
      >
        <div className="gba:statisticsSection" data-testid="backoffice-statistics-year-comparison">
          <OrgYearComparisonCard absences={absences} accessToken={undefined} />
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
                {distributionEntries.length === 0 ? (
                  <div className="gba:text-sm gba:text-destructive">No data</div>
                ) : (
                  (() => {
                    const maxVal = Math.max(...distributionEntries.map(e => e.count))
                    return distributionEntries.map(({ key, label, count }) => {
                      const pct = maxVal > 0 ? Math.max(4, Math.round((Number(count) / maxVal) * 100)) : 0
                      const translatedType = label
                      return (
                        <div key={key} className="gba:flex gba:items-center">
                          <div className="gba:w-28 gba:text-sm gba:text-foreground">{translatedType}</div>
                          <div className="gba:flex-1 gba:px-3">
                            <Progress value={pct} className="gba:h-2.5" />
                          </div>
                          <div className="gba:w-20 gba:text-right gba:text-sm gba:text-foreground">{count}</div>
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
      <StatisticsContent dashboardData={dashboardData} accessToken={accessToken} />
    </StatisticsDataProvider>
  )
}
