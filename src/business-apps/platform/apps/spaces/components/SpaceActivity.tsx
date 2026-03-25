/**
 * SpaceActivity - Activity feed component
 *
 * Simple activity list following NEWWORK design system
 */

import React, { useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  FileText,
  Edit3,
  Share2,
  MessageCircle,
  Plus,
  Activity,
  Trash2,
  FolderInput,
  FileSpreadsheet,
  StickyNote,
  Presentation
} from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import type { SpaceActivity as SpaceActivityType } from '../types/space.types'
import type { UserInfo } from '../hooks/useSpaceUserLookup'

export interface SpaceActivityProps {
  activities: SpaceActivityType[]
  isLoading?: boolean
  spaceId?: string
  /** Function to get user info (name, avatar) by userId - from useSpaceUserLookup */
  getUserInfo?: (userId: string) => UserInfo | undefined
  'data-testid'?: string
}

const actionConfig: Record<string, { icon: typeof FileText; label: string }> = {
  created: { icon: Plus, label: 'created' },
  updated: { icon: Edit3, label: 'edited' },
  edited: { icon: Edit3, label: 'edited' },
  deleted: { icon: Trash2, label: 'deleted' },
  shared: { icon: Share2, label: 'shared' },
  moved: { icon: FolderInput, label: 'moved' },
  commented: { icon: MessageCircle, label: 'commented on' }
}

const entityTypeConfig: Record<string, { icon: typeof FileText; label: string }> = {
  document: { icon: FileText, label: 'document' },
  note: { icon: StickyNote, label: 'note' },
  spreadsheet: { icon: FileSpreadsheet, label: 'spreadsheet' },
  slide: { icon: Presentation, label: 'presentation' },
  space: { icon: Activity, label: 'space' }
}

const getInitials = (name: string): string => {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export const SpaceActivity: React.FC<SpaceActivityProps> = ({
  activities,
  isLoading = false,
  spaceId,
  getUserInfo,
  'data-testid': testId = 'space-activity'
}) => {
  const handleActivityClick = useCallback(
    (activity: SpaceActivityType) => {
      // Don't navigate for deleted items or space-level activities
      if (activity.action === 'deleted' || activity.entityType === 'space') return

      // Use canonical platform paths (navigateTo() maps them for dev)
      const basePathByType: Record<SpaceActivityType['entityType'], string> = {
        document: '/platform/every-office/documents',
        note: '/platform/every-office/notes',
        spreadsheet: '/platform/every-office/spreadsheets',
        slide: '/platform/every-office/slides',
        space: '/platform/every-office/spaces'
      }

      const basePath = basePathByType[activity.entityType]
      if (!basePath) return

      const commonParams = spaceId ? { spaceId } : undefined

      switch (activity.entityType) {
        case 'document':
          navigateTo(buildPlatformUrl(basePath, { ...(commonParams || {}), docId: activity.entityId }))
          return
        case 'note':
          navigateTo(buildPlatformUrl(basePath, { ...(commonParams || {}), noteId: activity.entityId }))
          return
        case 'spreadsheet':
          navigateTo(buildPlatformUrl(basePath, { ...(commonParams || {}), appId: activity.entityId, view: 'viewer' }))
          return
        case 'slide':
          navigateTo(buildPlatformUrl(basePath, { ...(commonParams || {}), slideId: activity.entityId }))
          return
        default:
          return
      }
    },
    [spaceId]
  )

  if (isLoading) {
    return (
      <div className="gba:space-y-3" data-testid={testId}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="gba:flex gba:gap-3 gba:animate-pulse">
            <div className="gba:w-8 gba:h-8 gba:rounded-full gba:bg-muted/50" />
            <div className="gba:flex-1 gba:space-y-2">
              <div className="gba:h-4 gba:bg-muted/50 gba:rounded gba:w-3/4" />
              <div className="gba:h-3 gba:bg-muted/50 gba:rounded gba:w-1/4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="gba:text-center gba:py-8" data-testid={testId}>
        <Activity className="gba:w-8 gba:h-8 gba:text-muted-foreground/40 gba:mx-auto gba:mb-2" />
        <p className="gba:text-sm gba:text-muted-foreground">No activity yet</p>
        <p className="gba:text-xs gba:text-muted-foreground/70 gba:mt-1">Activity will appear as content is modified</p>
      </div>
    )
  }

  return (
    <div className="gba:space-y-1" data-testid={testId}>
      {activities.map(activity => {
        const action = actionConfig[activity.action] || actionConfig.updated
        const entityType = entityTypeConfig[activity.entityType] || entityTypeConfig.document
        const EntityIcon = entityType.icon
        const isClickable = activity.action !== 'deleted' && activity.entityType !== 'space'

        // Get resolved user info (with avatar) from useSpaceUserLookup
        const resolvedUser = getUserInfo?.(activity.userId)
        const displayName = resolvedUser?.name || activity.userName
        const avatarSrc = resolvedUser?.avatar || activity.userAvatar

        return (
          <div
            key={activity.id}
            className={`gba:flex gba:gap-3 gba:p-2 gba:rounded-md gba:transition-colors ${
              isClickable ? 'gba:cursor-pointer gba:hover:bg-muted/30' : ''
            }`}
            onClick={() => isClickable && handleActivityClick(activity)}
            data-testid={`${testId}-item-${activity.id}`}
          >
            {/* User Avatar */}
            <Avatar className="gba:w-8 gba:h-8 gba:flex-shrink-0">
              {avatarSrc && <AvatarImage src={avatarSrc} alt={displayName} />}
              <AvatarFallback className="gba:text-xs gba:bg-muted gba:text-muted-foreground">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>

            {/* Content */}
            <div className="gba:flex-1 gba:min-w-0">
              <p className="gba:text-sm gba:text-foreground">
                <span className="gba:font-medium">{displayName}</span>
                <span className="gba:text-muted-foreground"> {action.label} </span>
                <span className="gba:font-medium gba:inline-flex gba:items-center gba:gap-1">
                  <EntityIcon className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground" />
                  {activity.entityTitle}
                </span>
              </p>
              <p className="gba:text-xs gba:text-muted-foreground">
                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default SpaceActivity
