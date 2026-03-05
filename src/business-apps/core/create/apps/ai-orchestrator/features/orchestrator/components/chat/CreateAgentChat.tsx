import { Button } from '@newwork/nw-design-system'
import { History, Plus, MessageSquare, Sparkles } from 'lucide-react'
import { useMemo, useCallback } from 'react'
import { useChatScroll } from '../../hooks/useChatScroll'
import { useMessageAuthors } from '../../hooks/useMessageAuthors'
import { CreateAgentChatMessage } from './CreateAgentChatMessage'
import { CreateAgentChatInput } from './CreateAgentChatInput'
import { useCurrentUserPicture } from '@/business-apps/platform/apps/every-ai/hooks/useCurrentUserPicture'
import type { CreateChatMessage } from '../../types/chat'
import type { UserInfoProps } from '@/common/BusinessAppContext'

function toAvatarUrl(picture: string | undefined | null): string | undefined {
  if (!picture) return undefined
  return picture.startsWith('data:') ? picture : `data:image/png;base64,${picture}`
}

function getCurrentUserDisplay(
  userInfo: UserInfoProps | undefined,
  builtBy: any,
  builtByPicture: string | undefined,
  currentUserPicture: string | undefined
): { name: string; initials: string; avatar: string | undefined } {
  const first = userInfo?.givenName || userInfo?.employeeDetails?.firstName || ''
  const last = userInfo?.familyName || userInfo?.employeeDetails?.lastName || ''
  const name =
    [first, last].filter(Boolean).join(' ') || userInfo?.userName || userInfo?.employeeDetails?.firstName || 'You'
  const initials =
    [first[0], last[0]].filter(Boolean).join('').toUpperCase() || (userInfo?.userName?.slice(0, 2) ?? '?').toUpperCase()
  const isCurrentUserBuilder = !builtBy || builtBy?.id === userInfo?.id
  const picture = isCurrentUserBuilder ? builtByPicture : currentUserPicture
  return { name, initials, avatar: toAvatarUrl(picture ?? undefined) }
}

interface CreateAgentChatProps {
  messages: CreateChatMessage[]
  isProcessing: boolean
  onSend: (message: string) => void
  onNewSession: () => void
  onOpenHistory: () => void
  userInfo?: UserInfoProps
  builtBy?: any
  builtByLoading?: boolean
  accessToken?: string
  testId?: string
}

