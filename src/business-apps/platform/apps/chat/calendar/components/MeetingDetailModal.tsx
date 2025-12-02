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
  Separator
} from '@newwork/nw-design-system'
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
  MessageSquare
} from 'lucide-react'
import { navigateTo } from '@/common/utils/navigationUtils'
import type { CalendarEvent, InvitationStatus, MeetingStatus } from '../types'

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
}

const formatDate = (date: Date): string => {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const formatTime = (date: Date): string => {
  // Use getHours()/getMinutes() to ensure consistency with calendar position calculations
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const period = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  const minuteStr = minutes.toString().padStart(2, '0')
  return `${hour12}:${minuteStr} ${period}`
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
    case 'accepted':
      return <Check className="gba:h-4 gba:w-4 gba:text-success" />
    case 'declined':
      return <X className="gba:h-4 gba:w-4 gba:text-destructive" />
    case 'tentative':
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
  onOpenChat
}) => {
  const [responseComment, setResponseComment] = useState('')
  const [isResponding, setIsResponding] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showResponseInput, setShowResponseInput] = useState(false)
  const [pendingResponse, setPendingResponse] = useState<InvitationStatus | null>(null)

  if (!event) return null

  const organizerName =
    event.organizer.displayName ||
    `${event.organizer.firstName || ''} ${event.organizer.lastName || ''}`.trim() ||
    event.organizer.email

  const canEdit = event.isOrganizer && event.status === 'scheduled'
  const canDelete = event.isOrganizer
  const canRespond = !event.isOrganizer && event.status === 'scheduled'
  const canStartCall = event.meetingLink && (event.status === 'scheduled' || event.status === 'in_progress')

  const handleResponse = async (status: InvitationStatus) => {
    if (status === 'declined' || status === 'tentative') {
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
              {getStatusBadge(event.status)}
            </div>
          </div>
        </DialogHeader>

        <div className="gba:space-y-4 gba:py-4">
          {/* Date and Time */}
          <div className="gba:flex gba:items-start gba:gap-3">
            <Calendar className="gba:h-5 gba:w-5 gba:text-muted-foreground gba:mt-0.5" />
            <div>
              <div className="gba:font-medium">{formatDate(event.start)}</div>
              {event.allDay ? (
                <div className="gba:text-sm gba:text-muted-foreground">All day</div>
              ) : (
                <div className="gba:text-sm gba:text-muted-foreground">
                  {formatTime(event.start)} - {formatTime(event.end)}
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
                    <div className="gba:font-medium gba:text-primary">Video Call</div>
                    <div className="gba:text-sm gba:text-muted-foreground">Join link available</div>
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
                {event.isOrganizer ? 'You (Organizer)' : 'Organizer'}
              </div>
            </div>
            {event.isOrganizer && (
              <Badge variant="outline" className="gba:text-[10px]">
                Organizer
              </Badge>
            )}
          </div>

          {/* Participants */}
          <div className="gba:space-y-2">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <Users className="gba:h-5 gba:w-5 gba:text-muted-foreground" />
              <span className="gba:text-sm gba:font-medium">
                Participants ({event.acceptedCount} of {event.participantCount} attending)
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
                            Host
                          </Badge>
                        )}
                        {getParticipantStatusIcon(participant.status)}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="gba:text-sm gba:text-muted-foreground gba:py-2">No participant details available</div>
            )}
          </div>

          {/* Your Response Status (if not organizer) */}
          {!event.isOrganizer && event.participantStatus && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:p-3 gba:bg-muted/30 gba:rounded-lg">
              {getParticipantStatusIcon(event.participantStatus)}
              <span className="gba:text-sm">
                Your response: <span className="gba:font-medium gba:capitalize">{event.participantStatus}</span>
              </span>
            </div>
          )}

          {/* Response Input (for decline/tentative) */}
          {showResponseInput && (
            <div className="gba:space-y-3 gba:p-3 gba:border gba:border-border gba:rounded-lg">
              <div className="gba:text-sm gba:font-medium">
                {pendingResponse === 'declined' ? 'Decline meeting' : 'Mark as tentative'}
              </div>
              <Textarea
                value={responseComment}
                onChange={e => setResponseComment(e.target.value)}
                placeholder="Add a comment (optional)..."
                rows={2}
              />
              <div className="gba:flex gba:justify-end gba:gap-2">
                <Button variant="outline" size="sm" onClick={cancelResponseInput}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant={pendingResponse === 'declined' ? 'destructive' : 'default'}
                  onClick={() => submitResponse(pendingResponse!, responseComment)}
                  disabled={isResponding}
                >
                  {isResponding ? <Spinner className="gba:h-4 gba:w-4" /> : 'Confirm'}
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
                variant={event.participantStatus === 'accepted' ? 'default' : 'outline'}
                className="gba:flex-1"
                onClick={() => handleResponse('accepted')}
                disabled={isResponding}
              >
                <Check className="gba:h-4 gba:w-4 gba:mr-1" />
                Accept
              </Button>
              <Button
                variant={event.participantStatus === 'tentative' ? 'default' : 'outline'}
                className="gba:flex-1"
                onClick={() => handleResponse('tentative')}
                disabled={isResponding}
              >
                <HelpCircle className="gba:h-4 gba:w-4 gba:mr-1" />
                Maybe
              </Button>
              <Button
                variant={event.participantStatus === 'declined' ? 'destructive' : 'outline'}
                className="gba:flex-1"
                onClick={() => handleResponse('declined')}
                disabled={isResponding}
              >
                <X className="gba:h-4 gba:w-4 gba:mr-1" />
                Decline
              </Button>
            </div>
          )}

          {/* Action buttons */}
          <div className="gba:flex gba:gap-2">
            {/* Start call button */}
            {canStartCall && onStartCall && (
              <Button onClick={onStartCall} className="gba:flex-1">
                <Phone className="gba:h-4 gba:w-4 gba:mr-1" />
                Join Call
              </Button>
            )}

            {/* Open chat button */}
            {event.conversationId && onOpenChat && (
              <Button variant="outline" onClick={onOpenChat}>
                <MessageSquare className="gba:h-4 gba:w-4 gba:mr-1" />
                Chat
              </Button>
            )}

            {/* Edit button (organizer only) */}
            {canEdit && onEdit && (
              <Button variant="outline" onClick={onEdit}>
                <Pencil className="gba:h-4 gba:w-4 gba:mr-1" />
                Edit
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
