import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import type { TaskReference } from '@/common/components/common-relations/detail-sheets/task-detail-sheet'
import { useCustomerActivities } from '@/common/data/customer/hooks/useCustomerActivities'
import { useCustomerTasks } from '@/common/data/customer/hooks/useCustomerTasks'
import { useCustomerNotes } from '@/common/data/customer/hooks/useCustomerNotes'
import AccountSection from '@/common/components/common-relations/record-sections/account-section/AccountSection'
import ContactSection from '@/common/components/common-relations/record-sections/contact-section/ContactSection'
import ActivitySection from '@/common/components/common-relations/record-sections/activity-section/ActivitySection'
import NoteSection from '@/common/components/common-relations/record-sections/note-section/NoteSection'
import TaskSection from '@/common/components/common-relations/record-sections/task-section/TaskSection'
import SectionWrapper from '@/common/components/common-relations/record-sections/section-card/SectionCard'
import { TASK_TYPE, TASK_PRIORITY, ACTIVITY_TYPE } from '@/common/data/customer/constants/customerCatalogs'
import {
  APPROVAL_TASK_TYPE_REF,
  FILE_CONTEXT,
  APP_NAME,
  getFileEntityFromType
} from '@/common/data/customer/constants/customerConstants'
import { buildCustomerTaskPayload } from '@/common/data/customer/types/customerTaskTypes'
import { buildCustomerActivityPayload } from '@/common/data/customer/types/customerActivityTypes'
import { buildCustomerNotePayload } from '@/common/data/customer/types/customerNoteTypes'
import { getReferenceEntityType } from '@/common/data/customer/utils/referenceEntityUtils'
import { createFormPreSubmitHandler } from '@/common/data/relations/utils/formPreSubmitUtils'
import { useFileClient } from '@/common/network/files/useFileClient'

interface HomeViewProps extends BusinessAppContextProps {
  accountId: string
  accountData: any
}

