import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Button, Popover, PopoverContent, PopoverTrigger } from '@newwork/nw-design-system'
import EmojiPicker, { EmojiClickData, Theme, EmojiStyle } from 'emoji-picker-react'
import { AppActionProvider } from '@/components/app-action-provider'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { Smile } from 'lucide-react'
import { buildReactionPayload } from '@/common/data/content/payloads/reactionPayloads'

export interface Reaction {
  emoji: string
  count: number
  userReacted: boolean
  reactionId?: string
  catalogEntryId?: string
  imageUrl?: string
  version?: number
}

export interface ReactionSummary {
  [emoji: string]: Reaction
}

export interface ReactionPickerProps {
  contentEntryId: string
  reactionSummary: ReactionSummary
  allowReaction: boolean
  accessToken: string
  employeeId: string
  onSuccess?: () => void
  'data-testid'?: string
  allowedReactions?: string[]
  reactionCatalogMap?: Record<string, string>
}

const DEFAULT_REACTIONS = [
  '1f44d', // 👍
  '2764-fe0f', // ❤️
  '1f602', // 😂
  '1f44f', // 👏
  '1f525', // 🔥
  '1f389', // 🎉
  '1f64f', // 🙏
  '1f440' // 👀
]

/**
 * Centralized ReactionPicker component with optimistic updates
 * Displays reactions and allows users to add/remove reactions with immediate UI feedback
 */
