import React from 'react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { ArchiveBoxIcon, DotsThreeIcon, PencilSimpleIcon, UsersThreeIcon } from '@phosphor-icons/react'
import type { InternalCalendarSummary } from '../types'
import translations from '../../_i18n'

interface SharedCalendarRowMenuProps {
  calendar: InternalCalendarSummary
  onEdit: (calendar: InternalCalendarSummary) => void
  onManageAccess: (calendar: InternalCalendarSummary) => void
  onArchive: (calendar: InternalCalendarSummary) => void
}

export const SharedCalendarRowMenu: React.FC<SharedCalendarRowMenuProps> = ({
  calendar,
  onEdit,
  onManageAccess,
  onArchive
}) => {
  const { t } = useTranslation(translations)
  const canManageCalendar = calendar.canEdit || calendar.isOwner

  if (!canManageCalendar) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="gba:h-8 gba:w-8 gba:flex-shrink-0"
          data-testid={`calendar-sidebar-row-menu-button-${calendar.id}`}
        >
          <DotsThreeIcon className="gba:h-4 gba:w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="gba:w-48">
        <DropdownMenuItem onClick={() => onEdit(calendar)} data-testid={`calendar-sidebar-edit-button-${calendar.id}`}>
          <PencilSimpleIcon className="gba:h-4 gba:w-4 gba:mr-2" />
          {t('calendar-sidebar-editCalendar')}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => onManageAccess(calendar)}
          data-testid={`calendar-sidebar-manage-access-button-${calendar.id}`}
        >
          <UsersThreeIcon className="gba:h-4 gba:w-4 gba:mr-2" />
          {t('calendar-sidebar-manageAccess')}
        </DropdownMenuItem>

        {calendar.isOwner && (
          <DropdownMenuItem
            onClick={() => onArchive(calendar)}
            className="gba:text-destructive focus:gba:text-destructive"
            data-testid={`calendar-sidebar-archive-button-${calendar.id}`}
          >
            <ArchiveBoxIcon className="gba:h-4 gba:w-4 gba:mr-2" />
            {t('calendar-sidebar-archiveCalendar')}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
