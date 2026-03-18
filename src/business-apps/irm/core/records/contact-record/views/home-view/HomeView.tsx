import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { InvestmentContact } from '@/common/data/investment/types/investmentContactTypes'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import type { TaskReference } from '@/common/components/common-relations/detail-sheets/task-detail-sheet'
import {
  useGetInvestmentActivitiesByContactId,
  useGetInvestmentNotesByContactId,
  useGetInvestmentTasksByContactId
} from '@/common/data/investment/hooks/useInvestmentContacts'
import { useGetInvestmentsByContactId } from '@/common/data/investment/hooks/useInvestments'
import AccountSection from '@/common/components/common-relations/record-sections/account-section/AccountSection'
import ContactSection from '@/common/components/common-relations/record-sections/contact-section/ContactSection'
import InvestmentSection from '@/common/components/common-relations/record-sections/investment-section/InvestmentSection'
import ActivitySection from '@/common/components/common-relations/record-sections/activity-section/ActivitySection'
import NoteSection from '@/common/components/common-relations/record-sections/note-section/NoteSection'
import TaskSection from '@/common/components/common-relations/record-sections/task-section/TaskSection'
import SectionWrapper from '@/common/components/common-relations/record-sections/section-card/SectionCard'
import { TASK_TYPE, TASK_PRIORITY, ACTIVITY_TYPE } from '@/common/data/investment/constants/investmentCatalogs'
import {
  APPROVAL_TASK_TYPE_REF,
  FILE_CONTEXT,
  APP_NAME,
  getFileEntityFromType
} from '@/common/data/investment/constants/investmentConstants'
import { buildInvestmentTaskPayload } from '@/common/data/investment/types/investmentTaskTypes'
import { buildInvestmentActivityPayload } from '@/common/data/investment/types/investmentActivityTypes'
import { buildInvestmentNotePayload } from '@/common/data/investment/types/investmentNoteTypes'
import { getReferenceEntityType } from '@/common/data/investment/utils/referenceEntityUtils'
import { createFormPreSubmitHandler } from '@/common/data/relations/utils/formPreSubmitUtils'
import { useFileClient } from '@/common/network/files/useFileClient'

interface HomeViewProps extends BusinessAppContextProps {
  contactId: string
  contactData: InvestmentContact | undefined
}

