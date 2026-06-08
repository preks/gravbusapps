import React from 'react'
import dayjs from 'dayjs'
import { ColumnDef } from '@tanstack/react-table'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { TeamBirthday } from '../hooks/useTeamBirthdays'
import { PeopleMomentsListView } from '../components/shared/PeopleMomentsListView'
import { PersonAvatarCell } from '../components/shared/PersonAvatarCell'
import { getDeterministicVariantIndex } from '../utils/peopleMomentsHelpers'

export interface BirthdaysViewProps {
  upcomingBirthdays: TeamBirthday[]
  nextMonthBirthdays: TeamBirthday[]
  loadingBirthdays: boolean
  accessToken: string
  onNavigateBack: () => void
  onNavigateToEmployee: (employeeId: string) => void
}

const buildBirthdayMessage = (person: TeamBirthday) => {
  const variants = [
    `Happy Birthday, ${person.firstName}! Wishing you a fantastic day filled with joy and celebration. Thank you for the positive energy you bring to the team.`,
    `Happy Birthday, ${person.firstName}! Hope your day is full of great moments. Really appreciate your contribution and collaboration.`,
    `Wishing you a wonderful birthday, ${person.firstName}! Thanks for everything you do for the team - enjoy your special day!`
  ]
  const seed = `${person.id}-${person.birthDate || ''}`
  return variants[getDeterministicVariantIndex(seed, variants.length)]
}

const isBirthdayToday = (person: TeamBirthday, today: dayjs.Dayjs) => {
  const birthdayDate = dayjs(person.birthDate)
  return birthdayDate.isValid() && birthdayDate.month() === today.month() && birthdayDate.date() === today.date()
}

const birthdayColumns: ColumnDef<TeamBirthday>[] = [
  {
    id: 'name',
    header: getTranslationFromI18nKeyAndLabel('master-data:forms.capability.fields.name.label', 'Name'),
    size: 250,
    cell: ({ row }) => <PersonAvatarCell {...row.original} />
  },
  {
    id: 'birthDate',
    accessorKey: 'birthDate',
    header: getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.birthday', 'Birthday'),
    size: 150,
    cell: ({ row }) => (row.original.birthDate ? dayjs(row.original.birthDate).format('MMMM D') : '-')
  }
]

export const BirthdaysView: React.FC<BirthdaysViewProps> = ({
  upcomingBirthdays,
  nextMonthBirthdays,
  loadingBirthdays,
  accessToken,
  onNavigateBack,
  onNavigateToEmployee
}) => (
  <PeopleMomentsListView<TeamBirthday>
    currentData={upcomingBirthdays}
    nextMonthData={nextMonthBirthdays}
    loading={loadingBirthdays}
    accessToken={accessToken}
    onNavigateBack={onNavigateBack}
    onNavigateToEmployee={onNavigateToEmployee}
    greetingType="birthday-greeting"
    columns={birthdayColumns}
    title={getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.birthday', 'Birthdays')}
    emptyMessage="No birthdays this month"
    categoryLabel="birthdays"
    testIdPrefix="manager-dashboard-birthdays"
    messageConfig={{
      buildMessage: buildBirthdayMessage,
      isTodayCheck: isBirthdayToday,
      todayTooltip: 'Available on the birthday date',
      dialogTitle: 'Send birthday message',
      dialogDescription: 'Review and edit the message before sending.'
    }}
  />
)
