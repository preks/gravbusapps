'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ScrollArea,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Spinner,
  Alert,
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@newwork/nw-design-system'
import {
  CalendarIcon,
  UserIcon,
  ArrowSquareOutIcon,
  TextAlignLeftIcon,
  LinkIcon,
  Icon as PhosphorIcon
} from '@phosphor-icons/react'
import { PiPhone, PiEnvelope, PiUsers, PiListChecks } from 'react-icons/pi'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { getFileIcon, buildFileUrl } from '@/common/utils/fileUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { Activity, ActivityDocument } from './types'
import { getActivityEntityName, getActivityElementType, getActivityTypeColor } from './utils'
import { getReferenceTypeBadgeVariant } from '../task-detail-sheet/utils'
import dayjs from 'dayjs'

interface ActivityDetailSheetProps {
  // Single activity mode
  activityId?: string | null
  // Multiple activities mode
  activities?: Activity[]
  date?: string // For multiple activities header (e.g., "June 15, 2024")
  open: boolean
  onOpenChange: (open: boolean) => void
  accessToken: string
  'data-testid'?: string
}

const DATA_TEST_ID_PREFIX = 'ActivityDetailSheet'

interface FieldRowProps {
  icon: PhosphorIcon | React.ComponentType<any>
  label: string
  children: React.ReactNode
  testId?: string
}

const FieldRow: React.FC<FieldRowProps> = ({ icon: IconComponent, label, children, testId }) => (
  <div className="gba:flex gba:items-center gba:gap-3 gba:py-1" data-testid={testId}>
    <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-[100px] gba:text-sm gba:text-muted-foreground gba:shrink-0">
      <IconComponent size={14} className="gba:text-muted-foreground" />
      <span>{label}</span>
    </div>
    <div className="gba:flex-1">{children}</div>
  </div>
)

// Helper to get activity type icon
const getActivityTypeIcon = (type: string) => {
  switch (type) {
    case 'Call':
      return PiPhone
    case 'Email':
      return PiEnvelope
    case 'Meeting':
      return PiUsers
    case 'Task':
      return PiListChecks
    default:
      return PiListChecks
  }
}

// GraphQL query to fetch activity with documents
const buildActivityByIdQuery = (activityId: string): string => {
  return `
    query GetActivityById {
      salesActivity: SalesActivityByPk(id: "${activityId}") {
        id
        title
        description
        createdAt
        occurredAt
        activityType {
          value
        }
        ownerEmployee {
          id
          fullName
          firstName
          lastName
          pictureThumbnail
        }
        ownerEmployeeId
        account {
          id
          name
        }
        accountId
        contact {
          id
          firstName
          lastName
        }
        contactId
        lead {
          id
          name
          contact {
            firstName
            lastName
          }
        }
        leadId
        opportunity {
          id
          name
        }
        opportunityId
        documents {
          id
          name
          mimeType
          fileInfo
          description
        }
      }
    }
  `
}

/**
 * ActivityCard - Single activity display with documents integrated
 */