const HomeView: React.FC<HomeViewProps> = ({ accountId, accountData, ...props }) => {
  const fileClient = useFileClient({ accessToken: props.accessToken, userInfo: props.userInfo })
  const taskPreSubmit = useCallback(
    createFormPreSubmitHandler({
      userInfo: props.userInfo,
      fileClient,
      fileContext: FILE_CONTEXT.TASK,
      appName: APP_NAME,
      getFileEntityFromType,
      getReferenceEntityType,
      useCreatorFields: true
    }),
    [props.userInfo, fileClient]
  )
  const activityPreSubmit = useCallback(
    createFormPreSubmitHandler({
      userInfo: props.userInfo,
      fileClient,
      fileContext: FILE_CONTEXT.ACTIVITY,
      appName: APP_NAME,
      entityId: accountId,
      getFileEntityFromType,
      getReferenceEntityType,
      useCreatorFields: true
    }),
    [props.userInfo, fileClient, accountId]
  )
  const notePreSubmit = useCallback(
    createFormPreSubmitHandler({
      userInfo: props.userInfo,
      fileClient,
      fileContext: FILE_CONTEXT.NOTE,
      appName: APP_NAME,
      entityId: accountId,
      getFileEntityFromType,
      getReferenceEntityType,
      useCreatorFields: false
    }),
    [props.userInfo, fileClient, accountId]
  )

  // Data fetching hooks for CRM customer sections
  const { fetchCustomerActivitiesByAccountId } = useCustomerActivities(props)
  const { fetchCustomerTasksByAccountId } = useCustomerTasks(props)
  const { fetchCustomerNotesByAccountId } = useCustomerNotes(props)

  // State for section data
  const [activities, setActivities] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [approvals, setApprovals] = useState<any[]>([])
  const [sectionsLoading, setSectionsLoading] = useState(true)
  const [sectionsError, setSectionsError] = useState<string | null>(null)

  // Build reference URLs for CRM context
  const buildReferenceUrl = (reference: TaskReference): string => {
    switch (reference.type) {
      case 'lead':
        return buildPlatformUrl('/platform/crm/lead-record', { leadId: reference.id })
      case 'account':
        return buildPlatformUrl('/platform/crm/account-record', { accountId: reference.id })
      case 'contact':
        return buildPlatformUrl('/platform/crm/contact-record', { contactId: reference.id })
      case 'opportunity':
        return buildPlatformUrl('/platform/crm/opportunity-record', { opportunityId: reference.id })
      default:
        return ''
    }
  }

  // Load section data
  const loadSectionData = useCallback(async () => {
    if (!accountId || !props.accessToken) return

    setSectionsLoading(true)
    setSectionsError(null)

    try {
      const [activitiesData, notesData, tasksData] = await Promise.all([
        fetchCustomerActivitiesByAccountId(accountId),
        fetchCustomerNotesByAccountId(accountId),
        fetchCustomerTasksByAccountId(accountId)
      ])

      const sortedActivities = (activitiesData || []).sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      const sortedNotes = (notesData || []).sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      const sortedTasks = (tasksData || []).sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      // Separate regular tasks from approvals based on type catalog entry
      const regularTasks = sortedTasks.filter((task: any) => {
        const taskTypeCode = task?.taskType?.code || ''
        const taskTypeValue = task?.taskType?.value || ''
        return taskTypeCode?.toUpperCase() !== 'APPROVAL' && taskTypeValue?.toUpperCase() !== 'APPROVAL'
      })
      const approvalTasks = sortedTasks.filter((task: any) => {
        const taskTypeCode = task?.taskType?.code || ''
        const taskTypeValue = task?.taskType?.value || ''
        return taskTypeCode?.toUpperCase() === 'APPROVAL' || taskTypeValue?.toUpperCase() === 'APPROVAL'
      })

      setActivities(sortedActivities)
      setNotes(sortedNotes)
      setTasks(regularTasks)
      setApprovals(approvalTasks)
    } catch (error) {
      console.error('Error loading section data:', error)
      setSectionsError(
        error instanceof Error
          ? error.message
          : getTranslationFromI18nKeyAndLabel('crm.common.loadFailed', 'Failed to load data')
      )
    } finally {
      setSectionsLoading(false)
    }
  }, [
    accountId,
    props.accessToken,
    fetchCustomerActivitiesByAccountId,
    fetchCustomerNotesByAccountId,
    fetchCustomerTasksByAccountId
  ])

  // Load section data on mount
  useEffect(() => {
    loadSectionData()
  }, [loadSectionData])

  // Listen for process completion events to refresh section data
  useProcessCompletion({
    onSuccess: () => {
      loadSectionData()
    }
  })

  // Action props for sections - MUST be fully memoized to prevent infinite loops
  const activityActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.customerActivityCreate],
      externalContextData: {
        accountId,
        // Set current user as default owner
        ...(props.userInfo?.employeeDetails?.employeeId && {
          ownerEmployeeId: props.userInfo.employeeDetails.employeeId
        })
      },
      prefixDataTestId: 'account-activity',
      emptyStateBehavior: 'enable' as const
    }),
    [accountId, props.userInfo?.employeeDetails?.employeeId]
  )

  const activityEntityActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.customerActivityEntity],
      externalContextData: { accountId },
      prefixDataTestId: 'account-activity-entity',
      emptyStateBehavior: 'enable' as const
    }),
    [accountId]
  )

  const taskActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.customerTaskCreate],
      externalContextData: { accountId },
      prefixDataTestId: 'account-task',
      emptyStateBehavior: 'enable' as const
    }),
    [accountId]
  )

  const taskEntityActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.customerTaskEntity],
      externalContextData: { accountId },
      prefixDataTestId: 'account-task-entity',
      emptyStateBehavior: 'enable' as const
    }),
    [accountId]
  )

  const approvalActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.customerTaskCreate],
      externalContextData: {
        accountId,
        typeRef: APPROVAL_TASK_TYPE_REF,
        salesTask: { account: accountId, type: APPROVAL_TASK_TYPE_REF }
      },
      prefixDataTestId: 'account-approval',
      emptyStateBehavior: 'enable' as const
    }),
    [accountId]
  )

  const approvalEntityActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.customerTaskEntity],
      externalContextData: { accountId },
      prefixDataTestId: 'account-approval-entity',
      emptyStateBehavior: 'enable' as const
    }),
    [accountId]
  )

  const noteActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.customerNoteCreate],
      externalContextData: { accountId },
      prefixDataTestId: 'account-note',
      emptyStateBehavior: 'enable' as const
    }),
    [accountId]
  )

  const noteEntityActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.customerNoteEntity],
      externalContextData: { accountId },
      prefixDataTestId: 'account-note-entity',
      emptyStateBehavior: 'enable' as const
    }),
    [accountId]
  )

  return (
    <>
      {/* Account Section - 1/4 width */}
      <SectionWrapper
        className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-3 gba:lg:col-span-3 gba:row-span-1 gba:min-h-96 gba:max-h-96"
        sections={[
          {
            id: 'account-section',
            component: AccountSection,
            props: {
              ...props,
              account: accountData,
              accountId: accountId,
              actionButtonProps: {
                contextsArray: [FlowContextName.customerAccountEntity],
                externalContextData: { accountId },
                prefixDataTestId: 'account-account'
              }
            }
          }
        ]}
        data-testid="account-account-section-wrapper"
      />

      {/* Contact Section - 1/4 width */}
      <SectionWrapper
        className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-3 gba:lg:col-span-3 gba:row-span-1 gba:min-h-96 gba:max-h-96"
        sections={[
          {
            id: 'contact-section',
            component: ContactSection,
            props: {
              ...props,
              contacts:
                accountData?.accountContacts
                  ?.map((ac: any) => ({
                    ...ac.contact,
                    jobPosition: ac.contact?.jobTitle, // Map CRM jobTitle to jobPosition for ContactSection
                    contactType: ac.contactType
                  }))
                  .filter(Boolean) || [],
              contactId: accountData?.accountContacts?.[0]?.contact?.id || undefined,
              recordUrl: accountData?.accountContacts?.[0]?.contact?.id
                ? buildPlatformUrl('/platform/crm/contact-record', {
                    contactId: accountData.accountContacts[0].contact.id,
                    source: 'account-relations',
                    fromEntity: 'accounts'
                  })
                : undefined,
              actionButtonProps: {
                contextsArray: [FlowContextName.customerContactEntity],
                externalContextData: { accountId },
                prefixDataTestId: 'account-contact'
              }
            }
          }
        ]}
        data-testid="account-contact-section-wrapper"
      />

      {/* Activities & Notes Section - 1/2 width, spans 2 rows */}
      <SectionWrapper
        className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-6 gba:lg:col-span-6 gba:row-span-2 gba:min-h-196 gba:max-h-196"
        sections={[
          {
            id: 'activities-section',
            component: ActivitySection,
            props: {
              ...props,
              accountId,
              activities: activities,
              activitiesLoading: sectionsLoading,
              activitiesError: sectionsError,
              onReloadActivities: loadSectionData,
              alignment: 'right',
              activitySectionActionProps: activityActionProps,
              activityEntityActionProps: activityEntityActionProps,
              activityTypeCatalog: ACTIVITY_TYPE,
              buildActivityPayload: buildCustomerActivityPayload,
              preSubmit: activityPreSubmit
            }
          },
          {
            id: 'notes-section',
            component: NoteSection,
            props: {
              ...props,
              accountId,
              notes: notes,
              noteActionProps: noteActionProps,
              noteEntityActionProps: noteEntityActionProps,
              buildNotePayload: buildCustomerNotePayload,
              preSubmit: notePreSubmit,
              'data-testid': 'account-notes-section'
            }
          }
        ]}
        data-testid="account-activities-notes-section-wrapper"
      />

      {/* Tasks & Approvals - 1/2 width */}
      <SectionWrapper
        className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-6 gba:lg:col-span-6 gba:row-span-1 gba:min-h-96 gba:max-h-96"
        sections={[
          {
            id: 'tasks-section',
            component: TaskSection,
            props: {
              ...props,
              accountId,
              buildReferenceUrl,
              tasks: tasks,
              taskActionProps: taskActionProps,
              taskEntityActionProps: taskEntityActionProps,
              typeCatalog: TASK_TYPE,
              priorityCatalog: TASK_PRIORITY,
              buildTaskPayload: buildCustomerTaskPayload,
              defaultTaskStatusRef: 'SalesTaskStatus:v1:IN_PROGRESS',
              preSubmit: taskPreSubmit
            }
          },
          {
            id: 'approval-tasks-section',
            component: TaskSection,
            props: {
              ...props,
              accountId,
              sectionTitle: 'Approval Tasks',
              buildReferenceUrl,
              tasks: approvals,
              taskEntityActionProps: approvalEntityActionProps,
              taskActionProps: approvalActionProps,
              typeCatalog: TASK_TYPE,
              priorityCatalog: TASK_PRIORITY,
              buildTaskPayload: buildCustomerTaskPayload,
              isApprovalTaskSection: true,
              approvalTaskTypeRef: APPROVAL_TASK_TYPE_REF,
              defaultTaskStatusRef: 'SalesTaskStatus:v1:IN_PROGRESS',
              preSubmit: taskPreSubmit
            }
          }
        ]}
        data-testid="account-tasks-approvals-section-wrapper"
      />
    </>
  )
}

export { HomeView }
export default HomeView
