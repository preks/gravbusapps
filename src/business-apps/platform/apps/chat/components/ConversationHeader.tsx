import React, { useState, useRef, useEffect } from 'react'
import {
  Button,
  IconAvatar,
  Avatar,
  Input,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Popover,
  PopoverContent,
  PopoverAnchor,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@newwork/nw-design-system'
import {
  ArrowLeftIcon,
  DotsThreeVerticalIcon,
  SignOutIcon,
  XIcon,
  InfoIcon,
  UsersIcon,
  CheckIcon as PhosphorCheckIcon,
  MinusIcon,
  ProhibitInsetIcon,
  ClockIcon,
  MoonStarsIcon,
  EyeSlashIcon,
  PhoneCallIcon,
  PresentationChartIcon,
  ChatTextIcon,
  MagnifyingGlassIcon
} from '@phosphor-icons/react'
import {
  UserIcon,
  Phone,
  Video,
  PhoneCall,
  UserPlus,
  Bell,
  BellOff,
  CalendarIcon,
  Pin,
  PinOff,
  Mail
} from 'lucide-react'
import type { Conversation, UserStatus, Message } from '../types'
import { UserPresenceStatus, SystemPresenceStatus } from '../types'
import type { UserPresence } from '../hooks/usePresence'
import { navigateTo } from '@/common/utils/navigationUtils'

export interface ActiveCallInfo {
  roomId: string
  callType: 'audio' | 'video'
  participantCount: number
  participantNames: string[]
}

interface ConversationHeaderProps {
  conversation: Conversation
  onBack?: () => void
  onClose?: () => void
  onRemove?: () => void
  onGroupSettings?: () => void
  onAddExpert?: () => void
  onNudge?: () => void
  onAudioCall?: () => void
  onVideoCall?: () => void
  onJoinCall?: () => void
  showBackButton?: boolean
  currentUserId?: string | null
  compact?: boolean
  otherUserPresence?: UserPresence
  isCallEnabled?: boolean
  isInCall?: boolean
  isStartingCall?: boolean
  activeCall?: ActiveCallInfo | null
  t: (key: string, params?: Record<string, any>) => string
  isSearchOpen?: boolean
  onSearchOpenChange?: (open: boolean) => void
  searchQuery?: string
  onSearchQueryChange?: (value: string) => void
  searchResults?: Message[]
  searchResultAvatarMap?: Map<string, string> | null
  searchLoading?: boolean
  onSearchResultSelect?: (messageId: string) => void
  onSearchClear?: () => void
  isMuted?: boolean
  isPinned?: boolean
  onMute?: (muted: boolean) => void
  onPin?: () => void
  onMarkAsUnread?: () => void
}

/** Format a date as relative time (e.g. "just now", "5 min ago") or absolute date. */
function formatRelativeTime(
  dateInput: string | Date,
  t: (key: string, params?: Record<string, unknown>) => string,
  variant: 'message' | 'lastSeen'
): string | null {
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    if (Number.isNaN(d.getTime())) return variant === 'message' ? '' : null
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    if (diffMs < 0 || Number.isNaN(diffMs)) return variant === 'message' ? '' : null
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffMinutes < 1) return variant === 'lastSeen' ? 'Last seen just now' : t('chat-time-justNow')
    if (diffMinutes < 60)
      return variant === 'lastSeen'
        ? t('chat-lastSeenMinutes', { minutes: diffMinutes })
        : t('chat-time-minutesAgo', { minutes: diffMinutes })
    if (diffHours < 24)
      return variant === 'lastSeen'
        ? t('chat-lastSeenHours', { hours: diffHours })
        : t('chat-time-hoursAgo', { hours: diffHours })
    if (diffDays < 7)
      return variant === 'lastSeen'
        ? t('chat-lastSeenDays', { days: diffDays })
        : t('chat-time-daysAgo', { days: diffDays })
    return variant === 'lastSeen' ? t('chat-lastSeenLongAgo') : d.toLocaleDateString()
  } catch {
    return variant === 'message' ? '' : null
  }
}

/** Split text by query (case-insensitive) and wrap matches in highlight spans. */
function highlightSearchInText(text: string, query: string): React.ReactNode {
  if (!text) return null
  const q = query.trim()
  if (!q) return text
  const specials = String.raw`[.*+?^\${\}()|[\]\\]`
  const escaped = q.replace(new RegExp(specials, 'g'), String.raw`\$&`)
  const re = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(re)
  if (parts.length <= 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <span
        key={`hl-${i}-${part}`}
        className="gba:bg-accent gba:text-accent-foreground gba:rounded-sm gba:px-0.5 gba:font-medium"
      >
        {part}
      </span>
    ) : (
      part
    )
  )
}

