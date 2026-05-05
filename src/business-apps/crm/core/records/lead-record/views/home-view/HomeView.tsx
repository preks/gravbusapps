import React, { useCallback } from 'react'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { buildCrmRelatedEntityRecordUrl } from '@/common/utils/relatedEntityRecordUrls'
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
import { TASK_TYPE, TASK_PRIORITY, ACTIVITY_TYPE } from '@/common/data/customer/constants/customerCatalogs'
import {
  APPROVAL_TASK_TYPE_REF,
  APP_NAME,
  FILE_CONTEXT,
  getFileEntityFromType
} from '@/common/data/customer/constants/customerConstants'
import { getReferenceEntityType } from '@/common/data/customer/utils/referenceEntityUtils'
import { createFormPreSubmitHandler } from '@/common/data/relations/utils/formPreSubmitUtils'
import { useFileClient } from '@/common/network/files/useFileClient'
import { buildCustomerTaskPayload } from '@/common/data/customer/types/customerTaskTypes'
import { buildCustomerActivityPayload } from '@/common/data/customer/types/customerActivityTypes'
import { buildCustomerNotePayload } from '@/common/data/customer/types/customerNoteTypes'

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
  userInfo,
  ...props
}) => {
  const fileClient = useFileClient({ accessToken, userInfo })
  const taskPreSubmit = useCallback(
    createFormPreSubmitHandler({
      userInfo,
      fileClient,
      fileContext: FILE_CONTEXT.TASK,
      appName: APP_NAME,
      getFileEntityFromType,
      getReferenceEntityType,
      useCreatorFields: true
    }),
    [userInfo, fileClient]
  )
  const activityPreSubmit = useCallback(
    createFormPreSubmitHandler({
      userInfo,
      fileClient,
      fileContext: FILE_CONTEXT.ACTIVITY,
      appName: APP_NAME,
      getFileEntityFromType,
      getReferenceEntityType,
      useCreatorFields: true
    }),
    [userInfo, fileClient]
  )
  const notePreSubmit = useCallback(
    createFormPreSubmitHandler({
      userInfo,
      fileClient,
      fileContext: FILE_CONTEXT.NOTE,
      appName: APP_NAME,
      getFileEntityFromType,
      getReferenceEntityType,
      useCreatorFields: false
    }),
    [userInfo, fileClient]
  )

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
                  ...props,
                  accessToken,
                  account: buildCustomerAccountFromLead(rawLeadData),
                  accounts: rawLeadData ? [buildCustomerAccountFromLead(rawLeadData)].filter(Boolean) : undefined
                }
              }
            ]}
            data-testid="lead-account-section-wrapper"
          />

          {/* Contact Section - 1/4 width */}
          <SectionWrapper
            className="gba:min-h-96 gba:max-h-96"
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
        </div>

        {/* Tasks & Approvals - stretches to align with the right column */}
        <SectionWrapper
          className="gba:min-h-96 gba:flex-1"
          sections={[
            {
              id: 'tasks-section',
              component: TaskSection,
              props: {
                ...props,
                accessToken,
                userInfo,
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
                typeCatalog: TASK_TYPE,
                priorityCatalog: TASK_PRIORITY,
                buildTaskPayload: buildCustomerTaskPayload,
                defaultTaskStatusRef: 'SalesTaskStatus:v1:IN_PROGRESS',
                preSubmit: taskPreSubmit,
                'data-testid': 'lead-tasks-section'
              }
            },
            {
              id: 'approvals-section',
              component: TaskSection,
              props: {
                ...props,
                accessToken,
                userInfo,
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
                typeCatalog: TASK_TYPE,
                buildTaskPayload: buildCustomerTaskPayload,
                priorityCatalog: TASK_PRIORITY,
                isApprovalTaskSection: true,
                approvalTaskTypeRef: APPROVAL_TASK_TYPE_REF,
                defaultTaskStatusRef: 'SalesTaskStatus:v1:IN_PROGRESS',
                preSubmit: taskPreSubmit,
                'data-testid': 'lead-approvals-section'
              }
            }
          ]}
          data-testid="lead-tasks-approvals-section-wrapper"
        />
      </div>

      {/* Activities & Notes Section - 1/2 width, stretches with left column */}
      <SectionWrapper
        className="gba:min-h-196 gba:h-full gba:lg:col-span-6"
        sections={[
          {
            id: 'activities-section',
            component: ActivitySection,
            props: {
              ...props,
              accessToken,
              userInfo,
              leadId,
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
              },
              activityTypeCatalog: ACTIVITY_TYPE,
              buildActivityPayload: buildCustomerActivityPayload,
              preSubmit: activityPreSubmit,
              getRelatedRecordUrl: buildCrmRelatedEntityRecordUrl
            }
          },
          {
            id: 'notes-section',
            component: NoteSection as React.ComponentType<any>,
            props: {
              ...props,
              accessToken,
              leadId,
              preSubmit: notePreSubmit,
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
              buildNotePayload: buildCustomerNotePayload,
              'data-testid': 'lead-notes-section'
            }
          }
        ]}
        data-testid="lead-activities-notes-section-wrapper"
      />
    </div>
  )
}
