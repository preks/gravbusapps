import React, { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  useTranslation
} from '@newwork/nw-design-system'
import { CalendarBlankIcon } from '@phosphor-icons/react'
import type { CreateSharedCalendarData } from '../types'
import { MEETING_COLORS, getDefaultCalendarColor } from '../types'
import translations from '../../_i18n'

interface CreateSharedCalendarDialogProps {
  isOpen: boolean
  isSubmitting?: boolean
  onClose: () => void
  onSubmit: (data: CreateSharedCalendarData) => Promise<void>
}

export const CreateSharedCalendarDialog: React.FC<CreateSharedCalendarDialogProps> = ({
  isOpen,
  isSubmitting = false,
  onClose,
  onSubmit
}) => {
  const { t } = useTranslation(translations)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(getDefaultCalendarColor())

  const selectedColorName = useMemo(
    () => MEETING_COLORS.find(option => option.value === color)?.name || 'Blue',
    [color]
  )

  useEffect(() => {
    if (!isOpen) {
      setName('')
      setDescription('')
      setColor(getDefaultCalendarColor())
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (!name.trim()) {
      return
    }

    await onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      color
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && !isSubmitting && onClose()}>
      <DialogContent className="gba:max-w-md" data-testid="create-shared-calendar-dialog">
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <CalendarBlankIcon className="gba:h-5 gba:w-5" />
            {t('calendar-sidebar-newSharedCalendar')}
          </DialogTitle>
          <DialogDescription>{t('calendar-sidebar-newSharedCalendarDescription')}</DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-4">
          <div className="gba:space-y-2">
            <Label htmlFor="shared-calendar-name">{t('calendar-sidebar-calendarName')}</Label>
            <Input
              id="shared-calendar-name"
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder={t('calendar-sidebar-calendarNamePlaceholder')}
              disabled={isSubmitting}
              data-testid="shared-calendar-name-input"
            />
          </div>

          <div className="gba:space-y-2">
            <Label htmlFor="shared-calendar-description">{t('calendar-description')}</Label>
            <Textarea
              id="shared-calendar-description"
              value={description}
              onChange={event => setDescription(event.target.value)}
              placeholder={t('calendar-sidebar-calendarDescriptionPlaceholder')}
              rows={3}
              disabled={isSubmitting}
              data-testid="shared-calendar-description-input"
            />
          </div>

          <div className="gba:space-y-2">
            <Label htmlFor="shared-calendar-color">{t('calendar-color')}</Label>
            <Select value={color} onValueChange={setColor}>
              <SelectTrigger id="shared-calendar-color" data-testid="shared-calendar-color-select">
                <SelectValue>{selectedColorName}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {MEETING_COLORS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gba:flex gba:gap-2">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            data-testid="shared-calendar-cancel-button"
          >
            {t('calendar-cancel')}
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={!name.trim() || isSubmitting}
            data-testid="shared-calendar-submit-button"
          >
            {t('calendar-sidebar-createCalendar')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
