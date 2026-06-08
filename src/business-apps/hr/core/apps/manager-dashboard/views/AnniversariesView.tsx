import React from 'react'
import dayjs from 'dayjs'
import { Badge } from '@newwork/nw-design-system'
import { ColumnDef } from '@tanstack/react-table'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { TeamAnniversary } from '../hooks/useTeamAnniversaries'
import { PeopleMomentsListView } from '../components/shared/PeopleMomentsListView'
import { PersonAvatarCell } from '../components/shared/PersonAvatarCell'
import { getDeterministicVariantIndex } from '../utils/peopleMomentsHelpers'

export interface AnniversariesViewProps {
  upcomingAnniversaries: TeamAnniversary[]
  nextMonthAnniversaries: TeamAnniversary[]
  loadingAnniversaries: boolean
  accessToken: string
  onNavigateBack: () => void
  onNavigateToEmployee: (employeeId: string) => void
}

const buildAnniversaryMessage = (person: TeamAnniversary) => {
  const variants = [
    `Congratulations ${person.firstName} on your ${person.yearsOfService}-year work anniversary! Your dedication and impact are truly appreciated.`,
    `Happy work anniversary, ${person.firstName}! ${person.yearsOfService} years is a great milestone - thank you for your continuous contribution.`,
    `${person.firstName}, congrats on your ${person.yearsOfService} years with the company! Appreciate your commitment and teamwork.`
  ]
  const seed = `${person.id}-${person.yearsOfService}-${person.hireDate || ''}`
  return variants[getDeterministicVariantIndex(seed, variants.length)]
}

const isAnniversaryToday = (person: TeamAnniversary, today: dayjs.Dayjs) => {
  const hireDate = dayjs(person.hireDate)
  return hireDate.isValid() && hireDate.month() === today.month() && hireDate.date() === today.date()
}

const anniversaryColumns: ColumnDef<TeamAnniversary>[] = [
  {
    id: 'name',
    header: getTranslationFromI18nKeyAndLabel('master-data:forms.capability.fields.name.label', 'Name'),
    size: 250,
    cell: ({ row }) => <PersonAvatarCell {...row.original} />
  },
  {
    id: 'hireDate',
    accessorKey: 'hireDate',
    header: getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.anniversary_date', 'Anniversary'),
    size: 150,
    cell: ({ row }) => (row.original.hireDate ? dayjs(row.original.hireDate).format('MMMM D') : '-')
  },
  {
    id: 'years',
    accessorKey: 'yearsOfService',
    header: getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.years', 'Years'),
    size: 100,
    cell: ({ row }) => (
      <Badge variant="info" size="sm">
        {row.original.yearsOfService} {row.original.yearsOfService === 1 ? 'year' : 'years'}
      </Badge>
    )
  }
]

export const AnniversariesView: React.FC<AnniversariesViewProps> = ({
  upcomingAnniversaries,
  nextMonthAnniversaries,
  loadingAnniversaries,
  accessToken,
  onNavigateBack,
  onNavigateToEmployee
}) => (
  <PeopleMomentsListView<TeamAnniversary>
    currentData={upcomingAnniversaries}
    nextMonthData={nextMonthAnniversaries}
    loading={loadingAnniversaries}
    accessToken={accessToken}
    onNavigateBack={onNavigateBack}
    onNavigateToEmployee={onNavigateToEmployee}
    greetingType="anniversary-greeting"
    columns={anniversaryColumns}
    title={getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.anniversary_date', 'Anniversaries')}
    emptyMessage="No work anniversaries this month"
    categoryLabel="anniversaries"
    testIdPrefix="manager-dashboard-anniversaries"
    messageConfig={{
      buildMessage: buildAnniversaryMessage,
      isTodayCheck: isAnniversaryToday,
      todayTooltip: 'Available on the anniversary date',
      dialogTitle: 'Send anniversary message',
      dialogDescription: 'Review and edit the message before sending.'
    }}
  />
)
