import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Badge,
  Textarea,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Spinner,
  Separator,
  useLocale
} from '@newwork/nw-design-system'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import 'dayjs/locale/de'
import 'dayjs/locale/en'
import 'dayjs/locale/ro'
import { useChatTranslation } from '../../contexts/TranslationContext'
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  Check,
  X,
  HelpCircle,
  Trash2,
  Pencil,
  Phone,
  MessageSquare,
  ListTodo
} from 'lucide-react'
import { navigateTo } from '@/common/utils/navigationUtils'
import { CalendarEvent, InvitationStatus, MeetingStatus } from '../types'
import { getAgendaFromMetadata, getTotalAgendaDuration } from '../utils/agendaUtils'

dayjs.extend(localizedFormat)

interface MeetingDetailModalProps {
  event: CalendarEvent | null
  isOpen: boolean
  onClose: () => void
  onRespond: (status: InvitationStatus, comment?: string) => Promise<void>
  onEdit?: () => void
  onDelete?: () => Promise<void>
  onStartCall?: () => void
  onOpenChat?: () => void
  currentUserId?: string
  activeConversationCalls?: Map<string, any>
}

const formatDate = (date: Date, locale?: string): string => {
  return date.toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const formatTime = (date: Date, locale: string): string => {
  const baseLocale = locale?.split('-')[0]?.toLowerCase() || 'en'
  return dayjs(date).locale(baseLocale).format('LT')
}

const getStatusBadge = (status: MeetingStatus) => {
  switch (status) {
    case 'in_progress':
      return (
        <Badge variant="default" className="gba:bg-success">
          In Progress
        </Badge>
      )
    case 'completed':
      return <Badge variant="secondary">Completed</Badge>
    case 'cancelled':
      return <Badge variant="destructive">Cancelled</Badge>
    default:
      return null
  }
}

const getParticipantStatusIcon = (status?: InvitationStatus) => {
  switch (status) {
    case InvitationStatus.ACCEPTED:
      return <Check className="gba:h-4 gba:w-4 gba:text-success" />
    case InvitationStatus.DECLINED:
      return <X className="gba:h-4 gba:w-4 gba:text-destructive" />
    case InvitationStatus.TENTATIVE:
      return <HelpCircle className="gba:h-4 gba:w-4 gba:text-warning" />
    default:
      return <Clock className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
  }
}

const getInitials = (name: string): string => {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

const handleNavigateToProfile = (employeeId?: string) => {
  if (employeeId) {
    navigateTo(`/platform/employee-record?employeeId=${employeeId}`)
  }
}

export const MeetingDetailModal: React.FC<MeetingDetailModalProps> = ({
  event,
  isOpen,
  onClose,
  onRespond,
  onEdit,
  onDelete,
  onStartCall,
  onOpenChat,
  activeConversationCalls
}) => {
  const t = useChatTranslation()
  const { locale } = useLocale()
  const [responseComment, setResponseComment] = useState('')
  const [isResponding, setIsResponding] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showResponseInput, setShowResponseInput] = useState(false)
  const [pendingResponse, setPendingResponse] = useState<InvitationStatus | null>(null)

  if (!event) return null

  // Check if there's an active call for this meeting
  // If meeting is linked to a conversation, check using conversation ID
  // Otherwise, check using meeting ID
  const callId = event.conversationId || event.id
  const activeCall = activeConversationCalls?.get(callId)
  const hasActiveCall = !!activeCall

  const organizerName =
    event.organizer.displayName ||
    `${event.organizer.firstName || ''} ${event.organizer.lastName || ''}`.trim() ||
    event.organizer.email

  const canEdit = event.isOrganizer && event.status === 'scheduled'
  const canDelete = event.isOrganizer
  const canRespond = !event.isOrganizer && event.status === 'scheduled'
  const canStartCall = event.meetingLink && (event.status === 'scheduled' || event.status === 'in_progress')

  const handleResponse = async (status: InvitationStatus) => {
    if (status === InvitationStatus.DECLINED || status === InvitationStatus.TENTATIVE) {
      // Show comment input for decline/tentative
      setPendingResponse(status)
      setShowResponseInput(true)
    } else {
      await submitResponse(status)
    }
  }

  const submitResponse = async (status: InvitationStatus, comment?: string) => {
    setIsResponding(true)
    try {
      await onRespond(status, comment)
      setShowResponseInput(false)
      setPendingResponse(null)
      setResponseComment('')
    } catch (error) {
      console.error('Error responding to meeting:', error)
    } finally {
      setIsResponding(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return

    setIsDeleting(true)
    try {
      await onDelete()
      onClose()
    } catch (error) {
      console.error('Error deleting meeting:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const cancelResponseInput = () => {
    setShowResponseInput(false)
    setPendingResponse(null)
    setResponseComment('')
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="gba:max-w-md">
        <DialogHeader className="gba:pb-2">
          <div className="gba:flex gba:items-start gba:gap-3">
            <div
              className="gba:w-1 gba:h-12 gba:rounded-full gba:flex-shrink-0"
              style={{ backgroundColor: event.color }}
            />
            <div className="gba:flex-1">
              <DialogTitle className="gba:text-lg gba:mb-1">{event.title}</DialogTitle>
              <div className="gba:flex gba:items-center gba:gap-2">
                {hasActiveCall && (
                  <Badge variant="default" className="gba:bg-success gba:text-success-foreground">
                    <div className="gba:flex gba:items-center gba:gap-1">
                      <Phone className="gba:h-3 gba:w-3" />
                      <span>Call in Progress</span>
                    </div>
                  </Badge>
                )}
                {getStatusBadge(event.status)}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="gba:space-y-4 gba:py-4">
          {/* Date and Time */}
          <div className="gba:flex gba:items-start gba:gap-3">
            <Calendar className="gba:h-5 gba:w-5 gba:text-muted-foreground gba:mt-0.5" />
            <div>
              <div className="gba:font-medium">{formatDate(event.start, locale)}</div>
              {event.allDay ? (
                <div className="gba:text-sm gba:text-muted-foreground">{t('calendar-allDayEvent')}</div>
              ) : (
                <div className="gba:text-sm gba:text-muted-foreground">
                  {formatTime(event.start, locale)} - {formatTime(event.end, locale)}
                </div>
              )}
            </div>
          </div>

          {/* Location or Video Call */}
          {(event.location || event.meetingLink) && (
            <div className="gba:flex gba:items-start gba:gap-3">
              {event.meetingLink ? (
                <>
                  <Video className="gba:h-5 gba:w-5 gba:text-primary gba:mt-0.5" />
                  <div>
                    <div className="gba:font-medium gba:text-primary">{t('calendar-videoCallAvailable')}</div>
                    <div className="gba:text-sm gba:text-muted-foreground">{t('calendar-joinLinkAvailable')}</div>
                  </div>
                </>
              ) : (
                <>
                  <MapPin className="gba:h-5 gba:w-5 gba:text-muted-foreground gba:mt-0.5" />
                  <div className="gba:font-medium">{event.location}</div>
                </>
              )}
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="gba:text-sm gba:text-muted-foreground gba:bg-muted/30 gba:p-3 gba:rounded-lg">
              {event.description}
            </div>
          )}

          {/* Agenda */}
          {(() => {
            const agenda = getAgendaFromMetadata(event.metadata)
            if (agenda.length === 0) return null

            const totalDuration = getTotalAgendaDuration(agenda)

            // Helper to get participant name by ID
            const getAssigneeName = (assigneeId?: string) => {
              if (!assigneeId || !event.participants) return null
              const participant = event.participants.find(p => p.id === assigneeId)
              if (!participant) return null
              return (
                participant.displayName ||
                `${participant.firstName || ''} ${participant.lastName || ''}`.trim() ||
                participant.email
              )
            }

            // Helper to get participant avatar by ID
            const getAssigneeAvatar = (assigneeId?: string) => {
              if (!assigneeId || !event.participants) return null
              const participant = event.participants.find(p => p.id === assigneeId)
              return participant?.avatarUrl
            }

            return (
              <div className="gba:space-y-2">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <ListTodo className="gba:h-5 gba:w-5 gba:text-muted-foreground" />
                    <span className="gba:text-sm gba:font-medium">{t('calendar-agenda')}</span>
                  </div>
                  {totalDuration > 0 && (
                    <span className="gba:text-xs gba:text-muted-foreground">
                      {t('calendar-agendaTotalDuration', { minutes: totalDuration })}
                    </span>
                  )}
                </div>
                <div className="gba:space-y-1.5 gba:pl-7">
                  {agenda.map((item, index) => {
                    const assigneeName = getAssigneeName(item.assigneeId)
                    const assigneeAvatar = getAssigneeAvatar(item.assigneeId)

                    return (
                      <div
                        key={item.id}
                        className="gba:flex gba:items-center gba:gap-2 gba:py-1.5 gba:px-2 gba:rounded-md gba:bg-muted/30"
                      >
                        <span className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:min-w-[20px]">
                          {index + 1}.
                        </span>
                        <div className="gba:flex-1 gba:min-w-0">
                          <div className="gba:text-sm gba:font-medium gba:truncate">{item.title}</div>
                          {item.description && (
                            <div className="gba:text-xs gba:text-muted-foreground gba:truncate">{item.description}</div>
                          )}
                        </div>
                        {item.duration && (
                          <Badge variant="outline" className="gba:text-[10px] gba:shrink-0">
                            {item.duration} min
                          </Badge>
                        )}
                        {assigneeName && (
                          <div className="gba:flex gba:items-center gba:gap-1 gba:shrink-0">
                            <Avatar className="gba:h-5 gba:w-5">
                              {assigneeAvatar && <AvatarImage src={assigneeAvatar} alt={assigneeName} />}
                              <AvatarFallback className="gba:text-[8px]">{getInitials(assigneeName)}</AvatarFallback>
                            </Avatar>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          <Separator />

          {/* Organizer */}
          <div className="gba:flex gba:items-center gba:gap-3">
            <Avatar
              className={`gba:h-9 gba:w-9 ${event.organizer.employeeId ? 'gba:cursor-pointer hover:gba:ring-2 hover:gba:ring-primary gba:transition-all' : ''}`}
              onClick={() => handleNavigateToProfile(event.organizer.employeeId)}
              title={event.organizer.employeeId ? 'View profile' : undefined}
            >
              {event.organizer.avatarUrl && <AvatarImage src={event.organizer.avatarUrl} alt={organizerName} />}
              <AvatarFallback>{getInitials(organizerName)}</AvatarFallback>
            </Avatar>
            <div className="gba:flex-1">
              <div
                className={`gba:font-medium gba:text-sm ${event.organizer.employeeId ? 'gba:cursor-pointer hover:gba:text-primary gba:transition-colors' : ''}`}
                onClick={() => handleNavigateToProfile(event.organizer.employeeId)}
              >
                {organizerName}
              </div>
              <div className="gba:text-xs gba:text-muted-foreground">
                {event.isOrganizer ? t('calendar-youOrganizer') : t('calendar-organizer')}
              </div>
            </div>
            {event.isOrganizer && (
              <Badge variant="outline" className="gba:text-[10px]">
                {t('calendar-organizer')}
              </Badge>
            )}
          </div>

          {/* Participants */}
          <div className="gba:space-y-2">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <Users className="gba:h-5 gba:w-5 gba:text-muted-foreground" />
              <span className="gba:text-sm gba:font-medium">
                {t('calendar-participantsAttending', { accepted: event.acceptedCount, total: event.participantCount })}
              </span>
            </div>
            {event.participants && event.participants.length > 0 ? (
              <div className="gba:space-y-2 gba:max-h-[200px] gba:overflow-y-auto gba:pr-2">
                {event.participants.map(participant => {
                  const name =
                    participant.displayName ||
                    `${participant.firstName || ''} ${participant.lastName || ''}`.trim() ||
                    participant.email
                  const isClickable = !!participant.employeeId
                  return (
                    <div
                      key={participant.id}
                      className="gba:flex gba:items-center gba:gap-3 gba:py-1.5 gba:px-2 gba:rounded-md gba:bg-muted/30"
                    >
                      <Avatar
                        className={`gba:h-7 gba:w-7 ${isClickable ? 'gba:cursor-pointer hover:gba:ring-2 hover:gba:ring-primary gba:transition-all' : ''}`}
                        onClick={() => handleNavigateToProfile(participant.employeeId)}
                        title={isClickable ? 'View profile' : undefined}
                      >
                        {participant.avatarUrl && <AvatarImage src={participant.avatarUrl} alt={name} />}
                        <AvatarFallback className="gba:text-xs">{getInitials(name)}</AvatarFallback>
                      </Avatar>
                      <div className="gba:flex-1 gba:min-w-0">
                        <div
                          className={`gba:text-sm gba:font-medium gba:truncate ${isClickable ? 'gba:cursor-pointer hover:gba:text-primary gba:transition-colors' : ''}`}
                          onClick={() => handleNavigateToProfile(participant.employeeId)}
                        >
                          {name}
                        </div>
                        {participant.comment && (
                          <div className="gba:text-xs gba:text-muted-foreground gba:truncate">
                            "{participant.comment}"
                          </div>
                        )}
                      </div>
                      <div className="gba:flex gba:items-center gba:gap-1.5">
                        {participant.isOrganizer && (
                          <Badge variant="outline" className="gba:text-[10px] gba:px-1">
                            {t('calendar-host')}
                          </Badge>
                        )}
                        {getParticipantStatusIcon(participant.status)}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="gba:text-sm gba:text-muted-foreground gba:py-2">{t('calendar-noParticipantDetails')}</div>
            )}
          </div>

          {/* Your Response Status (if not organizer) */}
          {!event.isOrganizer && event.participantStatus && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:p-3 gba:bg-muted/30 gba:rounded-lg">
              {getParticipantStatusIcon(event.participantStatus)}
              <span className="gba:text-sm">
                {t('calendar-yourResponse')}{' '}
                <span className="gba:font-medium gba:capitalize">{event.participantStatus}</span>
              </span>
            </div>
          )}

          {/* Response Input (for decline/tentative) */}
          {showResponseInput && (
            <div className="gba:space-y-3 gba:p-3 gba:border gba:border-border gba:rounded-lg">
              <div className="gba:text-sm gba:font-medium">
                {pendingResponse === InvitationStatus.DECLINED
                  ? t('calendar-declineMeeting')
                  : t('calendar-markTentative')}
              </div>
              <Textarea
                value={responseComment}
                onChange={e => setResponseComment(e.target.value)}
                placeholder={t('calendar-addComment')}
                rows={2}
              />
              <div className="gba:flex gba:justify-end gba:gap-2">
                <Button variant="outline" size="sm" onClick={cancelResponseInput}>
                  {t('calendar-cancel')}
                </Button>
                <Button
                  size="sm"
                  variant={pendingResponse === InvitationStatus.DECLINED ? 'destructive' : 'default'}
                  onClick={() => submitResponse(pendingResponse!, responseComment)}
                  disabled={isResponding}
                >
                  {isResponding ? <Spinner className="gba:h-4 gba:w-4" /> : t('calendar-confirm')}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="gba:flex gba:flex-col gba:gap-3 gba:pt-4 gba:border-t gba:border-border">
          {/* Response buttons (for invitees) */}
          {canRespond && !showResponseInput && (
            <div className="gba:flex gba:gap-2">
              <Button
                variant={event.participantStatus === InvitationStatus.ACCEPTED ? 'default' : 'outline'}
                className="gba:flex-1"
                onClick={() => handleResponse(InvitationStatus.ACCEPTED)}
                disabled={isResponding}
              >
                <Check className="gba:h-4 gba:w-4 gba:mr-1" />
                {t('calendar-accept')}
              </Button>
              <Button
                variant={event.participantStatus === InvitationStatus.TENTATIVE ? 'default' : 'outline'}
                className="gba:flex-1"
                onClick={() => handleResponse(InvitationStatus.TENTATIVE)}
                disabled={isResponding}
              >
                <HelpCircle className="gba:h-4 gba:w-4 gba:mr-1" />
                {t('calendar-maybe')}
              </Button>
              <Button
                variant={event.participantStatus === InvitationStatus.DECLINED ? 'destructive' : 'outline'}
                className="gba:flex-1"
                onClick={() => handleResponse(InvitationStatus.DECLINED)}
                disabled={isResponding}
              >
                <X className="gba:h-4 gba:w-4 gba:mr-1" />
                {t('calendar-decline')}
              </Button>
            </div>
          )}

          {/* Action buttons */}
          <div className="gba:flex gba:gap-2">
            {/* Start call button */}
            {canStartCall && onStartCall && (
              <Button onClick={onStartCall} className="gba:flex-1" variant={hasActiveCall ? 'default' : 'default'}>
                <Phone className="gba:h-4 gba:w-4 gba:mr-1" />
                {hasActiveCall ? t('calendar-joinMeeting') : t('calendar-startMeeting')}
              </Button>
            )}

            {/* Open chat button */}
            {event.conversationId && onOpenChat && (
              <Button variant="outline" onClick={onOpenChat}>
                <MessageSquare className="gba:h-4 gba:w-4 gba:mr-1" />
                {t('calendar-chat')}
              </Button>
            )}

            {/* Edit button (organizer only) */}
            {canEdit && onEdit && (
              <Button variant="outline" onClick={onEdit}>
                <Pencil className="gba:h-4 gba:w-4 gba:mr-1" />
                {t('calendar-edit')}
              </Button>
            )}

            {/* Delete button (organizer only) */}
            {canDelete && onDelete && (
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={isDeleting}
                className="gba:text-destructive gba:hover:bg-destructive/10"
              >
                {isDeleting ? <Spinner className="gba:h-4 gba:w-4" /> : <Trash2 className="gba:h-4 gba:w-4" />}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
