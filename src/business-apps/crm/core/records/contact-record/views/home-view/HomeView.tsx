import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import type { CustomerContact } from '@/common/data/customer/types/customerContactTypes'
import type { CustomerActivity } from '@/common/data/customer/types/customerActivityTypes'
import type { CustomerTask } from '@/common/data/customer/types/customerTaskTypes'
import type { CustomerNote } from '@/common/data/customer/hooks/useCustomerNotes'
import type { TaskReference } from '@/common/components/common-relations/detail-sheets/task-detail-sheet'
import type { AppActionCommonProps } from '@/common/hooks/useAppActionData'
import ActivitySection from '@/common/components/common-relations/record-sections/activity-section/ActivitySection'
import NoteSection from '@/common/components/common-relations/record-sections/note-section/NoteSection'
import TaskSection from '@/common/components/common-relations/record-sections/task-section/TaskSection'
import AccountSection from '@/common/components/common-relations/record-sections/account-section/AccountSection'
import ContactSection from '@/common/components/common-relations/record-sections/contact-section/ContactSection'
import SectionWrapper from '@/common/components/common-relations/record-sections/section-card/SectionCard'

interface HomeViewProps extends BusinessAppContextProps {
  contactId: string
  contact: CustomerContact
  activities: CustomerActivity[]
  notes: CustomerNote[]
  tasks: CustomerTask[]
  approvals: CustomerTask[]
  sectionsLoading: boolean
  sectionsError: string | null
  loadSectionData: () => void
  activityActionProps: Omit<AppActionCommonProps, 'accessToken'>
  noteActionProps: Omit<AppActionCommonProps, 'accessToken'>
  taskActionProps: Omit<AppActionCommonProps, 'accessToken'>
  approvalActionProps: Omit<AppActionCommonProps, 'accessToken'>
}

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
  contactId,
  contact,
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
              accounts:
                contact?.accountContacts
                  ?.map(ac => ({
                    ...ac.account,
                    contactType: ac.contactType
                  }))
                  .filter(Boolean) || [],
              accountId: contact?.accountContacts?.[0]?.account?.id,
              recordUrl: contact?.accountContacts?.[0]?.account?.id
                ? buildPlatformUrl('/platform/crm/account-record', {
                    accountId: contact.accountContacts[0].account.id,
                    source: 'customer-relations'
                  })
                : undefined,
              actionButtonProps: {
                contextsArray: [FlowContextName.customerAccountEntity],
                externalContextData: {
                  accountId: contact?.accountContacts?.[0]?.account?.id
                },
                prefixDataTestId: 'contact-account'
              }
            }
          }
        ]}
        data-testid="contact-account-section-wrapper"
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
              contact: contact, // ✅ Vollständiges CustomerContact-Objekt
              contactId: contact?.id,
              actionButtonProps: {
                contextsArray: [FlowContextName.customerContactEntity],
                externalContextData: { contactId: contact?.id },
                prefixDataTestId: 'contact-contact'
              }
            }
          }
        ]}
        data-testid="contact-contact-section-wrapper"
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
                contextsArray: [FlowContextName.customerActivityEntity],
                externalContextData: { contactId },
                prefixDataTestId: 'contact-activity-entity',
                emptyStateBehavior: 'enable'
              }
            }
          }
        ]}
        data-testid="contact-activities-section-wrapper"
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
              tasks: tasks,
              taskActionProps: {
                ...taskActionProps,
                emptyStateBehavior: 'enable'
              },
              taskEntityActionProps: {
                contextsArray: [FlowContextName.customerTaskEntity],
                externalContextData: { contactId },
                prefixDataTestId: 'contact-task-entity',
                emptyStateBehavior: 'enable'
              },
              'data-testid': 'contact-tasks-section'
            }
          },
          {
            id: 'approvals-section',
            component: TaskSection,
            props: {
              ...props,
              buildReferenceUrl,
              tasks: approvals,
              taskActionProps: {
                ...approvalActionProps,
                emptyStateBehavior: 'enable'
              },
              taskEntityActionProps: {
                contextsArray: [FlowContextName.customerTaskEntity],
                externalContextData: { contactId },
                prefixDataTestId: 'contact-approval-entity',
                emptyStateBehavior: 'enable'
              },
              sectionTitle: getTranslationFromI18nKeyAndLabel('crm.customers.approvals.title', 'Approval Tasks'),
              'data-testid': 'contact-approvals-section'
            }
          }
        ]}
        data-testid="contact-tasks-approvals-section-wrapper"
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
              notes: notes,
              noteActionProps: {
                ...noteActionProps,
                emptyStateBehavior: 'enable'
              },
              noteEntityActionProps: {
                contextsArray: [FlowContextName.customerNoteEntity],
                externalContextData: { contactId },
                prefixDataTestId: 'contact-note-entity',
                emptyStateBehavior: 'enable'
              },
              'data-testid': 'contact-notes-section'
            }
          }
        ]}
        data-testid="contact-notes-section-wrapper"
      />
    </>
  )
}
