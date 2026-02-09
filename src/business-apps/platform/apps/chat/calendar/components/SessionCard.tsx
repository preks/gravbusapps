import React from 'react'
import { Card, CardHeader, CardContent, Badge, Button } from '@newwork/nw-design-system'
import type { CallSession } from '../types/call-session'
import { formatDuration, formatDateTime } from '../utils/dateHelpers'
import { Users, Video, Phone, Clock, FileText, CheckCircle2, XCircle } from 'lucide-react'

interface SessionCardProps {
  session: CallSession
  onViewTranscript?: (noteId: string) => void
}

export const SessionCard: React.FC<SessionCardProps> = ({ session, onViewTranscript }) => {
  const participantCount = session.participants?.length || 0
  const hasTranscript = !!session.transcriptNoteId

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'in_progress':
        return 'info'
      case 'failed':
        return 'destructive'
      case 'abandoned':
        return 'warning'
      default:
        return 'secondary'
    }
  }

  const getMediaIcon = () => {
    switch (session.mediaType) {
      case 'video':
        return <Video className="gba:h-4 gba:w-4" />
      case 'audio':
        return <Phone className="gba:h-4 gba:w-4" />
      case 'screenshare':
        return <Video className="gba:h-4 gba:w-4" />
      default:
        return <Phone className="gba:h-4 gba:w-4" />
    }
  }

  const getTranscriptionIcon = () => {
    switch (session.transcriptionStatus) {
      case 'completed':
        return <CheckCircle2 className="gba:h-4 gba:w-4 gba:text-success" />
      case 'processing':
      case 'pending':
        return <Clock className="gba:h-4 gba:w-4 gba:text-info" />
      case 'failed':
        return <XCircle className="gba:h-4 gba:w-4 gba:text-destructive" />
      default:
        return null
    }
  }

  const duration = session.actualDurationSeconds ? formatDuration(session.actualDurationSeconds) : 'In progress'

  return (
    <Card className="gba:mb-4">
      <CardHeader>
        <div className="gba:flex gba:items-start gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-2">
            {getMediaIcon()}
            <div>
              <h4 className="gba:text-sm gba:font-medium">
                {session.sessionName || session.meeting?.title || 'Group Call'}
              </h4>
              <p className="gba:text-xs gba:text-muted-foreground">{formatDateTime(session.startedAt)}</p>
            </div>
          </div>
          <Badge variant={getStatusBadgeVariant(session.sessionStatus)}>{session.sessionStatus}</Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="gba:space-y-3">
          {/* Duration */}
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
            <Clock className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
            <span className="gba:text-muted-foreground">Duration:</span>
            <span className="gba:font-medium">{duration}</span>
          </div>

          {/* Participants */}
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
            <Users className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
            <span className="gba:text-muted-foreground">Participants:</span>
            <span className="gba:font-medium">{participantCount}</span>
          </div>

          {/* Transcription */}
          {session.transcriptionEnabled && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
              {getTranscriptionIcon()}
              <span className="gba:text-muted-foreground">Transcription:</span>
              <span className="gba:font-medium gba:capitalize">{session.transcriptionStatus || 'Pending'}</span>
              {hasTranscript && onViewTranscript && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onViewTranscript(session.transcriptNoteId!)}
                  className="gba:ml-auto gba:h-7"
                >
                  <FileText className="gba:h-4 gba:w-4 gba:mr-1" />
                  View Transcript
                </Button>
              )}
            </div>
          )}

          {/* Participant List */}
          {session.participants && session.participants.length > 0 && (
            <div className="gba:mt-3 gba:pt-3 gba:border-t gba:border-border">
              <p className="gba:text-xs gba:text-muted-foreground gba:mb-2">Participants:</p>
              <div className="gba:flex gba:flex-wrap gba:gap-1">
                {session.participants.map(participant => (
                  <Badge key={participant.id} variant="secondary" className="gba:text-xs">
                    {participant.user?.displayName || participant.userName || participant.userEmail}
                    {participant.role === 'host' && ' (Host)'}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
