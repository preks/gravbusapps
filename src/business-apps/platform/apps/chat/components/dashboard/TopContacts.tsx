import React, { useMemo, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage, Button } from '@newwork/nw-design-system'
import { MessageSquare, Clock, UserPlus, Phone, Video } from 'lucide-react'
import type { UserContactsResponse, ContactInfo, ReachOutSuggestion } from '../../types'
import { useEmployeeAvatarsCache } from '../../hooks/useEmployeeAvatarsCache'

type CallType = 'audio' | 'video'

// Presence info for status indicators
export interface PresenceInfo {
  state: 'online' | 'offline'
  lastSeen?: string
}

interface TopContactsProps {
  contacts: UserContactsResponse | null
  accessToken?: string
  isLoading?: boolean
  presenceMap?: Map<string, PresenceInfo>
  onContactClick?: (userId: string) => void
  onStartCall?: (userId: string, displayName: string, callType: CallType, avatarUrl?: string) => void
  'data-testid'?: string
}

/**
 * PresenceIndicator - Shows online status as a green dot
 */
const PresenceIndicator: React.FC<{ status: 'online' | 'offline' }> = ({ status }) => {
  if (status !== 'online') return null

  return (
    <span
      className="gba:absolute gba:bottom-0 gba:right-0 gba:w-2.5 gba:h-2.5 gba:rounded-full gba:border-2 gba:border-card gba:bg-success"
      title="Online"
    />
  )
}

/**
 * Get initials from display name
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Format last contact date
 */
function formatLastContact(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return `${Math.floor(diffDays / 30)} months ago`
}

interface MostContactedCardProps {
  contact: ContactInfo
  accessToken?: string
  presenceStatus?: 'online' | 'offline'
  onClick?: () => void
  onStartAudioCall?: () => void
  onStartVideoCall?: () => void
  'data-testid'?: string
}

/**
 * MostContactedCard - Flat card following DS rules (SUR-001, SUR-003)
 * Interactive hover state without decorative borders
 */
