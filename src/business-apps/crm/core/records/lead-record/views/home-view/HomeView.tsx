import React from 'react'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import type { TaskReference } from '@/common/components/common-relations/detail-sheets/task-detail-sheet'
import AccountSection from '@/common/components/common-relations/record-sections/account-section/AccountSection'
import ContactSection from '@/common/components/common-relations/record-sections/contact-section/ContactSection'
import ActivitySection from '@/common/components/common-relations/record-sections/activity-section/ActivitySection'
import NoteSection from '@/common/components/common-relations/record-sections/note-section/NoteSection'
import TaskSection from '@/common/components/common-relations/record-sections/task-section/TaskSection'
import SectionWrapper from '@/common/components/common-relations/record-sections/section-card/SectionCard'
import type { HomeViewProps } from './types'
import { buildCustomerAccountFromLead, buildCustomerContactFromLead } from '../../utils/leadDataTransformers'

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

export const HomeView: React.FC<HomeViewProps> = ({
  leadId,
  rawLeadData,
  activities,
  notes,
  tasks,
  approvals,
  sectionsLoading,
  sectionsError,
  loadSectionData,
  activityActionProps,
  noteActionProps,
  taskActionProps,
  approvalActionProps,
  accessToken,
  ...props
}) => {
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
              accessToken,
              account: buildCustomerAccountFromLead(rawLeadData),
              accounts: rawLeadData ? [buildCustomerAccountFromLead(rawLeadData)].filter(Boolean) : undefined
            }
          }
        ]}
        data-testid="lead-account-section-wrapper"
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
              accessToken,
              contact: buildCustomerContactFromLead(rawLeadData),
              contacts: rawLeadData ? [buildCustomerContactFromLead(rawLeadData)].filter(Boolean) : undefined
            }
          }
        ]}
        data-testid="lead-contact-section-wrapper"
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
              accessToken,
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
                contextsArray: [FlowContextName.customerActivityEntity],
                externalContextData: { leadId },
                prefixDataTestId: 'lead-activity-entity',
                emptyStateBehavior: 'enable'
              }
            }
          }
        ]}
        data-testid="lead-activities-section-wrapper"
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
              accessToken,
              leadId: leadId,
              buildReferenceUrl,
              tasks: tasks,
              taskActionProps: {
                ...taskActionProps,
                emptyStateBehavior: 'enable'
              },
              taskEntityActionProps: {
                contextsArray: [FlowContextName.customerTaskEntity],
                externalContextData: { leadId },
                prefixDataTestId: 'lead-task-entity',
                emptyStateBehavior: 'enable'
              },
              'data-testid': 'lead-tasks-section'
            }
          },
          {
            id: 'approvals-section',
            component: TaskSection,
            props: {
              ...props,
              accessToken,
              leadId: leadId,
              buildReferenceUrl,
              tasks: approvals,
              taskActionProps: {
                ...approvalActionProps,
                emptyStateBehavior: 'enable'
              },
              taskEntityActionProps: {
                contextsArray: [FlowContextName.customerTaskEntity],
                externalContextData: { leadId },
                prefixDataTestId: 'lead-approval-entity',
                emptyStateBehavior: 'enable'
              },
              sectionTitle: getTranslationFromI18nKeyAndLabel('crm.customers.approvals.title', 'Approval Tasks'),
              'data-testid': 'lead-approvals-section'
            }
          }
        ]}
        data-testid="lead-tasks-approvals-section-wrapper"
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
              accessToken,
              notes: notes,
              noteActionProps: {
                ...noteActionProps,
                emptyStateBehavior: 'enable'
              },
              noteEntityActionProps: {
                contextsArray: [FlowContextName.customerNoteEntity],
                externalContextData: { leadId },
                prefixDataTestId: 'lead-note-entity',
                emptyStateBehavior: 'enable'
              },
              'data-testid': 'lead-notes-section'
            }
          }
        ]}
        data-testid="lead-notes-section-wrapper"
      />
    </>
  )
}
