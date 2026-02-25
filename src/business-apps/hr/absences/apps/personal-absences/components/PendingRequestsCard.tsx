import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge, Skeleton } from '@newwork/nw-design-system'
import dayjs from 'dayjs'
import { getAbsenceStatusLabel } from '@/business-apps/hr/absences/utils/absenceStatusUtils'
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
                  <p className="gba:text-xs gba:text-muted-foreground">{a.type}</p>
                </div>
                <Badge variant="pending">{getAbsenceStatusLabel('PENDING')}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
