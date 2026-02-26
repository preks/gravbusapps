import { Card, CardContent, CardHeader, CardTitle, Badge, Skeleton } from '@newwork/nw-design-system'
import React from 'react'
import dayjs from 'dayjs'
import { getAbsenceStatusLabel } from '@/business-apps/hr/absences/utils/absenceStatusUtils'
import { formatDate } from '@/common/utils/windowUtils'
import type { AbsenceRow } from '../types/personalAbsences'

type TFunction = (key: string) => string

interface NextHoliday {
  name: string
  date: dayjs.Dayjs
}

interface UpcomingAbsencesCardProps {
  isLoading: boolean
  upcomingAbsences: AbsenceRow[]
  nextHoliday: NextHoliday | null
  t: TFunction
}

export function UpcomingAbsencesCard({
  isLoading,
  upcomingAbsences,
  nextHoliday,
  t
}: Readonly<UpcomingAbsencesCardProps>) {
  const sortedItems = React.useMemo(() => {
    type UpcomingItem =
      | { kind: 'absence'; date: dayjs.Dayjs; absence: AbsenceRow }
      | { kind: 'holiday'; date: dayjs.Dayjs; name: string }
    const items: UpcomingItem[] = [
      ...upcomingAbsences.map(a => ({ kind: 'absence' as const, date: dayjs(a.startDate), absence: a })),
      ...(nextHoliday ? [{ kind: 'holiday' as const, date: nextHoliday.date, name: nextHoliday.name }] : [])
    ]
    return items.sort((a, b) => a.date.diff(b.date))
  }, [upcomingAbsences, nextHoliday])

  return (
    <Card>
      <CardHeader className="gba:pb-3">
        <CardTitle className="gba:text-base gba:font-semibold">{t('upcoming-absences')}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="gba:space-y-2">
            <Skeleton className="gba:h-6 gba:w-full" />
            <Skeleton className="gba:h-6 gba:w-full" />
          </div>
        ) : (
          <div className="gba:space-y-2">
            {sortedItems.length === 0 && (
              <p className="gba:text-sm gba:text-muted-foreground">{t('no-upcoming-absences')}</p>
            )}
            {sortedItems.map(item =>
              item.kind === 'absence' ? (
                <div
                  key={item.absence.id}
                  className="gba:flex gba:items-center gba:gap-3 gba:rounded gba:border gba:px-3 gba:py-2"
                >
                  <div
                    className="gba:w-2 gba:h-2 gba:rounded-full gba:shrink-0"
                    style={{ backgroundColor: `#${item.absence.typeColor}` }}
                  />
                  <div className="gba:flex-1 gba:min-w-0">
                    <p className="gba:text-sm gba:font-medium gba:truncate">
                      {item.absence.startDate !== item.absence.endDate
                        ? `${formatDate(item.absence.startDate, 'date.monthDay') ?? '—'} – ${formatDate(item.absence.endDate, 'date.medium') ?? '—'}`
                        : (formatDate(item.absence.startDate, 'date.medium') ?? '—')}
                      {' – '}
                      {item.absence.type}
                    </p>
                  </div>
                  <Badge variant="success">{getAbsenceStatusLabel('APPROVED')}</Badge>
                </div>
              ) : (
                <div
                  key={`holiday-${item.date.format('YYYY-MM-DD')}`}
                  className="gba:rounded gba:border gba:px-3 gba:py-2 gba:bg-muted/30"
                >
                  <p className="gba:text-xs gba:text-muted-foreground gba:font-medium gba:mb-1">
                    {t('company-holiday')}
                  </p>
                  <p className="gba:text-sm gba:font-medium">
                    {item.name} — {formatDate(item.date.toISOString(), 'date.medium') ?? '—'}
                  </p>
                </div>
              )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
