'use client'

import React from 'react'
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
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@newwork/nw-design-system'
import {
  CalendarIcon,
  UserIcon,
  ArrowSquareOutIcon,
  TagIcon,
  LinkIcon,
  ClockCounterClockwiseIcon,
  TextAlignLeftIcon,
  FileTextIcon,
  DotsThreeVerticalIcon,
  Icon as PhosphorIcon
} from '@phosphor-icons/react'
import { Activity, ActivityDocument } from './types'
import { buildFileUrl, getFileIcon } from '@/common/utils/fileUtils'
import {
  getActivityTypeBadgeVariant,
  getReferenceTypeBadgeVariant,
  getActivityReferenceType,
  getActivityReferenceName
} from './utils'
import dayjs from 'dayjs'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'

interface ActivityDetailSheetProps {
  activity: Activity | null
  open: boolean
  onOpenChange: (open: boolean) => void
  buildReferenceUrl?: (entityType: string, entityId: string) => string
  'data-testid'?: string
  accessToken?: string
  flowContext?: FlowContextName
}

const DATA_TEST_ID_PREFIX = 'ActivityDetailSheet'

interface FieldRowProps {
  icon: PhosphorIcon
  label: string
  children: React.ReactNode
  testId?: string
}

const FieldRow: React.FC<FieldRowProps> = ({ icon: IconComponent, label, children, testId }) => (
  <div className="gba:flex gba:items-start gba:gap-3 gba:py-2" data-testid={testId}>
    <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-[100px] gba:text-sm gba:text-muted-foreground">
      <IconComponent size={14} className="gba:text-muted-foreground" />
      <span>{label}</span>
    </div>
    <div className="gba:flex-1">{children}</div>
  </div>
)

const getInitials = (firstName: string, lastName: string): string => {
  const first = firstName?.charAt(0)?.toUpperCase() || ''
  const last = lastName?.charAt(0)?.toUpperCase() || ''
  return `${first}${last}` || '??'
}

/**
 * ActivityDetailSheet with integrated Sheet component
 * Displays detailed activity information in a slide-out panel
 */
