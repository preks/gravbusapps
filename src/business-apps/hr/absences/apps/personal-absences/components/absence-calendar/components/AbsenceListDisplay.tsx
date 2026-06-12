import React from 'react'
import { Badge, Button } from '@newwork/nw-design-system'
import { formatDate, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getAbsenceStatusBadgeVariant } from '@/business-apps/hr/absences/utils/absenceStatusUtils'

export interface AbsenceListDisplayItem {
  id: string
  type: string
  status: string
  originalStatus?: string
  tagColor?: string
  description?: string
  startDate: string
  endDate: string
}

export interface AbsenceListDisplayProps extends BusinessAppContextProps {
  absences: AbsenceListDisplayItem[]
  title?: string
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number, pageSize: number) => void
}

export const AbsenceListDisplay: React.FC<AbsenceListDisplayProps> = ({
  absences,
  title,
  page,
  pageSize,
  total,
  onPageChange
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const hasPreviousPage = page > 1
  const hasNextPage = page < totalPages

  const handlePreviousPage = () => {
    if (hasPreviousPage) {
      onPageChange(page - 1, pageSize)
    }
  }

  const handleNextPage = () => {
    if (hasNextPage) {
      onPageChange(page + 1, pageSize)
    }
  }

  return (
    <div className="gba:absence-list-root" data-testid="absence-calendar-list-root">
      {title && (
        <div className="gba:text-lg gba:font-semibold gba:mb-2" data-testid="absence-calendar-list-title">
          {title}
        </div>
      )}
      <div className="gba:flex gba:flex-col gba:gap-3" data-testid="absence-calendar-list">
        {absences.length === 0 && (
          <div className="gba:rounded-md gba:border gba:border-border gba:p-4 gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_calendar.no_absence_data_available', 'No absences.')}
          </div>
        )}
        {absences.map(item => {
          const isSameDay = item.startDate === item.endDate

          return (
            <div
              key={item.id}
              className="gba:absence-event-item gba:rounded-md gba:border gba:border-border gba:p-4"
              data-testid={`absence-calendar-list-item-${item.id}`}
            >
              <div className="gba:absence-event-row">
                <div className="gba:absence-event-date" data-testid={`absence-calendar-list-item-date-${item.id}`}>
                  {isSameDay
                    ? `Date: ${formatDate(item.startDate, 'date.long')}`
                    : `From: ${formatDate(item.startDate, 'date.long')} - To: ${formatDate(item.endDate, 'date.long')}`}
                </div>
                <span>Type: </span>
                <Badge
                  variant={getAbsenceStatusBadgeVariant(item.originalStatus)}
                  className="gba:absence-event-tag"
                  data-testid={`absence-calendar-list-item-type-${item.id}`}
                >
                  {item.type}
                </Badge>
                <div className="gba:absence-event-status" data-testid={`absence-calendar-list-item-status-${item.id}`}>
                  Status: {item.status}
                </div>
                {item.description && (
                  <div
                    className="gba:absence-event-description"
                    data-testid={`absence-calendar-list-item-description-${item.id}`}
                  >
                    Note: {item.description}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {totalPages > 1 && (
        <div className="gba:mt-4 gba:flex gba:items-center gba:justify-end gba:gap-3" data-testid="absence-calendar-list-pagination">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={!hasPreviousPage}
            data-testid="absence-calendar-list-previous-button"
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:common.previous', 'Previous')}
          </Button>
          <span className="gba:text-sm gba:text-muted-foreground" data-testid="absence-calendar-list-page-indicator">
            {page} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={!hasNextPage}
            data-testid="absence-calendar-list-next-button"
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:common.next', 'Next')}
          </Button>
        </div>
      )}
    </div>
  )
}