const MostContactedCard: React.FC<MostContactedCardProps> = ({
  contact,
  accessToken,
  presenceStatus,
  onClick,
  onStartAudioCall,
  onStartVideoCall,
  'data-testid': testId
}) => {
  // Use avatar cache hook for proper avatar resolution
  const avatarCache = useEmployeeAvatarsCache(accessToken || '')
  const avatarInfo = useMemo(() => {
    if (!accessToken) return null
    return avatarCache.requestAvatars([contact.userId]).get(contact.userId)
  }, [contact.userId, accessToken, avatarCache.cacheVersion])

  // Prefetch avatar if not already cached
  useEffect(() => {
    if (accessToken && contact.userId) {
      avatarCache.prefetchAvatars([contact.userId])
    }
  }, [contact.userId, accessToken, avatarCache])

  // Use avatarUrl from contact if available, otherwise use cached avatar
  const avatarUrl = contact.avatarUrl || avatarInfo?.avatarUrl

  return (
    <div
      className="gba:group gba:rounded-lg gba:p-2 gba:hover:bg-muted/50 gba:transition-colors gba:cursor-pointer"
      onClick={onClick}
      data-testid={testId}
    >
      <div className="gba:flex gba:items-center gba:gap-3">
        <div className="gba:relative">
          <Avatar className="gba:w-9 gba:h-9">
            <AvatarImage src={avatarUrl} alt={contact.displayName} />
            <AvatarFallback className="gba:text-sm gba:font-medium">{getInitials(contact.displayName)}</AvatarFallback>
          </Avatar>
          {presenceStatus && <PresenceIndicator status={presenceStatus} />}
        </div>
        <div className="gba:flex-1 gba:min-w-0">
          <h4 className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{contact.displayName}</h4>
          <p className="gba:text-xs gba:text-muted-foreground gba:truncate">
            {contact.messageCount.toLocaleString()} msgs · {formatLastContact(contact.lastContact)}
          </p>
        </div>
        <div className="gba:flex gba:items-center gba:gap-0.5">
          {onStartAudioCall && (
            <Button
              variant="ghost"
              size="sm"
              onClick={e => {
                e.stopPropagation()
                onStartAudioCall()
              }}
              className="gba:h-7 gba:w-7 gba:p-0"
              data-testid={testId ? `${testId}-audio-call` : undefined}
            >
              <Phone className="gba:w-3.5 gba:h-3.5" />
            </Button>
          )}
          {onStartVideoCall && (
            <Button
              variant="ghost"
              size="sm"
              onClick={e => {
                e.stopPropagation()
                onStartVideoCall()
              }}
              className="gba:h-7 gba:w-7 gba:p-0"
              data-testid={testId ? `${testId}-video-call` : undefined}
            >
              <Video className="gba:w-3.5 gba:h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

interface ReachOutCardProps {
  suggestion: ReachOutSuggestion
  accessToken?: string
  onClick?: () => void
  'data-testid'?: string
}

/**
 * ReachOutCard - Subtle suggestion card following DS rules
 */
const ReachOutCard: React.FC<ReachOutCardProps> = ({ suggestion, accessToken, onClick, 'data-testid': testId }) => {
  // Use avatar cache hook for proper avatar resolution
  const avatarCache = useEmployeeAvatarsCache(accessToken || '')
  const avatarInfo = useMemo(() => {
    if (!accessToken) return null
    return avatarCache.requestAvatars([suggestion.userId]).get(suggestion.userId)
  }, [suggestion.userId, accessToken, avatarCache.cacheVersion])

  // Prefetch avatar if not already cached
  useEffect(() => {
    if (accessToken && suggestion.userId) {
      avatarCache.prefetchAvatars([suggestion.userId])
    }
  }, [suggestion.userId, accessToken, avatarCache])

  // Use avatarUrl from suggestion if available, otherwise use cached avatar
  const avatarUrl = suggestion.avatarUrl || avatarInfo?.avatarUrl

  return (
    <div
      className="gba:group gba:rounded-lg gba:p-2 gba:hover:bg-muted/50 gba:transition-colors gba:cursor-pointer"
      onClick={onClick}
      data-testid={testId}
    >
      <div className="gba:flex gba:items-center gba:gap-3">
        <Avatar className="gba:w-9 gba:h-9">
          <AvatarImage src={avatarUrl} alt={suggestion.displayName} />
          <AvatarFallback className="gba:text-xs gba:font-medium">{getInitials(suggestion.displayName)}</AvatarFallback>
        </Avatar>
        <div className="gba:flex-1 gba:min-w-0">
          <h5 className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate gba:group-hover:text-primary gba:transition-colors">
            {suggestion.displayName}
          </h5>
          <p className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1 gba:truncate">
            <Clock className="gba:w-3 gba:h-3 gba:flex-shrink-0" />
            <span className="gba:truncate">{suggestion.reason}</span>
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={e => {
            e.stopPropagation()
            onClick?.()
          }}
          className="gba:h-7 gba:w-7 gba:p-0"
          data-testid={testId ? `${testId}-action` : undefined}
        >
          <MessageSquare className="gba:w-3.5 gba:h-3.5" />
        </Button>
      </div>
    </div>
  )
}

/**
 * TopContacts - Display most contacted users and reach out suggestions
 * Follows DS rules: flat surfaces, spacing for hierarchy (SUR-001, LAY-002)
 */
export const TopContacts: React.FC<TopContactsProps> = ({
  contacts,
  accessToken,
  isLoading = false,
  presenceMap,
  onContactClick,
  onStartCall,
  'data-testid': testId = 'top-contacts'
}) => {
  const mostContacted = contacts?.mostContacted ?? []
  const reachOutSuggestions = contacts?.reachOutSuggestions ?? []

  // Loading skeleton
  if (isLoading) {
    return (
      <section data-testid={testId}>
        <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-4 gba:uppercase gba:tracking-wide">
          My people
        </h3>
        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
          {/* Most contacted skeleton */}
          <div className="gba:rounded-xl gba:bg-card gba:p-4">
            <p className="gba:text-xs gba:text-muted-foreground gba:mb-3">Most contacted</p>
            <div className="gba:space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="gba:flex gba:items-center gba:gap-3 gba:py-2">
                  <div className="gba:w-9 gba:h-9 gba:rounded-full gba:bg-muted/50 gba:animate-pulse" />
                  <div className="gba:flex-1">
                    <div className="gba:h-3.5 gba:w-24 gba:bg-muted/50 gba:rounded-lg gba:animate-pulse gba:mb-1.5" />
                    <div className="gba:h-2.5 gba:w-32 gba:bg-muted/50 gba:rounded-lg gba:animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reach out skeleton */}
          <div className="gba:rounded-xl gba:bg-card gba:p-4">
            <p className="gba:text-xs gba:text-muted-foreground gba:mb-3">Maybe reach out</p>
            <div className="gba:space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="gba:flex gba:items-center gba:gap-3 gba:py-2">
                  <div className="gba:w-9 gba:h-9 gba:rounded-full gba:bg-muted/50 gba:animate-pulse" />
                  <div className="gba:flex-1">
                    <div className="gba:h-3.5 gba:w-24 gba:bg-muted/50 gba:rounded-lg gba:animate-pulse gba:mb-1.5" />
                    <div className="gba:h-2.5 gba:w-32 gba:bg-muted/50 gba:rounded-lg gba:animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }

  // Empty state
  if (mostContacted.length === 0 && reachOutSuggestions.length === 0) {
    return (
      <section data-testid={testId}>
        <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-4 gba:uppercase gba:tracking-wide">
          My people
        </h3>
        <div className="gba:rounded-xl gba:bg-card gba:p-6 gba:text-center">
          <div className="gba:w-10 gba:h-10 gba:rounded-full gba:bg-muted/50 gba:flex gba:items-center gba:justify-center gba:mx-auto gba:mb-3">
            <UserPlus className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
          </div>
          <h4 className="gba:font-medium gba:text-foreground gba:text-sm gba:mb-1">No contacts yet</h4>
          <p className="gba:text-xs gba:text-muted-foreground">
            Start chatting with colleagues to see your contacts here.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section data-testid={testId}>
      <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-4 gba:uppercase gba:tracking-wide">
        My people
      </h3>

      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
        {/* Most Contacted */}
        <div className="gba:rounded-xl gba:bg-card gba:p-4">
          <p className="gba:text-xs gba:text-muted-foreground gba:mb-3">Most contacted</p>
          {mostContacted.length > 0 ? (
            <div className="gba:space-y-1">
              {mostContacted.slice(0, 3).map((contact, index) => (
                <MostContactedCard
                  key={contact.userId}
                  contact={contact}
                  accessToken={accessToken}
                  presenceStatus={presenceMap?.get(contact.userId)?.state}
                  onClick={() => onContactClick?.(contact.userId)}
                  onStartAudioCall={
                    onStartCall
                      ? () => onStartCall(contact.userId, contact.displayName, 'audio', contact.avatarUrl)
                      : undefined
                  }
                  onStartVideoCall={
                    onStartCall
                      ? () => onStartCall(contact.userId, contact.displayName, 'video', contact.avatarUrl)
                      : undefined
                  }
                  data-testid={`${testId}-most-contacted-${index}`}
                />
              ))}
            </div>
          ) : (
            <p className="gba:text-xs gba:text-muted-foreground/70 gba:py-4 gba:text-center">No contacts yet</p>
          )}
        </div>

        {/* Reach Out Suggestions */}
        <div className="gba:rounded-xl gba:bg-card gba:p-4">
          <p className="gba:text-xs gba:text-muted-foreground gba:mb-3">Maybe reach out</p>
          {reachOutSuggestions.length > 0 ? (
            <div className="gba:space-y-1">
              {reachOutSuggestions.slice(0, 3).map((suggestion, index) => (
                <ReachOutCard
                  key={suggestion.userId}
                  suggestion={suggestion}
                  accessToken={accessToken}
                  onClick={() => onContactClick?.(suggestion.userId)}
                  data-testid={`${testId}-reach-out-${index}`}
                />
              ))}
            </div>
          ) : (
            <p className="gba:text-xs gba:text-muted-foreground/70 gba:py-4 gba:text-center">No suggestions</p>
          )}
        </div>
      </div>
    </section>
  )
}

export default TopContacts
