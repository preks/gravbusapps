import React, { useMemo, useState, useEffect } from 'react'
import { useQuickAddSubmitGuard } from '@/common/components/common-relations/record-sections/utils/quickAddSubmitGuard'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Spinner, TimelineLayout, Button, Alert, EmptyState, useTranslation } from '@newwork/nw-design-system'
import { PhoneIcon, EnvelopeIcon, CalendarBlankIcon, UserIcon, PlusIcon } from '@phosphor-icons/react'
import dayjs from 'dayjs'
import { AppActionProvider } from '@/components/app-action-provider/AppActionProvider'
import type { AppActionCommonProps } from '@/common/hooks/useAppActionData'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import translations from './_i18n'
import { handleDocumentClick as handleDocumentClickUtil } from '@/common/utils/documentClickHandler'
import { getDocumentIcon } from '@/common/utils/documentIconUtils'
import { FileInfo } from '@/common/types/FileTypes'
import type { Activity } from '@/common/data/relations/types/activityTypes'
import { compareActivitiesByOccurredAtDesc } from '@/common/data/relations/utils/activityOccurredAtSort'
import { ActivityInput } from './ActivityInput'
import { ActivityEmailBody } from './ActivityEmailBody'
import { ActivityRelatedEntityHints } from './ActivityRelatedEntityHints'
import {
  getActivityRelatedEntities,
  type ActivityWithInvestment,
  type ActivityRelatedEntityKind
} from './getActivityRelatedEntities'
import { AppAction } from '@/components/app-action'
import { useEmployeeSearch } from '@/common/data/employee/useEmployeeSearch'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActivityAssociationFields } from '@/common/components/common-relations/activity-association'
import type { ActivityAssociationVariant } from '@/common/components/common-relations/activity-association/types'
import {
  buildAssociationEntityOptions,
  getQuickActivityDefaultValues,
  mapQuickActivityFormToPayload,
  quickActivitySchema,
  resolveActivityAssociationVariant,
  seedQuickActivityPrimaryEntity,
  type QuickActivityFormValues
} from './activityQuickAddFormUtils'
import { useRecordSectionsRefresh } from '../RecordSectionsRefreshContext'

export type ActivityDocument = {
  id: string
  name: string
  mimeType?: string | null
  fileSize?: number | null
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
  /** Catalog identifier for activity type (e.g. from customerCatalogs or investmentCatalogs). */
  activityTypeCatalog?: string
  /** Optional payload builder; when set, quick-add submit passes built payload to executeAction instead of raw form shape. */
  buildActivityPayload?: (activity: Record<string, any>) => Record<string, any>
  accountId?: string
  contactId?: string
  opportunityId?: string
  leadId?: string
  investmentId?: string
  /**
   * When true, shows chips for every linked entity, including the one that matches the current record context.
   * When false or omitted, omits chips that duplicate the section context (accountId, contactId, etc.).
   */
  showAllRelatedEntityChips?: boolean
  /** Record URLs for linked entities; parent supplies CRM vs IRM paths. Omitted hrefs render non-clickable chips. */
  getRelatedRecordUrl?: (kind: ActivityRelatedEntityKind, id: string) => string | undefined
  /** Optional pre-submit handler (e.g. uploads _pendingFiles and returns data with documents). When set, called before buildActivityPayload/executeAction. */
  preSubmit?: (data: Record<string, any>) => Promise<Record<string, any>>
  /**
   * When set, renders optional secondary account/contact/investment pickers in quick add (same as full activity form).
   * Inferred from `buildActivityPayload` when omitted (customer vs investment builders).
   */
  activityAssociationVariant?: ActivityAssociationVariant
}

