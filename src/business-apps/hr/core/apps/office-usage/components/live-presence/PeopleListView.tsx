import React from 'react'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Badge
} from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { LivePresenceEmployee } from '../../types'

interface PeopleListViewProps {
  people: LivePresenceEmployee[]
  prefixDataTestId?: string
}

export const PeopleListView: React.FC<PeopleListViewProps> = ({ people, prefixDataTestId = 'people-list-view' }) => {
  const getFallback = (displayName: string): string => {
    const parts = displayName
      .split(/\s+/)
      .map(p => p.trim())
      .filter(Boolean)

    const first = parts[0]?.[0]
    const second = parts[1]?.[0]

    const initials = `${first ?? ''}${second ?? ''}`.toUpperCase()
    return initials || '–'
  }

  if (people.length === 0) {
    return (
      <div className="gba:text-center gba:py-12" data-testid={`${prefixDataTestId}-empty`}>
        <p className="gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:office_usage.no_people_in_office',
            'No people in office currently.'
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="gba:border gba:border-border gba:rounded-lg gba:overflow-hidden" data-testid={prefixDataTestId}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.name', 'Name')}</TableHead>
            <TableHead>{getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.status', 'Status')}</TableHead>
            <TableHead>{getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.location', 'Location')}</TableHead>
            <TableHead>{getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.time', 'Time')}</TableHead>
            <TableHead>{getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.team', 'Team')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {people.map(person => (
            <TableRow key={person.employeeId}>
              <TableCell>
                <div className="gba:flex gba:items-center gba:gap-3">
                  <Avatar className="gba:w-8 gba:h-8">
                    {person.pictureUrl && <AvatarImage src={`data:image/jpeg;base64,${person.pictureUrl}`} />}
                    <AvatarFallback>{getFallback(person.displayName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="gba:font-medium gba:text-foreground">{person.displayName}</p>
                    {person.jobTitle && <p className="gba:text-xs gba:text-muted-foreground">{person.jobTitle}</p>}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="success">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.in_office', 'In office')}
                </Badge>
              </TableCell>
              <TableCell>{person.siteLocationName}</TableCell>
              <TableCell>
                <span className="gba:text-sm">
                  {person.startTime}
                  {person.expectedEndTime && ` – ${person.expectedEndTime}`}
                </span>
              </TableCell>
              <TableCell>
                <span className="gba:text-sm gba:text-muted-foreground">{person.organizationalUnit || '–'}</span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
