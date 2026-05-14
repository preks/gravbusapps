import React, { useState, useCallback, useMemo } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Badge,
  Separator,
  useTranslation,
  toast
} from '@newwork/nw-design-system'
import { Newspaper, UserPlus, MessageCircle, Check } from 'lucide-react'
import { useContentEntries } from '@/common/data/content/hooks/useContentEntries'
import { ContentRole, ContentGroup } from '@/common/data/content/constants/contentConstants'
import { useChatClient } from '@/common/network/chat/useChatClient'
import { useNewJoiners, type NewJoiner } from '../hooks/useNewJoiners'
import { navigateTo, buildPlatformUrl, Navigation } from '@/common/utils/navigationUtils'
import dayjs from 'dayjs'
import translations from '../_i18n'

const WELCOMED_STORAGE_KEY = 'work-home:welcomed-joiners'

function getWelcomedJoinersFromStorage(): Set<string> {
  try {
    const raw = localStorage.getItem(WELCOMED_STORAGE_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

function persistWelcomedJoiner(userId: string) {
  try {
    const current = getWelcomedJoinersFromStorage()
    current.add(userId)
    localStorage.setItem(WELCOMED_STORAGE_KEY, JSON.stringify([...current]))
  } catch {
    /* noop */
  }
}

interface WhatsNewSectionProps {
  accessToken: string
  'data-testid'?: string
}

export const WhatsNewSection: React.FC<WhatsNewSectionProps> = ({
  accessToken,
  'data-testid': testId = 'work-home-whats-new'
}) => {
  const { t } = useTranslation(translations)
  const [sendingToUserId, setSendingToUserId] = useState<string | null>(null)
  const [welcomedUserIds, setWelcomedUserIds] = useState<Set<string>>(getWelcomedJoinersFromStorage)

  const { entries: newsEntries, isLoading: newsLoading } = useContentEntries(
    {
      role: ContentRole.ROOT,
      contentGroup: ContentGroup.NEWS,
      limit: 2,
      offset: 0,
      sortBy: 'createdAt',
      sortOrder: 'DESC'
    },
    accessToken
  )

  const { joiners, isLoading: joinersLoading, error: joinersError } = useNewJoiners({ accessToken })

  const chatClient = useChatClient(accessToken)

  const today = useMemo(() => dayjs().startOf('day'), [])

  const formatJoinDate = useCallback(
    (hireDate: string, orgUnitName?: string) => {
      const date = dayjs(hireDate)
      const formatted = date.format('MMM D, YYYY')
      const isPast = date.isBefore(today)
      if (orgUnitName) {
        return isPast
          ? t('joiner-joined-on-org', { date: formatted, orgUnit: orgUnitName })
          : t('joiner-joins-on-org', { date: formatted, orgUnit: orgUnitName })
      }
      return isPast ? t('joiner-joined-on', { date: formatted }) : t('joiner-joins-on', { date: formatted })
    },
    [today, t]
  )

  const handleOpenChat = useCallback(() => {
    navigateTo(buildPlatformUrl(Navigation.PLATFORM_TEAM_CHAT, { view: 'chat' }))
  }, [])

  const handleSayWelcome = useCallback(
    async (joiner: NewJoiner) => {
      if (!joiner.userId) {
        toast.error(t('welcome-error'))
        return
      }

      setSendingToUserId(joiner.userId)
      try {
        const currentUser = await chatClient.getCurrentUser()
        const conversation = await chatClient.getOrCreateDirectConversation(joiner.userId)
        const message = t('welcome-message', { name: joiner.firstName })
        await chatClient.sendMessage(conversation.id, message, currentUser.id, undefined, {
          source: 'work-home',
          type: 'welcome-greeting'
        })
        persistWelcomedJoiner(joiner.userId)
        setWelcomedUserIds(prev => new Set([...prev, joiner.userId]))
        toast.success(t('welcome-sent', { name: joiner.firstName }))
      } catch {
        toast.error(t('welcome-error'))
      } finally {
        setSendingToUserId(null)
      }
    },
    [chatClient, t]
  )

  const handleOpenIntranet = () => {
    navigateTo(buildPlatformUrl('/platform/content/intranet', { from: 'work-home', tab: 'home' }))
  }

  const handleOpenArticle = (articleId: string) => {
    navigateTo(
      buildPlatformUrl('/platform/content/intranet/content-record', { from: 'work-home', contentId: articleId })
    )
  }

  const isLoading = newsLoading || joinersLoading

  if (isLoading) {
    return (
      <Card className="gba:rounded-xl gba:p-5" data-testid={testId}>
        <CardHeader>
          <CardTitle className="gba:text-lg">{t('whats-new-title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:animate-pulse gba:space-y-3">
            <div className="gba:h-16 gba:bg-muted gba:rounded-lg" />
            <div className="gba:h-16 gba:bg-muted gba:rounded-lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="gba:rounded-xl gba:p-5" data-testid={testId}>
      <CardHeader className="gba:pb-3">
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:text-lg">{t('whats-new-title')}</CardTitle>
          <button
            onClick={handleOpenIntranet}
            className="gba:text-sm gba:text-primary gba:hover:underline gba:font-medium"
          >
            {t('whats-new-view-all')} →
          </button>
        </div>
      </CardHeader>
      <CardContent className="gba:space-y-4">
        {/* Latest News */}
        {newsEntries.length > 0 && (
          <div className="gba:space-y-2">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <Newspaper className="gba:h-4 gba:w-4 gba:text-primary" />
              <span className="gba:text-sm gba:font-medium gba:text-foreground">{t('whats-new-latest-news')}</span>
            </div>
            {newsEntries.map(entry => (
              <button
                key={entry.id}
                className="gba:w-full gba:flex gba:gap-3 gba:p-3 gba:border gba:rounded-lg gba:hover:bg-muted/50 gba:transition-colors gba:cursor-pointer gba:text-left"
                onClick={() => entry.id && handleOpenArticle(entry.id)}
                data-testid={`${testId}-news-${entry.id}`}
              >
                {entry.pictureThumbnail && (
                  <img
                    src={entry.pictureThumbnail}
                    alt=""
                    className="gba:w-16 gba:h-12 gba:rounded-md gba:object-cover gba:shrink-0"
                  />
                )}
                <div className="gba:min-w-0 gba:flex-1">
                  <p className="gba:text-sm gba:font-medium gba:text-foreground gba:line-clamp-2">{entry.title}</p>
                  {entry.createdAt && (
                    <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                      {new Date(entry.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric'
                      })}
                      {entry.creatorEmployee && (
                        <>
                          {' '}
                          &middot; {entry.creatorEmployee.firstName} {entry.creatorEmployee.lastName}
                        </>
                      )}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* New Joiners */}
        {joinersError && (
          <>
            {newsEntries.length > 0 && <Separator />}
            <div className="gba:flex gba:items-center gba:gap-2 gba:p-3 gba:rounded-lg gba:bg-destructive/10">
              <UserPlus className="gba:h-4 gba:w-4 gba:text-destructive" />
              <span className="gba:text-sm gba:text-destructive">{t('whats-new-joiners-error')}</span>
            </div>
          </>
        )}
        {joiners.length > 0 && (
          <>
            {newsEntries.length > 0 && <Separator />}
            <div className="gba:space-y-2">
              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                <UserPlus className="gba:h-4 gba:w-4 gba:text-success" />
                <span className="gba:text-sm gba:font-medium gba:text-foreground">{t('whats-new-joiners')}</span>
                <Badge variant="secondary">{joiners.length}</Badge>
              </div>
              {joiners.map(joiner => {
                const alreadyWelcomed = welcomedUserIds.has(joiner.userId)

                return (
                  <div
                    key={joiner.id}
                    className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg"
                    data-testid={`${testId}-joiner-${joiner.id}`}
                  >
                    <div className="gba:flex gba:items-center gba:gap-3">
                      <Avatar className="gba:h-9 gba:w-9">
                        {joiner.pictureThumbnail ? (
                          <AvatarImage src={joiner.pictureThumbnail} alt={joiner.fullName} />
                        ) : (
                          <AvatarFallback className="gba:text-xs">
                            {joiner.firstName.charAt(0)}
                            {joiner.lastName.charAt(0)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <p className="gba:text-sm gba:font-medium gba:text-foreground">{joiner.fullName}</p>
                        {joiner.jobPositionName && (
                          <p className="gba:text-xs gba:text-muted-foreground">{joiner.jobPositionName}</p>
                        )}
                        {joiner.hireDate && (
                          <p className="gba:text-xs gba:text-muted-foreground">
                            {formatJoinDate(joiner.hireDate, joiner.orgUnitName)}
                          </p>
                        )}
                      </div>
                    </div>
                    {alreadyWelcomed ? (
                      <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:text-muted-foreground">
                        <Check className="gba:h-3 gba:w-3 gba:text-success" />
                        <span>
                          {t('welcome-already-sent', { name: joiner.firstName })}{' '}
                          <button
                            type="button"
                            className="gba:text-primary gba:underline gba:hover:text-primary/80"
                            onClick={handleOpenChat}
                          >
                            {t('welcome-go-to-chat')}
                          </button>
                        </span>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSayWelcome(joiner)}
                        disabled={sendingToUserId === joiner.userId}
                      >
                        <MessageCircle className="gba:h-3 gba:w-3 gba:mr-1" />
                        {sendingToUserId === joiner.userId ? '...' : t('whats-new-say-welcome')}
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Empty state - only show when no error and genuinely empty */}
        {newsEntries.length === 0 && joiners.length === 0 && !joinersError && (
          <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
            <Newspaper className="gba:mx-auto gba:mb-2 gba:h-10 gba:w-10 gba:opacity-50" />
            <p className="gba:font-medium">{t('whats-new-empty')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
