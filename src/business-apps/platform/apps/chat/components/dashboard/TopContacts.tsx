import React, { useMemo, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage, Button } from '@newwork/nw-design-system'
import { MessageSquare, Clock, UserPlus, ArrowRight } from 'lucide-react'
import type { UserContactsResponse, ContactInfo, ReachOutSuggestion } from '../../services/chatApiClient'
import { useEmployeeAvatarsCache } from '../../hooks/useEmployeeAvatarsCache'

interface TopContactsProps {
  contacts: UserContactsResponse | null
  accessToken?: string
  isLoading?: boolean
  onContactClick?: (userId: string) => void
  'data-testid'?: string
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
  onClick?: () => void
  'data-testid'?: string
}

/**
 * MostContactedCard - Flat card following DS rules (SUR-001, SUR-003)
 * Interactive hover state without decorative borders
 */
const MostContactedCard: React.FC<MostContactedCardProps> = ({
  contact,
  accessToken,
  onClick,
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
      className="gba:group gba:rounded-xl gba:bg-card gba:p-5 hover:gba:bg-accent/50 gba:transition-colors gba:cursor-pointer"
      onClick={onClick}
      data-testid={testId}
    >
      <div className="gba:flex gba:items-center gba:gap-4">
        <Avatar className="gba:w-12 gba:h-12">
          <AvatarImage src={avatarUrl} alt={contact.displayName} />
          <AvatarFallback className="gba:text-base gba:font-medium">{getInitials(contact.displayName)}</AvatarFallback>
        </Avatar>
        <div className="gba:flex-1 gba:min-w-0">
          <h4 className="gba:font-medium gba:text-foreground gba:truncate">{contact.displayName}</h4>
          <p className="gba:text-sm gba:text-muted-foreground">
            {contact.messageCount.toLocaleString()} messages · {formatLastContact(contact.lastContact)}
          </p>
        </div>
        <ArrowRight className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity" />
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
      className="gba:group gba:flex gba:items-center gba:gap-3 gba:py-3 gba:cursor-pointer"
      onClick={onClick}
      data-testid={testId}
    >
      <Avatar className="gba:w-9 gba:h-9">
        <AvatarImage src={avatarUrl} alt={suggestion.displayName} />
        <AvatarFallback className="gba:text-xs gba:font-medium">{getInitials(suggestion.displayName)}</AvatarFallback>
      </Avatar>
      <div className="gba:flex-1 gba:min-w-0">
        <h5 className="gba:font-medium gba:text-foreground gba:truncate gba:text-sm group-hover:gba:text-primary gba:transition-colors">
          {suggestion.displayName}
        </h5>
        <p className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
          <Clock className="gba:w-3 gba:h-3" />
          {suggestion.reason}
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={e => {
          e.stopPropagation()
          onClick?.()
        }}
        className="gba:h-8 gba:w-8 gba:p-0 gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity"
        data-testid={testId ? `${testId}-action` : undefined}
      >
        <MessageSquare className="gba:w-4 gba:h-4" />
      </Button>
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
  onContactClick,
  'data-testid': testId = 'top-contacts'
}) => {
  const mostContacted = contacts?.mostContacted ?? []
  const reachOutSuggestions = contacts?.reachOutSuggestions ?? []

  // Loading skeleton
  if (isLoading) {
    return (
      <section className="gba:rounded-xl gba:bg-card gba:p-6" data-testid={testId}>
        <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-5 gba:uppercase gba:tracking-wide">
          Your people
        </h3>
        <div className="gba:space-y-6">
          {/* Most contacted skeleton */}
          <div>
            <p className="gba:text-xs gba:text-muted-foreground gba:mb-3">Most contacted</p>
            <div className="gba:space-y-1">
              {[1, 2, 3].map(i => (
                <div key={i} className="gba:flex gba:items-center gba:gap-4 gba:py-3">
                  <div className="gba:w-12 gba:h-12 gba:rounded-full gba:bg-muted/50 gba:animate-pulse" />
                  <div className="gba:flex-1">
                    <div className="gba:h-4 gba:w-32 gba:bg-muted/50 gba:rounded-lg gba:animate-pulse gba:mb-2" />
                    <div className="gba:h-3 gba:w-40 gba:bg-muted/50 gba:rounded-lg gba:animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reach out skeleton */}
          <div>
            <p className="gba:text-xs gba:text-muted-foreground gba:mb-3">Maybe reach out</p>
            <div className="gba:space-y-1">
              {[1, 2].map(i => (
                <div key={i} className="gba:flex gba:items-center gba:gap-3 gba:py-3">
                  <div className="gba:w-9 gba:h-9 gba:rounded-full gba:bg-muted/50 gba:animate-pulse" />
                  <div className="gba:flex-1">
                    <div className="gba:h-3 gba:w-24 gba:bg-muted/50 gba:rounded-lg gba:animate-pulse gba:mb-1.5" />
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
      <section className="gba:rounded-xl gba:bg-card gba:p-8 gba:text-center" data-testid={testId}>
        <div className="gba:w-12 gba:h-12 gba:rounded-full gba:bg-muted/50 gba:flex gba:items-center gba:justify-center gba:mx-auto gba:mb-4">
          <UserPlus className="gba:w-5 gba:h-5 gba:text-muted-foreground" />
        </div>
        <h3 className="gba:font-medium gba:text-foreground gba:mb-1">No contacts yet</h3>
        <p className="gba:text-sm gba:text-muted-foreground gba:max-w-xs gba:mx-auto">
          Start chatting with your colleagues to see your most contacted people here.
        </p>
      </section>
    )
  }

  return (
    <section className="gba:rounded-xl gba:bg-card gba:p-6" data-testid={testId}>
      <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-5 gba:uppercase gba:tracking-wide">
        Your people
      </h3>

      <div className="gba:space-y-6">
        {/* Most Contacted */}
        {mostContacted.length > 0 && (
          <div>
            <p className="gba:text-xs gba:text-muted-foreground gba:mb-2">Most contacted</p>
            <div className="gba:space-y-1">
              {mostContacted.slice(0, 3).map((contact, index) => (
                <MostContactedCard
                  key={contact.userId}
                  contact={contact}
                  accessToken={accessToken}
                  onClick={() => onContactClick?.(contact.userId)}
                  data-testid={`${testId}-most-contacted-${index}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Reach Out Suggestions */}
        {reachOutSuggestions.length > 0 && (
          <div>
            <p className="gba:text-xs gba:text-muted-foreground gba:mb-2">Maybe reach out</p>
            <div className="gba:divide-y gba:divide-border/50">
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
          </div>
        )}
      </div>
    </section>
  )
}

export default TopContacts