const getOtherParticipant = (conversation: Conversation, currentUserId?: string | null) => {
  if (conversation.type !== 'direct' || !conversation.participants || conversation.participants.length === 0) {
    return null
  }

  // Filter out current user to get the other participant
  const otherParticipants = conversation.participants.filter(p => {
    return p.userId !== currentUserId && p.user?.id !== currentUserId
  })

  return otherParticipants[0] || null
}

const getConversationName = (
  conversation: Conversation,
  currentUserId?: string | null,
  t?: (key: string) => string
): string => {
  if (conversation.name) {
    return conversation.name
  }

  const otherParticipant = getOtherParticipant(conversation, currentUserId)
  if (otherParticipant?.user) {
    const name = `${otherParticipant.user.firstName || ''} ${otherParticipant.user.lastName || ''}`.trim()
    return name || otherParticipant.user.username || (t ? t('chat-unknownUser') : 'Unknown User')
  }

  return t ? t('chat-directMessage') : 'Direct Message'
}

const getConversationAvatarUrl = (conversation: Conversation, currentUserId?: string | null): string | undefined => {
  if (conversation.type === 'group') {
    return undefined // Groups use icon
  }

  const otherParticipant = getOtherParticipant(conversation, currentUserId)
  return otherParticipant?.user?.avatarUrl
}

// Status badge component - shows user status icon (Available/Busy/etc) on avatar
const StatusBadge: React.FC<{
  status?: UserStatus | string
  size?: 'sm' | 'md'
}> = ({ status, size = 'md' }) => {
  if (!status) return null

  // Get status string from UserStatus object or use as string
  const statusString = typeof status === 'object' ? status.status : status

  // Status colors and icons for avatar badge
  const STATUS_STYLES: Record<string, { bgColor: string; icon: React.ReactNode }> = {
    [UserPresenceStatus.AVAILABLE]: {
      bgColor: 'gba:bg-success',
      icon: <PhosphorCheckIcon size={size === 'sm' ? 8 : 10} weight="bold" className="gba:text-white" />
    },
    [UserPresenceStatus.BUSY]: {
      bgColor: 'gba:bg-destructive',
      icon: <MinusIcon size={size === 'sm' ? 8 : 10} weight="bold" className="gba:text-white" />
    },
    [UserPresenceStatus.DO_NOT_DISTURB]: {
      bgColor: 'gba:bg-destructive',
      icon: <ProhibitInsetIcon size={size === 'sm' ? 8 : 10} weight="bold" className="gba:text-white" />
    },
    [UserPresenceStatus.BE_RIGHT_BACK]: {
      bgColor: 'gba:bg-warning-secondary',
      icon: <ClockIcon size={size === 'sm' ? 8 : 10} weight="bold" className="gba:text-white" />
    },
    [UserPresenceStatus.APPEAR_AWAY]: {
      bgColor: 'gba:bg-warning',
      icon: <MoonStarsIcon size={size === 'sm' ? 8 : 10} weight="bold" className="gba:text-white" />
    },
    [UserPresenceStatus.APPEAR_OFFLINE]: {
      bgColor: 'gba:bg-muted-foreground',
      icon: <EyeSlashIcon size={size === 'sm' ? 8 : 10} weight="bold" className="gba:text-white" />
    },
    [SystemPresenceStatus.IN_MEETING]: {
      bgColor: 'gba:bg-info',
      icon: <UsersIcon size={size === 'sm' ? 8 : 10} weight="bold" className="gba:text-white" />
    },
    [SystemPresenceStatus.IN_CALL]: {
      bgColor: 'gba:bg-info',
      icon: <PhoneCallIcon size={size === 'sm' ? 8 : 10} weight="bold" className="gba:text-white" />
    },
    [SystemPresenceStatus.PRESENTING]: {
      bgColor: 'gba:bg-info',
      icon: <PresentationChartIcon size={size === 'sm' ? 8 : 10} weight="bold" className="gba:text-white" />
    },
    offline: {
      bgColor: 'gba:bg-muted-foreground',
      icon: <EyeSlashIcon size={size === 'sm' ? 8 : 10} weight="bold" className="gba:text-white" />
    }
  }

  const config = statusString ? STATUS_STYLES[statusString] : STATUS_STYLES['offline']
  if (!config) return null

  const circleSize = size === 'sm' ? 'gba:w-3 gba:h-3' : 'gba:w-4 gba:h-4'

  return (
    <div
      className={`gba:absolute gba:bottom-0 gba:right-0 gba:rounded-full gba:border-2 gba:border-background ${config.bgColor} ${circleSize} gba:flex gba:items-center gba:justify-center gba:flex-shrink-0`}
    >
      {config.icon}
    </div>
  )
}

