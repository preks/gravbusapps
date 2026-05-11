import type { ActionOption } from '@newwork/nw-design-system'
import { Card, CardContent, CardHeader, CardTitle, Badge, Skeleton } from '@newwork/nw-design-system'
import { AppAction } from '@/components/app-action/AppAction'
import { getAbsenceStatusLabel } from '@/business-apps/hr/absences/utils/absenceStatusUtils'
import { formatDate } from '@/common/utils/windowUtils'
import type { AbsenceRow } from '../types/personalAbsences'
import type { CancelEmployeeAbsenceSnapshot } from '@/business-apps/hr/absences/utils/cancelEmployeeAbsence'

type TFunction = (key: string) => string

interface PendingRequestsCardProps {
  isLoading: boolean
  pendingRequests: AbsenceRow[]
  t: TFunction
  onCancelAbsence: (employeeAbsence: CancelEmployeeAbsenceSnapshot) => Promise<boolean>
  cancellingAbsenceId: string | null
  accessToken?: string
}

export function PendingRequestsCard({
  isLoading,
  pendingRequests,
  t,
  onCancelAbsence,
  cancellingAbsenceId,
  accessToken
}: Readonly<PendingRequestsCardProps>) {
  const totalPendingDays = pendingRequests.reduce((sum, a) => sum + (a.workingDays ?? 0), 0)
  const title =
    totalPendingDays > 0
      ? `${t('pending-requests')} (${totalPendingDays} ${totalPendingDays === 1 ? t('day') : t('days')})`
      : t('pending-requests')

  const buildActions = (absence: AbsenceRow): ActionOption[] => [
    {
      category: t('action'),
      key: `cancel-absence-${absence.id}`,
      label: t('cancel-request'),
      onClick: () => {
        void onCancelAbsence(absence.employeeAbsence)
      }
    }
  ]

  return (
    <Card>
      <CardHeader className="gba:pb-3">
        <CardTitle className="gba:text-base gba:font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {(() => {
          if (isLoading) {
            return (
              <div className="gba:space-y-2">
                <Skeleton className="gba:h-6 gba:w-full" />
                <Skeleton className="gba:h-6 gba:w-full" />
              </div>
            )
          }
          if (pendingRequests.length === 0) {
            return <p className="gba:text-sm gba:text-muted-foreground">{t('no-pending-requests')}</p>
          }
          return (
            <div className="gba:space-y-2">
              {pendingRequests.slice(0, 4).map(a => (
                <div
                  key={a.id}
                  className="gba:flex gba:items-center gba:justify-between gba:rounded gba:border gba:px-3 gba:py-2"
                >
                  <div className="gba:flex-1 gba:min-w-0">
                    <p className="gba:text-sm gba:font-medium">{formatDate(a.startDate, 'date.medium') ?? '—'}</p>
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
                  <div className="gba:flex gba:items-center gba:gap-2 gba:shrink-0">
                    <Badge variant="pending">{getAbsenceStatusLabel('PENDING')}</Badge>
                    <AppAction
                      data-testid={`personal-absence-pending-actions-${a.id}`}
                      variant="table-row"
                      customActions={buildActions(a)}
                      prefixDataTestId={`personal-absence-pending-action-${a.id}`}
                      accessToken={accessToken}
                      emptyState="enable"
                      deferMainContextRequestsUntilClick
                      disabled={cancellingAbsenceId === a.id}
                    />
                  </div>
                </div>
              ))}
            </div>
          )
        })()}
      </CardContent>
    </Card>
  )
}
