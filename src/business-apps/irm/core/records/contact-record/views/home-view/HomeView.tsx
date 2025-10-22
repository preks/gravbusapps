import React from 'react'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import type { TaskReference } from '@/common/components/common-relations/detail-sheets/task-detail-sheet'
import ActivitySection from '@/common/components/common-relations/record-sections/activity-section/ActivitySection'
import NoteSection from '@/common/components/common-relations/record-sections/note-section/NoteSection'
import TaskSection from '@/common/components/common-relations/record-sections/task-section/TaskSection'
import AccountSection from '@/common/components/common-relations/record-sections/account-section/AccountSection'
import ContactSection from '@/common/components/common-relations/record-sections/contact-section/ContactSection'
import SectionWrapper from '@/common/components/common-relations/record-sections/section-card/SectionCard'
import type { HomeViewProps } from './types'
import { transformTaskOrApproval } from './utils'

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

export const HomeView: React.FC<HomeViewProps> = ({
  contactId,
  contact,
  rawContactData,
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
                (rawContactData as any)?.investmentAccountContact
                  ?.map((iac: any) => ({
                    id: iac.account?.id,
                    name: iac.account?.name,
                    email: iac.account?.email,
                    phone: iac.account?.phone,
                    website: iac.account?.website,
                    legalForm: iac.account?.legalForm?.value,
                    industry: iac.account?.industryClass?.value,
                    size: iac.account?.companySize?.value,
                    revenue: iac.account?.accountAnnualRevenueBand?.value,
                    numberOfEmployees: iac.account?.companySize,
                    annualRevenue: iac.account?.accountAnnualRevenueBand,
                    addresses: iac.account?.addresses
                  }))
                  .filter(Boolean) || [],
              address: (rawContactData as any)?.investmentAccountContact?.[0]?.account
                ? (() => {
                    const addresses = (rawContactData as any).investmentAccountContact[0].account.addresses || []
                    const primaryAddress = addresses.find((addr: any) => addr.addressType === 'PRIMARY_ADDRESS')
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
              accountId: (rawContactData as any)?.investmentAccountContact?.[0]?.account?.id,
              recordUrl: (rawContactData as any)?.investmentAccountContact?.[0]?.account?.id
                ? buildPlatformUrl('/platform/irm/account-record', {
                    accountId: (rawContactData as any).investmentAccountContact[0].account.id,
                    source: 'contact-relations',
                    fromEntity: 'contacts'
                  })
                : undefined,
              actionButtonProps: {
                contextsArray: [FlowContextName.customerAccountEntity],
                externalContextData: {
                  accountId: (rawContactData as any)?.investmentAccountContact?.[0]?.account?.id
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
              contact: {
                id: contact?.id,
                firstName: contact?.firstName,
                lastName: contact?.lastName,
                email: contact?.email,
                phone: contact?.phone,
                jobTitle: (contact as any)?.jobTitle || (rawContactData as any)?.jobPosition,
                department: (contact as any)?.department || (rawContactData as any)?.department,
                academicTitle: contact?.academicTitle,
                professionalTitle: contact?.professionalTitle,
                communicationChannels: rawContactData?.communicationChannels
              },
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
                contextsArray: [FlowContextName.investmentActivityEntity],
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
              tasks: tasks.map(task =>
                transformTaskOrApproval(
                  task,
                  getTranslationFromI18nKeyAndLabel('crm.common.untitledTask', 'Untitled Task')
                )
              ),
              taskActionProps: {
                ...taskActionProps,
                emptyStateBehavior: 'enable'
              },
              taskEntityActionProps: {
                contextsArray: [FlowContextName.investmentTaskEntity],
                externalContextData: { contactId },
                prefixDataTestId: 'contact-task-entity',
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
                  getTranslationFromI18nKeyAndLabel('crm.common.untitledApproval', 'Approval Request')
                )
              ),
              taskEntityActionProps: {
                contextsArray: [FlowContextName.investmentTaskEntity],
                externalContextData: { contactId },
                prefixDataTestId: 'contact-approval-entity',
                emptyStateBehavior: 'enable'
              },
              taskActionProps: {
                ...approvalActionProps,
                emptyStateBehavior: 'enable'
              }
            }
          }
        ]}
        data-testid="contact-tasks-approvals-section-wrapper"
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
                  getTranslationFromI18nKeyAndLabel('crm.common.untitledNote', 'Untitled Note'),
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
                externalContextData: { contactId },
                prefixDataTestId: 'contact-note-entity',
                emptyStateBehavior: 'enable'
              }
            }
          }
        ]}
        data-testid="contact-notes-section-wrapper"
      />
    </>
  )
}
