import React, { useCallback } from 'react'
import { Button } from '@newwork/nw-design-system'
import { Heart } from 'lucide-react'
import { AppActionProvider } from '@/components/app-action-provider'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { UserLike } from '../../hooks/useArticleLikes'

export interface LikeButtonProps {
  articleId: string
  userLike: UserLike | null
  likesCount: number
  allowLike: boolean
  accessToken: string
  onSuccess?: () => void
  size?: 'sm' | 'md'
  'data-testid'?: string
}

export const LikeButton: React.FC<LikeButtonProps> = ({
  articleId,
  userLike,
  likesCount,
  allowLike,
  accessToken,
  onSuccess,
  size = 'sm',
  'data-testid': dataTestId = 'like-button'
}) => {
  const isLiked = userLike?.liked ?? false

  const transformData = useCallback(() => {
    const articleLikeData: any = {
      liked: !isLiked,
      article: articleId
    }

    // Only include id and version if user has already liked before
    if (userLike) {
      articleLikeData.id = userLike.id
      articleLikeData.version = userLike.version
    }

    return {
      articleLike: articleLikeData
    }
  }, [articleId, userLike, isLiked])

  const handleSuccess = useCallback(() => {
    if (onSuccess) {
      onSuccess()
    }
  }, [onSuccess])

  if (!allowLike) {
    return null
  }

  const iconSize = size === 'sm' ? 'gba:w-4 gba:h-4' : 'gba:w-5 gba:h-5'
  const textSize = size === 'sm' ? 'gba:text-xs' : 'gba:text-sm'

  return (
    <AppActionProvider
      contextsArray={[FlowContextName.contentLikeUpdate]}
      externalContextData={{ articleId }}
      accessToken={accessToken}
      onSuccess={handleSuccess}
      transformData={transformData}
    >
      {({ executeAction, isLoading, isProcessing }) => {
        const isActionLoading = isLoading || isProcessing

        return (
          <Button
            variant="ghost"
            size="sm"
            className="gba:p-0 gba:h-auto gba:gap-1"
            onClick={() => executeAction({})}
            disabled={isActionLoading}
            data-testid={dataTestId}
          >
            <Heart
              className={`${iconSize} ${isLiked ? 'gba:fill-destructive gba:text-destructive' : 'gba:text-muted-foreground'}`}
            />
            <span className={`${textSize} gba:text-foreground`}>{likesCount || 0}</span>
          </Button>
        )
      }}
    </AppActionProvider>
  )
}

export default LikeButton
