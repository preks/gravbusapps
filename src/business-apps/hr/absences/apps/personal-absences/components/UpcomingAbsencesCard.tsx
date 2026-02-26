import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@newwork/nw-design-system'
import dayjs from 'dayjs'
import {
  getAbsenceStatusLabel,
  getAbsenceStatusBackgroundClass,
  getAbsenceStatusTextClass
} from '@/business-apps/hr/absences/utils/absenceStatusUtils'
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

export function UpcomingAbsencesCard({ isLoading, upcomingAbsences, nextHoliday, t }: UpcomingAbsencesCardProps) {
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
            {upcomingAbsences.length === 0 && !nextHoliday && (
              <p className="gba:text-sm gba:text-muted-foreground">{t('no-upcoming-absences')}</p>
            )}
            {upcomingAbsences.map(a => (
              <div key={a.id} className="gba:flex gba:items-center gba:gap-3 gba:rounded gba:border gba:px-3 gba:py-2">
                <div
                  className="gba:w-2 gba:h-2 gba:rounded-full gba:shrink-0"
                  style={{ backgroundColor: `#${a.typeColor}` }}
                />
                <div className="gba:flex-1 gba:min-w-0">
                  <p className="gba:text-sm gba:font-medium gba:truncate">
                    {dayjs(a.startDate).format('MMM D')}
                    {a.startDate !== a.endDate && ` – ${dayjs(a.endDate).format('MMM D, YYYY')}`}
                    {a.startDate === a.endDate && `, ${dayjs(a.startDate).format('YYYY')}`}
                    {' – '}
                    {a.type}
                  </p>
                </div>
                <span
                  className={`gba:inline-flex gba:items-center gba:rounded-full gba:px-2 gba:py-0.5 gba:text-xs gba:font-medium ${getAbsenceStatusBackgroundClass('APPROVED')} ${getAbsenceStatusTextClass('APPROVED')}`}
                >
                  {getAbsenceStatusLabel('APPROVED')}
                </span>
              </div>
            ))}
            {nextHoliday && (
              <div className="gba:rounded gba:border gba:px-3 gba:py-2 gba:bg-muted/30">
                <p className="gba:text-xs gba:text-muted-foreground gba:font-medium gba:mb-1">{t('company-holiday')}</p>
                <p className="gba:text-sm gba:font-medium">
                  {nextHoliday.name} — {nextHoliday.date.format('MMM D, YYYY')}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
