import React from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useTranslation
} from '@newwork/nw-design-system'
import { ArchiveBoxIcon } from '@phosphor-icons/react'
import type { InternalCalendarSummary } from '../types'
import translations from '../../_i18n'

interface ArchiveCalendarDialogProps {
  calendar?: InternalCalendarSummary | null
  isOpen: boolean
  isSubmitting?: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}

export const ArchiveCalendarDialog: React.FC<ArchiveCalendarDialogProps> = ({
  calendar,
  isOpen,
  isSubmitting = false,
  onClose,
  onConfirm
}) => {
  const { t } = useTranslation(translations)

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && !isSubmitting && onClose()}>
      <DialogContent className="gba:max-w-md" data-testid="archive-calendar-dialog">
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <ArchiveBoxIcon className="gba:h-5 gba:w-5" />
            {t('calendar-sidebar-archiveCalendar')}
          </DialogTitle>
          <DialogDescription>
            {calendar
              ? t('calendar-sidebar-archiveCalendarDescription', { name: calendar.name })
              : t('calendar-sidebar-archiveCalendar')}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gba:flex gba:gap-2">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            data-testid="archive-calendar-cancel-button"
          >
            {t('calendar-cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={() => void onConfirm()}
            disabled={!calendar || isSubmitting}
            data-testid="archive-calendar-confirm-button"
          >
            {t('calendar-sidebar-archiveConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
