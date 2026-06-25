'use client'

import React, { useMemo } from 'react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Card,
  CardContent,
  CardDefaultVariantProvider,
  CardHeader,
  CardTitle,
  ScrollArea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import {
  CalendarIcon,
  UserIcon,
  LinkIcon,
  TagIcon,
  ClockCounterClockwiseIcon,
  TextAlignLeftIcon,
  FileTextIcon,
  Icon as PhosphorIcon,
  ArrowSquareOutIcon
} from '@phosphor-icons/react'
import { Activity, ActivityDocument } from './types'
import { handleDocumentClick as handleDocumentClickUtil } from '@/common/utils/documentClickHandler'
import { getDocumentIcon } from '@/common/utils/documentIconUtils'
import { getActivityTypeBadgeVariant } from './utils'
import dayjs from 'dayjs'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import activitySectionTranslations from '@/common/components/common-relations/record-sections/activity-section/_i18n'
import { ActivityRelatedEntityHints } from '@/common/components/common-relations/record-sections/activity-section/ActivityRelatedEntityHints'
import {
  getActivityRelatedEntities,
  type ActivityRelatedEntityKind,
  type ActivityWithInvestment
} from '@/common/components/common-relations/record-sections/activity-section/getActivityRelatedEntities'

const DATA_TEST_ID_PREFIX = 'ActivityDetailSheet'
const OVERVIEW_VALUE_MAX_WIDTH_CLASS = 'gba:max-w-[280px]'
const DESCRIPTION_MAX_WIDTH_CLASS = 'gba:max-w-[380px]'

interface FieldRowProps {
  icon: PhosphorIcon
  label: string
  children: React.ReactNode
  testId?: string
  align?: 'start' | 'center'
}

const FieldRow: React.FC<FieldRowProps> = ({ icon: IconComponent, label, children, testId, align = 'center' }) => {
  const alignmentClass = align === 'start' ? 'gba:items-start' : 'gba:items-center'

  return (
    <div className={`gba:flex ${alignmentClass} gba:gap-3 gba:py-2`} data-testid={testId}>
      <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-[100px] gba:text-sm gba:text-muted-foreground gba:shrink-0">
        <IconComponent size={14} className="gba:text-muted-foreground" />
        <span>{label}</span>
      </div>
      <div className="gba:flex-1 gba:min-w-0 gba:overflow-hidden">{children}</div>
    </div>
  )
}

const getInitials = (firstName: string, lastName: string): string => {
  const first = firstName?.charAt(0)?.toUpperCase() || ''
  const last = lastName?.charAt(0)?.toUpperCase() || ''
  return `${first}${last}` || '??'
}

export interface ActivityDetailContentProps {
  activity: Activity
  buildReferenceUrl?: (entityType: string, entityId: string) => string
  getRelatedRecordUrl?: (kind: ActivityRelatedEntityKind, id: string) => string | undefined
  'data-testid'?: string
  accessToken?: string
}

