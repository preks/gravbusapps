import React, { useCallback, useState } from 'react'
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
import { useChatClient } from '@/common/network/chat/useChatClient'
import { toast } from 'sonner'
import { PrefilledMessageDialog } from '../components/shared/PrefilledMessageDialog'

export interface BirthdaysViewProps {
  upcomingBirthdays: TeamBirthday[]
  loadingBirthdays: boolean
  accessToken: string
  onNavigateBack: () => void
  onNavigateToEmployee: (employeeId: string) => void
}

const getDeterministicVariantIndex = (seed: string, variantsCount: number): number => {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return hash % variantsCount
}

const buildBirthdayMessage = (employeeName: string, seed: string) => {
  const variants = [
    `Happy Birthday, ${employeeName}! Wishing you a fantastic day filled with joy and celebration. Thank you for the positive energy you bring to the team.`,
    `Happy Birthday, ${employeeName}! Hope your day is full of great moments. Really appreciate your contribution and collaboration.`,
    `Wishing you a wonderful birthday, ${employeeName}! Thanks for everything you do for the team - enjoy your special day!`
  ]
  return variants[getDeterministicVariantIndex(seed, variants.length)]
}

export const BirthdaysView: React.FC<BirthdaysViewProps> = ({
  upcomingBirthdays,
  loadingBirthdays,
  accessToken,
  onNavigateBack,
  onNavigateToEmployee
}) => {
  const [sendingToUserId, setSendingToUserId] = useState<string | null>(null)
  const [messageDraft, setMessageDraft] = useState<{ person: TeamBirthday; message: string } | null>(null)

  const chatClient = useChatClient(accessToken)

  const sendBirthdayMessage = useCallback(
    async (person: TeamBirthday, message: string) => {
      const recipientUserId = person.userId || person.id

      if (!recipientUserId) {
        toast.error('Unable to send message for this employee')
        return
      }

      setSendingToUserId(recipientUserId)
      try {
        const currentUser = await chatClient.getCurrentUser()
        const conversation = await chatClient.getOrCreateDirectConversation(recipientUserId)
        await chatClient.sendMessage(conversation.id, message, currentUser.id, undefined, {
          source: 'manager-dashboard',
          type: 'birthday-greeting',
          aiCustomized: true
        })
        toast.success(`Message sent to ${person.firstName} ${person.lastName}`)
        setMessageDraft(null)
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
          <p>
            {getTranslationFromI18nKeyAndLabel(
              'master-data:hr.manager_dashboard.no_upcoming_birthdays',
              'No upcoming birthdays in the next 30 days'
            )}
          </p>
          <p className="gba:mt-2 gba:text-sm">Use this window to schedule recognition moments for your team.</p>
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
                          setMessageDraft({
                            person,
                            message: buildBirthdayMessage(person.firstName, `${person.id}-${person.birthDate || ''}`)
                          })
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

      <PrefilledMessageDialog
        open={Boolean(messageDraft)}
        onOpenChange={open => {
          if (!open) {
            setMessageDraft(null)
          }
        }}
        title="Send birthday message"
        description="Review and edit the message before sending."
        recipientName={messageDraft?.person.fullName || ''}
        defaultMessage={messageDraft?.message || ''}
        confirmLabel="Send message"
        sending={sendingToUserId === (messageDraft?.person.userId || messageDraft?.person.id)}
        onConfirm={async message => {
          if (!messageDraft) return
          await sendBirthdayMessage(messageDraft.person, message)
        }}
      />
    </div>
  )
}
