import React from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  IconAvatar,
  Spinner,
  useLocale,
  useTranslation
} from '@newwork/nw-design-system'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import isToday from 'dayjs/plugin/isToday'
import isTomorrow from 'dayjs/plugin/isTomorrow'
import 'dayjs/locale/de'
import 'dayjs/locale/en'
import 'dayjs/locale/ro'
import { Clock, User, Check, X, HelpCircle, Bell } from 'lucide-react'
import translations from '../../_i18n'
import { type Meeting, InvitationStatus } from '../types'

dayjs.extend(localizedFormat)
dayjs.extend(isToday)
dayjs.extend(isTomorrow)

interface PendingInvitationsPanelProps {
  invitations: Meeting[]
  isLoading?: boolean
  onRespond: (meetingId: string, status: InvitationStatus) => Promise<void>
  onViewDetails: (meeting: Meeting) => void
}

const formatDate = (dateStr: string, locale: string, t: (key: string) => string): string => {
  const baseLocale = locale?.split('-')[0]?.toLowerCase() || 'en'
  const date = dayjs(dateStr)

  if (date.isToday()) {
    return `${t('formatter-today')} ${date.locale(baseLocale).format('LT')}`
  }
  if (date.isTomorrow()) {
    return `${t('formatter-tomorrow')} ${date.locale(baseLocale).format('LT')}`
  }

  return date.locale(baseLocale).format('ddd, MMM D, LT')
}

export const PendingInvitationsPanel: React.FC<PendingInvitationsPanelProps> = ({
  invitations,
  isLoading,
  onRespond,
  onViewDetails
}) => {
  const { t } = useTranslation(translations)
  const { locale } = useLocale()

  if (isLoading) {
    return (
      <Card className="gba:mb-4">
        <CardContent className="gba:py-6 gba:text-center">
          <Spinner className="gba:h-6 gba:w-6 gba:mx-auto" />
        </CardContent>
      </Card>
    )
  }

  if (invitations.length === 0) {
    return null
  }

  return (
    <Card className="gba:mb-4 gba:border-warning/30 gba:bg-warning-secondary/30">
      <CardHeader className="gba:pb-2">
        <CardTitle className="gba:text-sm gba:font-medium gba:flex gba:items-center gba:gap-2">
          <Bell className="gba:h-4 gba:w-4 gba:text-warning" />
          <span>Pending Invitations</span>
          <Badge variant="outline" className="gba:text-[10px] gba:bg-warning/10 gba:border-warning/30">
            {invitations.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-3">
        {invitations.map(meeting => {
          const organizerName =
            meeting.organizer?.displayName ||
            `${meeting.organizer?.firstName || ''} ${meeting.organizer?.lastName || ''}`.trim() ||
            meeting.organizer?.email ||
            'Unknown'

          return (
            <div key={meeting.id} className="gba:p-3 gba:bg-background gba:rounded-lg gba:border gba:border-border/50">
              <div className="gba:flex gba:items-start gba:gap-3">
                <div
                  className="gba:w-1 gba:h-full gba:min-h-[60px] gba:rounded-full gba:flex-shrink-0"
                  style={{ backgroundColor: meeting.color }}
                />
                <div className="gba:flex-1 gba:min-w-0">
                  <button
                    onClick={() => onViewDetails(meeting)}
                    className="gba:text-left gba:w-full gba:hover:underline"
                  >
                    <h4 className="gba:font-semibold gba:text-sm gba:truncate">{meeting.title}</h4>
                  </button>

                  <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground gba:mt-1">
                    <Clock className="gba:h-3 gba:w-3" />
                    <span>{formatDate(meeting.startTime, locale, t)}</span>
                  </div>

                  <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground gba:mt-1">
                    <IconAvatar label={organizerName} icon={User} className="gba:h-4 gba:w-4" />
                    <span>from {organizerName}</span>
                  </div>

                  {(meeting.transcriptionEnabled === true || meeting.metadata?.aiTranscriptionEnabled === true) && (
                    <div
                      className="gba:flex gba:items-center gba:gap-2 gba:mt-2"
                      data-testid="pending-invitations-recording-notice"
                    >
                      <span
                        className="gba:inline-block gba:w-2 gba:h-2 gba:rounded-full gba:bg-destructive gba:animate-pulse gba:flex-shrink-0"
                        aria-hidden
                      />
                      <p className="gba:text-xs gba:text-muted-foreground gba:italic">
                        {t('chat-call-recordingTranscriptNotice')}
                      </p>
                    </div>
                  )}

                  {/* Quick response buttons */}
                  <div className="gba:flex gba:gap-2 gba:mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gba:h-7 gba:text-xs gba:flex-1 gba:text-success gba:border-success/30 gba:hover:bg-success/10"
                      onClick={() => onRespond(meeting.id, InvitationStatus.ACCEPTED)}
                    >
                      <Check className="gba:h-3 gba:w-3 gba:mr-1" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gba:h-7 gba:text-xs gba:flex-1"
                      onClick={() => onRespond(meeting.id, InvitationStatus.TENTATIVE)}
                    >
                      <HelpCircle className="gba:h-3 gba:w-3 gba:mr-1" />
                      Maybe
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gba:h-7 gba:text-xs gba:flex-1 gba:text-destructive gba:border-destructive/30 gba:hover:bg-destructive/10"
                      onClick={() => onRespond(meeting.id, InvitationStatus.DECLINED)}
                    >
                      <X className="gba:h-3 gba:w-3 gba:mr-1" />
                      Decline
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
