import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Card } from '@newwork/nw-design-system'
import { AbsenceDistributionChart } from '../../KPISection/AbsenceDistributionChart'
import dayjs from 'dayjs'
import { useTeamMemberIds } from '../../../hooks/useTeamMemberIds'
import { TeamDailyFactsSource, useTeamDailyFactsByType } from '../../../hooks/useTeamDailyFacts'
import { useAbsenceTypeCatalog } from '../../../../personal-absences/hooks/useAbsenceTypeCatalog'
import { translateManagerAbsencesText } from '../../../utils/managerAbsencesI18n'

const FALLBACK_COLORS = [
  'var(--nw-chart-1)',
  'var(--nw-chart-2)',
  'var(--nw-chart-3)',
  'var(--nw-chart-4)',
  'var(--nw-chart-5)',
  'var(--nw-chart-6)',
  'var(--nw-chart-7)',
  'var(--nw-chart-8)'
]
const VACATION_GROUP_ID = 'AbsenceGroup:v1:RECR'

type DistributionDisplayVariant = 'default' | 'insights'

interface AbsenceDistributionSectionProps extends BusinessAppContextProps {
  displayVariant?: DistributionDisplayVariant
  factsSource?: TeamDailyFactsSource
}

type PieChartDatum = {
  code: string
  name: string
  value: number
  parentEntryId?: string
  color: string
}

const getPercentageValue = (value: number, total: number): number => {
  if (total <= 0) {
    return 0
  }

  return (value / total) * 100
}

const getRoundedPercentageValue = (value: number, total: number): number => {
  return Number(getPercentageValue(value, total).toFixed(1))
}

const sortByPercentageDesc = (left: PieChartDatum, right: PieChartDatum, total: number): number => {
  const rightPercentage = getRoundedPercentageValue(right.value, total)
  const leftPercentage = getRoundedPercentageValue(left.value, total)

  if (rightPercentage !== leftPercentage) {
    return rightPercentage - leftPercentage
  }

  if (right.value !== left.value) {
    return right.value - left.value
  }

  return left.name.localeCompare(right.name)
}

const assignDistinctColors = (data: PieChartDatum[]): PieChartDatum[] => {
  const usedColors = new Set<string>()
  let fallbackIndex = 0

  const getNextFallbackColor = (): string => {
    while (fallbackIndex < FALLBACK_COLORS.length) {
      const color = FALLBACK_COLORS[fallbackIndex]
      fallbackIndex += 1

      if (!usedColors.has(color)) {
        return color
      }
    }

    const wrappedColor = FALLBACK_COLORS[fallbackIndex % FALLBACK_COLORS.length]
    fallbackIndex += 1

    return wrappedColor
  }

  return data.map(datum => {
    const requestedColor = datum.color
    const color = requestedColor && !usedColors.has(requestedColor) ? requestedColor : getNextFallbackColor()

    usedColors.add(color)

    return {
      ...datum,
      color
    }
  })
}

export const AbsenceDistributionSection: React.FC<AbsenceDistributionSectionProps> = ({
  displayVariant = 'default',
  factsSource = 'net',
  ...props
}) => {
  const { accessToken } = props
  const { teamMemberIds, isLoading: teamMembersLoading, error: teamMembersError } = useTeamMemberIds(props)
  const { mapType } = useAbsenceTypeCatalog(accessToken)
  const from = dayjs().startOf('year').format('YYYY-MM-DD')
  const to = dayjs().endOf('year').format('YYYY-MM-DD')
  const {
    data: byType,
    loading: factsLoading,
    error: factsError
  } = useTeamDailyFactsByType(accessToken, teamMemberIds, from, to, mapType, ['APPROVED'], factsSource)

  const loading = teamMembersLoading || factsLoading
  const error = teamMembersError || (factsError ? factsError.message : null)

  if (!props.userInfo?.employeeDetails?.employeeId) {
    return (
      <div
        className="gba:p-6 gba:text-center gba:text-destructive"
        data-testid="absence-distribution-error-no-employee"
      >
        {translateManagerAbsencesText('lowcoder:absence_management_hub_manager.error_employee_missing', {
          en: 'Error: Employee ID not found. Please check your user profile.',
          de: 'Fehler: Mitarbeiter-ID nicht gefunden. Bitte prufen Sie Ihr Profil.',
          ro: 'Eroare: ID-ul angajatului nu a fost gasit. Verifica profilul tau.'
        })}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid="absence-distribution-loading">
        {translateManagerAbsencesText('lowcoder:absence_management_hub_manager.loading_distribution', {
          en: 'Loading absence distribution data...',
          de: 'Abwesenheitsverteilung wird geladen...',
          ro: 'Se incarca distributia absentelor...'
        })}
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6 gba:text-center gba:text-destructive" data-testid="absence-distribution-error">
        {translateManagerAbsencesText('lowcoder:absence_management_hub_manager.error_prefix', {
          en: 'Error',
          de: 'Fehler',
          ro: 'Eroare'
        })}
        : {error}
      </div>
    )
  }

  if (!byType || byType.length === 0) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid="absence-distribution-no-data">
        {translateManagerAbsencesText('lowcoder:absence_management_hub_manager.no_distribution_data', {
          en: 'No absence distribution data available.',
          de: 'Keine Daten zur Abwesenheitsverteilung verfugbar.',
          ro: 'Nu exista date disponibile pentru distributia absentelor.'
        })}
      </div>
    )
  }

  // Map hook data to chart props
  const rawPieChartData: PieChartDatum[] = byType.map((datum, index) => ({
    code: datum.code,
    name: datum.label,
    value: datum.value,
    parentEntryId: datum.parentEntryId,
    color: datum.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length]
  }))
  const totalAbsenceDays = rawPieChartData.reduce((sum, datum) => sum + (Number(datum.value) || 0), 0)
  const pieChartData = assignDistinctColors(
    rawPieChartData
      .filter(datum => {
        if (displayVariant !== 'insights') {
          return true
        }

        return getPercentageValue(datum.value, totalAbsenceDays) >= 1
      })
      .sort((left, right) => sortByPercentageDesc(left, right, totalAbsenceDays))
  )
  const groupColors = pieChartData.reduce<Record<string, string>>((acc, datum) => {
    acc[datum.code] = datum.color
    return acc
  }, {})
  const vacationVal = rawPieChartData
    .filter(datum => datum.parentEntryId === VACATION_GROUP_ID)
    .reduce((sum, datum) => sum + datum.value, 0)
  const vacationShare = totalAbsenceDays > 0 ? ((vacationVal / totalAbsenceDays) * 100).toFixed(1) : '0.0'

  return (
    <section className="gba:mb-6" data-testid="absence-distribution-section">
      <h3 className="gba:text-lg gba:font-bold gba:mb-4" data-testid="absence-distribution-section-title">
        {translateManagerAbsencesText('lowcoder:absence_management_hub_manager.absence_distribution', {
          en: 'Absence Distribution',
          de: 'Abwesenheitsverteilung',
          ro: 'Distributia Absentelor'
        })}
      </h3>
      <Card className="gba:hover:shadow-md gba:transition-shadow gba:w-full gba:h-[510px] gba:overflow-hidden">
        <AbsenceDistributionChart
          pieChartData={pieChartData}
          totalAbsenceDays={totalAbsenceDays}
          vacationShare={vacationShare}
          groupColors={groupColors}
          vacationGroupId={VACATION_GROUP_ID}
        />
      </Card>
    </section>
  )
}
