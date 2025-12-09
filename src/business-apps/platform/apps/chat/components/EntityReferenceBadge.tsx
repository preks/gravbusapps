import React from 'react'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@newwork/nw-design-system'
import { MessageSquare } from 'lucide-react'
import type { MessageEntityReference } from '../types'
import { isSupportedEntityType } from '../types'
import { ENTITY_ICONS, navigateToEntity } from './utils/entityUtils'

interface EntityReferenceBadgeProps {
  reference: MessageEntityReference
  isOwnMessage?: boolean
}

/**
 * Clickable badge component for entity references in messages
 */
export const EntityReferenceBadge: React.FC<EntityReferenceBadgeProps> = ({ reference, isOwnMessage }) => {
  const supportedType = isSupportedEntityType(reference.type) ? reference.type : undefined
  const Icon = supportedType ? ENTITY_ICONS[supportedType] : MessageSquare
  const isNavigable = Boolean(supportedType)
  const showAvatar = reference.type === 'employee' && reference.pictureThumbnail

  if (!supportedType) {
    console.warn('[Chat] Unsupported entity reference type', reference)
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={e => {
              if (!isNavigable) {
                return
              }
              e.stopPropagation()
              navigateToEntity(reference)
            }}
            disabled={!isNavigable}
            className={`gba:inline-flex gba:items-center gba:gap-1 gba:px-1.5 gba:py-0.5 gba:rounded gba:text-xs gba:font-medium gba:transition-colors gba:mx-0.5 ${
              isOwnMessage
                ? 'gba:bg-primary-foreground/20 gba:text-primary-foreground gba:hover:bg-primary-foreground/30'
                : 'gba:bg-primary/10 gba:text-primary gba:hover:bg-primary/20'
            } ${isNavigable ? 'gba:cursor-pointer' : 'gba:cursor-default'}`}
            data-testid={`entity-ref-${reference.type}-${reference.id}`}
          >
            {showAvatar ? (
              <img
                src={`data:image/jpeg;base64,${reference.pictureThumbnail}`}
                alt={reference.name}
                className="gba:w-4 gba:h-4 gba:rounded-full gba:object-cover"
              />
            ) : (
              <Icon className="gba:w-3 gba:h-3" />
            )}
            <span>{reference.name}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="gba:text-xs">
            {showAvatar && (
              <img
                src={`data:image/jpeg;base64,${reference.pictureThumbnail}`}
                alt={reference.name}
                className="gba:w-10 gba:h-10 gba:rounded-full gba:object-cover gba:mb-2 gba:mx-auto"
              />
            )}
            <div className="gba:font-medium">{reference.name}</div>
            <div className="gba:text-muted-foreground gba:capitalize">{reference.type.replace('_', ' ')}</div>
            {reference.subtitle && <div className="gba:text-muted-foreground">{reference.subtitle}</div>}
            <div className="gba:text-[10px] gba:mt-1 gba:text-muted-foreground">Click to open</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Render message content with clickable entity references
 */
export const renderContentWithReferences = (
  content: string,
  metadata?: Record<string, any>,
  isOwnMessage?: boolean
): React.ReactNode => {
  const entityReferences: MessageEntityReference[] = metadata?.entityReferences || []

  if (entityReferences.length === 0) {
    return <span>{content}</span>
  }

  // Sort references by start index
  const sortedRefs = [...entityReferences].sort((a, b) => a.startIndex - b.startIndex)

  const parts: React.ReactNode[] = []
  let lastIndex = 0

  sortedRefs.forEach((ref, idx) => {
    // Add text before this reference
    if (ref.startIndex > lastIndex) {
      parts.push(<span key={`text-${idx}`}>{content.slice(lastIndex, ref.startIndex)}</span>)
    }

    // Add the entity reference badge
    parts.push(<EntityReferenceBadge key={`ref-${idx}`} reference={ref} isOwnMessage={isOwnMessage} />)

    lastIndex = ref.endIndex
  })

  // Add remaining text after last reference
  if (lastIndex < content.length) {
    parts.push(<span key="text-end">{content.slice(lastIndex)}</span>)
  }

  return <>{parts}</>
}
