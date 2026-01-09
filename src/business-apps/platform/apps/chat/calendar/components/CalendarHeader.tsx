import React from 'react'
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import type { CalendarView } from '../types'
import translations from '../../_i18n'

interface CalendarHeaderProps {
  viewTitle: string
  view: CalendarView
  onViewChange: (view: CalendarView) => void
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
  onCreateMeeting: () => void
  pendingInvitationsCount: number
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  viewTitle,
  view,
  onViewChange,
  onPrevious,
  onNext,
  onToday,
  onCreateMeeting,
  pendingInvitationsCount
}) => {
  const { t } = useTranslation(translations)

  return (
    <div
      className="gba:flex gba:items-center gba:justify-between gba:gap-1 gba:px-2 gba:py-1.5 gba:border-b gba:border-border/50 gba:bg-background gba:min-w-0"
      data-testid="calendar-header"
    >
      {/* Left: Navigation */}
      <div className="gba:flex gba:items-center gba:gap-1 gba:flex-shrink-0">
        <div className="gba:flex gba:items-center gba:border gba:border-border gba:rounded-md">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrevious}
            className="gba:h-6 gba:w-6"
            data-testid="calendar-prev-button"
          >
            <ChevronLeft className="gba:h-3.5 gba:w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onNext}
            className="gba:h-6 gba:w-6"
            data-testid="calendar-next-button"
          >
            <ChevronRight className="gba:h-3.5 gba:w-3.5" />
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onToday}
          className="gba:h-6 gba:px-1.5 gba:text-[10px] gba:font-medium"
          data-testid="calendar-today-button"
        >
          {t('calendar-today')}
        </Button>
      </div>

      {/* Center: Title - can shrink */}
      <h2 className="gba:text-xs gba:font-semibold gba:text-foreground gba:truncate gba:min-w-0 gba:flex-1 gba:text-center gba:px-1">
        {viewTitle}
      </h2>

      {/* Right: Actions */}
      <div className="gba:flex gba:items-center gba:gap-1 gba:flex-shrink-0">
        {/* Pending invitations badge - only show count */}
        {pendingInvitationsCount > 0 && (
          <div className="gba:hidden gba:md:flex gba:items-center gba:justify-center gba:h-5 gba:w-5 gba:bg-warning gba:text-warning-foreground gba:rounded-full gba:text-[10px] gba:font-bold">
            {pendingInvitationsCount}
          </div>
        )}

        {/* View selector - compact */}
        <Select value={view} onValueChange={v => onViewChange(v as CalendarView)}>
          <SelectTrigger className="gba:w-[80px] gba:h-8 gba:text-[10px] gba:px-2" data-testid="calendar-view-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="gba:min-w-[120px]">
            <SelectItem value="day" className="gba:text-sm gba:py-2">
              {t('calendar-viewDay')}
            </SelectItem>
            <SelectItem value="week" className="gba:text-sm gba:py-2">
              {t('calendar-viewWeek')}
            </SelectItem>
            <SelectItem value="month" className="gba:text-sm gba:py-2">
              {t('calendar-viewMonth')}
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Create meeting button - always icon only to save space */}
        <Button
          onClick={onCreateMeeting}
          size="icon"
          className="gba:h-6 gba:w-6 gba:flex-shrink-0"
          data-testid="calendar-create-meeting-button"
        >
          <Plus className="gba:h-3.5 gba:w-3.5" />
        </Button>
      </div>
    </div>
  )
}
