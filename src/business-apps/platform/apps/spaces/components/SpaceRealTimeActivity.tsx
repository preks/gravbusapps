/**
 * SpaceRealTimeActivity - Shows who's working on what
 *
 * Displays real-time activity of team members editing documents in the space.
 * Shows messages like "Jens is editing 'Q4 Report'"
 */

import React, { useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@newwork/nw-design-system'
import { Pulse, FileText, Note, Table, Presentation } from '@phosphor-icons/react'
import { useSpaceDocumentActivity, type DocumentActivity, type DocumentType } from '../hooks/useSpaceDocumentActivity'
import type { SpaceContentItem } from '../types/space.types'

export interface SpaceRealTimeActivityProps {
  /** Space ID to track activity for */
  spaceId: string
  /** Content items in the space */
  spaceContent: SpaceContentItem[]
  /** Current user ID to exclude their own activity */
  currentUserId?: string
  /** Maximum number of activities to show */
  maxActivities?: number
  'data-testid'?: string
}

// Get icon for document type
const getDocumentIcon = (type: DocumentType) => {
  switch (type) {
    case 'document':
      return <FileText className="gba:w-4 gba:h-4" />
    case 'note':
      return <Note className="gba:w-4 gba:h-4" />
    case 'spreadsheet':
      return <Table className="gba:w-4 gba:h-4" />
    case 'slide':
      return <Presentation className="gba:w-4 gba:h-4" />
    default:
      return <FileText className="gba:w-4 gba:h-4" />
  }
}

// Get activity verb
const getActivityVerb = (activity: DocumentActivity) => {
  return activity.activityType === 'editing' ? 'is editing' : 'is viewing'
}

// Get initials for avatar fallback
const getInitials = (name?: string) => {
  if (!name) return '?'
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Format relative time
const formatDuration = (startedAt: Date) => {
  const diffMs = Date.now() - startedAt.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m`
  const diffHours = Math.floor(diffMins / 60)
  return `${diffHours}h`
}

export const SpaceRealTimeActivity: React.FC<SpaceRealTimeActivityProps> = ({
  spaceId,
  spaceContent,
  currentUserId,
  maxActivities = 5,
  'data-testid': testId = 'space-realtime-activity'
}) => {
  const { activities, hasActivity } = useSpaceDocumentActivity(spaceId, spaceContent, currentUserId)

  // Debug: prove component + hook are running in this screen
  useEffect(() => {
    let debugEnabled = false
    try {
      debugEnabled = window.localStorage?.getItem('gba:debug:space-activity') === '1'
    } catch {
      debugEnabled = false
    }

    if (!debugEnabled) return
    ;(window as any).__GBA_SPACE_ACTIVITY_DEBUG__ = {
      enabled: true,
      spaceId,
      contentCount: spaceContent.length,
      href: window.location.href
    }

    console.error('[SpaceActivity] SpaceRealTimeActivity mounted', {
      spaceId,
      contentCount: spaceContent.length,
      href: window.location.href
    })
  }, [spaceId, spaceContent.length])

  // Limit displayed activities
  const displayedActivities = activities.slice(0, maxActivities)

  return (
    <Card className="gba:border-border/50" data-testid={testId}>
      <CardHeader className="gba:pb-3">
        <CardTitle className="gba:text-base gba:font-medium gba:flex gba:items-center gba:gap-2">
          <Pulse className="gba:w-4 gba:h-4" />
          Live Activity
          {hasActivity && (
            <span className="gba:relative gba:flex gba:h-2 gba:w-2">
              <span className="gba:animate-ping gba:absolute gba:inline-flex gba:h-full gba:w-full gba:rounded-full gba:bg-success gba:opacity-75" />
              <span className="gba:relative gba:inline-flex gba:rounded-full gba:h-2 gba:w-2 gba:bg-success" />
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:pt-0">
        {!hasActivity ? (
          <div className="gba:text-center gba:py-6">
            <div className="gba:w-10 gba:h-10 gba:mx-auto gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center gba:mb-2">
              <Pulse className="gba:w-5 gba:h-5 gba:text-muted-foreground" />
            </div>
            <p className="gba:text-sm gba:text-muted-foreground">No active editing right now</p>
            <p className="gba:text-xs gba:text-muted-foreground/70 gba:mt-1">
              Activity will appear when team members work on documents
            </p>
          </div>
        ) : (
          <div className="gba:space-y-3">
            {displayedActivities.map(activity => (
              <div
                key={activity.key}
                className="gba:flex gba:items-center gba:gap-3 gba:p-2 gba:rounded-lg gba:bg-success/5 gba:border gba:border-success/20"
                data-testid={`${testId}-activity-${activity.key}`}
              >
                {/* User avatar with activity indicator */}
                <div className="gba:relative">
                  <Avatar className="gba:w-8 gba:h-8">
                    {activity.userAvatar ? <AvatarImage src={activity.userAvatar} alt={activity.userName} /> : null}
                    <AvatarFallback className="gba:text-xs gba:font-medium gba:bg-primary/10 gba:text-primary">
                      {getInitials(activity.userName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="gba:absolute gba:-bottom-0.5 gba:-right-0.5 gba:w-3 gba:h-3 gba:rounded-full gba:bg-success gba:border-2 gba:border-background gba:flex gba:items-center gba:justify-center">
                    <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-white" />
                  </span>
                </div>

                {/* Activity description */}
                <div className="gba:flex-1 gba:min-w-0">
                  <div className="gba:flex gba:items-center gba:gap-1.5">
                    <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">
                      {currentUserId && activity.userId === currentUserId ? 'You' : activity.userName}
                    </span>
                    <span className="gba:text-sm gba:text-muted-foreground">{getActivityVerb(activity)}</span>
                  </div>
                  <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:text-muted-foreground">
                    {getDocumentIcon(activity.documentType)}
                    <span className="gba:truncate">{activity.documentTitle}</span>
                    <span className="gba:text-muted-foreground/60">· {formatDuration(activity.startedAt)}</span>
                  </div>
                </div>
              </div>
            ))}

            {activities.length > maxActivities && (
              <p className="gba:text-xs gba:text-muted-foreground gba:text-center gba:pt-1">
                +{activities.length - maxActivities} more active
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default SpaceRealTimeActivity
