import React, { useState, useCallback, useEffect } from 'react'
import { Button } from '@newwork/nw-design-system'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { AppActionProvider } from '@/components/app-action-provider'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildReactionPayload } from '@/common/data/content/payloads/reactionPayloads'

export interface VoteState {
  score: number
  userVote: 'upvote' | 'downvote' | null
  userReactionId?: string
  userCatalogId?: string
  userVersion?: number
}

interface VoteButtonsProps {
  contentEntryId: string
  initialVoteState: VoteState
  upvoteCatalogId: string
  downvoteCatalogId: string
  accessToken: string
  employeeId: string
  size?: 'sm' | 'md' | 'lg'
  orientation?: 'vertical' | 'horizontal'
  onVoteComplete?: () => void
  'data-testid'?: string
}

/**
 * Centralized VoteButtons component with optimistic updates
 * Supports upvote/downvote functionality for questions and answers
 */
export const VoteButtons: React.FC<VoteButtonsProps> = ({
  contentEntryId,
  initialVoteState,
  upvoteCatalogId,
  downvoteCatalogId,
  accessToken,
  employeeId,
  size = 'md',
  orientation = 'vertical',
  onVoteComplete,
  'data-testid': dataTestId = 'vote-buttons'
}) => {
  // Optimistic state - updates immediately on click
  const [voteState, setVoteState] = useState<VoteState>(initialVoteState)

  // Update state when initialVoteState changes (e.g., after backend fetch)
  useEffect(() => {
    setVoteState(initialVoteState)
  }, [initialVoteState])

  // Size configurations
  const sizeConfig = {
    sm: { button: 'gba:h-8 gba:w-8', icon: 'gba:w-5 gba:h-5', text: 'gba:text-xl' },
    md: { button: 'gba:h-10 gba:w-10', icon: 'gba:w-6 gba:h-6', text: 'gba:text-2xl' },
    lg: { button: 'gba:h-12 gba:w-12', icon: 'gba:w-7 gba:h-7', text: 'gba:text-3xl' }
  }

  const config = sizeConfig[size]

  // Optimistic update: Calculate new vote state
  const getOptimisticVoteState = useCallback(
    (voteType: 'upvote' | 'downvote'): VoteState => {
      const currentVote = voteState.userVote

      // User clicks same vote -> remove vote
      if (currentVote === voteType) {
        const scoreDelta = voteType === 'upvote' ? -1 : 1
        return {
          ...voteState,
          score: voteState.score + scoreDelta,
          userVote: null
        }
      }

      // User clicks opposite vote -> change vote
      if (currentVote) {
        const scoreDelta = voteType === 'upvote' ? 2 : -2
        return {
          ...voteState,
          score: voteState.score + scoreDelta,
          userVote: voteType
        }
      }

      // User clicks new vote
      const scoreDelta = voteType === 'upvote' ? 1 : -1
      return {
        ...voteState,
        score: voteState.score + scoreDelta,
        userVote: voteType
      }
    },
    [voteState]
  )

  // Handle vote success from backend
  const handleVoteSuccess = useCallback(() => {
    if (onVoteComplete) {
      onVoteComplete()
    }
  }, [onVoteComplete])

  // Handle vote error - revert to previous state
  const handleVoteError = useCallback((previousState: VoteState) => {
    setVoteState(previousState)
  }, [])

  const containerClass =
    orientation === 'vertical'
      ? 'gba:flex gba:flex-col gba:items-center gba:gap-2 gba:min-w-[80px]'
      : 'gba:flex gba:flex-row gba:items-center gba:gap-2'

  return (
    <div className={containerClass} data-testid={dataTestId}>
      {/* Upvote button */}
      <AppActionProvider
        contextsArray={[FlowContextName.contentEntryReact]}
        externalContextData={{ contentEntryId }}
        accessToken={accessToken}
        onSuccess={handleVoteSuccess}
        transformData={() => {
          if (!upvoteCatalogId) {
            throw new Error('Upvote catalog entry not found')
          }
          return buildReactionPayload({
            contentEntryId,
            catalogEntryId: upvoteCatalogId,
            employeeId,
            existingReactionId: voteState.userReactionId,
            existingCatalogEntryId: voteState.userCatalogId,
            existingVersion: voteState.userVersion
          })
        }}
      >
        {({ executeAction, isLoading }) => (
          <Button
            variant="ghost"
            size="sm"
            className={`${config.button} gba:p-0 ${
              voteState.userVote === 'upvote'
                ? 'gba:text-success gba:hover:bg-success-secondary'
                : 'gba:text-muted-foreground gba:hover:text-success gba:hover:bg-accent'
            }`}
            onClick={e => {
              e.stopPropagation()
              // Optimistic update
              const previousState = { ...voteState }
              const newState = getOptimisticVoteState('upvote')
              setVoteState(newState)

              // Call backend
              executeAction({}).catch(() => {
                handleVoteError(previousState)
              })
            }}
            disabled={isLoading}
            data-testid={`${dataTestId}-upvote`}
          >
            <ThumbsUp className={config.icon} />
          </Button>
        )}
      </AppActionProvider>

      {/* Vote count */}
      <span
        className={(() => {
          const baseClasses = `gba:font-bold ${config.text}`
          if (voteState.score > 0) return `${baseClasses} gba:text-success`
          if (voteState.score < 0) return `${baseClasses} gba:text-destructive`
          return `${baseClasses} gba:text-foreground`
        })()}
        data-testid={`${dataTestId}-score`}
      >
        {voteState.score}
      </span>

      {/* Downvote button */}
      <AppActionProvider
        contextsArray={[FlowContextName.contentEntryReact]}
        externalContextData={{ contentEntryId }}
        accessToken={accessToken}
        onSuccess={handleVoteSuccess}
        transformData={() => {
          if (!downvoteCatalogId) {
            throw new Error('Downvote catalog entry not found')
          }
          return buildReactionPayload({
            contentEntryId,
            catalogEntryId: downvoteCatalogId,
            employeeId,
            existingReactionId: voteState.userReactionId,
            existingCatalogEntryId: voteState.userCatalogId,
            existingVersion: voteState.userVersion
          })
        }}
      >
        {({ executeAction, isLoading }) => (
          <Button
            variant="ghost"
            size="sm"
            className={`${config.button} gba:p-0 ${
              voteState.userVote === 'downvote'
                ? 'gba:text-destructive gba:hover:bg-destructive-secondary'
                : 'gba:text-muted-foreground gba:hover:text-destructive gba:hover:bg-accent'
            }`}
            onClick={e => {
              e.stopPropagation()
              // Optimistic update
              const previousState = { ...voteState }
              const newState = getOptimisticVoteState('downvote')
              setVoteState(newState)

              // Call backend
              executeAction({}).catch(() => {
                handleVoteError(previousState)
              })
            }}
            disabled={isLoading}
            data-testid={`${dataTestId}-downvote`}
          >
            <ThumbsDown className={config.icon} />
          </Button>
        )}
      </AppActionProvider>
    </div>
  )
}

export default VoteButtons