export const ReactionPicker: React.FC<ReactionPickerProps> = ({
  contentEntryId,
  reactionSummary: initialReactionSummary,
  allowReaction,
  accessToken,
  employeeId,
  onSuccess,
  'data-testid': dataTestId = 'reaction-picker',
  allowedReactions = DEFAULT_REACTIONS,
  reactionCatalogMap = {}
}) => {
  const [open, setOpen] = useState(false)
  const selectedEmojiRef = useRef<string | null>(null)

  // Optimistic state
  const [reactionSummary, setReactionSummary] = useState<ReactionSummary>(initialReactionSummary)

  // Update state when initialReactionSummary changes (e.g., after backend fetch)
  useEffect(() => {
    setReactionSummary(initialReactionSummary)
  }, [initialReactionSummary])

  // Optimistic update helper
  const getOptimisticReactionState = useCallback(
    (emoji: string, catalogEntryId: string): ReactionSummary => {
      const current = reactionSummary[emoji]
      const userReaction = Object.values(reactionSummary).find(r => r.userReacted)

      // Remove user's existing reaction from another emoji
      const newSummary = { ...reactionSummary }
      if (userReaction && userReaction.emoji !== emoji) {
        const oldEmoji = Object.keys(newSummary).find(k => newSummary[k].userReacted)
        if (oldEmoji) {
          const oldReaction = newSummary[oldEmoji]
          if (oldReaction.count <= 1) {
            delete newSummary[oldEmoji]
          } else {
            newSummary[oldEmoji] = {
              ...oldReaction,
              count: oldReaction.count - 1,
              userReacted: false
            }
          }
        }
      }

      // Toggle current emoji
      if (current?.userReacted) {
        // Remove reaction
        if (current.count <= 1) {
          delete newSummary[emoji]
        } else {
          newSummary[emoji] = {
            ...current,
            count: current.count - 1,
            userReacted: false
          }
        }
      } else {
        // Add reaction
        newSummary[emoji] = {
          emoji,
          count: (current?.count || 0) + 1,
          userReacted: true,
          catalogEntryId,
          reactionId: current?.reactionId,
          version: current?.version
        }
      }

      return newSummary
    },
    [reactionSummary]
  )

  const handleSuccess = useCallback(() => {
    if (onSuccess) {
      onSuccess()
    }
    setOpen(false)
    selectedEmojiRef.current = null
  }, [onSuccess])

  const handleReactionError = useCallback((previousState: ReactionSummary) => {
    setReactionSummary(previousState)
  }, [])

  // Handler for reaction button click
  const handleReactionClick = useCallback(
    (emoji: string, catalogEntryId: string, executeAction: () => Promise<void>) => {
      const previousState = { ...reactionSummary }
      const newState = getOptimisticReactionState(emoji, catalogEntryId)
      setReactionSummary(newState)
      executeAction().catch(() => handleReactionError(previousState))
    },
    [reactionSummary, getOptimisticReactionState, handleReactionError]
  )

  if (!allowReaction) {
    return null
  }

  const totalReactions = Object.values(reactionSummary).reduce((sum, r) => sum + r.count, 0)
  const hasReactions = totalReactions > 0

  return (
    <div className="gba:flex gba:items-center gba:gap-2">
      {/* Reaction summary display - Only show reactions that have been used */}
      {hasReactions && (
        <div className="gba:flex gba:items-center gba:gap-1 gba:flex-wrap">
          {Object.entries(reactionSummary)
            .sort(([, a], [, b]) => b.count - a.count)
            .slice(0, 5)
            .map(([emoji, reaction]) => (
              <AppActionProvider
                key={emoji}
                contextsArray={[FlowContextName.contentEntryReact]}
                externalContextData={{ contentEntryId }}
                accessToken={accessToken}
                onSuccess={handleSuccess}
                transformData={() => {
                  if (!reaction.catalogEntryId) {
                    throw new Error(`No catalog entry ID for reaction: ${emoji}`)
                  }

                  const userReaction = Object.values(reactionSummary).find(r => r.userReacted)

                  return buildReactionPayload({
                    contentEntryId,
                    catalogEntryId: reaction.catalogEntryId,
                    employeeId,
                    existingReactionId: userReaction?.reactionId,
                    existingCatalogEntryId: userReaction?.catalogEntryId,
                    existingVersion: userReaction?.version
                  })
                }}
              >
                {({ executeAction, isLoading }) => (
                  <Button
                    variant={reaction.userReacted ? 'default' : 'ghost'}
                    size="sm"
                    className={`gba:h-7 gba:px-2.5 gba:py-1 gba:gap-1 gba:rounded-full gba:text-sm ${
                      reaction.userReacted
                        ? 'gba:bg-primary gba:text-primary-foreground gba:hover:bg-primary/90'
                        : 'gba:bg-muted gba:text-foreground gba:hover:bg-accent'
                    }`}
                    onClick={() => handleReactionClick(emoji, reaction.catalogEntryId!, executeAction)}
                    disabled={isLoading}
                    data-testid={`${dataTestId}-${emoji}`}
                  >
                    {reaction.imageUrl ? (
                      <img src={reaction.imageUrl} alt={emoji} className="gba:w-4 gba:h-4" />
                    ) : (
                      <span className="gba:text-base gba:leading-none">{reaction.emoji}</span>
                    )}
                    {reaction.count > 0 && (
                      <span className="gba:text-sm gba:font-medium gba:leading-none">{reaction.count}</span>
                    )}
                  </Button>
                )}
              </AppActionProvider>
            ))}
        </div>
      )}

      {/* Add reaction button with Popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gba:h-7 gba:px-2 gba:py-1 gba:rounded-full gba:bg-muted gba:hover:bg-accent"
            data-testid={dataTestId}
          >
            <Smile className="gba:w-4 gba:h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="gba:w-auto gba:p-0 gba:border-0" align="start">
          <AppActionProvider
            contextsArray={[FlowContextName.contentEntryReact]}
            externalContextData={{ contentEntryId }}
            accessToken={accessToken}
            onSuccess={handleSuccess}
            transformData={() => {
              const selectedEmoji = selectedEmojiRef.current
              if (!selectedEmoji) {
                throw new Error('No emoji selected')
              }

              const catalogEntryId = reactionCatalogMap[selectedEmoji]
              if (!catalogEntryId) {
                throw new Error(`No catalog entry for emoji: ${selectedEmoji}`)
              }

              const userReaction = Object.values(reactionSummary).find(r => r.userReacted)

              return buildReactionPayload({
                contentEntryId,
                catalogEntryId,
                employeeId,
                existingReactionId: userReaction?.reactionId,
                existingCatalogEntryId: userReaction?.catalogEntryId,
                existingVersion: userReaction?.version
              })
            }}
          >
            {({ executeAction }) => (
              <EmojiPicker
                reactionsDefaultOpen={true}
                reactions={allowedReactions}
                emojiStyle={EmojiStyle.NATIVE}
                lazyLoadEmojis={true}
                skinTonesDisabled={true}
                allowExpandReactions={false}
                onReactionClick={(emojiData: EmojiClickData) => {
                  // Store selected emoji and execute action
                  selectedEmojiRef.current = emojiData.unified

                  const catalogEntryId = reactionCatalogMap[emojiData.unified]
                  if (catalogEntryId) {
                    // Optimistic update
                    const previousState = { ...reactionSummary }
                    const newState = getOptimisticReactionState(emojiData.emoji, catalogEntryId)
                    setReactionSummary(newState)

                    // Call backend
                    executeAction({}).catch(() => {
                      handleReactionError(previousState)
                    })
                  }
                }}
                theme={Theme.AUTO}
              />
            )}
          </AppActionProvider>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export default ReactionPicker
