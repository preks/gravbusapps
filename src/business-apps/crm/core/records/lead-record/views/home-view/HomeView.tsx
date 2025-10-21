import React from 'react'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import type { TaskReference } from '@/common/components/common-relations/detail-sheets/task-detail-sheet'
import ActivitySection from '@/common/components/common-relations/record-sections/activity-section/ActivitySection'
import NoteSection from '@/common/components/common-relations/record-sections/note-section/NoteSection'
import TaskSection from '@/common/components/common-relations/record-sections/task-section/TaskSection'
import SectionWrapper from '@/common/components/common-relations/record-sections/section-card/SectionCard'
import { StatusProgression } from '../../components/StatusProgression'
import { CompanyInfoCard } from './components/CompanyInfoCard'
import { ContactInfoCard } from './components/ContactInfoCard'
import type { HomeViewProps } from './types'
import { transformTaskOrApproval } from './utils'

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
  lead,
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
  leadStatuses,
  loadingStatuses,
  onStatusUpdate,
  accessToken,
  ...props
}) => {
  return (
    <>
      {/* Status Progression - Full width at top */}
      {!loadingStatuses && leadStatuses && leadStatuses.length > 0 && lead && (
        <div className="gba:col-span-12 gba:mb-6">
          <StatusProgression
            currentStatus={rawLeadData?.leadStatus?.value || lead?.status || 'New'}
            statuses={leadStatuses}
            leadId={leadId}
            leadVersion={parseInt(lead.version) || 0}
            accessToken={accessToken}
            onStatusUpdate={onStatusUpdate}
          />
        </div>
      )}

      {/* Company Information Card - 1/3 width */}
      <div
        className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-4 gba:lg:col-span-4"
        data-testid="lead-company-info-wrapper"
      >
        <CompanyInfoCard
          companyName={rawLeadData?.companyName}
          industry={rawLeadData?.industry?.value}
          numberOfEmployees={rawLeadData?.numberOfEmployees?.value}
          annualRevenue={rawLeadData?.annualRevenue?.value}
          companyWebsite={rawLeadData?.companyWebsite}
          addressLine={rawLeadData?.addressLine}
          city={rawLeadData?.city}
          postalCode={rawLeadData?.postalCode}
          state={typeof rawLeadData?.state === 'string' ? rawLeadData.state : rawLeadData?.state?.value}
          country={typeof rawLeadData?.country === 'string' ? rawLeadData.country : rawLeadData?.country?.value}
        />
      </div>

      {/* Contact Information Card - 1/3 width */}
      <div
        className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-4 gba:lg:col-span-4"
        data-testid="lead-contact-info-wrapper"
      >
        <ContactInfoCard
          firstName={rawLeadData?.firstName}
          lastName={rawLeadData?.lastName}
          email={rawLeadData?.email}
          phoneNumber={rawLeadData?.phoneNumber}
          position={rawLeadData?.position || rawLeadData?.jobTitle}
          department={rawLeadData?.department}
        />
      </div>

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
              buildReferenceUrl,
              tasks: tasks.map((task: any) =>
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
                contextsArray: [FlowContextName.customerTaskEntity],
                externalContextData: { leadId },
                prefixDataTestId: 'lead-task-entity',
                emptyStateBehavior: 'enable'
              }
            }
          },
          {
            id: 'approval-tasks-section',
            component: TaskSection,
            props: {
              ...props,
              accessToken,
              sectionTitle: 'Approval Tasks',
              buildReferenceUrl,
              tasks: approvals.map((approval: any) =>
                transformTaskOrApproval(
                  approval,
                  getTranslationFromI18nKeyAndLabel('crm.common.untitledApproval', 'Approval Request')
                )
              ),
              taskEntityActionProps: {
                contextsArray: [FlowContextName.customerTaskEntity],
                externalContextData: { leadId },
                prefixDataTestId: 'lead-approval-entity',
                emptyStateBehavior: 'enable'
              },
              taskActionProps: {
                ...approvalActionProps,
                emptyStateBehavior: 'enable'
              }
            }
          }
        ]}
        data-testid="lead-tasks-approvals-section-wrapper"
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
              accessToken,
              notes: notes.map((note: any) => ({
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
                reminderAt: note.reminderDate
              })),
              noteActionProps: {
                ...noteActionProps,
                emptyStateBehavior: 'enable'
              },
              noteEntityActionProps: noteActionProps
            }
          }
        ]}
        data-testid="lead-notes-section-wrapper"
      />
    </>
  )
}