export const CreateAgentChat = ({
  messages,
  isProcessing,
  onSend,
  onNewSession,
  onOpenHistory,
  userInfo,
  builtBy,
  builtByLoading,
  accessToken,
  testId = 'create-agent-chat'
}: CreateAgentChatProps) => {
  const { messagesEndRef, scrollContainerRef, handleScroll } = useChatScroll(messages.length)

  // Legacy session = no builder info (old sessions), or placeholder "orchestrator", or id-only with no name/photo
  const isLegacySession =
    !builtBy ||
    builtBy.id === 'orchestrator' ||
    (!builtBy.displayName && !builtBy.pictureThumbnail && !builtBy.firstName && !builtBy.lastName)

  // Use builtBy if available and not loading, otherwise fall back to userInfo (only when not loading)
  const actualBuilder = builtByLoading ? null : builtBy || userInfo

  const employeeId = actualBuilder?.employeeId || actualBuilder?.employeeDetails?.employeeId || undefined
  const { pictureThumbnail, isLoading: pictureLoading } = useCurrentUserPicture(employeeId, accessToken ?? '')

  const authorIds = useMemo(
    () => [...new Set(messages.filter(m => m.role === 'user' && m.createdBy).map(m => m.createdBy!))],
    [messages]
  )
  const currentUserInAuthors = !!userInfo?.id && authorIds.includes(userInfo.id)
  const currentUserEmployeeId = currentUserInAuthors ? userInfo?.employeeDetails?.employeeId : undefined
  const { pictureThumbnail: currentUserPictureThumbnail } = useCurrentUserPicture(
    currentUserEmployeeId,
    accessToken ?? ''
  )

  const userAvatar = useMemo(() => {
    const showIncognito = builtByLoading || isLegacySession
    if (showIncognito) {
      return { pictureBase64: undefined, initials: '', showIncognito: true, showPlaceholder: false }
    }
    const builderPicture = builtBy?.pictureThumbnail || pictureThumbnail
    // When we expect a picture (employeeId) but it's still loading, show placeholder to avoid initials→photo flash
    const showPlaceholder = !!builtBy && !!employeeId && !builderPicture && pictureLoading
    if (showPlaceholder) {
      return { pictureBase64: undefined, initials: '', showIncognito: false, showPlaceholder: true }
    }
    const firstName =
      actualBuilder?.firstName || actualBuilder?.givenName || actualBuilder?.employeeDetails?.firstName || ''
    const lastName =
      actualBuilder?.lastName || actualBuilder?.familyName || actualBuilder?.employeeDetails?.lastName || ''
    const initials = [firstName[0], lastName[0]].filter(Boolean).join('').toUpperCase() || '?'
    return { pictureBase64: builderPicture ?? undefined, initials, showIncognito: false, showPlaceholder: false }
  }, [pictureThumbnail, pictureLoading, actualBuilder, builtBy, builtByLoading, isLegacySession, employeeId])

  const { getAuthor } = useMessageAuthors({ accessToken: accessToken ?? '', userIds: authorIds })

  const getAuthorDisplayForMessage = useCallback(
    (message: CreateChatMessage): { name: string; avatar?: string; initials: string } | undefined => {
      if (message.role !== 'user') return undefined
      const createdBy = message.createdBy

      if (createdBy === userInfo?.id) {
        const display = getCurrentUserDisplay(
          userInfo,
          builtBy,
          builtBy?.pictureThumbnail ?? pictureThumbnail,
          currentUserPictureThumbnail ?? undefined
        )
        return display
      }

      if (createdBy) {
        const author = getAuthor(createdBy)
        if (author) return author
        return { name: 'Loading...', initials: '?', avatar: undefined }
      }

      // Legacy user message (no createdBy): show incognito icon for legacy sessions; otherwise "You"
      if (isLegacySession) return undefined
      return getCurrentUserDisplay(
        userInfo,
        builtBy,
        builtBy?.pictureThumbnail ?? pictureThumbnail,
        currentUserPictureThumbnail ?? undefined
      )
    },
    [userInfo, getAuthor, builtBy, pictureThumbnail, currentUserPictureThumbnail, isLegacySession]
  )

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:min-h-0" data-testid={testId}>
      {/* Header */}
      <div className="gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-3 gba:border-b gba:border-border gba:shrink-0 gba:h-[56px] gba:-mr-px">
        <Button
          variant="ghost"
          size="icon"
          className="gba:h-8 gba:w-8 gba:rounded-xl gba:hover:bg-muted"
          onClick={onOpenHistory}
          data-testid={`${testId}-history-btn`}
        >
          <History className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
        </Button>
        <span className="gba:font-funnel-display gba:text-lg gba:font-semibold gba:text-primary gba:flex-1 gba:truncate">
          CREATE Agent
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="gba:h-8 gba:w-8 gba:rounded-xl gba:hover:bg-muted"
          onClick={onNewSession}
          data-testid={`${testId}-new-session-btn`}
        >
          <Plus className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
        </Button>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="gba:flex-1 gba:overflow-y-auto gba:px-4 gba:py-4 gba:min-h-0"
        data-testid={`${testId}-messages`}
      >
        {messages.length === 0 && <EmptyState />}

        {messages.map(message => (
          <CreateAgentChatMessage
            key={message.id}
            message={message}
            isStreaming={!!message.isStreaming}
            userAvatar={userAvatar}
            authorDisplay={getAuthorDisplayForMessage(message)}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="gba:shrink-0">
        <CreateAgentChatInput
          onSend={onSend}
          disabled={isProcessing}
          isProcessing={isProcessing}
          testId={`${testId}-input`}
        />
      </div>
    </div>
  )
}

const EmptyState = () => (
  <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:text-center gba:space-y-5">
    <div className="gba:relative">
      <div className="gba:h-14 gba:w-14 gba:rounded-2xl gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
        <MessageSquare className="gba:h-7 gba:w-7 gba:text-primary" />
      </div>
      <div className="gba:absolute gba:-bottom-1 gba:-right-1 gba:h-5 gba:w-5 gba:rounded-full gba:bg-primary gba:flex gba:items-center gba:justify-center">
        <Sparkles className="gba:h-2.5 gba:w-2.5 gba:text-primary-foreground" />
      </div>
    </div>
    <div className="gba:space-y-1.5">
      <p className="gba:text-base gba:font-bold gba:tracking-tight gba:text-foreground">CREATE Agent</p>
      <p className="gba:text-xs gba:text-muted-foreground gba:max-w-[260px] gba:leading-relaxed">
        I'll help you build your application. Refine the plan, start the build, and fix screens — all from here.
      </p>
    </div>
  </div>
)
