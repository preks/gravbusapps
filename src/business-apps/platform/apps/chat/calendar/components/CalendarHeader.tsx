import React, { useMemo } from 'react'
import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import {
  ArrowsClockwiseIcon,
  BriefcaseIcon,
  CalendarBlankIcon,
  CalendarIcon,
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CaretUpIcon,
  ListBulletsIcon,
  PlusIcon,
  SidebarSimpleIcon,
  SquaresFourIcon
} from '@phosphor-icons/react'
import type { CalendarLayout, CalendarTimeScope } from '../types'
import { CalendarThreeDayScopeIcon } from './CalendarThreeDayScopeIcon'
import translations from '../../_i18n'

interface CalendarHeaderProps {
  viewTitle: string
  timeScope: CalendarTimeScope
  calendarLayout: CalendarLayout
  onTimeScopeChange: (scope: CalendarTimeScope) => void
  onCalendarLayoutChange: (layout: CalendarLayout) => void
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
  onCreateMeeting: () => void
  onRefresh?: () => void
  pendingInvitationsCount: number
  showSidebarToggle?: boolean
  onToggleSidebar?: () => void
}

const TIME_SCOPES: CalendarTimeScope[] = ['day', 'threeDay', 'workWeek', 'week', 'month']

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  viewTitle,
  timeScope,
  calendarLayout,
  onTimeScopeChange,
  onCalendarLayoutChange,
  onPrevious,
  onNext,
  onToday,
  onCreateMeeting,
  onRefresh,
  pendingInvitationsCount,
  showSidebarToggle = false,
  onToggleSidebar
}) => {
  const { t } = useTranslation(translations)
  const [menuOpen, setMenuOpen] = React.useState(false)

  const scopeLabel = useMemo(() => {
    switch (timeScope) {
      case 'day':
        return t('calendar-viewDay')
      case 'threeDay':
        return t('calendar-threeDay')
      case 'workWeek':
        return t('calendar-workWeek')
      case 'week':
        return t('calendar-viewWeek')
      case 'month':
        return t('calendar-viewMonth')
      default:
        return t('calendar-viewWeek')
    }
  }, [t, timeScope])

  const triggerLabel = calendarLayout === 'list' ? `${scopeLabel} · ${t('calendar-layout-list')}` : scopeLabel

  const scopeIcon = (scope: CalendarTimeScope) => {
    const className = 'gba:h-4 gba:w-4 gba:shrink-0 gba:text-muted-foreground'
    switch (scope) {
      case 'day':
        return <CalendarBlankIcon className={className} aria-hidden />
      case 'threeDay':
        return <CalendarThreeDayScopeIcon className={className} />
      case 'workWeek':
        return <BriefcaseIcon className={className} aria-hidden />
      case 'week':
        return <CalendarIcon className={className} aria-hidden />
      case 'month':
        return <SquaresFourIcon className={className} aria-hidden />
      default:
        return <CalendarIcon className={className} aria-hidden />
    }
  }

  const scopeLabelFor = (scope: CalendarTimeScope) => {
    switch (scope) {
      case 'day':
        return t('calendar-viewDay')
      case 'threeDay':
        return t('calendar-threeDay')
      case 'workWeek':
        return t('calendar-workWeek')
      case 'week':
        return t('calendar-viewWeek')
      case 'month':
        return t('calendar-viewMonth')
      default:
        return ''
    }
  }

  return (
    <div
      className="gba:flex gba:items-center gba:justify-between gba:gap-1 gba:px-2 gba:py-1.5 gba:border-b gba:border-border/50 gba:bg-background gba:min-w-0"
      data-testid="calendar-header"
    >
      <div className="gba:flex gba:items-center gba:gap-1 gba:flex-shrink-0">
        {showSidebarToggle ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="gba:h-6 gba:w-6"
            data-testid="calendar-sidebar-trigger"
            aria-label={t('calendar-sidebar-title')}
          >
            <SidebarSimpleIcon className="gba:h-3.5 gba:w-3.5" />
          </Button>
        ) : null}

        <div className="gba:flex gba:items-center gba:border gba:border-border gba:rounded-md">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrevious}
            className="gba:h-6 gba:w-6"
            data-testid="calendar-prev-button"
          >
            <CaretLeftIcon className="gba:h-3.5 gba:w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onNext}
            className="gba:h-6 gba:w-6"
            data-testid="calendar-next-button"
          >
            <CaretRightIcon className="gba:h-3.5 gba:w-3.5" />
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onToday}
          className="gba:h-6 gba:px-1.5 gba:text-xs gba:font-medium"
          data-testid="calendar-today-button"
        >
          {t('calendar-today')}
        </Button>
      </div>

      <h2 className="gba:text-xs gba:font-semibold gba:text-foreground gba:truncate gba:min-w-0 gba:flex-1 gba:text-center gba:px-1">
        {viewTitle}
      </h2>

      <div className="gba:flex gba:items-center gba:gap-1 gba:flex-shrink-0">
        {pendingInvitationsCount > 0 && (
          <div className="gba:hidden gba:md:flex gba:items-center gba:justify-center gba:h-5 gba:w-5 gba:bg-warning gba:text-warning-foreground gba:rounded-full gba:text-xs gba:font-bold">
            {pendingInvitationsCount}
          </div>
        )}

        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gba:h-8 gba:gap-1 gba:px-2 gba:text-xs gba:font-medium gba:max-w-40 gba:sm:max-w-none"
              data-testid="calendar-view-select"
              aria-label={t('calendar-view-menu-aria')}
            >
              {scopeIcon(timeScope)}
              <span className="gba:truncate">{triggerLabel}</span>
              {menuOpen ? (
                <CaretUpIcon className="gba:h-3.5 gba:w-3.5 gba:shrink-0" aria-hidden />
              ) : (
                <CaretDownIcon className="gba:h-3.5 gba:w-3.5 gba:shrink-0" aria-hidden />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="gba:min-w-52">
            <DropdownMenuRadioGroup value={timeScope} onValueChange={v => onTimeScopeChange(v as CalendarTimeScope)}>
              {TIME_SCOPES.map(scope => (
                <DropdownMenuRadioItem
                  key={scope}
                  value={scope}
                  className="gba:gap-2"
                  data-testid={`calendar-scope-${scope}`}
                >
                  {scopeIcon(scope)}
                  <span className="gba:flex-1">{scopeLabelFor(scope)}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={calendarLayout === 'list'}
              onCheckedChange={checked => onCalendarLayoutChange(checked ? 'list' : 'calendar')}
              className="gba:gap-2"
              data-testid="calendar-layout-list-toggle"
            >
              <ListBulletsIcon className="gba:h-4 gba:w-4 gba:shrink-0" aria-hidden />
              {t('calendar-layout-list')}
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {onRefresh && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            className="gba:h-6 gba:w-6 gba:flex-shrink-0"
            data-testid="calendar-refresh-button"
            title={t('calendar-refresh')}
          >
            <ArrowsClockwiseIcon className="gba:h-3.5 gba:w-3.5" />
          </Button>
        )}

        <Button
          onClick={onCreateMeeting}
          size="icon"
          className="gba:h-6 gba:w-6 gba:flex-shrink-0"
          data-testid="calendar-create-meeting-button"
        >
          <PlusIcon className="gba:h-3.5 gba:w-3.5" />
        </Button>
      </div>
    </div>
  )
}
