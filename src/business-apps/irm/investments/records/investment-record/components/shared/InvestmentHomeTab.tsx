import React, { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { buildIrmRelatedEntityRecordUrl } from '@/common/utils/relatedEntityRecordUrls'
import { useGetInvestmentTasksByInvestmentId } from '../../hooks/useInvestmentTasksByInvestmentId'
import { useGetInvestmentActivitiesByInvestmentId } from '../../hooks/useInvestmentActivitiesByInvestmentId'
import { useGetInvestmentNotesByInvestmentId } from '../../hooks/useInvestmentNotesByInvestmentId'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import AccountSection from '@/common/components/common-relations/record-sections/account-section/AccountSection'
import ContactSection from '@/common/components/common-relations/record-sections/contact-section/ContactSection'
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
import { getReferenceEntityType } from '@/common/data/investment/utils/referenceEntityUtils'
import { createFormPreSubmitHandler } from '@/common/data/relations/utils/formPreSubmitUtils'
import { useFileClient } from '@/common/network/files/useFileClient'
import type { TaskReference } from '@/common/components/common-relations/detail-sheets/task-detail-sheet'
import { buildInvestmentTaskPayload } from '@/common/data/investment/types/investmentTaskTypes'
import { buildInvestmentActivityPayload } from '@/common/data/investment/types/investmentActivityTypes'
import { buildInvestmentNotePayload } from '@/common/data/investment/types/investmentNoteTypes'

interface InvestmentHomeTabProps extends BusinessAppContextProps {
  investmentId: string
  investment?: any
}

export const InvestmentHomeTab: React.FC<InvestmentHomeTabProps> = ({ investmentId, investment, ...context }) => {
  const fileClient = useFileClient({ accessToken: context.accessToken, userInfo: context.userInfo })
  const taskPreSubmit = useCallback(
    createFormPreSubmitHandler({
      userInfo: context.userInfo,
      fileClient,
      fileContext: FILE_CONTEXT.TASK,
      appName: APP_NAME,
      entityId: investmentId,
      getFileEntityFromType,
      getReferenceEntityType,
      useCreatorFields: true
    }),
    [context.userInfo, fileClient, investmentId]
  )
  const activityPreSubmit = useCallback(
    createFormPreSubmitHandler({
      userInfo: context.userInfo,
      fileClient,
      fileContext: FILE_CONTEXT.ACTIVITY,
      appName: APP_NAME,
      entityId: investmentId,
      getFileEntityFromType,
      getReferenceEntityType,
      useCreatorFields: true
    }),
    [context.userInfo, fileClient, investmentId]
  )
  const notePreSubmit = useCallback(
    createFormPreSubmitHandler({
      userInfo: context.userInfo,
      fileClient,
      fileContext: FILE_CONTEXT.NOTE,
      appName: APP_NAME,
      entityId: investmentId,
      getFileEntityFromType,
      getReferenceEntityType,
      useCreatorFields: false
    }),
    [context.userInfo, fileClient, investmentId]
  )

  // Real data state
  const [tasks, setTasks] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(false)
  const [activitiesError, setActivitiesError] = useState<string | null>(null)
  const [notes, setNotes] = useState<any[]>([])
  const [approvals, setApprovals] = useState<any[]>([])

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

  const { fetchInvestmentTasksByInvestmentId } = useGetInvestmentTasksByInvestmentId(context)
  const { fetchInvestmentActivitiesByInvestmentId } = useGetInvestmentActivitiesByInvestmentId(context)
  const { fetchInvestmentNotesByInvestmentId } = useGetInvestmentNotesByInvestmentId(context)

  const loadTasks = useCallback(async () => {
    if (!investmentId) return

    try {
      const tasksData = await fetchInvestmentTasksByInvestmentId(investmentId)
      // Filter out approval tasks - only show regular tasks
      const regularTasks = (tasksData || []).filter((task: any) => {
        const taskTypeCode = task?.taskType?.code || ''
        const taskTypeValue = task?.taskType?.value || ''
        return taskTypeCode?.toUpperCase() !== 'APPROVAL' && taskTypeValue?.toUpperCase() !== 'APPROVAL'
      })
      setTasks(regularTasks)
    } catch (error) {
      console.error('Error loading tasks:', error)
    }
  }, [investmentId, fetchInvestmentTasksByInvestmentId])

  const loadActivities = useCallback(async () => {
    if (!investmentId) return

    setActivitiesLoading(true)
    setActivitiesError(null)

    try {
      const activitiesData = await fetchInvestmentActivitiesByInvestmentId(investmentId)
      setActivities(activitiesData || [])
    } catch (error) {
      console.error('Error loading activities:', error)
      setActivitiesError(error instanceof Error ? error.message : 'Failed to load activities')
    } finally {
      setActivitiesLoading(false)
    }
  }, [investmentId, fetchInvestmentActivitiesByInvestmentId])

  const loadNotes = useCallback(async () => {
    if (!investmentId) return

    try {
      const notesData = await fetchInvestmentNotesByInvestmentId(investmentId)
      setNotes(notesData || [])
    } catch (error) {
      console.error('Error loading notes:', error)
    }
  }, [investmentId, fetchInvestmentNotesByInvestmentId])

  const loadApprovals = useCallback(async () => {
    if (!investmentId) return

    try {
      const tasksData = await fetchInvestmentTasksByInvestmentId(investmentId)
      // Filter only approval tasks - taskType code or value must be 'APPROVAL'
      const approvalTasks = (tasksData || []).filter((task: any) => {
        const taskTypeCode = task?.taskType?.code || ''
        const taskTypeValue = task?.taskType?.value || ''
        return taskTypeCode?.toUpperCase() === 'APPROVAL' || taskTypeValue?.toUpperCase() === 'APPROVAL'
      })
      setApprovals(approvalTasks)
    } catch {
      // Failed to load approvals
    }
  }, [investmentId, fetchInvestmentTasksByInvestmentId])

  // Load section data on mount
  useEffect(() => {
    loadTasks()
    loadActivities()
    loadNotes()
    loadApprovals()
  }, [loadTasks, loadActivities, loadNotes, loadApprovals])

  // Memoized callback for process completion
  const handleProcessSuccess = useCallback(() => {
    loadTasks()
    loadActivities()
    loadNotes()
    loadApprovals()
  }, [loadTasks, loadActivities, loadNotes, loadApprovals])

  // Listen for process completion events to refresh section data
  useProcessCompletion({
    onSuccess: handleProcessSuccess
  })

  return (
    <div className="gba:col-span-12 gba:grid gba:grid-cols-1 gba:gap-4 gba:items-stretch gba:lg:grid-cols-12">
      <div className="gba:flex gba:h-full gba:flex-col gba:gap-4 gba:lg:col-span-6">
        <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:sm:grid-cols-2">
          {/* Account Section - 1/4 width */}
          <SectionWrapper
            className="gba:min-h-96 gba:max-h-96"
            sections={[
              {
                id: 'account-section',
                component: AccountSection,
                props: {
                  ...context,
                  // Transform junction table to include account type
                  accounts:
                    investment?.investmentAccounts
                      ?.map(junction => ({
                        ...junction.investmentAccount,
                        investmentAccountType: junction.investmentAccountType // Add catalog entry from junction table
                      }))
                      .filter(Boolean) || [],
                  account: investment?.investmentAccounts?.[0]
                    ? {
                        ...investment.investmentAccounts[0].investmentAccount,
                        investmentAccountType: investment.investmentAccounts[0].investmentAccountType
                      }
                    : undefined,
                  accountId: investment?.investmentAccounts?.[0]?.investmentAccountId,
                  recordUrl: investment?.investmentAccounts?.[0]?.investmentAccountId
                    ? buildPlatformUrl('/platform/irm/account-record', {
                        accountId: investment.investmentAccounts[0].investmentAccountId,
                        source: 'investment-relations',
                        fromEntity: 'investments'
                      })
                    : undefined,
                  actionButtonProps: investment?.investmentAccounts?.[0]?.investmentAccountId
                    ? {
                        contextsArray: [FlowContextName.investmentAccountEntity],
                        externalContextData: { accountId: investment.investmentAccounts[0].investmentAccountId },
                        prefixDataTestId: 'investment-record-account-action'
                      }
                    : undefined
                }
              }
            ]}
            data-testid="investment-account-section-wrapper"
          />

          {/* Contact Section - 1/4 width */}
          <SectionWrapper
            className="gba:min-h-96 gba:max-h-96"
            sections={[
              {
                id: 'contact-section',
                component: ContactSection,
                props: {
                  ...context,
                  // Flatten contacts from all associated accounts (junction table)
                  // GraphQL field: investmentAccountContact (singular), TypeScript: accountContacts (plural)
                  contacts:
                    investment?.investmentAccounts
                      ?.flatMap(junction => {
                        // Try both field names: accountContacts (mapped) or investmentAccountContact (raw GraphQL)
                        const contactAssociations =
                          junction.investmentAccount?.accountContacts ||
                          junction.investmentAccount?.investmentAccountContact ||
                          []
                        return contactAssociations.map((iac: any) => ({
                          ...iac.contact,
                          contactType: iac.contactType, // From account-contact association
                          pictureThumbnail: iac.contact?.pictureThumbnail,
                          communicationChannels: iac.contact?.communicationChannels
                        }))
                      })
                      .filter(Boolean) || [],
                  contactId: (() => {
                    const firstContactAssoc = investment?.investmentAccounts
                      ?.flatMap(
                        junction =>
                          junction.investmentAccount?.accountContacts ||
                          junction.investmentAccount?.investmentAccountContact ||
                          []
                      )
                      .find(Boolean)
                    return firstContactAssoc?.contact?.id || null
                  })(),
                  recordUrl: (() => {
                    const firstContactAssoc = investment?.investmentAccounts
                      ?.flatMap(
                        junction =>
                          junction.investmentAccount?.accountContacts ||
                          junction.investmentAccount?.investmentAccountContact ||
                          []
                      )
                      .find(Boolean)
                    const firstContact = firstContactAssoc?.contact
                    return firstContact?.id
                      ? buildPlatformUrl('/platform/irm/contact-record', {
                          contactId: firstContact.id,
                          source: 'investment-relations',
                          fromEntity: 'investments'
                        })
                      : undefined
                  })(),
                  actionButtonProps: (() => {
                    const firstContactAssoc = investment?.investmentAccounts
                      ?.flatMap(
                        junction =>
                          junction.investmentAccount?.accountContacts ||
                          junction.investmentAccount?.investmentAccountContact ||
                          []
                      )
                      .find(Boolean)
                    const firstContact = firstContactAssoc?.contact
                    return firstContact?.id
                      ? {
                          contextsArray: [FlowContextName.investmentContactEntity],
                          externalContextData: {
                            contactId: firstContact.id
                          },
                          prefixDataTestId: 'investment-record-contact-action'
                        }
                      : undefined
                  })()
                }
              }
            ]}
            data-testid="investment-contact-section-wrapper"
          />
        </div>

        {/* Tasks & Approvals - stretches to align with the right column */}
        <SectionWrapper
          className="gba:min-h-96 gba:flex-1"
          sections={[
            {
              id: 'tasks-section',
              component: TaskSection,
              props: {
                ...context,
                investmentId,
                buildReferenceUrl,
                tasks: tasks,
                taskActionProps: {
                  contextsArray: [FlowContextName.investmentTaskCreate],
                  externalContextData: { investmentId },
                  prefixDataTestId: 'investment-task',
                  emptyStateBehavior: 'enable'
                },
                taskEntityActionProps: {
                  contextsArray: [FlowContextName.investmentTaskEntity],
                  externalContextData: { investmentId },
                  prefixDataTestId: 'investment-task-entity',
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
                ...context,
                sectionTitle: 'Approval Tasks',
                investmentId,
                buildReferenceUrl,
                tasks: approvals,
                taskActionProps: {
                  contextsArray: [FlowContextName.investmentTaskCreate],
                  externalContextData: {
                    investmentId,
                    typeRef: APPROVAL_TASK_TYPE_REF,
                    investmentTask: { investment: investmentId, type: APPROVAL_TASK_TYPE_REF }
                  },
                  prefixDataTestId: 'investment-approval',
                  emptyStateBehavior: 'enable'
                },
                taskEntityActionProps: {
                  contextsArray: [FlowContextName.investmentTaskEntity],
                  externalContextData: { investmentId },
                  prefixDataTestId: 'investment-approval-entity',
                  emptyStateBehavior: 'enable'
                },
                typeCatalog: TASK_TYPE,
                priorityCatalog: TASK_PRIORITY,
                buildTaskPayload: buildInvestmentTaskPayload,
                isApprovalTaskSection: true,
                approvalTaskTypeRef: APPROVAL_TASK_TYPE_REF,
                defaultTaskStatusRef: 'InvestmentTaskStatus:v1:IN_PROGRESS',
                preSubmit: taskPreSubmit
              }
            }
          ]}
          data-testid="investment-tasks-approvals-section-wrapper"
        />
      </div>

      {/* Activities & Notes - 1/2 width, stretches with left column */}
      <SectionWrapper
        className="gba:min-h-196 gba:h-full gba:lg:col-span-6"
        sections={[
          {
            id: 'activities-section',
            component: ActivitySection,
            props: {
              ...context,
              investmentId,
              activities: activities,
              activitiesLoading: activitiesLoading,
              activitiesError: activitiesError,
              onReloadActivities: loadActivities,
              activitySectionActionProps: {
                contextsArray: [FlowContextName.investmentActivityCreate],
                externalContextData: {
                  investmentId,
                  ...(context.userInfo?.employeeDetails?.employeeId && {
                    ownerEmployeeId: context.userInfo.employeeDetails.employeeId
                  }),
                  ...(context.userInfo?.id && {
                    employeeId: context.userInfo.id,
                    userId: context.userInfo.id,
                    employeeDetails: { userId: context.userInfo.id }
                  })
                },
                prefixDataTestId: 'investment-activity',
                emptyStateBehavior: 'enable'
              },
              activityEntityActionProps: {
                contextsArray: [FlowContextName.investmentActivityEntity],
                externalContextData: { investmentId },
                prefixDataTestId: 'investment-activity-entity',
                emptyStateBehavior: 'enable'
              },
              activityTypeCatalog: ACTIVITY_TYPE,
              buildActivityPayload: buildInvestmentActivityPayload,
              alignment: 'right',
              preSubmit: activityPreSubmit,
              getRelatedRecordUrl: buildIrmRelatedEntityRecordUrl
            }
          },
          {
            id: 'notes-section',
            component: NoteSection,
            props: {
              ...context,
              investmentId,
              notes: notes,
              noteActionProps: {
                contextsArray: [FlowContextName.investmentNoteCreate],
                externalContextData: { investmentId },
                prefixDataTestId: 'investment-note',
                emptyStateBehavior: 'enable'
              },
              noteEntityActionProps: {
                contextsArray: [FlowContextName.investmentNoteEntity],
                externalContextData: { investmentId },
                prefixDataTestId: 'investment-note-entity',
                emptyStateBehavior: 'enable'
              },
              buildNotePayload: buildInvestmentNotePayload,
              preSubmit: notePreSubmit
            }
          }
        ]}
        data-testid="investment-activities-notes-section-wrapper"
      />
    </div>
  )
}

export default InvestmentHomeTab
