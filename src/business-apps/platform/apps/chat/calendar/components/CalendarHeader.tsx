import React from 'react'
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from 'lucide-react'
import type { CalendarView } from '../types'

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
  return (
    <div
      className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-3 gba:border-b gba:border-border/50 gba:bg-background"
      data-testid="calendar-header"
    >
      {/* Left section: Navigation */}
      <div className="gba:flex gba:items-center gba:gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onToday}
          className="gba:font-medium"
          data-testid="calendar-today-button"
        >
          Today
        </Button>

        <div className="gba:flex gba:items-center gba:border gba:border-border gba:rounded-md">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrevious}
            className="gba:h-8 gba:w-8 gba:rounded-r-none"
            data-testid="calendar-prev-button"
          >
            <ChevronLeft className="gba:h-4 gba:w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onNext}
            className="gba:h-8 gba:w-8 gba:rounded-l-none"
            data-testid="calendar-next-button"
          >
            <ChevronRight className="gba:h-4 gba:w-4" />
          </Button>
        </div>

        <h2 className="gba:text-lg gba:font-semibold gba:text-foreground gba:ml-2">{viewTitle}</h2>
      </div>

      {/* Right section: View selector and actions */}
      <div className="gba:flex gba:items-center gba:gap-3">
        {/* Pending invitations badge */}
        {pendingInvitationsCount > 0 && (
          <div className="gba:flex gba:items-center gba:gap-1 gba:px-2 gba:py-1 gba:bg-warning-secondary gba:text-warning-secondary-foreground gba:rounded-full gba:text-xs gba:font-medium">
            <CalendarIcon className="gba:h-3 gba:w-3" />
            <span>{pendingInvitationsCount} pending</span>
          </div>
        )}

        {/* View selector */}
        <Select value={view} onValueChange={v => onViewChange(v as CalendarView)}>
          <SelectTrigger className="gba:w-[120px]" data-testid="calendar-view-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Day</SelectItem>
            <SelectItem value="week">Week</SelectItem>
            <SelectItem value="month">Month</SelectItem>
          </SelectContent>
        </Select>

        {/* Create meeting button */}
        <Button onClick={onCreateMeeting} className="gba:gap-1" data-testid="calendar-create-meeting-button">
          <Plus className="gba:h-4 gba:w-4" />
          <span>New Meeting</span>
        </Button>
      </div>
    </div>
  )
}
