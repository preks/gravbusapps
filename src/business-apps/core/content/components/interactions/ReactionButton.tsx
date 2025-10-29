import React, { useState, useCallback, useRef } from 'react'
import { Button, Popover, PopoverContent, PopoverTrigger } from '@newwork/nw-design-system'
import EmojiPicker, { EmojiClickData, Theme, EmojiStyle } from 'emoji-picker-react'
import { AppActionProvider } from '@/components/app-action-provider'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { Smile } from 'lucide-react'
import { buildReactionPayload } from '@/common/data/content/payloads'

export interface Reaction {
  emoji: string
  count: number
  userReacted: boolean
  reactionId?: string
  catalogEntryId?: string // Catalog entry ID for the reaction
  imageUrl?: string // For CUSTOM type reactions
  version?: number // Version from the database
}

export interface ReactionSummary {
  [emoji: string]: Reaction
}

export interface ReactionButtonProps {
  contentEntryId: string
  reactionSummary: ReactionSummary
  allowReaction: boolean
  accessToken: string
  employeeId: string
  onSuccess?: () => void
  size?: 'sm' | 'md' | 'lg'
  'data-testid'?: string
  allowedReactions?: string[] // Unified codes of allowed reactions
  reactionCatalogMap?: Record<string, string> // Map of unified code -> catalog entry ID
}

// Fallback reactions if not provided
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
 * Reaction Button with Reactions Picker
 * Uses emoji-picker-react's Reactions mode with catalog-based reactions
 */
export const ReactionButton: React.FC<ReactionButtonProps> = ({
  contentEntryId,
  reactionSummary,
  allowReaction,
  accessToken,
  employeeId,
  onSuccess,
  'data-testid': dataTestId = 'reaction-button',
  allowedReactions = DEFAULT_REACTIONS,
  reactionCatalogMap = {}
}) => {
  const [open, setOpen] = useState(false)
  const selectedEmojiRef = useRef<string | null>(null)

  const handleSuccess = useCallback(() => {
    if (onSuccess) {
      onSuccess()
    }
    setOpen(false)
    selectedEmojiRef.current = null
  }, [onSuccess])

  if (!allowReaction) {
    return null
  }

  const totalReactions = Object.values(reactionSummary).reduce((sum, r) => sum + r.count, 0)
  const hasReactions = totalReactions > 0

  return (
    <div className="gba:flex gba:items-center gba:gap-2">
      {/* Reaction summary display */}
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

                  // Check if user already has ANY reaction (user can only have ONE reaction per content entry)
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
                    onClick={() => executeAction({})}
                    disabled={isLoading}
                    data-testid={`${dataTestId}-${emoji}`}
                  >
                    {reaction.imageUrl ? (
                      <img src={reaction.imageUrl} alt={emoji} className="gba:w-4 gba:h-4" />
                    ) : (
                      <span className="gba:text-base gba:leading-none">{reaction.emoji}</span>
                    )}
                    <span className="gba:text-sm gba:font-medium gba:leading-none">{reaction.count}</span>
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
        <PopoverContent className="gba:w-auto gba:p-0 gba:border-0 gba:bg-transparent gba:shadow-none" align="start">
          <AppActionProvider
            contextsArray={[FlowContextName.contentEntryReact]}
            externalContextData={{ contentEntryId }}
            accessToken={accessToken}
            onSuccess={handleSuccess}
            transformData={() => {
              // Get the selected emoji's catalog ID
              const selectedUnified = selectedEmojiRef.current
              if (!selectedUnified) {
                throw new Error('No emoji selected')
              }

              const catalogEntryId = reactionCatalogMap[selectedUnified]
              if (!catalogEntryId) {
                throw new Error(`No catalog entry ID found for emoji: ${selectedUnified}`)
              }

              // Check if user already has ANY reaction (user can only have ONE reaction per content entry)
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
                  executeAction({})
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

export default ReactionButton
