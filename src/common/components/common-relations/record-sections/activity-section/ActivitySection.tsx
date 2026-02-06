import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Spinner, TimelineLayout, Button, Alert, EmptyState } from '@newwork/nw-design-system'
import {
  PhoneIcon,
  EnvelopeIcon,
  CalendarBlankIcon,
  UserIcon,
  PlusIcon,
  DotsThreeVerticalIcon
} from '@phosphor-icons/react'
import dayjs from 'dayjs'
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu'
import type { AppActionCommonProps } from '@/common/hooks/useAppActionData'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { handleDocumentClick as handleDocumentClickUtil } from '@/common/utils/documentClickHandler'
import { getDocumentIcon } from '@/common/utils/documentIconUtils'
import { FileInfo } from '@/common/types/FileTypes'
import type { Activity } from '@/common/data/relations/types/activityTypes'

export type ActivityDocument = {
  id: string
  name: string
  mimeType?: string
  fileSize?: number
  file?: string
  fileInfo?: FileInfo
}

export type ActivityItem = {
  id: string
  title: string
  description?: string
  occurredAt?: string
  createdAt?: string
  ownerEmployee?: {
    id?: string
    displayName?: string
    firstName?: string
    lastName?: string
    pictureThumbnail?: string
  }
  createdBy?: string
  activityType?: {
    id?: string
    code?: string
    value?: string
    type?: string
  }
  documents?: ActivityDocument[]
}

export interface ActivitySectionProps extends BusinessAppContextProps {
  activities?: Activity[]
  activitiesLoading?: boolean
  activitiesError?: string | null
  onReloadActivities?: () => void
  activitySectionActionProps?: Omit<AppActionCommonProps, 'accessToken'>
  activityEntityActionProps?: Omit<AppActionCommonProps, 'accessToken'>
  className?: string
  alignment?: 'left' | 'right'
}

