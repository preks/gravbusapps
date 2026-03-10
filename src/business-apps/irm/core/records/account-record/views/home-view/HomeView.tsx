import React, { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { InvestmentAccount } from '@/common/data/investment/types/investmentAccountTypes'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import type { TaskReference } from '@/common/components/common-relations/detail-sheets/task-detail-sheet'
import {
  useGetInvestmentActivitiesByAccountId,
  useGetInvestmentNotesByAccountId,
  useGetInvestmentTasksByAccountId
} from '@/common/data/investment/hooks/useInvestmentAccounts'
import type { Investment } from '@/common/data/investment/types/investmentTypes'
import AccountSection from '@/common/components/common-relations/record-sections/account-section/AccountSection'
import ContactSection from '@/common/components/common-relations/record-sections/contact-section/ContactSection'
import InvestmentSection from '@/common/components/common-relations/record-sections/investment-section/InvestmentSection'
import ActivitySection from '@/common/components/common-relations/record-sections/activity-section/ActivitySection'
import NoteSection from '@/common/components/common-relations/record-sections/note-section/NoteSection'
import TaskSection from '@/common/components/common-relations/record-sections/task-section/TaskSection'
import SectionWrapper from '@/common/components/common-relations/record-sections/section-card/SectionCard'

interface HomeViewProps extends BusinessAppContextProps {
  accountId: string
  accountData: InvestmentAccount | undefined
  investments: Investment[]
  investmentsLoading: boolean
}

const HomeView: React.FC<HomeViewProps> = ({ accountId, accountData, investments, investmentsLoading, ...props }) => {
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
              account: accountData,
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

      {/* Contact Section - 1/4 width - EXACT MATCH TO LEAD */}
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
                    contactType: ac.contactType
                  }))
                  .filter(Boolean) || [],
              contactId: accountData?.accountContacts?.[0]?.contact?.id || undefined,
              recordUrl: accountData?.accountContacts?.[0]?.contact?.id
                ? buildPlatformUrl('/platform/irm/contact-record', {
                    contactId: accountData.accountContacts[0].contact.id,
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
              isLoading: investmentsLoading,
              error: sectionsError,
              actionButtonProps: {
                contextsArray: [FlowContextName.investmentEntity],
                externalContextData: { accountId },
                prefixDataTestId: 'account-investment'
              }
            }
          }
        ]}
        data-testid="account-investment-section-wrapper"
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
              buildReferenceUrl,
              tasks: tasks,
              taskActionProps: {
                contextsArray: [FlowContextName.investmentTaskCreate],
                externalContextData: { accountId },
                prefixDataTestId: 'account-tasks',
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
              tasks: approvals,
              taskEntityActionProps: {
                contextsArray: [FlowContextName.investmentTaskEntity],
                externalContextData: { accountId },
                prefixDataTestId: 'account-approval-entity',
                emptyStateBehavior: 'enable'
              },
              taskActionProps: {
                contextsArray: [FlowContextName.investmentTaskCreate],
                externalContextData: {
                  accountId,
                  account: accountId,
                  typeRef: 'InvestmentTaskType:v1:APPROVAL',
                  investmentTask: { account: accountId, type: 'InvestmentTaskType:v1:APPROVAL' }
                },
                prefixDataTestId: 'account-approvals',
                emptyStateBehavior: 'enable'
              }
            }
          }
        ]}
        data-testid="account-tasks-approvals-section-wrapper"
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
              activities: activities,
              activitiesLoading: sectionsLoading,
              activitiesError: sectionsError,
              onReloadActivities: loadSectionData,
              activitySectionActionProps: {
                contextsArray: [FlowContextName.investmentActivityCreate],
                externalContextData: { accountId },
                prefixDataTestId: 'account-activities'
              },
              activityEntityActionProps: {
                contextsArray: [FlowContextName.investmentActivityEntity],
                externalContextData: { accountId },
                prefixDataTestId: 'account-activity-entity'
              }
            }
          },
          {
            id: 'notes-section',
            component: NoteSection as React.ComponentType<any>,
            props: {
              ...props,
              notes: notes,
              noteActionProps: {
                contextsArray: [FlowContextName.investmentNoteCreate],
                externalContextData: { accountId },
                prefixDataTestId: 'account-notes',
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
        data-testid="account-activities-notes-section-wrapper"
      />
    </>
  )
}

export { HomeView }
export default HomeView
