import React, { useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { buildCrmRelatedEntityRecordUrl } from '@/common/utils/relatedEntityRecordUrls'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import type { CustomerContact } from '@/common/data/customer/types/customerContactTypes'
import type { CustomerActivity } from '@/common/data/customer/types/customerActivityTypes'
import type { CustomerTask } from '@/common/data/customer/types/customerTaskTypes'
import { buildCustomerTaskPayload } from '@/common/data/customer/types/customerTaskTypes'
import { buildCustomerActivityPayload } from '@/common/data/customer/types/customerActivityTypes'
import { buildCustomerNotePayload } from '@/common/data/customer/types/customerNoteTypes'
import {
  FILE_CONTEXT,
  APP_NAME,
  getFileEntityFromType,
  APPROVAL_TASK_TYPE_REF
} from '@/common/data/customer/constants/customerConstants'
import { getReferenceEntityType } from '@/common/data/customer/utils/referenceEntityUtils'
import { createFormPreSubmitHandler } from '@/common/data/relations/utils/formPreSubmitUtils'
import { useFileClient } from '@/common/network/files/useFileClient'
import type { CustomerNote } from '@/common/data/customer/hooks/useCustomerNotes'
import type { TaskReference } from '@/common/components/common-relations/detail-sheets/task-detail-sheet'
import type { AppActionCommonProps } from '@/common/hooks/useAppActionData'
import ActivitySection from '@/common/components/common-relations/record-sections/activity-section/ActivitySection'
import NoteSection from '@/common/components/common-relations/record-sections/note-section/NoteSection'
import TaskSection from '@/common/components/common-relations/record-sections/task-section/TaskSection'
import AccountSection from '@/common/components/common-relations/record-sections/account-section/AccountSection'
import ContactSection from '@/common/components/common-relations/record-sections/contact-section/ContactSection'
import { useRecordSectionDisplayConfig } from '@/common/components/common-relations/record-sections/section-display'
import SectionWrapper from '@/common/components/common-relations/record-sections/section-card/SectionCard'
import { TASK_TYPE, TASK_PRIORITY, ACTIVITY_TYPE } from '@/common/data/customer/constants/customerCatalogs'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'
import { RecordSectionsRefreshProvider } from '@/common/components/common-relations/record-sections/RecordSectionsRefreshContext'

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
  const sectionDisplay = useRecordSectionDisplayConfig()
  const docuSignEnabled = useFeature<boolean>(Feature.CRM.DocuSign.Key) === true
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

  return (
    <RecordSectionsRefreshProvider value={loadSectionData}>
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
                    ...sectionDisplay.relatedAccounts,
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

            {/* Contact Section - 1/4 width */}
            <SectionWrapper
              className="gba:min-h-96 gba:max-h-96"
              sections={[
                {
                  id: 'contact-section',
                  component: ContactSection,
                  props: {
                    ...props,
                    ...sectionDisplay.contactInformation,
                    contact: contact,
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
                  contactId,
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
                  typeCatalog: TASK_TYPE,
                  priorityCatalog: TASK_PRIORITY,
                  buildTaskPayload: buildCustomerTaskPayload,
                  defaultTaskStatusRef: 'SalesTaskStatus:v1:IN_PROGRESS',
                  preSubmit: taskPreSubmit,
                  docuSignEnabled,
                  'data-testid': 'contact-tasks-section'
                }
              },
              {
                id: 'approvals-section',
                component: TaskSection,
                props: {
                  ...props,
                  contactId,
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
                  typeCatalog: TASK_TYPE,
                  priorityCatalog: TASK_PRIORITY,
                  buildTaskPayload: buildCustomerTaskPayload,
                  isApprovalTaskSection: true,
                  approvalTaskTypeRef: APPROVAL_TASK_TYPE_REF,
                  defaultTaskStatusRef: 'SalesTaskStatus:v1:IN_PROGRESS',
                  preSubmit: taskPreSubmit,
                  docuSignEnabled,
                  'data-testid': 'contact-approvals-section'
                }
              }
            ]}
            data-testid="contact-tasks-approvals-section-wrapper"
          />
        </div>

        {/* Activities & Notes Section - 1/2 width, stretches with left column */}
        <SectionWrapper
          className="gba:min-h-196 gba:h-full gba:lg:col-span-6"
          sections={[
            {
              id: 'activities-section',
              component: ActivitySection as React.ComponentType<any>,
              props: {
                ...props,
                contactId,
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
                contactId,
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
                buildNotePayload: buildCustomerNotePayload,
                preSubmit: notePreSubmit,
                'data-testid': 'contact-notes-section'
              }
            }
          ]}
          data-testid="contact-activities-notes-section-wrapper"
        />
      </div>
    </RecordSectionsRefreshProvider>
  )
}
