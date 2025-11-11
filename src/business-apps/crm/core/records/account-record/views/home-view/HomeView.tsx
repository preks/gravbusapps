import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
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

interface HomeViewProps extends BusinessAppContextProps {
  accountId: string
  accountData: any
}

const HomeView: React.FC<HomeViewProps> = ({ accountId, accountData, ...props }) => {
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
        const taskTypeCode = task?.type?.code || ''
        const taskTypeValue = task?.type?.value || ''
        return taskTypeCode?.toUpperCase() !== 'APPROVAL' && taskTypeValue?.toUpperCase() !== 'APPROVAL'
      })
      const approvalTasks = sortedTasks.filter((task: any) => {
        const taskTypeCode = task?.type?.code || ''
        const taskTypeValue = task?.type?.value || ''
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
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        // Check for successful completion
        if (event.detail?.resolution === 'success') {
          loadSectionData()
          return
        }

        // Also check for different event structure
        const response = event.detail?.response
        if (response?.detail?.resolution === 'success' || response?.account) {
          loadSectionData()
        }
      } catch (err) {
        console.error('Error handling process completion in HomeView:', err)
      }
    }

    // Listen to multiple possible event names
    const eventNames = [
      'com.newwork.process.taskCompletion',
      'com.newwork.process.completion',
      'com.newwork.process.continue',
      'com.newwork.process.processCompletion',
      'processCompletion',
      'taskCompletion',
      'taskCompleted',
      'processCompleted',
      'task-completion',
      'process-completion'
    ]

    eventNames.forEach(eventName => {
      window.addEventListener(eventName, handleProcessCompletion as EventListener)
    })

    return () => {
      eventNames.forEach(eventName => {
        window.removeEventListener(eventName, handleProcessCompletion as EventListener)
      })
    }
  }, [loadSectionData])

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
        typeRef: 'SalesTaskType:v1:APPROVAL',
        salesTask: { account: accountId, type: 'SalesTaskType:v1:APPROVAL' }
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
      {/* Account Section - 1/3 width */}
      <SectionWrapper
        className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-4 gba:lg:col-span-4 gba:row-span-1"
        sections={[
          {
            id: 'account-section',
            component: AccountSection,
            props: {
              ...props,
              account: accountData
                ? {
                    id: accountData.id,
                    name: accountData.name,
                    website: accountData.website,
                    email: accountData.email,
                    phone: accountData.phone,
                    // Map catalog entries to expected format
                    legalForm: accountData.legalForm?.value,
                    industry: accountData.industry?.value,
                    size: accountData.numberOfEmployees?.value,
                    revenue: accountData.annualRevenue?.value,
                    // Map other fields
                    numberOfEmployees: accountData.numberOfEmployees,
                    annualRevenue: accountData.annualRevenue
                  }
                : undefined,
              address: accountData
                ? (() => {
                    const addresses = accountData.addresses || []
                    const primaryAddress = addresses.find((addr: any) => addr.addressType === 'PRIMARY_ADDRESS')
                    const address = primaryAddress || addresses[0]

                    return address
                      ? {
                          addressLine: address.addressLine,
                          postalCode: address.postalCode,
                          locality: address.city, // CRM uses 'city' field, map to 'locality' for AccountSection
                          country: typeof address.country === 'string' ? address.country : address.country?.value,
                          region: typeof address.region === 'string' ? address.region : address.region?.value
                        }
                      : undefined
                  })()
                : undefined,
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

      {/* Contact Section - 1/3 width */}
      <SectionWrapper
        className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-4 gba:lg:col-span-4 gba:row-span-1"
        sections={[
          {
            id: 'contact-section',
            component: ContactSection,
            props: {
              ...props,
              contacts:
                accountData?.accountContacts?.map((accountContact: any) => accountContact.contact).filter(Boolean) ||
                [],
              contact: accountData?.accountContacts?.[0]?.contact || undefined,
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

      {/* Activities Section - 1/3 width, full height */}
      <SectionWrapper
        className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-4 gba:lg:col-span-4 gba:row-span-5"
        sections={[
          {
            id: 'activities-section',
            component: ActivitySection,
            props: {
              ...props,
              activities: activities,
              activitiesLoading: sectionsLoading,
              activitiesError: sectionsError,
              onReloadActivities: loadSectionData,
              alignment: 'right',
              activitySectionActionProps: activityActionProps,
              activityEntityActionProps: activityEntityActionProps
            }
          }
        ]}
        data-testid="account-activities-section-wrapper"
      />

      {/* Tasks & Approvals - 2/3 width, spans 2 rows */}
      <SectionWrapper
        className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-8 gba:lg:col-span-8 gba:row-span-2"
        sections={[
          {
            id: 'tasks-section',
            component: TaskSection,
            props: {
              ...props,
              buildReferenceUrl,
              tasks: tasks.map(task => ({
                id: task.id,
                title:
                  task.name ||
                  task.displayName ||
                  getTranslationFromI18nKeyAndLabel('crm.tasks.untitled', 'Untitled Task'),
                description: task.description,
                createdAt: task.createdAt,
                due: task.dueDate,
                assignee: task.assignedEmployee?.displayName || task.assignedEmployee?.fullName,
                statusCode: task.taskStatus?.value?.toUpperCase(),
                taskStatus: task.taskStatus,
                taskPriority: task.taskPriority,
                assigneeEmployee: task.assignedEmployee,
                taskTiming: task.taskTiming,
                startDate: task.startDate,
                creatorEmployee: task.creatorEmployee,
                documents: task.documents,
                reference: task.lead
                  ? {
                      type: 'lead' as const,
                      id: task.lead.id,
                      name:
                        `${task.lead.firstName || ''} ${task.lead.lastName || ''}`.trim() || task.lead.code || 'Lead'
                    }
                  : task.account
                    ? {
                        type: 'account' as const,
                        id: task.account.id,
                        name: task.account.name || task.account.code || 'Account'
                      }
                    : task.contact
                      ? {
                          type: 'contact' as const,
                          id: task.contact.id,
                          name:
                            `${task.contact.firstName || ''} ${task.contact.lastName || ''}`.trim() ||
                            task.contact.code ||
                            'Contact'
                        }
                      : task.opportunity
                        ? {
                            type: 'opportunity' as const,
                            id: task.opportunity.id,
                            name: task.opportunity.name || task.opportunity.code || 'Opportunity'
                          }
                        : undefined
              })),
              taskActionProps: taskActionProps,
              taskEntityActionProps: taskEntityActionProps
            }
          },
          {
            id: 'approval-tasks-section',
            component: TaskSection,
            props: {
              ...props,
              sectionTitle: 'Approval Tasks',
              buildReferenceUrl,
              tasks: approvals.map(approval => ({
                id: approval.id,
                title:
                  approval.name ||
                  approval.displayName ||
                  getTranslationFromI18nKeyAndLabel('crm.approvals.request', 'Approval Request'),
                description: approval.description,
                createdAt: approval.createdAt,
                due: approval.dueDate,
                assignee: approval.assignedEmployee?.displayName || approval.assignedEmployee?.fullName,
                statusCode: approval.taskStatus?.value?.toUpperCase(),
                taskStatus: approval.taskStatus,
                taskPriority: approval.taskPriority,
                assigneeEmployee: approval.assignedEmployee,
                taskTiming: approval.taskTiming,
                startDate: approval.startDate,
                creatorEmployee: approval.creatorEmployee,
                documents: approval.documents,
                reference: approval.lead
                  ? {
                      type: 'lead' as const,
                      id: approval.lead.id,
                      name:
                        `${approval.lead.firstName || ''} ${approval.lead.lastName || ''}`.trim() ||
                        approval.lead.code ||
                        'Lead'
                    }
                  : approval.account
                    ? {
                        type: 'account' as const,
                        id: approval.account.id,
                        name: approval.account.name || approval.account.code || 'Account'
                      }
                    : approval.contact
                      ? {
                          type: 'contact' as const,
                          id: approval.contact.id,
                          name:
                            `${approval.contact.firstName || ''} ${approval.contact.lastName || ''}`.trim() ||
                            approval.contact.code ||
                            'Contact'
                        }
                      : approval.opportunity
                        ? {
                            type: 'opportunity' as const,
                            id: approval.opportunity.id,
                            name: approval.opportunity.name || approval.opportunity.code || 'Opportunity'
                          }
                        : undefined
              })),
              taskEntityActionProps: approvalEntityActionProps,
              taskActionProps: approvalActionProps
            }
          }
        ]}
        data-testid="account-tasks-approvals-section-wrapper"
      />

      {/* Notes Section - 2/3 width, spans 3 rows */}
      <SectionWrapper
        className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-8 gba:lg:col-span-8 gba:row-span-3"
        sections={[
          {
            id: 'notes-section',
            component: NoteSection,
            props: {
              ...props,
              notes: notes.map(note => ({
                id: note.id,
                version: note.version,
                noteTitle: note.noteTitle || getTranslationFromI18nKeyAndLabel('crm.notes.untitled', 'Untitled Note'),
                noteText: note.noteText || '',
                createdAt: note.createdAt,
                createdBy:
                  note.authorEmployee?.displayName ||
                  getTranslationFromI18nKeyAndLabel('crm.common.unknown', 'Unknown'),
                authorEmployee: note.authorEmployee,
                reminderDate: note.reminderDate
              })),
              noteActionProps: noteActionProps,
              noteEntityActionProps: noteEntityActionProps,
              'data-testid': 'account-notes-section'
            }
          }
        ]}
        data-testid="account-notes-section-wrapper"
      />
    </>
  )
}

export { HomeView }
export default HomeView
