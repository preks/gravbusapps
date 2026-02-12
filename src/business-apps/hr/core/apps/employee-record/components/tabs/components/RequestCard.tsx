import React from 'react'
import { Card, CardContent, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'

export interface ReviewerAvatar {
  id?: string
  firstName?: string | null
  lastName?: string | null
  pictureThumbnail?: string | null
}

export interface RequestCardProps {
  id: string
  title: string
  subtitle?: string
  dateText?: string
  creatorName?: string | null
  onCreatorClick?: () => void
  reviewerAvatars?: ReviewerAvatar[]
  reviewerNames?: string[]
  rightAction?: React.ReactNode
  dataTestIdPrefix: string
  onRightActionClick?: () => void
  // When true, style creator name link with info color (used in second column)
  highlightCreatorName?: boolean
}

const toAvatarSrc = (thumb?: string | null): string | undefined => {
  if (!thumb) return undefined
  const t = thumb.trim()
  if (!t) return undefined
  if (t.startsWith('http://') || t.startsWith('https://')) return t
  if (t.startsWith('data:image')) return t
  const sig = t.slice(0, 12)
  let mime = 'image/jpeg'
  if (sig.startsWith('/9j/')) mime = 'image/jpeg'
  else if (sig.startsWith('iVBORw0KGgo')) mime = 'image/png'
  else if (sig.startsWith('R0lGOD')) mime = 'image/gif'
  else if (sig.startsWith('Qk')) mime = 'image/bmp'
  return `data:${mime};base64,${t}`
}

export const RequestCard: React.FC<RequestCardProps> = ({
  id,
  title,
  subtitle,
  dateText,
  creatorName,
  onCreatorClick,
  reviewerAvatars,
  reviewerNames,
  rightAction,
  dataTestIdPrefix,
  onRightActionClick,
  highlightCreatorName = false
}) => {
  const hasReviewerAvatars = Boolean(reviewerAvatars && reviewerAvatars.length > 0)
  const hasReviewerNames = Boolean(reviewerNames && reviewerNames.length > 0)

  let reviewerContent: React.ReactNode = null

  if (creatorName) {
    reviewerContent = (
      <button
        className={`gba:text-sm ${highlightCreatorName ? 'gba:text-info gba:hover:underline gba:underline-offset-2' : 'gba:text-primary'} gba:font-medium`}
        data-testid={`${dataTestIdPrefix}-creator-${id}`}
        onClick={onCreatorClick}
        type="button"
      >
        {creatorName}
      </button>
    )
  } else if (hasReviewerAvatars) {
    reviewerContent = (
      <div className="gba:flex gba:gap-2">
        {reviewerAvatars!.map(rev => {
          const avatarKey = rev.id || `${rev.firstName || ''}-${rev.lastName || ''}-${rev.pictureThumbnail || ''}`
          return (
            <div
              key={avatarKey}
              className="gba:w-8 gba:h-8"
              data-testid={`${dataTestIdPrefix}-avatar-${id}-${avatarKey}`}
            >
              <Avatar className="gba:h-8 gba:w-8">
                {toAvatarSrc(rev.pictureThumbnail) && (
                  <AvatarImage
                    src={toAvatarSrc(rev.pictureThumbnail)}
                    alt={`${rev.firstName || ''} ${rev.lastName || ''}`}
                  />
                )}
                <AvatarFallback>{`${rev.firstName?.[0] || ''}${rev.lastName?.[0] || ''}`}</AvatarFallback>
              </Avatar>
            </div>
          )
        })}
      </div>
    )
  } else if (hasReviewerNames) {
    reviewerContent = (
      <div className="gba:flex gba:flex-wrap gba:gap-2">
        {reviewerNames!.map(name => (
          <span
            key={`${id}-name-${name}`}
            className="gba:text-sm gba:text-foreground"
            data-testid={`${dataTestIdPrefix}-name-${id}-${name}`}
          >
            {name}
          </span>
        ))}
      </div>
    )
  }

  return (
    <Card className="gba:transition-shadow gba:h-full" data-testid={`${dataTestIdPrefix}-card-${id}`}>
      <CardContent className="gba:p-4 gba:flex gba:flex-col gba:gap-4 gba:h-full">
        <div className="gba:flex gba:justify-between gba:items-start gba:w-full">
          <div className="gba:flex gba:flex-col gba:gap-1">
            <div className="gba:font-medium" data-testid={`${dataTestIdPrefix}-title-${id}`}>
              {title}
            </div>
            {subtitle && (
              <div className="gba:text-sm gba:text-muted-foreground" data-testid={`${dataTestIdPrefix}-subtitle-${id}`}>
                {subtitle}
              </div>
            )}
            {dateText && (
              <div className="gba:flex gba:items-center gba:gap-1 gba:text-muted-foreground gba:text-sm">
                <span data-testid={`${dataTestIdPrefix}-date-${id}`}>{dateText}</span>
              </div>
            )}
          </div>
        </div>

        <div className="gba:flex gba:justify-between gba:items-center gba:w-full gba:mt-auto">
          <div className="gba:flex gba:flex-col gba:gap-1">{reviewerContent}</div>

          <div className="gba:self-end">
            {onRightActionClick ? (
              <button type="button" onClick={onRightActionClick} className="gba:cursor-pointer">
                {rightAction}
              </button>
            ) : (
              rightAction
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default RequestCard