const HomeView: React.FC<HomeViewProps> = ({ contactId, contactData, ...props }) => {
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
      entityId: contactId,
      getFileEntityFromType,
      getReferenceEntityType,
      useCreatorFields: true
    }),
    [props.userInfo, fileClient, contactId]
  )
  const notePreSubmit = useCallback(
    createFormPreSubmitHandler({
      userInfo: props.userInfo,
      fileClient,
      fileContext: FILE_CONTEXT.NOTE,
      appName: APP_NAME,
      entityId: contactId,
      getFileEntityFromType,
      getReferenceEntityType,
      useCreatorFields: false
    }),
    [props.userInfo, fileClient, contactId]
  )

  // Data fetching hooks for sections
  const { fetchInvestmentActivitiesByContactId } = useGetInvestmentActivitiesByContactId(props)
  const { fetchInvestmentNotesByContactId } = useGetInvestmentNotesByContactId(props)
  const { fetchInvestmentTasksByContactId } = useGetInvestmentTasksByContactId(props)
  const { fetchInvestmentsByContactId } = useGetInvestmentsByContactId(props)

  // State for section data
  const [activities, setActivities] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [approvals, setApprovals] = useState<any[]>([])
  const [investments, setInvestments] = useState<any[]>([])
  const [sectionsLoading, setSectionsLoading] = useState(true)
  const [sectionsError, setSectionsError] = useState<string | null>(null)

  // Extract account IDs from contact data
  const contactAccountIds = useMemo(() => {
    return (contactData?.accountContacts || []).map((ac: any) => ac.account?.id).filter(Boolean)
  }, [contactData])

  // Build reference URLs for IRM context
  const buildReferenceUrl = (reference: TaskReference): string => {
    switch (reference.type) {
      case 'lead':
        return buildPlatformUrl('/platform/irm/lead-record', { leadId: reference.id })
      case 'account':
        return buildPlatformUrl('/platform/irm/account-record', { accountId: reference.id })
      case 'contact':
        return buildPlatformUrl('/platform/irm/contact-record', { contactId: reference.id })
      case 'opportunity':
        return buildPlatformUrl('/platform/irm/opportunity-record', { opportunityId: reference.id })
      case 'investment':
        return buildPlatformUrl('/platform/irm/investment-record', { investmentId: reference.id })
      default:
        return ''
    }
  }

  // Load section data
  const loadSectionData = useCallback(async () => {
    if (!contactId || !props.accessToken) return

    setSectionsLoading(true)
    setSectionsError(null)

    try {
      const [activitiesData, notesData, tasksData, investmentsData] = await Promise.all([
        fetchInvestmentActivitiesByContactId(contactId),
        fetchInvestmentNotesByContactId(contactId),
        fetchInvestmentTasksByContactId(contactId),
        fetchInvestmentsByContactId(contactId, contactAccountIds)
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

      // Separate regular tasks from approvals based on taskType catalog entry
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
      setInvestments(investmentsData?.Investment || [])
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
    contactId,
    props.accessToken,
    contactAccountIds,
    fetchInvestmentActivitiesByContactId,
    fetchInvestmentNotesByContactId,
    fetchInvestmentTasksByContactId,
    fetchInvestmentsByContactId
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

  return (
    <>
      {/* Account Section - 1/4 width - EXACT MATCH TO LEAD */}
      <SectionWrapper
        className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-3 gba:lg:col-span-3 gba:row-span-1 gba:min-h-96 gba:max-h-96"
        sections={[
          {
            id: 'account-section',
            component: AccountSection,
            props: {
              ...props,
              accounts:
                contactData?.accountContacts
                  ?.map((ac: any) => ({
                    ...ac.account,
                    contactType: ac.contactType
                  }))
                  .filter(Boolean) || [],
              accountId: contactData?.accountContacts?.[0]?.account?.id,
              recordUrl: contactData?.accountContacts?.[0]?.account?.id
                ? buildPlatformUrl('/platform/irm/account-record', {
                    accountId: contactData.accountContacts[0].account.id,
                    source: 'contact-relations',
                    fromEntity: 'contacts'
                  })
                : undefined,
              actionButtonProps: {
                contextsArray: [FlowContextName.investmentAccountEntity],
                externalContextData: {
                  accountId: contactData?.accountContacts?.[0]?.account?.id
                },
                prefixDataTestId: 'contact-account'
              }
            }
          }
        ]}
        data-testid="contact-account-section-wrapper"
      />

      {/* Contact Section - 1/4 width - EXACT MATCH TO LEAD */}
      <SectionWrapper
        className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-3 gba:lg:col-span-3 gba:row-span-1 gba:min-h-96 gba:max-h-96"
        sections={[
          {
            id: 'contact-section',
            component: ContactSection,
            props: {
              ...props,
              contact: contactData,
              contactId: contactData?.id,
              actionButtonProps: {
                contextsArray: [FlowContextName.investmentContactEntity],
                externalContextData: { contactId: contactData?.id },
                prefixDataTestId: 'contact-contact'
              }
            }
          }
        ]}
        data-testid="contact-contact-section-wrapper"
      />

      {/* Investment Section - 1/2 width - EXACT MATCH TO LEAD */}
      <SectionWrapper
        className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-6 gba:lg:col-span-6 gba:row-span-1"
        sections={[
          {
            id: 'investment-section',
            component: InvestmentSection,
            props: {
              ...props,
              investments: investments,
              isLoading: sectionsLoading,
              error: sectionsError,
              actionButtonProps: {
                contextsArray: [FlowContextName.investmentEntity],
                externalContextData: { contactId },
                prefixDataTestId: 'contact-investment'
              }
            }
          }
        ]}
        data-testid="contact-investment-section-wrapper"
      />

      {/* Tasks & Approvals - 1/2 width, spans 2 rows - EXACT MATCH TO LEAD */}
      <SectionWrapper
        className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-6 gba:lg:col-span-6 gba:row-span-2"
        sections={[
          {
            id: 'tasks-section',
            component: TaskSection,
            props: {
              ...props,
              contactId,
              buildReferenceUrl,
              tasks: tasks,
              taskActionProps: {
                contextsArray: [FlowContextName.investmentTaskCreate],
                externalContextData: { contactId },
                prefixDataTestId: 'contact-tasks',
                emptyStateBehavior: 'enable'
              },
              taskEntityActionProps: {
                contextsArray: [FlowContextName.investmentTaskEntity],
                externalContextData: { contactId },
                prefixDataTestId: 'contact-task-entity',
                emptyStateBehavior: 'enable'
              },
              typeCatalog: TASK_TYPE,
              priorityCatalog: TASK_PRIORITY,
              buildTaskPayload: buildInvestmentTaskPayload,
              defaultTaskStatusRef: 'InvestmentTaskStatus:v1:IN_PROGRESS',
              preSubmit: taskPreSubmit
            }
          },
          {
            id: 'approval-tasks-section',
            component: TaskSection,
            props: {
              ...props,
              contactId,
              sectionTitle: 'Approval Tasks',
              buildReferenceUrl,
              tasks: approvals,
              taskEntityActionProps: {
                contextsArray: [FlowContextName.investmentTaskEntity],
                externalContextData: { contactId },
                prefixDataTestId: 'contact-approval-entity',
                emptyStateBehavior: 'enable'
              },
              taskActionProps: {
                contextsArray: [FlowContextName.investmentTaskCreate],
                externalContextData: {
                  contactId,
                  contact: contactId,
                  typeRef: APPROVAL_TASK_TYPE_REF,
                  investmentTask: { contact: contactId, type: APPROVAL_TASK_TYPE_REF }
                },
                prefixDataTestId: 'contact-approvals',
                emptyStateBehavior: 'enable'
              },
              typeCatalog: TASK_TYPE,
              isApprovalTaskSection: true,
              approvalTaskTypeRef: APPROVAL_TASK_TYPE_REF,
              defaultTaskStatusRef: 'InvestmentTaskStatus:v1:IN_PROGRESS',
              priorityCatalog: TASK_PRIORITY,
              buildTaskPayload: buildInvestmentTaskPayload,
              preSubmit: taskPreSubmit
            }
          }
        ]}
        data-testid="contact-tasks-approvals-section-wrapper"
      />

      {/* Activities & Notes - 1/2 width, spans 2 rows - EXACT MATCH TO LEAD */}
      <SectionWrapper
        className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-6 gba:lg:col-span-6 gba:row-span-2"
        sections={[
          {
            id: 'activities-section',
            component: ActivitySection,
            props: {
              ...props,
              contactId,
              activities: activities,
              activitiesLoading: sectionsLoading,
              activitiesError: sectionsError,
              onReloadActivities: loadSectionData,
              activitySectionActionProps: {
                contextsArray: [FlowContextName.investmentActivityCreate],
                externalContextData: {
                  contactId,
                  ...(props.userInfo?.employeeDetails?.employeeId && {
                    ownerEmployeeId: props.userInfo.employeeDetails.employeeId
                  }),
                  ...(props.userInfo?.id && {
                    employeeId: props.userInfo.id,
                    userId: props.userInfo.id,
                    employeeDetails: { userId: props.userInfo.id }
                  })
                },
                prefixDataTestId: 'contact-activities',
                emptyStateBehavior: 'enable'
              },
              activityEntityActionProps: {
                contextsArray: [FlowContextName.investmentActivityEntity],
                externalContextData: { contactId },
                prefixDataTestId: 'contact-activity-entity',
                emptyStateBehavior: 'enable'
              },
              activityTypeCatalog: ACTIVITY_TYPE,
              buildActivityPayload: buildInvestmentActivityPayload,
              alignment: 'right',
              preSubmit: activityPreSubmit
            }
          },
          {
            id: 'notes-section',
            component: NoteSection as React.ComponentType<any>,
            props: {
              ...props,
              contactId,
              notes: notes,
              noteActionProps: {
                contextsArray: [FlowContextName.investmentNoteCreate],
                externalContextData: { contactId },
                prefixDataTestId: 'contact-notes',
                emptyStateBehavior: 'enable'
              },
              noteEntityActionProps: {
                contextsArray: [FlowContextName.investmentNoteEntity],
                externalContextData: { contactId },
                prefixDataTestId: 'contact-note-entity',
                emptyStateBehavior: 'enable'
              },
              buildNotePayload: buildInvestmentNotePayload,
              preSubmit: notePreSubmit
            }
          }
        ]}
        data-testid="contact-activities-notes-section-wrapper"
      />
    </>
  )
}

export { HomeView }
export default HomeView
