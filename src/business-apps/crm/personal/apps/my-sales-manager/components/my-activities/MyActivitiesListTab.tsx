import React, { useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Card,
  CardContent,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Spinner,
  Alert,
  AlertTitle,
  AlertDescription
} from '@newwork/nw-design-system'
import { useMyActivities } from '../../hooks/useMyActivities'
import { ActivityBadge } from './ActivityBadge'
import dayjs from 'dayjs'

export interface MyActivitiesListTabProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  employeeId: string
}

export const MyActivitiesListTab: React.FC<MyActivitiesListTabProps> = ({ accessToken, employeeId }) => {
  const [dateFrom] = useState(dayjs().subtract(30, 'days').toISOString())
  const [dateTo] = useState(dayjs().add(1, 'day').toISOString())

  const { activities, total, loading, error } = useMyActivities({
    employeeId,
    accessToken: accessToken || '',
    dateFrom,
    dateTo,
    limit: 50
  })

  if (error) {
    return (
      <Alert variant="destructive" data-testid="my-activities-list-error">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Card data-testid="my-activities-list">
      <CardContent>
        {loading ? (
          <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
            <Spinner size="lg" />
          </div>
        ) : activities.length === 0 ? (
          <div className="gba:text-center gba:py-12">
            <p className="gba:text-muted-foreground">No activities found in the last 30 days</p>
          </div>
        ) : (
          <>
            <div className="gba:mb-4 gba:text-sm gba:text-muted-foreground">
              Showing {activities.length} of {total} activities
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map(activity => (
                  <TableRow key={activity.id} data-testid={`activity-row-${activity.id}`}>
                    <TableCell>
                      {activity.occurredAt
                        ? dayjs(activity.occurredAt).format('MMM D, YYYY')
                        : dayjs(activity.createdAt).format('MMM D, YYYY')}
                    </TableCell>
                    <TableCell className="gba:font-medium">{activity.title}</TableCell>
                    <TableCell>{activity.activityType?.value || '-'}</TableCell>
                    <TableCell>
                      <ActivityBadge activity={activity} data-testid={`activity-badge-${activity.id}`} />
                    </TableCell>
                    <TableCell className="gba:max-w-xs gba:truncate">{activity.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default MyActivitiesListTab