export const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  conversation,
  onBack,
  onClose,
  onRemove,
  onGroupSettings,
  onAddExpert,
  onNudge,
  onAudioCall,
  onVideoCall,
  onJoinCall,
  showBackButton = false,
  currentUserId = null,
  compact = false,
  otherUserPresence,
  isCallEnabled = true,
  isInCall = false,
  isStartingCall = false,
  activeCall = null,
  t,
  isSearchOpen = false,
  onSearchOpenChange,
  searchQuery = '',
  onSearchQueryChange,
  searchResults = [],
  searchResultAvatarMap,
  searchLoading = false,
  onSearchResultSelect,
  onSearchClear,
  isMuted = false,
  isPinned = false,
  onMute,
  onPin,
  onMarkAsUnread
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (isSearchOpen) searchInputRef.current?.focus()
  }, [isSearchOpen])
  const name = getConversationName(conversation, currentUserId, t)
  const avatarUrl = getConversationAvatarUrl(conversation, currentUserId)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  const isGroupChat = conversation.type === 'group'
  const isDirectChat = conversation.type === 'direct'
  const otherParticipant = isDirectChat ? getOtherParticipant(conversation, currentUserId) : null
  // Use employeeId for navigation, not keycloak id
  const otherEmployeeId = (otherParticipant?.user as any)?.employeeId

  const handleAvatarClick = () => {
    if (isDirectChat && otherEmployeeId) {
      navigateTo(`/platform/employee-record?employeeId=${otherEmployeeId}`)
    }
  }
  const presenceStatus = otherUserPresence?.state || 'offline'
  // Check for active call from prop or conversation object (applies to both group and direct chats)
  const hasActiveCall = !!activeCall || !!conversation.activeCall
  // Determine call message key based on call type
  const getCallMessageKey = (): string => {
    if (conversation.metadata?.type === 'meeting') {
      return 'chat-activeCallMeeting'
    } else if (isDirectChat) {
      return 'chat-activeCallDirect'
    } else if (isGroupChat) {
      return 'chat-activeCallGroup'
    }
    return 'chat-activeCallInGroup' // fallback
  }

  const handleRemoveClick = () => {
    setShowRemoveDialog(true)
  }

  const handleConfirmRemove = () => {
    setShowRemoveDialog(false)
    onRemove?.()
  }

  const avatarSize = compact ? 'gba:w-8 gba:h-8' : 'gba:w-9 gba:h-9'

  return (
    <>
      <div
        className={`gba:flex gba:items-center gba:border-b gba:border-border/50 gba:bg-background/80 gba:backdrop-blur-sm gba:flex-shrink-0 ${
          compact ? 'gba:gap-2 gba:px-3 gba:py-2' : 'gba:gap-3 gba:px-4 gba:py-3'
        }`}
        data-testid="conversation-header"
      >
        {showBackButton && onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="gba:h-8 gba:w-8 gba:flex-shrink-0"
            data-testid="conversation-back-button"
          >
            <ArrowLeftIcon className="gba:w-4 gba:h-4" />
          </Button>
        )}

        {isSearchOpen ? (
          <Popover open={isSearchOpen && searchQuery.trim().length >= 2}>
            <PopoverAnchor asChild>
              <div className="gba:flex-1 gba:min-w-0 gba:flex gba:items-center gba:gap-2 gba:transition-all gba:duration-200">
                <div className="gba:relative gba:flex-1 gba:min-w-0">
                  <MagnifyingGlassIcon
                    className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground gba:pointer-events-none"
                    weight="regular"
                  />
                  <Input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={e => onSearchQueryChange?.(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Escape') {
                        onSearchOpenChange?.(false)
                        onSearchClear?.()
                      }
                    }}
                    placeholder={t('chat-searchMessagesPlaceholder')}
                    className="gba:pl-9 gba:pr-14 gba:h-8 gba:bg-muted/50"
                    data-testid="conversation-search-input"
                  />
                  {searchQuery.trim() ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="gba:absolute gba:right-1.5 gba:top-1/2 gba:-translate-y-1/2 gba:h-6 gba:px-2 gba:text-xs gba:text-muted-foreground gba:hover:text-foreground"
                      onClick={e => {
                        e.preventDefault()
                        e.stopPropagation()
                        onSearchClear?.()
                        searchInputRef.current?.focus()
                      }}
                      data-testid="conversation-search-clear"
                    >
                      {t('chat-searchClear')}
                    </Button>
                  ) : null}
                </div>
              </div>
            </PopoverAnchor>
            <PopoverContent
              className={`gba:w-[var(--radix-popover-trigger-width)] gba:overflow-y-auto gba:rounded-lg gba:border gba:border-border gba:bg-popover gba:p-0 ${compact ? 'gba:max-h-32' : 'gba:max-h-72'}`}
              align="start"
              side={compact ? 'top' : 'bottom'}
              sideOffset={6}
              onOpenAutoFocus={e => e.preventDefault()}
            >
              <div className="gba:py-1.5 gba:pb-2" data-testid="conversation-search-results">
                {(() => {
                  if (searchLoading) {
                    return (
                      <div className="gba:px-4 gba:py-6 gba:text-sm gba:text-muted-foreground gba:text-center">
                        {t('chat-searchSearching')}
                      </div>
                    )
                  }
                  if (searchResults.length === 0) {
                    return (
                      <div className="gba:px-4 gba:py-6 gba:text-sm gba:text-muted-foreground gba:text-center">
                        {t('chat-searchNoResults')}
                      </div>
                    )
                  }
                  return searchResults.map((msg, idx) => {
                    const snippet = (msg.content || '').slice(0, 60)
                    const sender = msg.sender
                    let senderName = ''
                    if (sender) {
                      senderName =
                        [sender.firstName, sender.lastName].filter(Boolean).join(' ') || sender.username || ''
                    }
                    const avatarLabel = senderName || sender?.username || '?'
                    const createdAt = msg.createdAt ? (formatRelativeTime(msg.createdAt, t, 'message') ?? '') : ''
                    const isLast = idx === searchResults.length - 1
                    const resultAvatarUrl =
                      (msg.senderId && searchResultAvatarMap?.get(msg.senderId)) ?? sender?.avatarUrl
                    return (
                      <button
                        key={msg.id}
                        type="button"
                        className={`gba:w-full gba:flex gba:items-start gba:gap-3 gba:px-4 gba:py-2.5 gba:text-left gba:transition-colors gba:hover:bg-accent gba:focus:bg-accent gba:focus:outline-none gba:focus-visible:ring-2 gba:focus-visible:ring-ring gba:focus-visible:ring-offset-0 ${isLast ? '' : 'gba:border-b gba:border-border/50'}`}
                        onClick={() => onSearchResultSelect?.(msg.id)}
                        data-testid={`conversation-search-result-${msg.id}`}
                      >
                        <div className="gba:flex-shrink-0 gba:mt-0.5">
                          {resultAvatarUrl ? (
                            <Avatar className="gba:h-8 gba:w-8">
                              <img
                                src={resultAvatarUrl}
                                alt={avatarLabel}
                                className="gba:h-full gba:w-full gba:object-cover gba:rounded-full"
                              />
                            </Avatar>
                          ) : (
                            <IconAvatar className="gba:h-8 gba:w-8" label={avatarLabel} icon={UserIcon} />
                          )}
                        </div>
                        <div className="gba:flex-1 gba:min-w-0 gba:flex gba:flex-col gba:gap-0.5">
                          <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
                            {senderName ? (
                              <span className="gba:font-medium gba:text-foreground gba:text-sm gba:truncate">
                                {senderName}
                              </span>
                            ) : null}
                            {createdAt ? (
                              <span className="gba:text-xs gba:text-muted-foreground gba:flex-shrink-0">
                                {createdAt}
                              </span>
                            ) : null}
                          </div>
                          <span className="gba:text-sm gba:text-muted-foreground gba:line-clamp-2 gba:break-words">
                            {snippet ? highlightSearchInText(snippet, searchQuery ?? '') || '—' : '—'}
                          </span>
                        </div>
                      </button>
                    )
                  })
                })()}
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <>
            <div
              className={`gba:relative gba:flex-shrink-0 ${isDirectChat && otherEmployeeId ? 'gba:cursor-pointer hover:gba:opacity-80 gba:transition-opacity' : ''}`}
              onClick={isDirectChat && otherEmployeeId ? handleAvatarClick : undefined}
              title={isDirectChat && otherEmployeeId ? t('chat-viewProfile') : undefined}
            >
              {avatarUrl ? (
                <Avatar className={avatarSize}>
                  <img src={avatarUrl} alt={name} className="gba:w-full gba:h-full gba:object-cover gba:rounded-full" />
                </Avatar>
              ) : (
                <IconAvatar
                  className={avatarSize}
                  label={name}
                  icon={isGroupChat ? (conversation.metadata?.type === 'meeting' ? CalendarIcon : UsersIcon) : UserIcon}
                />
              )}
              {isDirectChat && <StatusBadge status={otherUserPresence?.userStatus} size={compact ? 'sm' : 'md'} />}
            </div>

            <div className="gba:flex-1 gba:min-w-0">
              <div className="gba:flex gba:items-center gba:gap-1.5 gba:min-w-0">
                <h2
                  className={`gba:font-semibold gba:truncate gba:text-foreground ${compact ? 'gba:text-sm' : 'gba:text-base'}`}
                >
                  {name}
                </h2>
                {isMuted && (
                  <span
                    className="gba:flex gba:flex-shrink-0 gba:rounded-full gba:p-0.5 gba:bg-muted gba:text-muted-foreground"
                    title={t('chat-muteConversation')}
                  >
                    <BellOff className="gba:w-4 gba:h-4" aria-hidden />
                  </span>
                )}
              </div>
              {(() => {
                if (
                  isDirectChat &&
                  !compact &&
                  otherUserPresence?.userStatus?.statusMessage &&
                  presenceStatus !== 'offline'
                ) {
                  return (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="gba:flex gba:items-center gba:gap-1.5 gba:cursor-default">
                            <ChatTextIcon
                              size={14}
                              weight="duotone"
                              className="gba:text-muted-foreground gba:flex-shrink-0"
                            />
                            <p className="gba:text-xs gba:text-muted-foreground gba:truncate gba:italic">
                              {otherUserPresence.userStatus.statusMessage}
                            </p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="start">
                          <p className="gba:max-w-xs gba:break-words">{otherUserPresence.userStatus.statusMessage}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )
                }
                if (isDirectChat && !compact && otherUserPresence?.lastSeen && presenceStatus === 'offline') {
                  const lastSeenText = formatRelativeTime(otherUserPresence.lastSeen, t, 'lastSeen')
                  return lastSeenText ? <p className="gba:text-xs gba:text-muted-foreground">{lastSeenText}</p> : null
                }
                if (hasActiveCall && !compact) {
                  return <p className="gba:text-xs gba:text-success">{t(getCallMessageKey())}</p>
                }
                return null
              })()}
              {isGroupChat && conversation.participants && !compact && (
                <p className="gba:text-xs gba:text-muted-foreground">
                  {t('chat-participantsCount', { count: conversation.participants.length.toString() })}
                </p>
              )}
            </div>
          </>
        )}

        <div className="gba:flex gba:items-center gba:gap-1">
          {isSearchOpen && onSearchOpenChange ? (
            <Button
              variant="ghost"
              size="icon"
              className="gba:h-8 gba:w-8 gba:flex-shrink-0"
              onClick={() => onSearchOpenChange(false)}
              data-testid="conversation-search-close-button"
              title={t('chat-searchClear')}
            >
              <XIcon className="gba:w-4 gba:h-4" />
            </Button>
          ) : null}
          {!isSearchOpen && onSearchOpenChange ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onSearchOpenChange(true)}
              className="gba:h-8 gba:w-8 gba:flex-shrink-0"
              data-testid="conversation-search-button"
              title={t('chat-searchInConversation')}
            >
              <MagnifyingGlassIcon className="gba:w-4 gba:h-4" weight="regular" />
            </Button>
          ) : null}
          {/* Nudge button - only for direct chats */}
          {isDirectChat && onNudge && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onNudge}
              className="gba:h-8 gba:w-8 gba:flex-shrink-0"
              data-testid="conversation-nudge-button"
              title={t('chat-sendNudge')}
            >
              <Bell className="gba:w-4 gba:h-4" />
            </Button>
          )}

          {/* Call controls - show join button for active calls, or call buttons otherwise */}
          {isCallEnabled && !isInCall && (
            <>
              {hasActiveCall && onJoinCall ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onJoinCall}
                  className="gba:h-8 gba:w-8 gba:flex-shrink-0 gba:text-success gba:hover:text-success gba:hover:bg-success/10"
                  data-testid="conversation-join-call-button"
                  title={t('chat-joinCall')}
                >
                  <PhoneCall className="gba:w-4 gba:h-4" />
                </Button>
              ) : (
                <>
                  {onAudioCall && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onAudioCall}
                      disabled={isStartingCall}
                      className="gba:h-8 gba:w-8 gba:flex-shrink-0"
                      data-testid="conversation-audio-call-button"
                      title={t('chat-startAudioCall')}
                    >
                      <Phone className="gba:w-4 gba:h-4" />
                    </Button>
                  )}
                  {onVideoCall && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onVideoCall}
                      disabled={isStartingCall}
                      className="gba:h-8 gba:w-8 gba:flex-shrink-0"
                      data-testid="conversation-video-call-button"
                      title={t('chat-startVideoCall')}
                    >
                      <Video className="gba:w-4 gba:h-4" />
                    </Button>
                  )}
                </>
              )}
            </>
          )}

          {!showBackButton && onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="gba:h-8 gba:w-8 gba:flex-shrink-0"
              data-testid="conversation-close-button"
              title={t('chat-closeConversation')}
            >
              <XIcon className="gba:w-4 gba:h-4" />
            </Button>
          )}

          {(onRemove || (isGroupChat && (onGroupSettings || onAddExpert)) || onPin || onMute || onMarkAsUnread) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="gba:h-8 gba:w-8 gba:flex-shrink-0"
                  data-testid="conversation-menu-button"
                >
                  <DotsThreeVerticalIcon className="gba:w-4 gba:h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onPin && (
                  <DropdownMenuItem
                    onClick={onPin}
                    data-testid={isPinned ? 'conversation-header-unpin-button' : 'conversation-header-pin-button'}
                  >
                    {isPinned ? (
                      <>
                        <PinOff className="gba:w-4 gba:h-4 gba:mr-2" />
                        {t('chat-unpinConversation')}
                      </>
                    ) : (
                      <>
                        <Pin className="gba:w-4 gba:h-4 gba:mr-2" />
                        {t('chat-pinConversation')}
                      </>
                    )}
                  </DropdownMenuItem>
                )}
                {onMarkAsUnread && (
                  <DropdownMenuItem onClick={onMarkAsUnread} data-testid="conversation-header-mark-unread-button">
                    <Mail className="gba:w-4 gba:h-4 gba:mr-2" />
                    {t('chat-markAsUnread')}
                  </DropdownMenuItem>
                )}
                {onMute && (
                  <DropdownMenuItem
                    onClick={() => onMute(!isMuted)}
                    data-testid={isMuted ? 'conversation-header-unmute-button' : 'conversation-header-mute-button'}
                  >
                    {isMuted ? (
                      <>
                        <Bell className="gba:w-4 gba:h-4 gba:mr-2" />
                        {t('chat-unmuteConversation')}
                      </>
                    ) : (
                      <>
                        <BellOff className="gba:w-4 gba:h-4 gba:mr-2" />
                        {t('chat-muteConversation')}
                      </>
                    )}
                  </DropdownMenuItem>
                )}
                {isGroupChat && onAddExpert && (
                  <DropdownMenuItem onClick={onAddExpert} data-testid="conversation-add-expert-button">
                    <UserPlus className="gba:w-4 gba:h-4 gba:mr-2" />
                    {t('chat-addExpert')}
                  </DropdownMenuItem>
                )}
                {isGroupChat && onGroupSettings && (
                  <DropdownMenuItem onClick={onGroupSettings} data-testid="conversation-group-settings-button">
                    <InfoIcon className="gba:w-4 gba:h-4 gba:mr-2" />
                    {t('chat-groupSettings')}
                  </DropdownMenuItem>
                )}
                {onRemove && (
                  <DropdownMenuItem onClick={handleRemoveClick} data-testid="conversation-remove-button">
                    <SignOutIcon className="gba:w-4 gba:h-4 gba:mr-2" />
                    {isGroupChat ? t('chat-leaveConversation') : t('chat-removeConversation')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {conversation.type === 'group' ? t('chat-leaveConversationTitle') : t('chat-removeConversationTitle')}
            </DialogTitle>
            <DialogDescription>
              {conversation.type === 'group'
                ? t('chat-leaveConversationDescription')
                : t('chat-removeConversationDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowRemoveDialog(false)} data-testid="conversation-remove-cancel">
              {t('common-cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmRemove} data-testid="conversation-remove-confirm">
              {conversation.type === 'group' ? t('chat-leave') : t('chat-remove')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
