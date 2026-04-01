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
import { CalendarBlank, PencilSimple } from '@phosphor-icons/react'
import type { InternalCalendarSummary, UpdateSharedCalendarData } from '../types'
import { MEETING_COLORS, getDefaultCalendarColor } from '../types'
import translations from '../../_i18n'

interface EditSharedCalendarDialogProps {
  calendar?: InternalCalendarSummary | null
  isOpen: boolean
  isSubmitting?: boolean
  onClose: () => void
  onSubmit: (data: UpdateSharedCalendarData) => Promise<void>
}

export const EditSharedCalendarDialog: React.FC<EditSharedCalendarDialogProps> = ({
  calendar,
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
    if (!isOpen || !calendar) {
      return
    }

    setName(calendar.name)
    setDescription(calendar.description || '')
    setColor(calendar.color || getDefaultCalendarColor())
  }, [calendar, isOpen])

  const handleSubmit = async () => {
    if (!calendar || !name.trim()) {
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
      <DialogContent className="gba:max-w-md" data-testid="edit-shared-calendar-dialog">
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <PencilSimple className="gba:h-5 gba:w-5" />
            {t('calendar-sidebar-editCalendar')}
          </DialogTitle>
          <DialogDescription>{t('calendar-sidebar-editCalendarDescription')}</DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-4">
          <div className="gba:space-y-2">
            <Label htmlFor="edit-shared-calendar-name">{t('calendar-sidebar-calendarName')}</Label>
            <Input
              id="edit-shared-calendar-name"
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder={t('calendar-sidebar-calendarNamePlaceholder')}
              disabled={isSubmitting}
              data-testid="edit-shared-calendar-name-input"
            />
          </div>

          <div className="gba:space-y-2">
            <Label htmlFor="edit-shared-calendar-description">{t('calendar-description')}</Label>
            <Textarea
              id="edit-shared-calendar-description"
              value={description}
              onChange={event => setDescription(event.target.value)}
              placeholder={t('calendar-sidebar-calendarDescriptionPlaceholder')}
              rows={3}
              disabled={isSubmitting}
              data-testid="edit-shared-calendar-description-input"
            />
          </div>

          <div className="gba:space-y-2">
            <Label htmlFor="edit-shared-calendar-color">{t('calendar-color')}</Label>
            <Select value={color} onValueChange={setColor}>
              <SelectTrigger id="edit-shared-calendar-color" data-testid="edit-shared-calendar-color-select">
                <SelectValue>
                  <span className="gba:flex gba:items-center gba:gap-2">
                    <CalendarBlank className="gba:h-4 gba:w-4" style={{ color }} />
                    {selectedColorName}
                  </span>
                </SelectValue>
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
            data-testid="edit-shared-calendar-cancel-button"
          >
            {t('calendar-cancel')}
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={!calendar || !name.trim() || isSubmitting}
            data-testid="edit-shared-calendar-submit-button"
          >
            {t('calendar-saveChanges')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
