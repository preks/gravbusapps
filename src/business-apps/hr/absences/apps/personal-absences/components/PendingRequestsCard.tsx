import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@newwork/nw-design-system'
import dayjs from 'dayjs'
import {
  getAbsenceStatusLabel,
  getAbsenceStatusBackgroundClass,
  getAbsenceStatusTextClass
} from '@/business-apps/hr/absences/utils/absenceStatusUtils'
import type { AbsenceRow } from '../types/personalAbsences'

type TFunction = (key: string) => string

interface PendingRequestsCardProps {
  isLoading: boolean
  pendingRequests: AbsenceRow[]
  t: TFunction
}

export function PendingRequestsCard({ isLoading, pendingRequests, t }: PendingRequestsCardProps) {
  return (
    <Card>
      <CardHeader className="gba:pb-3">
        <CardTitle className="gba:text-base gba:font-semibold">{t('pending-requests')}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="gba:space-y-2">
            <Skeleton className="gba:h-6 gba:w-full" />
            <Skeleton className="gba:h-6 gba:w-full" />
          </div>
        ) : pendingRequests.length === 0 ? (
          <p className="gba:text-sm gba:text-muted-foreground">{t('no-pending-requests')}</p>
        ) : (
          <div className="gba:space-y-2">
            {pendingRequests.slice(0, 4).map(a => (
              <div
                key={a.id}
                className="gba:flex gba:items-center gba:justify-between gba:rounded gba:border gba:px-3 gba:py-2"
              >
                <div className="gba:flex-1 gba:min-w-0">
                  <p className="gba:text-sm gba:font-medium">{dayjs(a.startDate).format('MMM D, YYYY')}</p>
                  <p className="gba:text-xs gba:text-muted-foreground">
                    {a.type}
                    {typeof a.workingDays === 'number' && (
                      <>
                        {' '}
                        · {a.workingDays} {a.workingDays === 1 ? t('day') : t('days')}
                      </>
                    )}
                  </p>
                </div>
                <span
                  className={`gba:inline-flex gba:items-center gba:rounded-full gba:px-2 gba:py-0.5 gba:text-xs gba:font-medium ${getAbsenceStatusBackgroundClass('PENDING')} ${getAbsenceStatusTextClass('PENDING')}`}
                >
                  {getAbsenceStatusLabel('PENDING')}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
