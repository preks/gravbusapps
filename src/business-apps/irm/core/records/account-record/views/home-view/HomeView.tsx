import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { InvestmentAccount } from '@/common/data/investment/types'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import type { TaskReference } from '@/common/components/common-relations/detail-sheets/task-detail-sheet'
import {
  useGetInvestmentActivitiesByAccountId,
  useGetInvestmentNotesByAccountId,
  useGetInvestmentTasksByAccountId
} from '@/common/data/investment/hooks/useInvestmentAccounts'
import AccountSection from '@/common/components/common-relations/record-sections/account-section/AccountSection'
import ContactSection from '@/common/components/common-relations/record-sections/contact-section/ContactSection'
import ActivitySection from '@/common/components/common-relations/record-sections/activity-section/ActivitySection'
import NoteSection from '@/common/components/common-relations/record-sections/note-section/NoteSection'
import TaskSection from '@/common/components/common-relations/record-sections/task-section/TaskSection'
import { transformTaskOrApproval } from '@/common/components/common-relations/record-sections/task-section/utils/taskMappers'
import SectionWrapper from '@/common/components/common-relations/record-sections/section-card/SectionCard'

interface HomeViewProps extends BusinessAppContextProps {
  accountId: string
  accountData: InvestmentAccount | undefined
}

