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
import { TeamAnniversary } from '../hooks/useTeamAnniversaries'
import { ChatApiClient } from '@/business-apps/platform/apps/chat/services/chatApiClient'
import { getChatServiceApiUrl } from '@/business-apps/platform/apps/chat/utils/chatServiceUrl'
import { toast } from 'sonner'

export interface AnniversariesViewProps {
  upcomingAnniversaries: TeamAnniversary[]
  loadingAnniversaries: boolean
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

const buildAnniversaryMessage = (employeeName: string, yearsOfService: number, seed: string) => {
  const variants = [
    `Congratulations ${employeeName} on your ${yearsOfService}-year work anniversary! Your dedication and impact are truly appreciated.`,
    `Happy work anniversary, ${employeeName}! ${yearsOfService} years is a great milestone - thank you for your continuous contribution.`,
    `${employeeName}, congrats on your ${yearsOfService} years with the company! Appreciate your commitment and teamwork.`
  ]
  return variants[getDeterministicVariantIndex(seed, variants.length)]
}

export const AnniversariesView: React.FC<AnniversariesViewProps> = ({
  upcomingAnniversaries,
  loadingAnniversaries,
  accessToken,
  onNavigateBack,
  onNavigateToEmployee
}) => {
  const [sendingToUserId, setSendingToUserId] = useState<string | null>(null)

  const chatClient = useMemo(() => new ChatApiClient(getChatServiceApiUrl(), accessToken), [accessToken])

  const sendAnniversaryMessage = useCallback(
    async (person: TeamAnniversary) => {
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
          buildAnniversaryMessage(
            person.firstName,
            person.yearsOfService,
            `${person.id}-${person.yearsOfService}-${person.hireDate || ''}`
          ),
          currentUser.id,
          undefined,
          { source: 'manager-dashboard', type: 'anniversary-greeting', aiCustomized: true }
        )
        toast.success(`Message sent to ${person.firstName} ${person.lastName}`)
      } catch {
        console.error('Failed to send anniversary chat message')
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
            data-testid="manager-dashboard-anniversaries-back-button"
          >
            <ChevronLeft size={16} className="gba:mr-1" />
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_backoffice.absence_details.back_to_dashboard',
              'Back to Dashboard'
            )}
          </Button>
          <h1 className="gba:text-xl gba:font-semibold">
            {getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.anniversary_date', 'Anniversaries')}
          </h1>
          <Badge variant="info" className="gba:ml-3">
            {`${upcomingAnniversaries.length} this month`}
          </Badge>
        </div>
      </div>

      {loadingAnniversaries && (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
          <Spinner size="lg" />
        </div>
      )}

      {!loadingAnniversaries && upcomingAnniversaries.length === 0 && (
        <div className="gba:text-center gba:py-12 gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel(
            'master-data:hr.manager_dashboard.no_upcoming_anniversaries',
            'No upcoming work anniversaries in the next 30 days'
          )}
        </div>
      )}

      {!loadingAnniversaries && upcomingAnniversaries.length > 0 && (
        <div className="gba:flex-1 gba:overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  {getTranslationFromI18nKeyAndLabel('master-data:forms.capability.fields.name.label', 'Name')}
                </TableHead>
                <TableHead>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.anniversary_date', 'Anniversary')}
                </TableHead>
                <TableHead>
                  {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.years', 'Years')}
                </TableHead>
                <TableHead>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.actions', 'Actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcomingAnniversaries.map(person => {
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
                    <TableCell>{person.hireDate ? dayjs(person.hireDate).format('MMMM D') : '-'}</TableCell>
                    <TableCell>
                      <Badge variant="info" size="sm">
                        {person.yearsOfService} {person.yearsOfService === 1 ? 'year' : 'years'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={event => {
                          event.stopPropagation()
                          void sendAnniversaryMessage(person)
                        }}
                        disabled={isSending}
                        data-testid={`manager-dashboard-anniversary-chat-${person.id}`}
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