const ActivityCard: React.FC<{
  activity: Activity
  expanded?: boolean
  onToggle?: () => void
  'data-testid'?: string
}> = ({ activity, expanded = true, onToggle, 'data-testid': dataTestId }) => {
  const activityType = activity.activityType?.value || 'Task'
  const ActivityIcon = getActivityTypeIcon(activityType)
  const activityColor = getActivityTypeColor(activityType)
  const entityName = getActivityEntityName(activity)
  const entityType = getActivityElementType(activity)
  const hasReference = activity.accountId || activity.contactId || activity.leadId || activity.opportunityId

  const handleDocumentClick = (doc: ActivityDocument, e: React.MouseEvent) => {
    e.stopPropagation()
    if (doc.fileInfo) {
      try {
        const fullUrl = buildFileUrl(doc.fileInfo)
        window.open(fullUrl, '_blank', 'noopener,noreferrer')
      } catch (error) {
        console.error('Error building file URL:', error)
      }
    }
  }

  const handleEntityClick = () => {
    if (activity.accountId && activity.account) {
      const url = buildPlatformUrl('/platform/crm/account-record', { accountId: activity.accountId })
      navigateTo(url)
    } else if (activity.contactId && activity.contact) {
      const url = buildPlatformUrl('/platform/crm/contact-record', { contactId: activity.contactId })
      navigateTo(url)
    } else if (activity.leadId && activity.lead) {
      const url = buildPlatformUrl('/platform/crm/lead-record', { leadId: activity.leadId })
      navigateTo(url)
    } else if (activity.opportunityId && activity.opportunity) {
      const url = buildPlatformUrl('/platform/crm/opportunity-record', { opportunityId: activity.opportunityId })
      navigateTo(url)
    }
  }

  const handleOwnerClick = () => {
    if (activity.ownerEmployeeId) {
      const url = buildPlatformUrl('/platform/employee-record', { employeeId: activity.ownerEmployeeId })
      navigateTo(url)
    }
  }

  return (
    <Card data-testid={dataTestId}>
      <CardHeader
        className={onToggle ? 'gba:cursor-pointer hover:gba:bg-accent gba:transition-colors' : ''}
        onClick={onToggle}
      >
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
          <div className="gba:flex-1 gba:min-w-0">
            <CardTitle className="gba:text-base gba:font-semibold gba:mb-2">{activity.title}</CardTitle>
            <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
              <Badge
                variant="secondary"
                className="gba:gap-1.5"
                style={{
                  backgroundColor: `${activityColor}15`,
                  color: activityColor
                }}
              >
                <ActivityIcon size={12} />
                <span>{activityType}</span>
              </Badge>
              {activity.occurredAt && (
                <span className="gba:text-xs gba:text-muted-foreground">
                  {dayjs(activity.occurredAt).format('MMM DD, YYYY HH:mm')}
                </span>
              )}
            </div>
          </div>
          <div className="gba:flex gba:items-center gba:gap-2 gba:shrink-0">
            {activity.documents && activity.documents.length > 0 && (
              <Badge variant="outline">
                {activity.documents.length} {activity.documents.length === 1 ? 'doc' : 'docs'}
              </Badge>
            )}
            {onToggle && (
              <div className="gba:text-muted-foreground">
                {expanded ? <ChevronUp className="gba:w-5 gba:h-5" /> : <ChevronDown className="gba:w-5 gba:h-5" />}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="gba:pt-0 gba:space-y-2">
          {/* Owner Employee */}
          {activity.ownerEmployee && (
            <FieldRow icon={UserIcon} label="Owner" testId={`${dataTestId || DATA_TEST_ID_PREFIX}-owner-field`}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleOwnerClick}
                    className="gba:cursor-pointer gba:hover:bg-accent gba:px-2 gba:py-1 gba:rounded gba:transition-colors gba:w-fit gba:min-h-[24px] gba:border-0 gba:bg-transparent"
                  >
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Avatar size="sm">
                        {activity.ownerEmployee.pictureThumbnail && (
                          <AvatarImage
                            src={`data:image/jpeg;base64,${activity.ownerEmployee.pictureThumbnail}`}
                            alt={activity.ownerEmployee.fullName || 'Unknown'}
                          />
                        )}
                        <AvatarFallback>
                          <UserIcon size={14} />
                        </AvatarFallback>
                      </Avatar>
                      <span className="gba:text-sm gba:font-medium gba:truncate">
                        {activity.ownerEmployee.fullName || 'Unknown'}
                      </span>
                      <ArrowSquareOutIcon size={12} className="gba:text-muted-foreground gba:shrink-0" />
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent>View employee profile</TooltipContent>
              </Tooltip>
            </FieldRow>
          )}

          {/* Entity Reference */}
          <FieldRow icon={LinkIcon} label="Reference" testId={`${dataTestId || DATA_TEST_ID_PREFIX}-reference-field`}>
            {hasReference ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleEntityClick}
                    className="gba:cursor-pointer gba:hover:bg-accent gba:px-2 gba:py-1 gba:rounded gba:transition-colors gba:w-fit gba:min-h-[24px] gba:border-0 gba:bg-transparent"
                  >
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Badge
                        variant={getReferenceTypeBadgeVariant(entityType.toLowerCase()) as any}
                        className="gba:text-xs gba:shrink-0"
                      >
                        {entityType}
                      </Badge>
                      <span className="gba:text-sm gba:font-medium gba:truncate">{entityName}</span>
                      <ArrowSquareOutIcon size={12} className="gba:text-muted-foreground gba:shrink-0" />
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent>View {entityType.toLowerCase()} record</TooltipContent>
              </Tooltip>
            ) : (
              <span className="gba:text-sm gba:text-muted-foreground gba:px-2 gba:py-1">No reference</span>
            )}
          </FieldRow>

          {/* Created Date */}
          <FieldRow icon={CalendarIcon} label="Created" testId={`${dataTestId || DATA_TEST_ID_PREFIX}-created-field`}>
            <span className="gba:text-sm gba:text-foreground">
              {dayjs(activity.createdAt).format('MMM DD, YYYY HH:mm')}
            </span>
          </FieldRow>

          {/* Description */}
          {activity.description && (
            <FieldRow
              icon={TextAlignLeftIcon}
              label="Description"
              testId={`${dataTestId || DATA_TEST_ID_PREFIX}-description-field`}
            >
              <p className="gba:text-sm gba:text-foreground gba:whitespace-pre-wrap">{activity.description}</p>
            </FieldRow>
          )}

          {/* Documents Section */}
          {activity.documents && activity.documents.length > 0 && (
            <div className="gba:space-y-2 gba:pt-3 gba:border-t gba:border-border">
              <div className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-1">
                Documents ({activity.documents.length})
              </div>
              <div className="gba:space-y-2">
                {activity.documents.map(doc => {
                  const FileIcon = getFileIcon(doc.mimeType || undefined)
                  return (
                    <button
                      type="button"
                      key={doc.id}
                      onClick={e => handleDocumentClick(doc, e)}
                      className="gba:w-full gba:flex gba:items-center gba:gap-3 gba:p-2 gba:text-left gba:bg-muted gba:rounded gba:hover:bg-accent gba:transition-colors gba:group"
                      data-testid={`${dataTestId || DATA_TEST_ID_PREFIX}-document-${doc.id}`}
                    >
                      <div className="gba:flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:bg-background gba:rounded gba:shrink-0">
                        <FileIcon size={14} weight="bold" />
                      </div>
                      <div className="gba:flex-1 gba:min-w-0">
                        <div className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{doc.name}</div>
                        {doc.mimeType && (
                          <div className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">{doc.mimeType}</div>
                        )}
                      </div>
                      <ArrowSquareOutIcon
                        size={16}
                        className="gba:text-muted-foreground gba:shrink-0 gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity"
                      />
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

/**
 * MultipleActivitiesContent - List view for multiple activities (fetches full details with documents)
 */
const MultipleActivitiesContent: React.FC<{
  activities: Activity[]
  accessToken: string
  'data-testid'?: string
}> = ({ activities, accessToken, 'data-testid': dataTestId }) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set([activities[0]?.id].filter(Boolean)))
  const [fullActivities, setFullActivities] = useState<Record<string, Activity>>({})
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
  const graphqlClient = useGraphQLClient(accessToken)

  const toggleExpanded = useCallback(
    async (id: string) => {
      const wasExpanded = expandedIds.has(id)

      setExpandedIds(prev => {
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
        } else {
          next.add(id)
        }
        return next
      })

      // Fetch full details with documents when expanding if not already loaded
      if (!wasExpanded && !fullActivities[id] && !loadingIds.has(id)) {
        setLoadingIds(prev => new Set(prev).add(id))
        try {
          const query = buildActivityByIdQuery(id)
          const result = await graphqlClient.request<{ salesActivity: Activity }>(query)
          setFullActivities(prev => ({ ...prev, [id]: result.salesActivity }))
        } catch (error) {
          console.error('Error fetching activity details:', error)
        } finally {
          setLoadingIds(prev => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
        }
      }
    },
    [expandedIds, fullActivities, loadingIds, graphqlClient]
  )

  return (
    <ScrollArea className="gba:h-full">
      <div className="gba:space-y-3 gba:py-4">
        {activities.map(activity => {
          const fullActivity = fullActivities[activity.id] || activity
          const isLoading = loadingIds.has(activity.id)

          return (
            <div key={activity.id} className="gba:relative">
              <ActivityCard
                activity={fullActivity}
                expanded={expandedIds.has(activity.id)}
                onToggle={() => toggleExpanded(activity.id)}
                data-testid={`${dataTestId || DATA_TEST_ID_PREFIX}-activity-${activity.id}`}
              />
              {isLoading && expandedIds.has(activity.id) && (
                <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center gba:bg-background/50 gba:rounded">
                  <Spinner size="sm" />
                </div>
              )}
            </div>
          )
        })}
        <div className="gba:h-4" />
      </div>
    </ScrollArea>
  )
}

/**
 * SingleActivityContent - Full detail view for single activity
 */
const SingleActivityContent: React.FC<{
  activity: Activity
  'data-testid'?: string
}> = ({ activity, 'data-testid': dataTestId }) => (
  <ScrollArea className="gba:h-full">
    <div className="gba:py-4">
      <ActivityCard activity={activity} expanded={true} data-testid={dataTestId} />
      <div className="gba:h-4" />
    </div>
  </ScrollArea>
)

/**
 * ActivityDetailSheet - Sheet component for displaying activity details
 * Supports both single activity and multiple activities modes
 */
export const ActivityDetailSheet: React.FC<ActivityDetailSheetProps> = ({
  activityId,
  activities: providedActivities,
  date,
  open,
  onOpenChange,
  accessToken,
  'data-testid': dataTestId
}) => {
  const [fetchedActivity, setFetchedActivity] = useState<Activity | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  const isMultipleMode = providedActivities && providedActivities.length > 0
  const isSingleMode = activityId && !isMultipleMode

  // Fetch single activity when activityId is provided
  const fetchActivity = useCallback(async () => {
    if (!activityId) return

    setIsLoading(true)
    setError(null)
    try {
      const query = buildActivityByIdQuery(activityId)
      const result = await graphqlClient.request<{ salesActivity: Activity }>(query)
      setFetchedActivity(result.salesActivity)
    } catch (err) {
      console.error('Error fetching activity details:', err)
      setError(err instanceof Error ? err.message : 'Failed to load activity details')
    } finally {
      setIsLoading(false)
    }
  }, [activityId, graphqlClient])

  useEffect(() => {
    if (open && isSingleMode) {
      fetchActivity()
    }
  }, [activityId, open, isSingleMode, fetchActivity])

  const handleRetry = () => {
    fetchActivity()
  }

  // Determine header title
  const getHeaderTitle = () => {
    if (isMultipleMode) {
      return date ? `Activities - ${date}` : `${providedActivities.length} Activities`
    }
    if (fetchedActivity) {
      return fetchedActivity.title
    }
    return 'Activity Details'
  }

  // Render content based on mode
  const renderContent = () => {
    // Multiple activities mode
    if (isMultipleMode) {
      return (
        <MultipleActivitiesContent activities={providedActivities} accessToken={accessToken} data-testid={dataTestId} />
      )
    }

    // Single activity mode with loading/error states
    if (isSingleMode) {
      if (isLoading) {
        return (
          <div className="gba:flex gba:justify-center gba:items-center gba:py-12">
            <Spinner size="lg" />
          </div>
        )
      }

      if (error) {
        return (
          <div className="gba:p-4">
            <Alert variant="destructive" className="gba:mb-4">
              <div className="gba:flex gba:flex-col gba:gap-2">
                <h3 className="gba:text-lg gba:font-semibold">Error Loading Activity</h3>
                <p className="gba:text-sm">{error}</p>
                <Button onClick={handleRetry} variant="outline" size="sm" className="gba:mt-2 gba:w-fit">
                  Retry
                </Button>
              </div>
            </Alert>
          </div>
        )
      }

      if (fetchedActivity) {
        return <SingleActivityContent activity={fetchedActivity} data-testid={dataTestId} />
      }
    }

    return <div className="gba:p-4 gba:text-center gba:text-muted-foreground">No activity selected</div>
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={getHeaderTitle()}>
      <SheetContent className="gba:w-[500px]! gba:sm:w-[500px]! gba:max-w-[90vw]! gba:p-0 gba:flex gba:flex-col">
        <SheetHeader className="gba:px-6 gba:py-6 gba:border-b gba:border-border gba:shrink-0">
          <SheetTitle className="gba:text-xl gba:font-semibold gba:text-left">{getHeaderTitle()}</SheetTitle>
        </SheetHeader>
        <div className="gba:flex-1 gba:overflow-hidden gba:px-6">{renderContent()}</div>
      </SheetContent>
    </Sheet>
  )
}

export default ActivityDetailSheet