// Standard React component that can be used with SectionWrapper
const ActivitySection: React.FC<ActivitySectionProps> = props => {
  const refreshRecordSections = useRecordSectionsRefresh()
  const {
    accessToken,
    userInfo,
    activities: rawActivities = [],
    activitiesLoading = false,
    activitiesError = null,
    onReloadActivities,
    activityEntityActionProps,
    activitySectionActionProps,
    className,
    alignment = 'left',
    activityTypeCatalog,
    buildActivityPayload,
    accountId,
    contactId,
    opportunityId,
    leadId,
    investmentId,
    showAllRelatedEntityChips,
    getRelatedRecordUrl,
    activityAssociationVariant: activityAssociationVariantProp
  } = props
  const reloadActivities = refreshRecordSections ?? onReloadActivities

  const recordEntityContext = useMemo(
    () => ({ accountId, contactId, opportunityId, leadId, investmentId }),
    [accountId, contactId, opportunityId, leadId, investmentId]
  )

  const activityAssociationVariant = useMemo(
    () => resolveActivityAssociationVariant(activityAssociationVariantProp, buildActivityPayload),
    [activityAssociationVariantProp, buildActivityPayload]
  )

  const associationEntityOptions = useMemo(
    () => buildAssociationEntityOptions(recordEntityContext),
    [recordEntityContext]
  )

  const { t } = useTranslation(translations)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const { isSubmitting: isQuickAddSubmitting, runGuarded: runQuickAddGuarded } = useQuickAddSubmitGuard()
  const [ownerPrefill, setOwnerPrefill] = useState<
    Array<{
      id: string
      displayName: string
      userId?: string
      pictureThumbnail?: string
      organizationalUnitName?: string
      jobPositionName?: string
    }>
  >([])

  const currentEmployeeId = userInfo?.employeeDetails?.employeeId

  // Employee search for owner selection
  const {
    employees,
    loading: employeesLoading,
    search,
    hydrateById,
    hasMore,
    loadMore
  } = useEmployeeSearch(accessToken)

  // Prefill current user as default owner
  useEffect(() => {
    const employeeId = props.userInfo?.employeeDetails?.employeeId
    if (!employeeId) return

    const displayName =
      `${props.userInfo?.employeeDetails?.firstName || ''} ${props.userInfo?.employeeDetails?.lastName || ''}`.trim() ||
      props.userInfo?.userName ||
      'Current User'

    // Set basic prefill immediately
    setOwnerPrefill([
      {
        id: employeeId,
        displayName,
        organizationalUnitName: props.userInfo?.employeeDetails?.organizationalUnit?.name
      }
    ])

    // Hydrate to get full details (picture, job position)
    hydrateById(employeeId)

    // Trigger initial search to load all employees
    search('')
  }, [
    props.userInfo?.employeeDetails?.employeeId,
    props.userInfo?.employeeDetails?.firstName,
    props.userInfo?.employeeDetails?.lastName,
    search,
    hydrateById
  ])

  // Merge prefilled owner with employees (employees from hook already include hydrated data)
  const mergedEmployees = useMemo(() => {
    const map = new Map<string, any>()
    // Add prefill first (will be overwritten by full data from employees)
    for (const o of ownerPrefill) {
      map.set(o.id, o)
    }
    // Add/override with full employee data
    for (const e of employees) {
      map.set(e.id, e)
    }
    return Array.from(map.values())
  }, [ownerPrefill, employees])

  const defaultOwnerId = props.userInfo?.employeeDetails?.employeeId || ''

  const form = useForm<QuickActivityFormValues>({
    resolver: zodResolver(quickActivitySchema),
    defaultValues: getQuickActivityDefaultValues(defaultOwnerId, recordEntityContext)
  })

  const associationFields = useMemo(() => {
    if (!activityAssociationVariant) {
      return null
    }
    return (
      <ActivityAssociationFields
        variant={activityAssociationVariant}
        accessToken={accessToken}
        entitySearchOptions={associationEntityOptions}
        data-testid="activity-quick-add-associations"
      />
    )
  }, [activityAssociationVariant, accessToken, associationEntityOptions])

  // Reset datetime and seed primary entity when quick add opens
  useEffect(() => {
    if (!showQuickAdd) {
      return
    }
    form.setValue('occurredAt', new Date().toISOString().slice(0, 16))
    if (props.userInfo?.employeeDetails?.employeeId) {
      form.setValue('ownerEmployeeId', props.userInfo.employeeDetails.employeeId)
    }
    seedQuickActivityPrimaryEntity(form, recordEntityContext)
  }, [showQuickAdd, form, props.userInfo, recordEntityContext])

  // Process activities - map from Activity to ActivityItem
  const processedActivities = useMemo(() => {
    if (!rawActivities || rawActivities.length === 0) return []

    const relatedContext = {
      accountId,
      contactId,
      opportunityId,
      leadId,
      investmentId,
      showAllRelatedEntityChips,
      getRelatedRecordUrl
    }

    return rawActivities
      .map((activity: Activity) => ({
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
        documents: activity.documents || [],
        emailMessageId: activity.additionalProperties?.emailMessageId || null,
        relatedEntities: getActivityRelatedEntities(activity as ActivityWithInvestment, relatedContext)
      }))
      .sort(compareActivitiesByOccurredAtDesc)
  }, [
    rawActivities,
    accountId,
    contactId,
    opportunityId,
    leadId,
    investmentId,
    showAllRelatedEntityChips,
    getRelatedRecordUrl
  ])

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
    navigateTo(buildPlatformUrl('/platform/employee-record', { employeeId }))
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
            <strong>{t('activities-errorTitle')}</strong>
            <div>{activitiesError}</div>
            {reloadActivities && (
              <Button variant="secondary" size="sm" onClick={reloadActivities} data-testid="activity-retry-button">
                {t('common-retry')}
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
          description={t('activities-emptyState')}
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
          const emailMessageId = activity.emailMessageId

          const activityActions = activityEntityActionProps ? (
            <AppAction
              variant="list-item"
              accessToken={accessToken}
              contextsArray={activityEntityActionProps.contextsArray}
              externalContextData={{
                ...activityEntityActionProps.externalContextData,
                activityId: activity.id,
                activityType: activity.activityType?.value
              }}
              prefixDataTestId={`${activityEntityActionProps.prefixDataTestId}-${activity.id}`}
            />
          ) : null

          return {
            id: activity.id,
            date: `${t('activities-timelineOccurred')}: ${dayjs(activity.occurredAt).format('MMM D, YYYY h:mm A')}`,
            actor: activity.ownerEmployee ? (
              <a
                href={buildPlatformUrl('/platform/employee-record', {
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
              <div className="gba:flex gba:flex-col gba:gap-1.5 gba:w-full gba:min-w-0">
                <ActivityRelatedEntityHints activityId={activity.id} entities={activity.relatedEntities} t={t} />
                <div className="gba:flex gba:items-center gba:justify-between gba:w-full gba:min-w-0">
                  <span className="gba:flex-1 gba:truncate">{activity.title}</span>
                  {activityActions}
                </div>
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
                {/* Inline email body for email-type activities */}
                {emailMessageId && accessToken && (
                  <ActivityEmailBody
                    emailMessageId={emailMessageId}
                    accessToken={accessToken}
                    isEmailOwner={
                      !!currentEmployeeId &&
                      !!activity.ownerEmployee?.id &&
                      currentEmployeeId === activity.ownerEmployee.id
                    }
                    data-testid={`activity-email-body-${activity.id}`}
                  />
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
      {activitySectionActionProps && !activitiesLoading && !activitiesError && (
        <div className="gba:mb-4">
          <AppActionProvider
            accessToken={accessToken}
            contextsArray={activitySectionActionProps.contextsArray}
            externalContextData={activitySectionActionProps.externalContextData}
            prefixDataTestId={activitySectionActionProps.prefixDataTestId}
            onSuccess={() => {
              form.reset(getQuickActivityDefaultValues(defaultOwnerId, recordEntityContext))
              setShowQuickAdd(false)
              refreshRecordSections?.()
            }}
            onError={(error: Error) => {
              console.error('Failed to create activity:', error)
            }}
            transformData={
              buildActivityPayload
                ? (data: any) => data
                : (data: any) => mapQuickActivityFormToPayload(data, recordEntityContext)
            }
          >
            {({ executeAction, isProcessing }) => {
              const handleSubmit = async (data: QuickActivityFormValues) => {
                if (isProcessing || isQuickAddSubmitting) {
                  return
                }
                await runQuickAddGuarded(async () => {
                  const mapped = mapQuickActivityFormToPayload(data, recordEntityContext)
                  let toBuild: Record<string, any> = mapped
                  if (props.preSubmit && mapped._pendingFiles?.length) {
                    toBuild = await props.preSubmit(mapped)
                  }
                  const payload = buildActivityPayload ? buildActivityPayload(toBuild) : toBuild
                  if (payload && '_pendingFiles' in payload) {
                    delete payload._pendingFiles
                  }
                  await executeAction(payload)
                })
              }
              return (
                <ActivityInput
                  form={form}
                  accessToken={accessToken}
                  employees={mergedEmployees}
                  employeesLoading={employeesLoading}
                  onEmployeeSearch={search}
                  employeesHasMore={hasMore}
                  onEmployeeLoadMore={loadMore}
                  onSubmit={handleSubmit}
                  isProcessing={isProcessing}
                  isSubmitting={isQuickAddSubmitting}
                  showQuickAdd={showQuickAdd}
                  onShowQuickAddChange={setShowQuickAdd}
                  activityTypeCatalog={activityTypeCatalog}
                  schema={quickActivitySchema}
                  associationFields={associationFields}
                />
              )
            }}
          </AppActionProvider>
        </div>
      )}
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