export const ActivityDetailContent: React.FC<ActivityDetailContentProps> = ({
  activity,
  buildReferenceUrl,
  getRelatedRecordUrl: getRelatedRecordUrlProp,
  'data-testid': dataTestId,
  accessToken
}) => {
  const { t } = useTranslation(activitySectionTranslations)

  const resolveRelatedRecordUrl = useMemo(() => {
    return (kind: ActivityRelatedEntityKind, id: string): string | undefined => {
      if (getRelatedRecordUrlProp) {
        const url = getRelatedRecordUrlProp(kind, id)
        return url && url.length > 0 ? url : undefined
      }
      const url = buildReferenceUrl?.(kind, id)
      return url && url.length > 0 ? url : undefined
    }
  }, [buildReferenceUrl, getRelatedRecordUrlProp])

  const relatedEntities = useMemo(
    () =>
      getActivityRelatedEntities(activity as ActivityWithInvestment, {
        getRelatedRecordUrl: resolveRelatedRecordUrl,
        showAllRelatedEntityChips: true
      }),
    [activity, resolveRelatedRecordUrl]
  )

  const activityType = activity.activityType?.value || 'Activity'

  const handleDocumentClick = async (doc: ActivityDocument) => {
    await handleDocumentClickUtil(doc, accessToken, { showToast: true })
  }

  const handleOwnerClick = () => {
    if (activity.ownerEmployeeId) {
      const url = buildPlatformUrl('/platform/employee-record', { employeeId: activity.ownerEmployeeId })
      navigateTo(url)
    }
  }

  return (
    <ScrollArea className="gba:h-full gba:w-full">
      {/* Match the task detail sheet: force the `surface` card variant (clean
          surface cards, not the flat gray bg-card) and the same width/spacing. */}
      <CardDefaultVariantProvider variant="surface">
        <div className="gba:space-y-4 gba:p-1">
          <Card>
            <CardHeader>
              <CardTitle className="gba:text-base">Overview</CardTitle>
            </CardHeader>
            <CardContent className="gba:space-y-3">
              <FieldRow icon={TagIcon} label="Type" testId={`${dataTestId || DATA_TEST_ID_PREFIX}-type`}>
                <Badge variant={getActivityTypeBadgeVariant(activityType) as any}>{activityType}</Badge>
              </FieldRow>

              <FieldRow
                icon={LinkIcon}
                label={t('activities-detail-related')}
                testId={`${dataTestId || DATA_TEST_ID_PREFIX}-related`}
                align="start"
              >
                {relatedEntities.length > 0 ? (
                  <div className={`gba:w-full gba:min-w-0 gba:overflow-hidden ${OVERVIEW_VALUE_MAX_WIDTH_CLASS}`}>
                    <ActivityRelatedEntityHints
                      activityId={activity.id}
                      entities={relatedEntities}
                      t={t}
                      transparentChips
                    />
                  </div>
                ) : (
                  <Badge variant="outline">{t('activities-detail-general')}</Badge>
                )}
              </FieldRow>

              {activity.ownerEmployee && (
                <FieldRow icon={UserIcon} label="Created By" testId={`${dataTestId || DATA_TEST_ID_PREFIX}-owner`}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className={`gba:flex gba:items-center gba:gap-2 gba:cursor-pointer hover:gba:bg-accent gba:rounded gba:p-1 gba:-m-1 gba:transition-colors gba:border-0 gba:bg-transparent gba:min-w-0 ${OVERVIEW_VALUE_MAX_WIDTH_CLASS}`}
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
                        <span className="gba:flex-1 gba:min-w-0 gba:truncate gba:text-sm gba:font-medium">
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

              <FieldRow icon={CalendarIcon} label="Created" testId={`${dataTestId || DATA_TEST_ID_PREFIX}-created`}>
                <span className="gba:text-sm gba:text-foreground">
                  {dayjs(activity.createdAt).format('MMM D, YYYY h:mm A')}
                </span>
              </FieldRow>

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

          {activity.description && (
            <Card>
              <CardHeader>
                <CardTitle className="gba:text-base">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="gba:flex gba:items-start gba:gap-3">
                  <TextAlignLeftIcon size={14} className="gba:text-muted-foreground gba:mt-0.5 gba:shrink-0" />
                  <p
                    className={`gba:block gba:flex-1 gba:min-w-0 ${DESCRIPTION_MAX_WIDTH_CLASS} gba:whitespace-normal gba:text-sm gba:text-foreground`}
                  >
                    {activity.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

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
                  {activity.documents.map(doc => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => handleDocumentClick(doc)}
                      className="gba:w-full gba:flex gba:items-center gba:gap-3 gba:p-3 gba:rounded gba:hover:bg-accent gba:transition-colors gba:border-0 gba:text-left gba:group"
                      data-testid={`${dataTestId || DATA_TEST_ID_PREFIX}-document-${doc.id}`}
                    >
                      <div className="gba:flex gba:items-center gba:justify-center gba:size-8 gba:bg-background gba:rounded gba:shrink-0">
                        {getDocumentIcon({ name: doc.name, mimeType: doc.mimeType, size: 16 })}
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
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </CardDefaultVariantProvider>
    </ScrollArea>
  )
}
