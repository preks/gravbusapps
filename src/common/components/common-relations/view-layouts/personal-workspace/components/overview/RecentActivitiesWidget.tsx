import React, { useMemo, useCallback } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  TimelineLayout,
  Spinner,
  EmptyState,
  useTranslation
} from '@newwork/nw-design-system'
import type { GenericActivity, PersonalWorkspaceConfig } from '../../types'
import dayjs from 'dayjs'
import { PhoneIcon, EnvelopeIcon, CalendarBlankIcon, UserIcon } from '@phosphor-icons/react'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { handleDocumentClick as handleDocumentClickUtil } from '@/common/utils/documentClickHandler'
import { getDocumentIcon } from '@/common/utils/documentIconUtils'
import activitySectionTranslations from '@/common/components/common-relations/record-sections/activity-section/_i18n'
import personalWorkspaceTranslations from '@/common/components/common-relations/view-layouts/personal-workspace/_i18n'
import { sortActivitiesByOccurredAtDesc } from '@/common/data/relations/utils/activityOccurredAtSort'
import { ActivityRelatedEntityHints } from '@/common/components/common-relations/record-sections/activity-section/ActivityRelatedEntityHints'
import {
  getActivityRelatedEntities,
  type ActivityWithInvestment
} from '@/common/components/common-relations/record-sections/activity-section/getActivityRelatedEntities'
import { createWorkspaceModuleRelatedRecordUrlResolver } from '@/common/utils/relatedEntityRecordUrls'

export interface RecentActivitiesWidgetProps {
  activities: GenericActivity[]
  loading: boolean
  config: PersonalWorkspaceConfig
  accessToken?: string
}

// Icon components for activity types
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

/**
 * Recent Activities on the personal workspace overview.
 * Timeline matches ActivitySection: all related-entity chips (no record context — every link shown).
 */
export const RecentActivitiesWidget: React.FC<RecentActivitiesWidgetProps> = ({
  activities,
  loading,
  config,
  accessToken
}) => {
  const { t } = useTranslation(activitySectionTranslations)
  const { t: tPersonalWorkspace } = useTranslation(personalWorkspaceTranslations)

  const getRelatedRecordUrl = useMemo(
    () => createWorkspaceModuleRelatedRecordUrlResolver(config.module),
    [config.module]
  )

  const getOwnerName = (ownerEmployee: any) => {
    if (!ownerEmployee) return 'Unknown'
    const fullName = `${ownerEmployee.firstName || ''} ${ownerEmployee.lastName || ''}`.trim()
    if (fullName) return fullName
    return ownerEmployee.displayName || 'Unknown'
  }

  const handleEmployeeClick = useCallback((employeeId: string) => {
    navigateTo(buildPlatformUrl('/platform/hr/core/employees/employee-record', { employeeId }))
  }, [])

  const handleDocumentClick = useCallback(
    async (document: any, e: React.MouseEvent) => {
      e.stopPropagation()
      await handleDocumentClickUtil(document, accessToken, { showToast: true })
    },
    [accessToken]
  )

  // Helper function to render activity documents - reduces nesting depth
  const renderActivityDocuments = useCallback(
    (activityId: string, documents: any[]) => {
      if (!documents || documents.length === 0) return null

      return (
        <div className="gba:flex gba:flex-wrap gba:gap-2">
          {documents.map((doc: any) => (
            <button
              key={doc.id}
              onClick={e => handleDocumentClick(doc, e)}
              className="gba:flex gba:items-center gba:gap-1 gba:px-2 gba:py-1 gba:text-xs gba:bg-muted gba:rounded gba:hover:bg-accent gba:transition-colors"
              data-testid={`activity-document-${activityId}-${doc.id}`}
              title={doc.name}
            >
              {getDocumentIcon({ name: doc.name, mimeType: doc.mimeType, size: 14 })}
              <span className="gba:truncate gba:max-w-[150px]">{doc.name}</span>
            </button>
          ))}
        </div>
      )
    },
    [handleDocumentClick]
  )

  const relatedEntitiesContext = useMemo(
    () => ({
      showAllRelatedEntityChips: true as const,
      getRelatedRecordUrl
    }),
    [getRelatedRecordUrl]
  )

  const timelineItems = useMemo(() => {
    const ordered = sortActivitiesByOccurredAtDesc(activities)

    return ordered.map(activity => {
      const activityTypeLabel = activity.activityType?.value || 'Activity'
      const ownerName = getOwnerName(activity.ownerEmployee)
      const effectiveAt = activity.occurredAt || activity.createdAt
      const relatedEntities = getActivityRelatedEntities(activity as ActivityWithInvestment, relatedEntitiesContext)

      return {
        id: activity.id,
        date: `${t('activities-timelineOccurred')}: ${dayjs(effectiveAt).format('MMM D, YYYY h:mm A')}`,
        actor: activity.ownerEmployee ? (
          <a
            href={buildPlatformUrl('/platform/hr/core/employees/employee-record', {
              employeeId: activity.ownerEmployee.id
            })}
            onClick={e => {
              e.preventDefault()
              handleEmployeeClick(activity.ownerEmployee?.id || '')
            }}
            className="gba:font-medium gba:text-primary hover:gba:underline gba:cursor-pointer"
          >
            {ownerName}
          </a>
        ) : undefined,
        title: (
          <div className="gba:flex gba:flex-col gba:gap-1.5 gba:w-full gba:min-w-0">
            <ActivityRelatedEntityHints activityId={activity.id} entities={relatedEntities} t={t} />
            <div className="gba:flex gba:items-center gba:w-full gba:min-w-0">
              <span className="gba:flex-1 gba:truncate">{activity.title}</span>
            </div>
          </div>
        ),
        description: (
          <div className="gba:flex gba:flex-col gba:gap-2">
            {activity.description && <span>{activity.description}</span>}
            {activity.documents && renderActivityDocuments(activity.id, activity.documents)}
          </div>
        ),
        icon: getActivityIcon(activityTypeLabel)
      } as any
    })
  }, [activities, handleEmployeeClick, renderActivityDocuments, relatedEntitiesContext, t])

  // Render content based on loading/data state
  const renderContent = () => {
    if (loading) {
      return (
        <div className="gba:flex gba:justify-center gba:py-8">
          <Spinner size="lg" />
        </div>
      )
    }

    if (activities.length === 0) {
      return (
        <EmptyState
          type="no-data"
          title={tPersonalWorkspace('personal-workspace-recent-activities-empty-title')}
          description={tPersonalWorkspace('personal-workspace-recent-activities-empty-description')}
          data-testid="recent-activities-empty-state"
        />
      )
    }

    return (
      <TimelineLayout
        items={timelineItems}
        variant="default"
        orientation="vertical"
        alignment="left"
        className="gba:w-full"
      />
    )
  }

  return (
    <Card data-testid="recent-activities-widget">
      <CardHeader>
        <CardTitle>{tPersonalWorkspace('personal-workspace-recent-activities-title')}</CardTitle>
      </CardHeader>

      <CardContent className="gba:p-0">
        {/* Fixed height container with scroll */}
        <div className="gba:h-[400px] gba:overflow-y-auto gba:px-6 gba:py-4">{renderContent()}</div>
      </CardContent>
    </Card>
  )
}

export default RecentActivitiesWidget
