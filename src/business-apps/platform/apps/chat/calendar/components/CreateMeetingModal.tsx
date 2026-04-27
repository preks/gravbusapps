import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  X,
  Repeat,
  Bell,
  User,
  Mic,
  ListTodo,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import type { CreateMeetingData, InternalCalendarSummary, UpdateMeetingData } from '../types'
import { MeetingRecurrence, REMINDER_OPTIONS } from '../types'
import type { AgendaItem } from '../utils/agendaUtils'
import { getAgendaFromMetadata, getTotalAgendaDuration } from '../utils/agendaUtils'
import { createEmployeeSearchService, CalendarEmployee } from '../services/employeeSearchService'
import translations from '../../_i18n'
import { AvailabilityPanel } from './AvailabilityPanel'

interface CreateMeetingModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateMeetingData) => Promise<void>
  onUpdate?: (meetingId: string, data: UpdateMeetingData) => Promise<void>
  accessToken: string
  availableCalendars?: InternalCalendarSummary[]
  includePersonal?: boolean
  defaultCalendarId?: string
  initialDate?: Date
  initialHour?: number
  initialTitle?: string
  initialParticipants?: CalendarEmployee[]
  // For editing existing meeting
  editMeeting?: {
    id: string
    title: string
    description?: string
    startTime: Date
    endTime: Date
    location?: string
    meetingLink?: string
    conversationId?: string
    isAllDay?: boolean
    recurrence?: MeetingRecurrence
    recurrenceEndDate?: Date
    calendarId?: string
    reminderMinutes?: number[]
    participants?: Array<{ id: string; displayName?: string; firstName?: string; lastName?: string }>
    metadata?: Record<string, any>
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

const getDefaultCreateConversation = (isVideoCall: boolean): boolean => isVideoCall

const resolveSelectableCalendarId = ({
  requestedCalendarId,
  includePersonal,
  editableCalendars
}: {
  requestedCalendarId?: string
  includePersonal: boolean
  editableCalendars: InternalCalendarSummary[]
}): string => {
  if (requestedCalendarId === 'personal') {
    return includePersonal ? 'personal' : editableCalendars[0]?.id || ''
  }

  if (requestedCalendarId && editableCalendars.some(calendar => calendar.id === requestedCalendarId)) {
    return requestedCalendarId
  }

  if (includePersonal) {
    return 'personal'
  }

  return editableCalendars[0]?.id || ''
}

export const CreateMeetingModal: React.FC<CreateMeetingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onUpdate,
  accessToken,
  availableCalendars = [],
  includePersonal = true,
  defaultCalendarId,
  initialDate,
  initialHour,
  initialTitle,
  initialParticipants = [],
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
  const [createConversation, setCreateConversation] = useState(getDefaultCreateConversation(false))
  const [hasManualCreateConversationOverride, setHasManualCreateConversationOverride] = useState(false)
  const [isAllDay, setIsAllDay] = useState(false)
  const [recurrence, setRecurrence] = useState<MeetingRecurrence>(MeetingRecurrence.NONE)
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')
  const [reminderMinutes, setReminderMinutes] = useState<number[]>([15])
  const [enableAITranscription, setEnableAITranscription] = useState(false)
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>(defaultCalendarId || 'personal')
  const [hasUserChosenCalendar, setHasUserChosenCalendar] = useState(false)

  // Agenda state
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([])

  // Participants (using real employees)
  // NOTE: Must be declared before callbacks that reference it in dependency arrays
  // to avoid TDZ errors ("Cannot access '<x>' before initialization") in production bundles.
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<CalendarEmployee[]>([])
  const [selectedParticipants, setSelectedParticipants] = useState<CalendarEmployee[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const editableCalendars = useMemo(() => availableCalendars.filter(calendar => calendar.canEdit), [availableCalendars])
  const shouldShowCalendarSelect = includePersonal || editableCalendars.length > 0
  const hasExistingConversation = Boolean(editMeeting?.conversationId)
  const previousOpenRef = useRef(false)
  const previousEditMeetingIdRef = useRef<string | null>(null)

  // Debounce timer for search
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null)

  // Generate unique ID for agenda items
  const generateAgendaId = useCallback(() => {
    return `agenda-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }, [])

  // Add new agenda item
  const addAgendaItem = useCallback(() => {
    const newItem: AgendaItem = {
      id: generateAgendaId(),
      title: '',
      duration: undefined,
      assigneeId: undefined
    }
    setAgendaItems(prev => [...prev, newItem])
  }, [generateAgendaId])

  // Remove agenda item
  const removeAgendaItem = useCallback((id: string) => {
    setAgendaItems(prev => prev.filter(item => item.id !== id))
  }, [])

  // Update agenda item
  const updateAgendaItem = useCallback((id: string, updates: Partial<AgendaItem>) => {
    setAgendaItems(prev => prev.map(item => (item.id === id ? { ...item, ...updates } : item)))
  }, [])

  // Move agenda item up
  const moveAgendaItemUp = useCallback((index: number) => {
    if (index <= 0) return
    setAgendaItems(prev => {
      const newItems = [...prev]
      ;[newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]]
      return newItems
    })
  }, [])

  // Move agenda item down
  const moveAgendaItemDown = useCallback((index: number) => {
    setAgendaItems(prev => {
      if (index >= prev.length - 1) return prev
      const newItems = [...prev]
      ;[newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]]
      return newItems
    })
  }, [])

  // Calculate total agenda duration
  const totalAgendaDuration = useMemo(() => getTotalAgendaDuration(agendaItems), [agendaItems])

  const applyVideoCallState = useCallback(
    (nextIsVideoCall: boolean) => {
      setIsVideoCall(nextIsVideoCall)

      if (hasExistingConversation) {
        setCreateConversation(true)
        return
      }

      if (!hasManualCreateConversationOverride) {
        setCreateConversation(getDefaultCreateConversation(nextIsVideoCall))
      }
    },
    [hasExistingConversation, hasManualCreateConversationOverride]
  )

  const handleCalendarChange = useCallback((nextCalendarId: string) => {
    setSelectedCalendarId(nextCalendarId)
    setHasUserChosenCalendar(true)
  }, [])

  const resetForm = useCallback(() => {
    const nextCalendarId = resolveSelectableCalendarId({
      requestedCalendarId: defaultCalendarId,
      includePersonal,
      editableCalendars
    })

    setTitle(initialTitle || '')
    setDescription('')
    setDate(formatDateForInput(new Date()))
    setStartTime(formatTimeForInput(new Date()))
    setEndTime(formatTimeForInput(new Date(Date.now() + 60 * 60 * 1000)))
    setLocation('')
    setIsVideoCall(false)
    setCreateConversation(getDefaultCreateConversation(false))
    setHasManualCreateConversationOverride(false)
    setIsAllDay(false)
    setRecurrence(MeetingRecurrence.NONE)
    setRecurrenceEndDate('')
    setReminderMinutes([15])
    setHasUserChosenCalendar(false)
    setSelectedCalendarId(nextCalendarId)
    setEnableAITranscription(false)
    setAgendaItems([])
    setSelectedParticipants(initialParticipants.map(participant => ({ ...participant })))
    setSearchQuery('')
    setSearchResults([])
  }, [defaultCalendarId, editableCalendars, includePersonal, initialParticipants, initialTitle])

  // Initialize form when editMeeting changes
  useEffect(() => {
    const openedNow = isOpen && !previousOpenRef.current
    const currentEditMeetingId = editMeeting?.id || null
    const editMeetingChanged = currentEditMeetingId !== previousEditMeetingIdRef.current

    if (editMeeting && isOpen && (openedNow || editMeetingChanged)) {
      const nextCalendarId = resolveSelectableCalendarId({
        requestedCalendarId: editMeeting.calendarId || defaultCalendarId || 'personal',
        includePersonal,
        editableCalendars
      })

      setTitle(editMeeting.title || '')
      setDescription(editMeeting.description || '')
      setDate(formatDateForInput(editMeeting.startTime))
      setStartTime(formatTimeForInput(editMeeting.startTime))
      setEndTime(formatTimeForInput(editMeeting.endTime))
      setLocation(editMeeting.location || '')
      setIsVideoCall(!!editMeeting.meetingLink)
      setCreateConversation(
        Boolean(editMeeting.conversationId) || getDefaultCreateConversation(!!editMeeting.meetingLink)
      )
      setHasManualCreateConversationOverride(false)
      setIsAllDay(editMeeting.isAllDay || false)
      setRecurrence(editMeeting.recurrence || MeetingRecurrence.NONE)
      setRecurrenceEndDate(editMeeting.recurrenceEndDate ? formatDateForInput(editMeeting.recurrenceEndDate) : '')
      setReminderMinutes(editMeeting.reminderMinutes || [15])
      setHasUserChosenCalendar(false)
      setSelectedCalendarId(nextCalendarId)

      const transcriptionValue = editMeeting.metadata?.aiTranscriptionEnabled === true
      setEnableAITranscription(transcriptionValue)

      // Initialize agenda from metadata
      const existingAgenda = getAgendaFromMetadata(editMeeting.metadata)
      setAgendaItems(existingAgenda)

      // Convert participants to CalendarEmployee format
      if (editMeeting.participants) {
        setSelectedParticipants(
          editMeeting.participants.map(p => ({
            id: p.id,
            userId: p.id,
            displayName: p.displayName || [p.firstName, p.lastName].filter(Boolean).join(' ') || p.id,
            firstName: p.firstName,
            lastName: p.lastName
          }))
        )
      }
      previousEditMeetingIdRef.current = currentEditMeetingId
    } else if (!editMeeting && openedNow) {
      // Reset for create mode
      resetForm()
      if (initialDate) {
        setDate(formatDateForInput(initialDate))
      }
      if (initialHour !== undefined) {
        setStartTime(`${String(initialHour).padStart(2, '0')}:00`)
        setEndTime(`${String(Math.min(initialHour + 1, 23)).padStart(2, '0')}:00`)
      }
      previousEditMeetingIdRef.current = null
    } else if (!isOpen) {
      setHasUserChosenCalendar(false)
      previousEditMeetingIdRef.current = null
    }

    previousOpenRef.current = isOpen
  }, [defaultCalendarId, editMeeting, editableCalendars, includePersonal, initialDate, initialHour, isOpen, resetForm])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const nextCalendarId = resolveSelectableCalendarId({
      requestedCalendarId:
        !isEditMode && !hasUserChosenCalendar && defaultCalendarId ? defaultCalendarId : selectedCalendarId,
      includePersonal,
      editableCalendars
    })

    if (nextCalendarId !== selectedCalendarId) {
      setSelectedCalendarId(nextCalendarId)
    }
  }, [
    defaultCalendarId,
    editableCalendars,
    hasUserChosenCalendar,
    includePersonal,
    isEditMode,
    isOpen,
    selectedCalendarId
  ])

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
    if (shouldShowCalendarSelect && !selectedCalendarId) return false
    return true
  }, [date, endTime, isAllDay, selectedCalendarId, shouldShowCalendarSelect, startTime, title])

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

        // Filter out empty agenda items and prepare for storage
        const validAgendaItems = agendaItems.filter(item => item.title.trim())

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
          calendarId: selectedCalendarId === 'personal' ? undefined : selectedCalendarId,
          reminderMinutes,
          metadata: {
            aiTranscriptionEnabled: enableAITranscription,
            ...(validAgendaItems.length > 0 && { agenda: validAgendaItems })
          },
          // For updates, use addParticipantIds and removeParticipantIds
          ...(addParticipantIds.length > 0 && { addParticipantIds }),
          ...(removeParticipantIds.length > 0 && { removeParticipantIds }),
          createConversation
        }

        await onUpdate(editMeeting.id, updateData)
      } else {
        // Filter out empty agenda items and prepare for storage
        const validAgendaItems = agendaItems.filter(item => item.title.trim())

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
          calendarId: selectedCalendarId === 'personal' ? undefined : selectedCalendarId,
          reminderMinutes,
          participantIds: selectedParticipants.map(p => p.userId || p.id),
          createConversation,
          metadata: {
            aiTranscriptionEnabled: enableAITranscription,
            ...(validAgendaItems.length > 0 && { agenda: validAgendaItems })
          }
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

  const handleApplyAvailabilitySuggestion = useCallback((startIso: string, endIso: string) => {
    const start = new Date(startIso)
    const end = new Date(endIso)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return
    }

    setDate(formatDateForInput(start))
    setStartTime(formatTimeForInput(start))
    setEndTime(formatTimeForInput(end))
  }, [])

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="gba:max-w-lg gba:w-[95vw] gba:sm:w-full gba:max-h-[90vh] gba:overflow-y-auto">
        <DialogDescription className="gba:sr-only">
          {isEditMode ? t('calendar-editMeeting') : t('calendar-scheduleMeeting')}
        </DialogDescription>
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

          {shouldShowCalendarSelect && (
            <div className="gba:space-y-2">
              <Label htmlFor="meeting-calendar-select">Calendar</Label>
              <Select value={selectedCalendarId} onValueChange={handleCalendarChange}>
                <SelectTrigger id="meeting-calendar-select" data-testid="meeting-calendar-select">
                  <SelectValue placeholder="Choose calendar" />
                </SelectTrigger>
                <SelectContent>
                  {includePersonal && <SelectItem value="personal">My calendar</SelectItem>}
                  {editableCalendars.map(calendar => (
                    <SelectItem key={calendar.id} value={calendar.id}>
                      {calendar.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
                onClick={() => applyVideoCallState(!isVideoCall)}
                title={isVideoCall ? t('calendar-removeVideoCall') : t('calendar-addVideoCall')}
                data-testid="meeting-video-call-toggle"
              >
                <Video className="gba:h-4 gba:w-4" />
              </Button>
            </div>
          </div>

          <div className="gba:space-y-2">
            <div className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:border-border gba:rounded-lg gba:bg-muted/50">
              <div className="gba:flex-1">
                <Label htmlFor="meeting-create-chat" className="gba:font-medium gba:cursor-pointer">
                  {t('calendar-createMeetingChat')}
                </Label>
                <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">
                  {t('calendar-createMeetingChatDescription')}
                </p>
              </div>
              <Switch
                id="meeting-create-chat"
                checked={createConversation}
                disabled={hasExistingConversation}
                onCheckedChange={checked => {
                  setCreateConversation(checked)
                  setHasManualCreateConversationOverride(true)
                }}
                data-testid="meeting-create-chat-toggle"
              />
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

          {/* Agenda */}
          <div className="gba:space-y-2">
            <div className="gba:flex gba:items-center gba:justify-between">
              <Label className="gba:flex gba:items-center gba:gap-1">
                <ListTodo className="gba:h-3 gba:w-3" />
                {t('calendar-agendaOptional')}
              </Label>
              {totalAgendaDuration > 0 && (
                <span className="gba:text-xs gba:text-muted-foreground">
                  {t('calendar-agendaTotalDuration', { minutes: totalAgendaDuration })}
                </span>
              )}
            </div>

            {/* Agenda items list */}
            {agendaItems.length > 0 && (
              <div className="gba:space-y-2">
                {agendaItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="gba:flex gba:items-start gba:gap-2 gba:p-3 gba:border gba:border-border gba:rounded-lg gba:bg-muted/30"
                    data-testid={`agenda-item-${index}`}
                  >
                    <span className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mt-2 gba:min-w-[20px]">
                      {index + 1}.
                    </span>
                    <div className="gba:flex-1 gba:space-y-2">
                      <Input
                        value={item.title}
                        onChange={e => updateAgendaItem(item.id, { title: e.target.value })}
                        placeholder={t('calendar-agendaItemTitlePlaceholder')}
                        className="gba:h-8 gba:text-sm"
                        data-testid={`agenda-item-title-${index}`}
                      />
                      <div className="gba:flex gba:gap-2">
                        <div className="gba:w-24">
                          <Input
                            type="number"
                            min={1}
                            max={480}
                            value={item.duration || ''}
                            onChange={e =>
                              updateAgendaItem(item.id, {
                                duration: e.target.value ? parseInt(e.target.value, 10) : undefined
                              })
                            }
                            placeholder={t('calendar-agendaItemDuration')}
                            className="gba:h-8 gba:text-sm"
                            data-testid={`agenda-item-duration-${index}`}
                          />
                        </div>
                        {selectedParticipants.length > 0 && (
                          <Select
                            value={item.assigneeId || 'unassigned'}
                            onValueChange={value =>
                              updateAgendaItem(item.id, {
                                assigneeId: value === 'unassigned' ? undefined : value
                              })
                            }
                          >
                            <SelectTrigger className="gba:h-8 gba:text-sm gba:flex-1">
                              <SelectValue placeholder={t('calendar-agendaItemAssignee')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">{t('calendar-agendaItemUnassigned')}</SelectItem>
                              {selectedParticipants.map(participant => (
                                <SelectItem key={participant.id} value={participant.userId || participant.id}>
                                  {participant.displayName ||
                                    `${participant.firstName || ''} ${participant.lastName || ''}`.trim() ||
                                    t('calendar-unknown')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                    <div className="gba:flex gba:flex-col gba:gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="gba:h-6 gba:w-6"
                        onClick={() => moveAgendaItemUp(index)}
                        disabled={index === 0}
                        title={t('calendar-agendaItemMoveUp')}
                      >
                        <ChevronUp className="gba:h-3 gba:w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="gba:h-6 gba:w-6"
                        onClick={() => moveAgendaItemDown(index)}
                        disabled={index === agendaItems.length - 1}
                        title={t('calendar-agendaItemMoveDown')}
                      >
                        <ChevronDown className="gba:h-3 gba:w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="gba:h-6 gba:w-6 gba:text-destructive gba:hover:text-destructive"
                        onClick={() => removeAgendaItem(item.id)}
                        title={t('calendar-agendaItemRemove')}
                      >
                        <Trash2 className="gba:h-3 gba:w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add agenda item button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addAgendaItem}
              className="gba:w-full gba:gap-1"
              data-testid="add-agenda-item-button"
            >
              <Plus className="gba:h-3 gba:w-3" />
              {t('calendar-addAgendaItem')}
            </Button>
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

          <AvailabilityPanel
            accessToken={accessToken}
            participants={selectedParticipants.map(participant => ({
              id: participant.userId || participant.id,
              displayName: participant.displayName,
              firstName: participant.firstName,
              lastName: participant.lastName
            }))}
            date={date}
            startTime={startTime}
            endTime={endTime}
            onApplySuggestion={handleApplyAvailabilitySuggestion}
          />

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

          {/* AI Transcription */}
          <div className="gba:space-y-2">
            <div className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:border-border gba:rounded-lg gba:bg-muted/50">
              <div className="gba:flex gba:items-start gba:gap-2 gba:flex-1">
                <Mic className="gba:h-4 gba:w-4 gba:text-primary gba:mt-0.5" />
                <div className="gba:flex-1">
                  <Label htmlFor="ai-transcription" className="gba:font-medium gba:cursor-pointer">
                    {t('calendar-aiTranscription')}
                  </Label>
                  <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">
                    {t('calendar-aiTranscriptionDescription')}
                  </p>
                </div>
              </div>
              <Switch
                id="ai-transcription"
                checked={enableAITranscription}
                onCheckedChange={setEnableAITranscription}
                data-testid="meeting-ai-transcription-toggle"
              />
            </div>
          </div>
          {enableAITranscription && (
            <div className="gba:flex gba:items-center gba:gap-2" data-testid="create-meeting-recording-notice">
              <span
                className="gba:inline-block gba:w-2 gba:h-2 gba:rounded-full gba:bg-destructive gba:animate-pulse gba:flex-shrink-0"
                aria-hidden
              />
              <p className="gba:text-xs gba:text-muted-foreground gba:italic">
                {t('chat-call-recordingTranscriptActive')}
              </p>
            </div>
          )}
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