// Standard React component that can be used with SectionWrapper
const ActivitySection: React.FC<ActivitySectionProps> = props => {
  const {
    accessToken,
    activities: rawActivities = [],
    activitiesLoading = false,
    activitiesError = null,
    onReloadActivities,
    activityEntityActionProps,
    className,
    alignment = 'left'
  } = props

  // Process activities - map from Activity to ActivityItem
  const processedActivities = useMemo(() => {
    if (!rawActivities || rawActivities.length === 0) return []

    return rawActivities.map((activity: Activity) => ({
      id: activity.id,
      title: activity.title || 'Untitled Activity',
      description: activity.description || '',
      occurredAt: activity.occurredAt || activity.createdAt,
      createdAt: activity.createdAt,
      ownerEmployee: activity.ownerEmployee,
      createdBy: activity.ownerEmployee
        ? `${activity.ownerEmployee.firstName || ''} ${activity.ownerEmployee.lastName || ''}`.trim() ||
          activity.ownerEmployee.displayName
        : undefined,
      activityType: activity.activityType,
      documents: activity.documents || []
    }))
  }, [rawActivities])

  // Handle document download
  const handleDocumentClick = async (document: ActivityDocument, e: React.MouseEvent) => {
    e.stopPropagation()
    await handleDocumentClickUtil(document, accessToken, { showToast: true })
  }

  const getActivityIcon = (activityType: string) => {
    switch (activityType?.toLowerCase()) {
      case 'call':
        return (props: any) => <PhoneIcon weight="bold" {...props} />
      case 'email':
        return (props: any) => <EnvelopeIcon weight="bold" {...props} />
      case 'meeting':
        return (props: any) => <CalendarBlankIcon weight="bold" {...props} />
      default:
        return (props: any) => <UserIcon weight="bold" {...props} />
    }
  }

  const getActivityTypeLabel = (activityType: any) => activityType?.value || 'Activity'
  const getOwnerName = (ownerEmployee: any) => {
    if (!ownerEmployee) return 'Unknown'

    // Use firstName + lastName first
    const fullName = `${ownerEmployee.firstName || ''} ${ownerEmployee.lastName || ''}`.trim()
    if (fullName) return fullName

    // Fallback to displayName
    return ownerEmployee.displayName || 'Unknown'
  }

  const handleEmployeeClick = (employeeId: string) => {
    navigateTo(buildPlatformUrl('/platform/hr/core/employees/employee-record', { employeeId }))
  }

  const renderContent = () => {
    if (activitiesLoading) {
      return (
        <div className="gba:flex gba:justify-center gba:py-8">
          <Spinner size="lg" />
        </div>
      )
    }

    if (activitiesError) {
      return (
        <Alert variant="destructive" data-testid="activity-error-alert">
          <div>
            <strong>
              {getTranslationFromI18nKeyAndLabel('crm.activities.errorTitle', 'Error loading activities')}
            </strong>
            <div>{activitiesError}</div>
            {onReloadActivities && (
              <Button variant="secondary" size="sm" onClick={onReloadActivities} data-testid="activity-retry-button">
                {getTranslationFromI18nKeyAndLabel('crm.common.retry', 'Retry')}
              </Button>
            )}
          </div>
        </Alert>
      )
    }

    if (processedActivities.length === 0) {
      return (
        <EmptyState
          type="no-data"
          title="No Activities"
          description="No activities yet. Create your first activity."
          data-testid="activity-section-empty-state"
        />
      )
    }

    return (
      <TimelineLayout
        items={processedActivities.map((activity: any) => {
          const activityTypeLabel = getActivityTypeLabel(activity.activityType)
          const ownerName = getOwnerName(activity.ownerEmployee)
          const description = activity.description

          const activityActions = activityEntityActionProps ? (
            <AppActionMenu
              accessToken={accessToken}
              contextsArray={activityEntityActionProps.contextsArray}
              externalContextData={{
                ...activityEntityActionProps.externalContextData,
                activityId: activity.id,
                activityType: activity.activityType?.value
              }}
              prefixDataTestId={`${activityEntityActionProps.prefixDataTestId}-${activity.id}`}
              deferMainContextRequestsUntilClick={true}
              emptyStateBehavior="enable"
            >
              <div
                className="gba:flex gba:items-center gba:justify-center gba:h-6 gba:w-6 gba:cursor-pointer gba:rounded gba:hover:bg-muted gba:transition-colors"
                data-testid={`activity-menu-${activity.id}`}
              >
                <DotsThreeVerticalIcon size={16} />
              </div>
            </AppActionMenu>
          ) : null

          return {
            id: activity.id,
            date: dayjs(activity.occurredAt).format('MMM D, YYYY h:mm A'),
            actor: activity.ownerEmployee ? (
              <a
                href={buildPlatformUrl('/platform/hr/core/employees/employee-record', {
                  employeeId: activity.ownerEmployee.id
                })}
                onClick={e => {
                  e.preventDefault()
                  handleEmployeeClick(activity.ownerEmployee.id)
                }}
                className="gba:font-medium gba:text-primary gba:hover:underline gba:cursor-pointer"
              >
                {ownerName}
              </a>
            ) : undefined,
            title: (
              <div className="gba:flex gba:items-center gba:justify-between gba:w-full">
                <span className="gba:flex-1 gba:truncate">{activity.title}</span>
                {activityActions}
              </div>
            ),
            description: (
              <div className="gba:flex gba:flex-col gba:gap-2">
                {description && <span>{description}</span>}
                {activity.documents && activity.documents.length > 0 && (
                  <div className="gba:flex gba:flex-wrap gba:gap-2">
                    {activity.documents.map((doc: ActivityDocument) => (
                      <button
                        key={doc.id}
                        onClick={e => handleDocumentClick(doc, e)}
                        className="gba:flex gba:items-center gba:gap-1 gba:px-2 gba:py-1 gba:text-xs gba:bg-muted gba:rounded gba:hover:bg-accent gba:transition-colors"
                        data-testid={`activity-document-${activity.id}-${doc.id}`}
                        title={doc.name}
                      >
                        {getDocumentIcon({ name: doc.name, mimeType: doc.mimeType, size: 14 })}
                        <span className="gba:truncate gba:max-w-[150px]">{doc.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ),
            icon: getActivityIcon(activityTypeLabel)
          } as any
        })}
        variant="default"
        orientation="vertical"
        alignment={alignment}
        className="gba:w-full"
      />
    )
  }

  return (
    <div data-testid="activity-section-new-content" className={className}>
      {renderContent()}
    </div>
  )
}

// Static properties for SectionWrapper
;(ActivitySection as any).sectionTitle = 'Activities'
;(ActivitySection as any).getActionButtonConfig = (_pageData: any, _pageIndex: number, props: ActivitySectionProps) => {
  const { accessToken, activitySectionActionProps } = props

  if (!activitySectionActionProps || !accessToken) {
    return null
  }

  return {
    type: 'AppAction' as const,
    config: {
      contextsArray: activitySectionActionProps.contextsArray,
      externalContextData: activitySectionActionProps.externalContextData,
      prefixDataTestId: activitySectionActionProps.prefixDataTestId,
      emptyStateBehavior: activitySectionActionProps.emptyStateBehavior || 'enable',
      children: (
        <Button data-testid="add-activity-button" variant="secondary" size="icon">
          <PlusIcon />
        </Button>
      )
    }
  }
}

export default ActivitySection