const HomeView: React.FC<HomeViewProps> = ({ accountId, accountData, ...props }) => {
  // Data fetching hooks for sections
  const { fetchInvestmentActivitiesByAccountId } = useGetInvestmentActivitiesByAccountId(props)
  const { fetchInvestmentNotesByAccountId } = useGetInvestmentNotesByAccountId(props)
  const { fetchInvestmentTasksByAccountId } = useGetInvestmentTasksByAccountId(props)

  // State for section data
  const [activities, setActivities] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [approvals, setApprovals] = useState<any[]>([])
  const [sectionsLoading, setSectionsLoading] = useState(true)
  const [sectionsError, setSectionsError] = useState<string | null>(null)

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
    if (!accountId || !props.accessToken) return

    setSectionsLoading(true)
    setSectionsError(null)

    try {
      const [activitiesData, notesData, tasksData] = await Promise.all([
        fetchInvestmentActivitiesByAccountId(accountId),
        fetchInvestmentNotesByAccountId(accountId),
        fetchInvestmentTasksByAccountId(accountId)
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
    fetchInvestmentActivitiesByAccountId,
    fetchInvestmentNotesByAccountId,
    fetchInvestmentTasksByAccountId
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

  // Action props for sections
  const activityActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentActivityCreate],
      externalContextData: { accountId },
      prefixDataTestId: 'account-activity'
    }),
    [accountId]
  )

  const noteActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentNoteCreate],
      externalContextData: { accountId },
      prefixDataTestId: 'account-note'
    }),
    [accountId]
  )

  const taskActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentTaskCreate],
      externalContextData: { accountId },
      prefixDataTestId: 'account-task'
    }),
    [accountId]
  )

  const approvalActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentTaskCreate],
      externalContextData: {
        accountId,
        typeRef: 'InvestmentTaskType:v1:APPROVAL',
        investmentTask: { account: accountId, type: 'InvestmentTaskType:v1:APPROVAL' }
      },
      prefixDataTestId: 'account-approval'
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
                    industry: accountData.industryClass?.value,
                    size: accountData.companySize?.value,
                    revenue: accountData.accountAnnualRevenueBand?.value,
                    // Map other fields
                    numberOfEmployees: accountData.companySize,
                    annualRevenue: accountData.accountAnnualRevenueBand
                  }
                : undefined,
              address: accountData
                ? (() => {
                    const addresses = accountData.addresses || []
                    const primaryAddress = addresses.find(addr => addr.addressType === 'PRIMARY_ADDRESS')
                    const address = primaryAddress || addresses[0]

                    return address
                      ? {
                          addressLine: address.addressLine,
                          postalCode: address.postalCode,
                          locality: address.locality,
                          country: typeof address.country === 'string' ? address.country : address.country?.value,
                          region: typeof address.region === 'string' ? address.region : address.region?.value
                        }
                      : undefined
                  })()
                : undefined,
              accountId: accountId,
              actionButtonProps: {
                contextsArray: [FlowContextName.investmentAccountEntity],
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
                (accountData as any)?.investmentAccountContact
                  ?.map((accountContact: any) => {
                    const c = accountContact.contact
                    return c ? { ...c, jobTitle: c.jobPosition } : null
                  })
                  .filter(Boolean) || [],
              contact: (() => {
                const c = (accountData as any)?.investmentAccountContact?.[0]?.contact
                return c ? { ...c, jobTitle: c.jobPosition } : undefined
              })(),
              contactId: (accountData as any)?.investmentAccountContact?.[0]?.contact?.id || undefined,
              recordUrl: (accountData as any)?.investmentAccountContact?.[0]?.contact?.id
                ? buildPlatformUrl('/platform/irm/contact-record', {
                    contactId: (accountData as any).investmentAccountContact[0].contact.id,
                    source: 'account-relations',
                    fromEntity: 'accounts'
                  })
                : undefined,
              actionButtonProps: {
                contextsArray: [FlowContextName.investmentContactEntity],
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
              activitySectionActionProps: {
                ...activityActionProps,
                emptyStateBehavior: 'enable'
              },
              activityEntityActionProps: {
                contextsArray: [FlowContextName.investmentActivityEntity],
                externalContextData: { accountId },
                prefixDataTestId: 'account-activity-entity',
                emptyStateBehavior: 'enable'
              }
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
              tasks: tasks.map(task =>
                transformTaskOrApproval(task, getTranslationFromI18nKeyAndLabel('crm.tasks.untitled', 'Untitled Task'))
              ),
              taskActionProps: {
                ...taskActionProps,
                emptyStateBehavior: 'enable'
              },
              taskEntityActionProps: {
                contextsArray: [FlowContextName.investmentTaskEntity],
                externalContextData: { accountId },
                prefixDataTestId: 'account-task-entity',
                emptyStateBehavior: 'enable'
              }
            }
          },
          {
            id: 'approval-tasks-section',
            component: TaskSection,
            props: {
              ...props,
              sectionTitle: 'Approval Tasks',
              buildReferenceUrl,
              tasks: approvals.map(approval =>
                transformTaskOrApproval(
                  approval,
                  getTranslationFromI18nKeyAndLabel('crm.approvals.request', 'Approval Request')
                )
              ),
              taskEntityActionProps: {
                contextsArray: [FlowContextName.investmentTaskEntity],
                externalContextData: { accountId },
                prefixDataTestId: 'account-approval-entity',
                emptyStateBehavior: 'enable'
              },
              taskActionProps: {
                ...approvalActionProps,
                emptyStateBehavior: 'enable'
              }
            }
          }
        ]}
        data-testid="account-tasks-approvals-section-wrapper"
      />

      {/* Notes Section - 2/3 width, spans 2 rows */}
      <SectionWrapper
        className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-8 gba:lg:col-span-8 gba:row-span-2"
        sections={[
          {
            id: 'notes-section',
            component: NoteSection,
            props: {
              ...props,
              notes: notes.map(note => ({
                id: note.id,
                noteTitle:
                  note.title ||
                  note.displayName ||
                  getTranslationFromI18nKeyAndLabel('crm.notes.untitled', 'Untitled Note'),
                noteText: note.text || '',
                createdAt: note.createdAt,
                createdBy:
                  note.authorDisplayName ||
                  note.authorEmployee?.displayName ||
                  getTranslationFromI18nKeyAndLabel('crm.common.unknown', 'Unknown'),
                authorEmployee: note.authorEmployee,
                reminderAt: note.reminderDate,
                documents: note.documents
              })),
              noteActionProps: {
                ...noteActionProps,
                emptyStateBehavior: 'enable'
              },
              noteEntityActionProps: {
                contextsArray: [FlowContextName.investmentNoteEntity],
                externalContextData: { accountId },
                prefixDataTestId: 'account-note-entity',
                emptyStateBehavior: 'enable'
              }
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
