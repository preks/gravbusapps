import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Badge,
  Spinner,
  IconAvatar,
  useTranslation
} from '@newwork/nw-design-system'
import { Calendar, Clock, MapPin, Video, Users, X, Repeat, Bell, Palette, User } from 'lucide-react'
import type { CreateMeetingData, MeetingRecurrence } from '../types'
import { MEETING_COLORS, REMINDER_OPTIONS, getDefaultCalendarColor } from '../types'
import { createEmployeeSearchService, CalendarEmployee } from '../services/employeeSearchService'
import translations from '../../_i18n'

interface CreateMeetingModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateMeetingData) => Promise<void>
  onUpdate?: (meetingId: string, data: Partial<CreateMeetingData>) => Promise<void>
  accessToken: string
  initialDate?: Date
  initialHour?: number
  // For editing existing meeting
  editMeeting?: {
    id: string
    title: string
    description?: string
    startTime: Date
    endTime: Date
    location?: string
    meetingLink?: string
    isAllDay?: boolean
    recurrence?: MeetingRecurrence
    recurrenceEndDate?: Date
    color?: string
    reminderMinutes?: number[]
    participants?: Array<{ id: string; displayName?: string; firstName?: string; lastName?: string }>
  }
}

const formatDateForInput = (date: Date): string => {
  // Use local date methods instead of toISOString() to avoid timezone conversion issues
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatTimeForInput = (date: Date): string => {
  return date.toTimeString().slice(0, 5)
}

export const CreateMeetingModal: React.FC<CreateMeetingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onUpdate,
  accessToken,
  initialDate,
  initialHour,
  editMeeting
}) => {
  const { t } = useTranslation(translations)
  const isEditMode = !!editMeeting

  // Helper to get translated reminder label
  const getReminderLabel = (minutes: number): string => {
    switch (minutes) {
      case 0:
        return t('calendar-reminderAtTime')
      case 5:
        return t('calendar-reminder5Min')
      case 15:
        return t('calendar-reminder15Min')
      case 30:
        return t('calendar-reminder30Min')
      case 60:
        return t('calendar-reminder1Hour')
      case 1440:
        return t('calendar-reminder1Day')
      default:
        return `${minutes} minutes`
    }
  }

  // Form state - initialize from editMeeting if available
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(formatDateForInput(initialDate || new Date()))
  const [startTime, setStartTime] = useState(
    initialHour !== undefined ? `${String(initialHour).padStart(2, '0')}:00` : formatTimeForInput(new Date())
  )
  const [endTime, setEndTime] = useState(
    initialHour !== undefined
      ? `${String(Math.min(initialHour + 1, 23)).padStart(2, '0')}:00`
      : formatTimeForInput(new Date(Date.now() + 60 * 60 * 1000))
  )
  const [location, setLocation] = useState('')
  const [isVideoCall, setIsVideoCall] = useState(false)
  const [isAllDay, setIsAllDay] = useState(false)
  const [recurrence, setRecurrence] = useState<MeetingRecurrence>('none')
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')
  const [selectedColor, setSelectedColor] = useState(getDefaultCalendarColor())
  const [reminderMinutes, setReminderMinutes] = useState<number[]>([15])

  // Initialize form when editMeeting changes
  useEffect(() => {
    if (editMeeting && isOpen) {
      setTitle(editMeeting.title || '')
      setDescription(editMeeting.description || '')
      setDate(formatDateForInput(editMeeting.startTime))
      setStartTime(formatTimeForInput(editMeeting.startTime))
      setEndTime(formatTimeForInput(editMeeting.endTime))
      setLocation(editMeeting.location || '')
      setIsVideoCall(!!editMeeting.meetingLink)
      setIsAllDay(editMeeting.isAllDay || false)
      setRecurrence(editMeeting.recurrence || 'none')
      setRecurrenceEndDate(editMeeting.recurrenceEndDate ? formatDateForInput(editMeeting.recurrenceEndDate) : '')
      setSelectedColor(editMeeting.color || getDefaultCalendarColor())
      setReminderMinutes(editMeeting.reminderMinutes || [15])
      // Convert participants to CalendarEmployee format
      if (editMeeting.participants) {
        setSelectedParticipants(
          editMeeting.participants.map(p => ({
            id: p.id,
            userId: p.id,
            displayName: p.displayName,
            firstName: p.firstName,
            lastName: p.lastName
          }))
        )
      }
    } else if (!editMeeting && isOpen) {
      // Reset for create mode
      resetForm()
      if (initialDate) {
        setDate(formatDateForInput(initialDate))
      }
      if (initialHour !== undefined) {
        setStartTime(`${String(initialHour).padStart(2, '0')}:00`)
        setEndTime(`${String(Math.min(initialHour + 1, 23)).padStart(2, '0')}:00`)
      }
    }
  }, [editMeeting, isOpen, initialDate, initialHour])

  // Participants (using real employees)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<CalendarEmployee[]>([])
  const [selectedParticipants, setSelectedParticipants] = useState<CalendarEmployee[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Debounce timer for search
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null)

  // Employee search service
  const employeeSearchService = useMemo(() => {
    if (!accessToken) return null
    return createEmployeeSearchService(accessToken)
  }, [accessToken])

  // Search for employees with debounce
  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query)

      // Clear previous debounce
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current)
      }

      if (!query.trim() || !employeeSearchService) {
        setSearchResults([])
        return
      }

      // Debounce the search
      searchDebounceRef.current = setTimeout(async () => {
        setIsSearching(true)
        try {
          const results = await employeeSearchService.searchEmployees(query, 10)
          // Filter out already selected participants
          const filtered = results.filter(employee => !selectedParticipants.some(p => p.id === employee.id))
          setSearchResults(filtered)
        } catch (error) {
          console.error('Error searching employees:', error)
        } finally {
          setIsSearching(false)
        }
      }, 300)
    },
    [employeeSearchService, selectedParticipants]
  )

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current)
      }
    }
  }, [])

  // Add participant
  const addParticipant = (employee: CalendarEmployee) => {
    setSelectedParticipants(prev => [...prev, employee])
    setSearchResults([])
    setSearchQuery('')
  }

  // Remove participant
  const removeParticipant = (employeeId: string) => {
    setSelectedParticipants(prev => prev.filter(p => p.id !== employeeId))
  }

  // Toggle reminder
  const toggleReminder = (minutes: number) => {
    setReminderMinutes(prev => (prev.includes(minutes) ? prev.filter(m => m !== minutes) : [...prev, minutes]))
  }

  // Validate form
  const isValid = useMemo(() => {
    if (!title.trim()) return false
    if (!date) return false
    if (!isAllDay && (!startTime || !endTime)) return false
    return true
  }, [title, date, isAllDay, startTime, endTime])

  // Handle submit
  const handleSubmit = async () => {
    if (!isValid) return

    setIsSubmitting(true)
    try {
      const startDateTime = new Date(`${date}T${startTime}`)
      const endDateTime = new Date(`${date}T${endTime}`)

      if (isEditMode && editMeeting && onUpdate) {
        // For updates, calculate which participants to add/remove
        const currentParticipantIds = selectedParticipants.map(p => p.userId || p.id)
        const originalParticipantIds = editMeeting.participants?.map(p => p.id) || []

        // Find new participants (in current but not in original)
        const addParticipantIds = currentParticipantIds.filter(id => !originalParticipantIds.includes(id))
        // Find removed participants (in original but not in current)
        const removeParticipantIds = originalParticipantIds.filter(id => !currentParticipantIds.includes(id))

        const updateData = {
          title: title.trim(),
          description: description.trim() || undefined,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          location: location.trim() || undefined,
          meetingLink: isVideoCall ? 'auto-generate' : undefined,
          isAllDay,
          recurrence,
          recurrenceEndDate:
            recurrence !== 'none' && recurrenceEndDate ? new Date(recurrenceEndDate).toISOString() : undefined,
          color: selectedColor,
          reminderMinutes,
          // For updates, use addParticipantIds and removeParticipantIds
          ...(addParticipantIds.length > 0 && { addParticipantIds }),
          ...(removeParticipantIds.length > 0 && { removeParticipantIds })
        }

        await onUpdate(editMeeting.id, updateData)
      } else {
        // For create, use participantIds
        const meetingData: CreateMeetingData = {
          title: title.trim(),
          description: description.trim() || undefined,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          location: location.trim() || undefined,
          meetingLink: isVideoCall ? 'auto-generate' : undefined,
          isAllDay,
          recurrence,
          recurrenceEndDate:
            recurrence !== 'none' && recurrenceEndDate ? new Date(recurrenceEndDate).toISOString() : undefined,
          color: selectedColor,
          reminderMinutes,
          participantIds: selectedParticipants.map(p => p.userId || p.id)
        }

        await onSubmit(meetingData)
      }

      // Reset form
      resetForm()
      onClose()
    } catch (error) {
      console.error('Error saving meeting:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setDate(formatDateForInput(new Date()))
    setStartTime(formatTimeForInput(new Date()))
    setEndTime(formatTimeForInput(new Date(Date.now() + 60 * 60 * 1000)))
    setLocation('')
    setIsVideoCall(false)
    setIsAllDay(false)
    setRecurrence('none')
    setRecurrenceEndDate('')
    setSelectedColor(getDefaultCalendarColor())
    setReminderMinutes([15])
    setSelectedParticipants([])
    setSearchQuery('')
    setSearchResults([])
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="gba:max-w-lg gba:w-[95vw] gba:sm:w-full gba:max-h-[90vh] gba:overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Calendar className="gba:h-5 gba:w-5 gba:text-primary" />
            {isEditMode ? t('calendar-editMeeting') : t('calendar-scheduleMeeting')}
          </DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4 gba:py-4">
          {/* Title */}
          <div className="gba:space-y-2">
            <Label htmlFor="title">{t('calendar-meetingTitleRequired')}</Label>
            <Input
              id="title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={t('calendar-meetingTitlePlaceholder')}
              data-testid="meeting-title-input"
            />
          </div>

          {/* Date and Time */}
          <div className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:gap-3 gba:sm:gap-4">
            <div className="gba:space-y-2">
              <Label htmlFor="date">{t('calendar-dateRequired')}</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                data-testid="meeting-date-input"
              />
            </div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:sm:pt-6">
              <Switch checked={isAllDay} onCheckedChange={setIsAllDay} id="allDay" />
              <Label htmlFor="allDay" className="gba:text-sm">
                {t('calendar-allDay')}
              </Label>
            </div>
          </div>

          {!isAllDay && (
            <div className="gba:grid gba:grid-cols-2 gba:gap-3 gba:sm:gap-4">
              <div className="gba:space-y-2">
                <Label htmlFor="startTime" className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:sm:text-sm">
                  <Clock className="gba:h-3 gba:w-3" />
                  {t('calendar-start')}
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  data-testid="meeting-start-time-input"
                />
              </div>
              <div className="gba:space-y-2">
                <Label htmlFor="endTime" className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:sm:text-sm">
                  <Clock className="gba:h-3 gba:w-3" />
                  {t('calendar-end')}
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  data-testid="meeting-end-time-input"
                />
              </div>
            </div>
          )}

          {/* Location / Video Call */}
          <div className="gba:space-y-2">
            <Label className="gba:flex gba:items-center gba:gap-1">
              {isVideoCall ? <Video className="gba:h-3 gba:w-3" /> : <MapPin className="gba:h-3 gba:w-3" />}
              {isVideoCall ? t('calendar-videoCall') : t('calendar-location')}
            </Label>
            <div className="gba:flex gba:gap-2">
              <Input
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder={isVideoCall ? t('calendar-videoCallPlaceholder') : t('calendar-enterLocation')}
                disabled={isVideoCall}
                className="gba:flex-1"
              />
              <Button
                type="button"
                variant={isVideoCall ? 'default' : 'outline'}
                size="icon"
                onClick={() => setIsVideoCall(!isVideoCall)}
                title={isVideoCall ? t('calendar-removeVideoCall') : t('calendar-addVideoCall')}
              >
                <Video className="gba:h-4 gba:w-4" />
              </Button>
            </div>
          </div>

          {/* Description */}
          <div className="gba:space-y-2">
            <Label htmlFor="description">{t('calendar-description')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('calendar-descriptionPlaceholder')}
              rows={3}
            />
          </div>

          {/* Participants */}
          <div className="gba:space-y-2">
            <Label className="gba:flex gba:items-center gba:gap-1">
              <Users className="gba:h-3 gba:w-3" />
              {t('calendar-inviteParticipants')}
            </Label>

            {/* Selected participants */}
            {selectedParticipants.length > 0 && (
              <div className="gba:flex gba:flex-wrap gba:gap-2 gba:mb-2">
                {selectedParticipants.map(employee => (
                  <Badge key={employee.id} variant="secondary" className="gba:flex gba:items-center gba:gap-1 gba:pr-1">
                    <span>
                      {employee.displayName ||
                        `${employee.firstName || ''} ${employee.lastName || ''}`.trim() ||
                        t('calendar-unknown')}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeParticipant(employee.id)}
                      className="gba:ml-1 gba:hover:bg-muted gba:rounded-full gba:p-0.5"
                    >
                      <X className="gba:h-3 gba:w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Search input */}
            <div className="gba:relative">
              <Input
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                placeholder={t('calendar-searchByName')}
                data-testid="meeting-participant-search"
              />

              {/* Search results dropdown */}
              {(searchResults.length > 0 || isSearching) && (
                <div className="gba:absolute gba:top-full gba:left-0 gba:right-0 gba:mt-1 gba:bg-popover gba:border gba:border-border gba:rounded-md gba:shadow-lg gba:z-50 gba:max-h-48 gba:overflow-y-auto">
                  {isSearching ? (
                    <div className="gba:p-3 gba:text-center">
                      <Spinner className="gba:h-4 gba:w-4 gba:mx-auto" />
                    </div>
                  ) : (
                    searchResults.map(employee => (
                      <button
                        key={employee.id}
                        type="button"
                        onClick={() => addParticipant(employee)}
                        className="gba:w-full gba:flex gba:items-center gba:gap-2 gba:p-2 gba:hover:bg-muted gba:transition-colors gba:text-left"
                      >
                        <IconAvatar
                          label={employee.displayName || employee.firstName || 'U'}
                          icon={User}
                          className="gba:h-8 gba:w-8"
                        />
                        <div className="gba:flex-1 gba:min-w-0">
                          <div className="gba:text-sm gba:font-medium gba:truncate">
                            {employee.displayName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim()}
                          </div>
                          <div className="gba:text-xs gba:text-muted-foreground gba:truncate">
                            {employee.jobPositionName || employee.organizationalUnitName
                              ? `${employee.jobPositionName || ''}${employee.jobPositionName && employee.organizationalUnitName ? ' • ' : ''}${employee.organizationalUnitName || ''}`
                              : t('calendar-employee')}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Recurrence */}
          <div className="gba:space-y-2">
            <Label className="gba:flex gba:items-center gba:gap-1">
              <Repeat className="gba:h-3 gba:w-3" />
              {t('calendar-repeat')}
            </Label>
            <div className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:gap-3 gba:sm:gap-4">
              <Select value={recurrence} onValueChange={v => setRecurrence(v as MeetingRecurrence)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('calendar-doesNotRepeat')}</SelectItem>
                  <SelectItem value="daily">{t('calendar-daily')}</SelectItem>
                  <SelectItem value="weekly">{t('calendar-weekly')}</SelectItem>
                  <SelectItem value="biweekly">{t('calendar-every2Weeks')}</SelectItem>
                  <SelectItem value="monthly">{t('calendar-monthly')}</SelectItem>
                </SelectContent>
              </Select>
              {recurrence !== 'none' && (
                <Input
                  type="date"
                  value={recurrenceEndDate}
                  onChange={e => setRecurrenceEndDate(e.target.value)}
                  min={date}
                  placeholder={t('calendar-endDate')}
                />
              )}
            </div>
          </div>

          {/* Reminders */}
          <div className="gba:space-y-2">
            <Label className="gba:flex gba:items-center gba:gap-1">
              <Bell className="gba:h-3 gba:w-3" />
              {t('calendar-reminders')}
            </Label>
            <div className="gba:flex gba:flex-wrap gba:gap-2">
              {REMINDER_OPTIONS.map(option => (
                <Badge
                  key={option.value}
                  variant={reminderMinutes.includes(option.value) ? 'default' : 'outline'}
                  className="gba:cursor-pointer gba:transition-colors"
                  onClick={() => toggleReminder(option.value)}
                >
                  {getReminderLabel(option.value)}
                </Badge>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="gba:space-y-2">
            <Label className="gba:flex gba:items-center gba:gap-1">
              <Palette className="gba:h-3 gba:w-3" />
              {t('calendar-color')}
            </Label>
            <div className="gba:flex gba:gap-2">
              {MEETING_COLORS.map(color => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setSelectedColor(color.value)}
                  className={`gba:w-7 gba:h-7 gba:rounded-full gba:transition-transform ${
                    selectedColor === color.value ? 'gba:scale-125 gba:ring-2 gba:ring-offset-2 gba:ring-primary' : ''
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="gba:flex gba:justify-end gba:gap-2 gba:pt-4 gba:border-t gba:border-border">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            {t('calendar-cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
            {isSubmitting ? (
              <>
                <Spinner className="gba:h-4 gba:w-4 gba:mr-2" />
                {isEditMode ? t('calendar-saving') : t('calendar-creating')}
              </>
            ) : isEditMode ? (
              t('calendar-saveChanges')
            ) : (
              t('calendar-createMeeting')
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
