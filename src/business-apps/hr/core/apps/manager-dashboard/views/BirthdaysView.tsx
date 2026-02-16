import React, { useCallback, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@newwork/nw-design-system'
import { ChevronLeft, MessageSquare } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { TeamBirthday } from '../hooks/useTeamBirthdays'
import { ChatApiClient } from '@/business-apps/platform/apps/chat/services/chatApiClient'
import { getChatServiceApiUrl } from '@/business-apps/platform/apps/chat/utils/chatServiceUrl'
import { toast } from 'sonner'

export interface BirthdaysViewProps {
  upcomingBirthdays: TeamBirthday[]
  loadingBirthdays: boolean
  accessToken: string
  onNavigateBack: () => void
  onNavigateToEmployee: (employeeId: string) => void
}

const buildBirthdayMessage = (employeeName: string) => {
  const variants = [
    `Happy Birthday, ${employeeName}! Wishing you a fantastic day filled with joy and celebration. Thank you for the positive energy you bring to the team.`,
    `Happy Birthday, ${employeeName}! Hope your day is full of great moments. Really appreciate your contribution and collaboration.`,
    `Wishing you a wonderful birthday, ${employeeName}! Thanks for everything you do for the team - enjoy your special day!`
  ]
  return variants[Math.floor(Math.random() * variants.length)]
}

export const BirthdaysView: React.FC<BirthdaysViewProps> = ({
  upcomingBirthdays,
  loadingBirthdays,
  accessToken,
  onNavigateBack,
  onNavigateToEmployee
}) => {
  const [sendingToUserId, setSendingToUserId] = useState<string | null>(null)

  const chatClient = useMemo(() => new ChatApiClient(getChatServiceApiUrl(), accessToken), [accessToken])

  const sendBirthdayMessage = useCallback(
    async (person: TeamBirthday) => {
      const recipientUserId = person.userId || person.id

      if (!recipientUserId) {
        toast.error('Unable to send message for this employee')
        return
      }

      setSendingToUserId(recipientUserId)
      try {
        const currentUser = await chatClient.getCurrentUser()
        const conversation = await chatClient.getOrCreateDirectConversation(recipientUserId)
        await chatClient.sendMessage(
          conversation.id,
          buildBirthdayMessage(person.firstName),
          currentUser.id,
          undefined,
          { source: 'manager-dashboard', type: 'birthday-greeting', aiCustomized: true }
        )
        toast.success(`Message sent to ${person.firstName} ${person.lastName}`)
      } catch {
        console.error('Failed to send birthday chat message')
        toast.error('Failed to send message')
      } finally {
        setSendingToUserId(null)
      }
    },
    [chatClient]
  )

  return (
    <div className="gba:p-6 gba:h-full gba:flex gba:flex-col">
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
        <div className="gba:flex gba:items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateBack}
            className="gba:mr-4"
            data-testid="manager-dashboard-birthdays-back-button"
          >
            <ChevronLeft size={16} className="gba:mr-1" />
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_backoffice.absence_details.back_to_dashboard',
              'Back to Dashboard'
            )}
          </Button>
          <h1 className="gba:text-xl gba:font-semibold">
            {getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.birthday', 'Birthdays')}
          </h1>
          <Badge variant="info" className="gba:ml-3">
            {`${upcomingBirthdays.length} this month`}
          </Badge>
        </div>
      </div>

      {loadingBirthdays && (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
          <Spinner size="lg" />
        </div>
      )}

      {!loadingBirthdays && upcomingBirthdays.length === 0 && (
        <div className="gba:text-center gba:py-12 gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel(
            'master-data:hr.manager_dashboard.no_upcoming_birthdays',
            'No upcoming birthdays in the next 30 days'
          )}
        </div>
      )}

      {!loadingBirthdays && upcomingBirthdays.length > 0 && (
        <div className="gba:flex-1 gba:overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  {getTranslationFromI18nKeyAndLabel('master-data:forms.capability.fields.name.label', 'Name')}
                </TableHead>
                <TableHead>{getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.birthday', 'Birthday')}</TableHead>
                <TableHead>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.actions', 'Actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcomingBirthdays.map(person => {
                const userKey = person.userId || person.id
                const isSending = sendingToUserId === userKey

                return (
                  <TableRow
                    key={person.id}
                    className="gba:cursor-pointer hover:gba:bg-muted/40"
                    onClick={() => onNavigateToEmployee(person.id)}
                  >
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-3">
                        <Avatar className="gba:h-8 gba:w-8">
                          <AvatarImage
                            src={
                              person.pictureThumbnail && !person.pictureThumbnail.startsWith('{')
                                ? `data:image/jpeg;base64,${person.pictureThumbnail}`
                                : undefined
                            }
                            alt={person.fullName}
                          />
                          <AvatarFallback>{`${person.firstName[0]}${person.lastName[0]}`.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="gba:font-medium">{person.fullName}</span>
                      </div>
                    </TableCell>
                    <TableCell>{person.birthDate ? dayjs(person.birthDate).format('MMMM D') : '-'}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={event => {
                          event.stopPropagation()
                          void sendBirthdayMessage(person)
                        }}
                        disabled={isSending}
                        data-testid={`manager-dashboard-birthday-chat-${person.id}`}
                      >
                        <MessageSquare size={16} className="gba:mr-1" />
                        {isSending
                          ? getTranslationFromI18nKeyAndLabel('master-data:sending', 'Sending...')
                          : getTranslationFromI18nKeyAndLabel(
                              'master-data:hr.manager_dashboard.send_message',
                              'Send Message'
                            )}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
