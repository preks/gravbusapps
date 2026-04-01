import React from 'react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { ArchiveBoxIcon, CheckIcon, DotsThreeIcon, PencilSimpleIcon, UsersThreeIcon } from '@phosphor-icons/react'
import translations from '../../_i18n'
import { getCalendarColors } from '../utils/calendarColors'

interface CalendarRowMenuProps {
  rowId: string
  title: string
  color: string
  hasColorOverride?: boolean
  isColorUpdating?: boolean
  onSelectColor: (color: string | null) => void | Promise<void>
  onEdit?: () => void
  onManageAccess?: () => void
  onArchive?: () => void
}

export const CalendarRowMenu: React.FC<CalendarRowMenuProps> = ({
  rowId,
  title,
  color,
  hasColorOverride = false,
  isColorUpdating = false,
  onSelectColor,
  onEdit,
  onManageAccess,
  onArchive
}) => {
  const { t } = useTranslation(translations)
  const [open, setOpen] = React.useState(false)
  const availableColors = React.useMemo(() => getCalendarColors(), [])

  const handleSelectColor = React.useCallback(
    (nextColor: string | null) => {
      void Promise.resolve(onSelectColor(nextColor)).finally(() => {
        setOpen(false)
      })
    },
    [onSelectColor]
  )

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="gba:h-8 gba:w-8 gba:flex-shrink-0"
          data-testid={`calendar-sidebar-row-menu-button-${rowId}`}
        >
          {isColorUpdating ? <Spinner className="gba:h-4 gba:w-4" /> : <DotsThreeIcon className="gba:h-4 gba:w-4" />}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="gba:w-56">
        <DropdownMenuLabel className="gba:text-xs gba:text-muted-foreground">{title}</DropdownMenuLabel>
        <div className="gba:px-2 gba:pb-2 gba:space-y-2">
          <p className="gba:text-xs gba:font-medium gba:text-muted-foreground">{t('calendar-color')}</p>
          <div className="gba:grid gba:grid-cols-4 gba:gap-2" data-testid={`calendar-color-palette-${rowId}`}>
            {availableColors.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelectColor(option.value)}
                disabled={isColorUpdating}
                className="gba:flex gba:h-6 gba:w-6 gba:items-center gba:justify-center gba:rounded-full gba:border gba:border-background gba:ring-1 gba:ring-border disabled:gba:cursor-not-allowed disabled:gba:opacity-60"
                style={{ backgroundColor: option.value }}
                title={option.name}
                aria-label={`${t('calendar-color')}: ${option.name}`}
                data-testid={`calendar-color-option-${rowId}-${option.name.toLowerCase()}`}
              >
                {color === option.value ? <CheckIcon className="gba:h-3 gba:w-3 gba:text-white" weight="bold" /> : null}
              </button>
            ))}
          </div>
        </div>

        <DropdownMenuItem
          onClick={() => handleSelectColor(null)}
          disabled={!hasColorOverride || isColorUpdating}
          data-testid={`calendar-color-reset-${rowId}`}
        >
          {t('calendar-sidebar-resetToDefault')}
        </DropdownMenuItem>

        {onEdit || onManageAccess || onArchive ? <DropdownMenuSeparator /> : null}

        {onEdit ? (
          <DropdownMenuItem onClick={onEdit} data-testid={`calendar-sidebar-edit-button-${rowId}`}>
            <PencilSimpleIcon className="gba:h-4 gba:w-4 gba:mr-2" />
            {t('calendar-sidebar-editCalendar')}
          </DropdownMenuItem>
        ) : null}

        {onManageAccess ? (
          <DropdownMenuItem onClick={onManageAccess} data-testid={`calendar-sidebar-manage-access-button-${rowId}`}>
            <UsersThreeIcon className="gba:h-4 gba:w-4 gba:mr-2" />
            {t('calendar-sidebar-manageAccess')}
          </DropdownMenuItem>
        ) : null}

        {onArchive ? (
          <DropdownMenuItem
            onClick={onArchive}
            className="gba:text-destructive focus:gba:text-destructive"
            data-testid={`calendar-sidebar-archive-button-${rowId}`}
          >
            <ArchiveBoxIcon className="gba:h-4 gba:w-4 gba:mr-2" />
            {t('calendar-sidebar-archiveCalendar')}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