export const ActivityDetailSheet: React.FC<ActivityDetailSheetProps> = ({
  activity,
  open,
  onOpenChange,
  buildReferenceUrl,
  'data-testid': dataTestId,
  accessToken,
  flowContext
}) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Activity Details">
      <SheetContent className="gba:!w-[500px] gba:sm:!w-[500px] gba:!max-w-[90vw] gba:p-0 gba:flex gba:flex-col">
        <SheetHeader className="gba:px-6 gba:py-6 gba:border-b gba:border-border gba:shrink-0">
          <SheetTitle className="gba:text-xl gba:font-semibold gba:text-left gba:mb-3">
            {activity?.title || 'Activity Details'}
          </SheetTitle>
          {accessToken && flowContext && activity && (
            <div className="gba:flex gba:justify-end">
              <AppAction
                contexts={[{ context: flowContext, contextData: { activityId: activity.id } }]}
                accessToken={accessToken}
                mode="button"
                buttonSize="sm"
                buttonVariant="outline"
                emptyState="enable"
                lazyLoad
                prefixDataTestId={`${dataTestId || DATA_TEST_ID_PREFIX}-actions`}
                data-testid={`${dataTestId || DATA_TEST_ID_PREFIX}-actions-button`}
              >
                <DotsThreeVerticalIcon size={16} className="gba:mr-2" />
                Actions
              </AppAction>
            </div>
          )}
        </SheetHeader>
        <div className="gba:flex-1 gba:overflow-hidden gba:px-6">
          {activity ? (
            <ActivityDetailContent activity={activity} buildReferenceUrl={buildReferenceUrl} data-testid={dataTestId} />
          ) : (
            <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:text-muted-foreground">
              No activity selected
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

interface ActivityDetailContentProps {
  activity: Activity
  buildReferenceUrl?: (entityType: string, entityId: string) => string
  'data-testid'?: string
}

const ActivityDetailContent: React.FC<ActivityDetailContentProps> = ({
  activity,
  buildReferenceUrl,
  'data-testid': dataTestId
}) => {
  const activityType = activity.activityType?.value || 'Activity'
  const referenceType = getActivityReferenceType(activity)
  const referenceName = getActivityReferenceName(activity)
  const hasReference = activity.accountId || activity.contactId || activity.leadId || activity.opportunityId

  const handleDocumentClick = (doc: ActivityDocument) => {
    if (doc.fileInfo) {
      try {
        const fullUrl = buildFileUrl(doc.fileInfo)
        window.open(fullUrl, '_blank', 'noopener,noreferrer')
      } catch (error) {
        console.error('Error building file URL:', error)
      }
    }
  }

  const handleReferenceClick = () => {
    let url: string | null = null

    if (activity.accountId) {
      url = buildReferenceUrl
        ? buildReferenceUrl('account', activity.accountId)
        : buildPlatformUrl('/platform/crm/account-record', { accountId: activity.accountId })
    } else if (activity.contactId) {
      url = buildReferenceUrl
        ? buildReferenceUrl('contact', activity.contactId)
        : buildPlatformUrl('/platform/crm/contact-record', { contactId: activity.contactId })
    } else if (activity.leadId) {
      url = buildReferenceUrl
        ? buildReferenceUrl('lead', activity.leadId)
        : buildPlatformUrl('/platform/crm/lead-record', { leadId: activity.leadId })
    } else if (activity.opportunityId) {
      url = buildReferenceUrl
        ? buildReferenceUrl('opportunity', activity.opportunityId)
        : buildPlatformUrl('/platform/crm/opportunity-record', { opportunityId: activity.opportunityId })
    }

    if (url) {
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
    <ScrollArea className="gba:h-full">
      <div className="gba:py-6 gba:space-y-6">
        {/* Header Card */}
        <Card>
          <CardHeader>
            <CardTitle className="gba:text-base">Overview</CardTitle>
          </CardHeader>
          <CardContent className="gba:space-y-3">
            {/* Activity Type */}
            <FieldRow icon={TagIcon} label="Type" testId={`${dataTestId || DATA_TEST_ID_PREFIX}-type`}>
              <Badge variant={getActivityTypeBadgeVariant(activityType) as any}>{activityType}</Badge>
            </FieldRow>

            {/* Reference */}
            <FieldRow icon={LinkIcon} label="Reference" testId={`${dataTestId || DATA_TEST_ID_PREFIX}-reference`}>
              {hasReference ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer hover:gba:bg-accent gba:rounded gba:p-1 gba:-m-1 gba:transition-colors gba:border-0 gba:bg-transparent gba:min-w-0 gba:max-w-full"
                      onClick={handleReferenceClick}
                      data-testid={`${dataTestId || DATA_TEST_ID_PREFIX}-reference-link`}
                    >
                      <Badge
                        variant={getReferenceTypeBadgeVariant(referenceType.toLowerCase()) as any}
                        className="gba:shrink-0"
                      >
                        {referenceType}
                      </Badge>
                      <span className="gba:text-sm gba:font-medium gba:truncate">{referenceName}</span>
                      <ArrowSquareOutIcon size={12} className="gba:text-muted-foreground gba:shrink-0" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>View {referenceType.toLowerCase()} record</TooltipContent>
                </Tooltip>
              ) : (
                <Badge variant="outline">General</Badge>
              )}
            </FieldRow>

            {/* Owner Employee (also shown as Created By since they're the same) */}
            {activity.ownerEmployee && (
              <FieldRow icon={UserIcon} label="Created By" testId={`${dataTestId || DATA_TEST_ID_PREFIX}-owner`}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer hover:gba:bg-accent gba:rounded gba:p-1 gba:-m-1 gba:transition-colors gba:border-0 gba:bg-transparent gba:min-w-0 gba:max-w-full"
                      onClick={handleOwnerClick}
                      data-testid={`${dataTestId || DATA_TEST_ID_PREFIX}-owner-link`}
                    >
                      <Avatar size="sm" className="gba:size-6 gba:shrink-0">
                        {activity.ownerEmployee.pictureThumbnail && (
                          <AvatarImage
                            src={`data:image/gif;base64,${activity.ownerEmployee.pictureThumbnail}`}
                            alt={
                              activity.ownerEmployee.displayName ||
                              `${activity.ownerEmployee.firstName} ${activity.ownerEmployee.lastName}`
                            }
                          />
                        )}
                        <AvatarFallback className="gba:text-xs">
                          {getInitials(activity.ownerEmployee.firstName || '', activity.ownerEmployee.lastName || '')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="gba:text-sm gba:font-medium gba:truncate">
                        {activity.ownerEmployee.displayName ||
                          `${activity.ownerEmployee.firstName || ''} ${activity.ownerEmployee.lastName || ''}`.trim() ||
                          'Unknown'}
                      </span>
                      <ArrowSquareOutIcon size={12} className="gba:text-muted-foreground gba:shrink-0" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>View employee profile</TooltipContent>
                </Tooltip>
              </FieldRow>
            )}

            {/* Created Date */}
            <FieldRow icon={CalendarIcon} label="Created" testId={`${dataTestId || DATA_TEST_ID_PREFIX}-created`}>
              <span className="gba:text-sm gba:text-foreground">
                {dayjs(activity.createdAt).format('MMM D, YYYY h:mm A')}
              </span>
            </FieldRow>

            {/* Occurred Date */}
            {activity.occurredAt && (
              <FieldRow
                icon={ClockCounterClockwiseIcon}
                label="Occurred"
                testId={`${dataTestId || DATA_TEST_ID_PREFIX}-occurred`}
              >
                <span className="gba:text-sm gba:text-foreground">
                  {dayjs(activity.occurredAt).format('MMM D, YYYY h:mm A')}
                </span>
              </FieldRow>
            )}
          </CardContent>
        </Card>

        {/* Description */}
        {activity.description && (
          <Card>
            <CardHeader>
              <CardTitle className="gba:text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="gba:flex gba:items-start gba:gap-3">
                <TextAlignLeftIcon size={14} className="gba:text-muted-foreground gba:mt-0.5" />
                <p className="gba:text-sm gba:text-foreground gba:whitespace-pre-wrap gba:flex-1">
                  {activity.description}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documents */}
        {activity.documents && activity.documents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
                <FileTextIcon size={16} />
                Documents ({activity.documents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="gba:space-y-2">
                {activity.documents.map(doc => {
                  const FileIcon = getFileIcon(doc.mimeType)
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => handleDocumentClick(doc)}
                      className="gba:w-full gba:flex gba:items-center gba:gap-3 gba:p-3 gba:bg-muted gba:rounded gba:hover:bg-accent gba:transition-colors gba:border-0 gba:text-left gba:group"
                      data-testid={`${dataTestId || DATA_TEST_ID_PREFIX}-document-${doc.id}`}
                    >
                      <div className="gba:flex gba:items-center gba:justify-center gba:size-8 gba:bg-background gba:rounded gba:shrink-0">
                        <FileIcon size={16} />
                      </div>
                      <div className="gba:flex-1 gba:min-w-0">
                        <div className="gba:text-sm gba:font-medium gba:truncate">{doc.name}</div>
                        {doc.mimeType && <div className="gba:text-xs gba:text-muted-foreground">{doc.mimeType}</div>}
                      </div>
                      <ArrowSquareOutIcon
                        size={16}
                        className="gba:text-muted-foreground gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity gba:shrink-0"
                      />
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  )
}

export default ActivityDetailSheet
