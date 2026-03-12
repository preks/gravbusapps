import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea
} from '@newwork/nw-design-system'
import { History, Plus, MessageSquare, Sparkles } from 'lucide-react'
import { useMemo, useCallback, useState } from 'react'
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
  onEditMessage?: (message: CreateChatMessage, nextContent: string) => void
  onRestoreMessage?: (message: CreateChatMessage) => void
  isRestoringMessageId?: string | null
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
  onEditMessage,
  onRestoreMessage,
  isRestoringMessageId,
  onNewSession,
  onOpenHistory,
  userInfo,
  builtBy,
  builtByLoading,
  accessToken,
  testId = 'create-agent-chat'
}: CreateAgentChatProps) => {
  const { messagesEndRef, scrollContainerRef, handleScroll } = useChatScroll(messages.length)
  const [editingMessage, setEditingMessage] = useState<CreateChatMessage | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [pendingRestoreMessage, setPendingRestoreMessage] = useState<CreateChatMessage | null>(null)
  const UNKNOWN_AUTHOR_ID = 'unknown-user'

  // Legacy session = no builder info (old sessions), or placeholder "orchestrator", or id-only with no name/photo
  const isLegacySession =
    !builtBy ||
    builtBy.id === 'orchestrator' ||
    (!builtBy.displayName && !builtBy.pictureThumbnail && !builtBy.firstName && !builtBy.lastName)

  // Use builtBy if available and not loading, otherwise fall back to userInfo (only when not loading)
  const actualBuilder = builtByLoading ? null : builtBy || userInfo

  const employeeId = actualBuilder?.employeeId || actualBuilder?.employeeDetails?.employeeId || undefined
  const { pictureThumbnail, isLoading: pictureLoading } = useCurrentUserPicture(employeeId, accessToken ?? '')

  const authorIds = useMemo(() => {
    const fromCreatedBy = messages.filter(m => m.role === 'user' && m.createdBy).map(m => m.createdBy!)
    const fromEditHistory = messages
      .filter(m => m.role === 'user' && (m.editHistory?.length ?? 0) > 0)
      .flatMap(m => (m.editHistory ?? []).map(e => e.userId).filter(Boolean))
    return [...new Set([...fromCreatedBy, ...fromEditHistory].filter(id => !!id && id !== UNKNOWN_AUTHOR_ID))]
  }, [messages])
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

  /**
   * Deterministic author resolver. Precedence:
   * 1. message.createdBy -> resolved author
   * 2. editHistory[last].userId -> legacy hint
   * 3. Legacy fallback: if isLegacySession show logged-in user; else "Unknown collaborator"
   */
  const getAuthorDisplayForMessage = useCallback(
    (message: CreateChatMessage): { name: string; avatar?: string; initials: string } | undefined => {
      if (message.role !== 'user') return undefined

      const createdBy = message.createdBy ?? message.editHistory?.slice(-1)[0]?.userId

      if (createdBy === userInfo?.id) {
        return getCurrentUserDisplay(
          userInfo,
          builtBy,
          builtBy?.pictureThumbnail ?? pictureThumbnail,
          currentUserPictureThumbnail ?? undefined
        )
      }

      if (createdBy) {
        if (createdBy === UNKNOWN_AUTHOR_ID && isLegacySession) {
          return getCurrentUserDisplay(
            userInfo,
            builtBy,
            builtBy?.pictureThumbnail ?? pictureThumbnail,
            currentUserPictureThumbnail ?? undefined
          )
        }
        const author = getAuthor(createdBy)
        if (author) return author
        return { name: 'Unknown', initials: '?', avatar: undefined }
      }

      // Legacy user message (no createdBy, no editHistory hint)
      if (isLegacySession) {
        return getCurrentUserDisplay(
          userInfo,
          builtBy,
          builtBy?.pictureThumbnail ?? pictureThumbnail,
          currentUserPictureThumbnail ?? undefined
        )
      }
      return { name: 'Unknown collaborator', initials: '?', avatar: undefined }
    },
    [userInfo, getAuthor, builtBy, pictureThumbnail, currentUserPictureThumbnail, isLegacySession]
  )

  const getEditorDisplaysForMessage = useCallback(
    (message: CreateChatMessage): Array<{ name: string; avatar?: string; initials: string }> => {
      if (message.role !== 'user') return []
      const ids = [
        message.createdBy,
        ...(Array.isArray(message.editHistory) ? message.editHistory.map(entry => entry.userId) : [])
      ].filter(Boolean) as string[]
      const uniqueIds: string[] = []
      const seen = new Set<string>()
      ids.forEach(id => {
        if (!id || seen.has(id)) return
        seen.add(id)
        uniqueIds.push(id)
      })
      return uniqueIds
        .map(id => {
          if (id === userInfo?.id || (id === UNKNOWN_AUTHOR_ID && isLegacySession)) {
            return getCurrentUserDisplay(
              userInfo,
              builtBy,
              builtBy?.pictureThumbnail ?? pictureThumbnail,
              currentUserPictureThumbnail ?? undefined
            )
          }
          return getAuthor(id) ?? { name: 'Unknown', initials: '?', avatar: undefined }
        })
        .filter(Boolean)
    },
    [
      builtBy,
      currentUserPictureThumbnail,
      getAuthor,
      isLegacySession,
      pictureThumbnail,
      userInfo
    ]
  )

  const openEditDialog = useCallback((message: CreateChatMessage) => {
    setEditingMessage(message)
    setEditingContent(message.content || '')
  }, [])

  const closeEditDialog = useCallback(() => {
    setEditingMessage(null)
    setEditingContent('')
  }, [])

  const confirmEditDialog = useCallback(() => {
    if (!editingMessage || !onEditMessage) return
    const nextContent = editingContent.trim()
    if (!nextContent) return
    onEditMessage(editingMessage, nextContent)
    closeEditDialog()
  }, [closeEditDialog, editingContent, editingMessage, onEditMessage])

  const requestRestoreDialog = useCallback((message: CreateChatMessage) => {
    setPendingRestoreMessage(message)
  }, [])

  const closeRestoreDialog = useCallback(() => {
    setPendingRestoreMessage(null)
  }, [])

  const confirmRestoreDialog = useCallback(() => {
    if (!pendingRestoreMessage || !onRestoreMessage) return
    onRestoreMessage(pendingRestoreMessage)
    setPendingRestoreMessage(null)
  }, [onRestoreMessage, pendingRestoreMessage])

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
            editorDisplays={getEditorDisplaysForMessage(message)}
            onRestoreMessage={onRestoreMessage ? requestRestoreDialog : undefined}
            onRequestEdit={onEditMessage ? openEditDialog : undefined}
            onSendDecisionReply={onSend}
            isRestoring={isRestoringMessageId === message.id}
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
      <Dialog open={!!editingMessage} onOpenChange={open => !open && closeEditDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Prompt</DialogTitle>
            <DialogDescription>
              Updating a previous prompt restores context before it and reruns from the edited text.
            </DialogDescription>
          </DialogHeader>
          <Textarea rows={6} value={editingContent} onChange={event => setEditingContent(event.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>
              Cancel
            </Button>
            <Button onClick={confirmEditDialog} disabled={!editingContent.trim()}>
              Save and rerun
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!pendingRestoreMessage} onOpenChange={open => !open && closeRestoreDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore to this message?</DialogTitle>
            <DialogDescription>
              Are you sure you want to restore? This will restore the app and chat to this assistant message.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeRestoreDialog}>
              Cancel
            </Button>
            <Button onClick={confirmRestoreDialog} disabled={isRestoringMessageId === pendingRestoreMessage?.id}>
              {isRestoringMessageId === pendingRestoreMessage?.id ? 'Restoring...' : 'Restore'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
