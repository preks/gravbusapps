import React, { useCallback, useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import type { TaskReference } from '@/common/components/common-relations/detail-sheets/task-detail-sheet'
import AccountSection from '@/common/components/common-relations/record-sections/account-section/AccountSection'
import ContactSection from '@/common/components/common-relations/record-sections/contact-section/ContactSection'
import ConditionSection from '@/common/components/common-relations/record-sections/condition-section/ConditionSection'
import ActivitySection from '@/common/components/common-relations/record-sections/activity-section/ActivitySection'
import NoteSection from '@/common/components/common-relations/record-sections/note-section/NoteSection'
import TaskSection from '@/common/components/common-relations/record-sections/task-section/TaskSection'
import SectionWrapper from '@/common/components/common-relations/record-sections/section-card/SectionCard'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { TASK_TYPE, TASK_PRIORITY, ACTIVITY_TYPE } from '@/common/data/customer/constants/customerCatalogs'
import {
  APPROVAL_TASK_TYPE_REF,
  FILE_CONTEXT,
  APP_NAME,
  getFileEntityFromType
} from '@/common/data/customer/constants/customerConstants'
import { buildCustomerTaskPayload } from '@/common/data/customer/types/customerTaskTypes'
import { buildCustomerActivityPayload } from '@/common/data/customer/types/customerActivityTypes'
import noteSectionI18n from '@/common/components/common-relations/record-sections/note-section/_i18n'
import {
  buildCustomerNotePayload,
  buildCustomerNextStepNotePayload,
  isCrmNoteNextStepType,
  isCrmNoteRegularType
} from '@/common/data/customer/types/customerNoteTypes'
import { getReferenceEntityType } from '@/common/data/customer/utils/referenceEntityUtils'
import { createFormPreSubmitHandler } from '@/common/data/relations/utils/formPreSubmitUtils'
import { useFileClient } from '@/common/network/files/useFileClient'

interface HomeViewProps extends BusinessAppContextProps {
  opportunityId: string
  opportunityData: any
  activities: any[]
  notes: any[]
  tasks: any[]
  approvals: any[]
  stageConditionStatuses: any[]
  activitiesLoading: boolean
  activitiesError: string | null
  loadActivities: () => void
  stageConditionActionProps: any
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
  opportunityId,
  opportunityData,
  activities,
  notes,
  tasks,
  approvals,
  stageConditionStatuses,
  activitiesLoading,
  activitiesError,
  loadActivities,
  stageConditionActionProps,
  accessToken,
  ...props
}) => {
  const { t } = useTranslation(noteSectionI18n)
  const regularOpportunityNotes = useMemo(() => (notes ?? []).filter(isCrmNoteRegularType), [notes])
  const nextStepOpportunityNotes = useMemo(() => (notes ?? []).filter(isCrmNoteNextStepType), [notes])

  const fileClient = useFileClient({ accessToken, userInfo: props.userInfo })
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
      entityId: opportunityId,
      getFileEntityFromType,
      getReferenceEntityType,
      useCreatorFields: true
    }),
    [props.userInfo, fileClient, opportunityId]
  )
  const notePreSubmit = useCallback(
    createFormPreSubmitHandler({
      userInfo: props.userInfo,
      fileClient,
      fileContext: FILE_CONTEXT.NOTE,
      appName: APP_NAME,
      entityId: opportunityId,
      getFileEntityFromType,
      getReferenceEntityType,
      useCreatorFields: false
    }),
    [props.userInfo, fileClient, opportunityId]
  )

  return (
    <>
      {/* Account Information - 1/4 width */}
      <SectionWrapper
        className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-3 gba:lg:col-span-3 gba:row-span-1 gba:min-h-96 gba:max-h-96"
        sections={[
          {
            id: 'account-section',
            component: AccountSection,
            props: {
              ...props,
              accessToken,
              // Transform junction table to include account type
              accounts:
                opportunityData?.opportunityAccounts
                  ?.map(junction => ({
                    ...junction.account,
                    accountType: junction.accountType // Add catalog entry from junction table
                  }))
                  .filter(Boolean) || [],
              account: opportunityData?.opportunityAccounts?.[0]
                ? {
                    ...opportunityData.opportunityAccounts[0].account,
                    accountType: opportunityData.opportunityAccounts[0].accountType
                  }
                : undefined,
              accountId: opportunityData?.opportunityAccounts?.[0]?.accountId,
              recordUrl: opportunityData?.opportunityAccounts?.[0]?.accountId
                ? buildPlatformUrl('/platform/crm/account-record', {
                    accountId: opportunityData.opportunityAccounts[0].accountId,
                    source: 'opportunity-relations',
                    fromEntity: 'opportunities'
                  })
                : undefined,
              actionButtonProps: {
                contextsArray: [FlowContextName.customerAccountEntity],
                externalContextData: {
                  accountId: opportunityData?.opportunityAccounts?.[0]?.accountId
                },
                prefixDataTestId: 'customer-opportunity-account-action'
              }
            }
          }
        ]}
        data-testid="opportunity-account-section-wrapper"
      />

      {/* Contact Information - 1/4 width */}
      <SectionWrapper
        className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-3 gba:lg:col-span-3 gba:row-span-1 gba:min-h-96 gba:max-h-96"
        sections={[
          {
            id: 'contact-section',
            component: ContactSection,
            props: {
              ...props,
              accessToken,
              contacts:
                opportunityData?.opportunityContacts
                  ?.map((oc: any) => ({
                    ...oc.contact,
                    jobPosition: oc.contact?.jobTitle, // Map CRM jobTitle to jobPosition for ContactSection
                    contactType: oc.contactType
                  }))
                  .filter(Boolean) || [],
              contactId: opportunityData?.opportunityContacts?.[0]?.contact?.id,
              recordUrl: opportunityData?.opportunityContacts?.[0]?.contact?.id
                ? buildPlatformUrl('/platform/crm/contact-record', {
                    contactId: opportunityData.opportunityContacts[0].contact.id,
                    source: 'opportunity-relations',
                    fromEntity: 'opportunities'
                  })
                : undefined,
              actionButtonProps: {
                contextsArray: [FlowContextName.customerContactEntity],
                externalContextData: {
                  contactId: opportunityData?.opportunityContacts?.[0]?.contact?.id,
                  version: opportunityData?.opportunityContacts?.[0]?.contact?.version
                },
                prefixDataTestId: 'customer-opportunity-contact-action'
              }
            }
          }
        ]}
        data-testid="opportunity-contact-section-wrapper"
      />

      {/* Stage Condition Card - 2/4 width (half) - matching IRM Lead Investment Section position */}
      <SectionWrapper
        className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-6 gba:lg:col-span-6 gba:row-span-1 gba:min-h-96 gba:max-h-96"
        sections={[
          {
            id: 'stage-condition-section',
            component: ConditionSection,
            props: {
              ...props,
              accessToken,
              // Data is already mapped by toCustomerOpportunity
              opportunity: opportunityData,
              stageConditionStatuses: stageConditionStatuses || [],
              stageConditionActionProps: {
                ...stageConditionActionProps,
                emptyStateBehavior: 'enable'
              }
            }
          }
        ]}
        data-testid="opportunity-stage-condition-section-wrapper"
      />

      {/* Tasks & Approvals - 1/2 width, spans 2 rows - matching IRM Lead layout */}
      <SectionWrapper
        className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-6 gba:lg:col-span-6 gba:row-span-2"
        sections={[
          {
            id: 'tasks-section',
            component: TaskSection,
            props: {
              ...props,
              accessToken,
              opportunityId: opportunityId,
              buildReferenceUrl,
              tasks: tasks,
              taskActionProps: {
                contextsArray: [FlowContextName.customerTaskCreate],
                externalContextData: { opportunityId },
                prefixDataTestId: 'opportunity-tasks',
                emptyStateBehavior: 'enable'
              },
              taskEntityActionProps: {
                contextsArray: [FlowContextName.customerTaskEntity],
                externalContextData: { opportunityId },
                prefixDataTestId: 'opportunity-task-entity',
                emptyStateBehavior: 'enable'
              },
              typeCatalog: TASK_TYPE,
              priorityCatalog: TASK_PRIORITY,
              buildTaskPayload: buildCustomerTaskPayload,
              defaultTaskStatusRef: 'SalesTaskStatus:v1:IN_PROGRESS',
              preSubmit: taskPreSubmit
            }
          },
          {
            id: 'approval-tasks-section',
            component: TaskSection,
            props: {
              ...props,
              accessToken,
              sectionTitle: 'Approval Tasks',
              opportunityId: opportunityId,
              buildReferenceUrl,
              tasks: approvals,
              taskEntityActionProps: {
                contextsArray: [FlowContextName.customerTaskEntity],
                externalContextData: { opportunityId },
                prefixDataTestId: 'opportunity-approval-entity',
                emptyStateBehavior: 'enable'
              },
              taskActionProps: {
                contextsArray: [FlowContextName.customerTaskCreate],
                externalContextData: {
                  opportunityId,
                  opportunity: opportunityId,
                  typeRef: APPROVAL_TASK_TYPE_REF,
                  salesTask: { opportunity: opportunityId, type: APPROVAL_TASK_TYPE_REF }
                },
                prefixDataTestId: 'opportunity-approvals',
                emptyStateBehavior: 'enable'
              },
              typeCatalog: TASK_TYPE,
              priorityCatalog: TASK_PRIORITY,
              buildTaskPayload: buildCustomerTaskPayload,
              isApprovalTaskSection: true,
              approvalTaskTypeRef: APPROVAL_TASK_TYPE_REF,
              defaultTaskStatusRef: 'SalesTaskStatus:v1:IN_PROGRESS',
              preSubmit: taskPreSubmit
            }
          }
        ]}
        data-testid="opportunity-tasks-approvals-section-wrapper"
      />

      {/* Activities & Notes - 1/2 width, spans 2 rows - matching IRM Lead layout */}
      <SectionWrapper
        className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-6 gba:lg:col-span-6 gba:row-span-2"
        sections={[
          {
            id: 'activities-section',
            component: ActivitySection,
            props: {
              ...props,
              accessToken,
              opportunityId,
              activities: activities,
              activitiesLoading: activitiesLoading,
              activitiesError: activitiesError,
              onReloadActivities: loadActivities,
              activitySectionActionProps: {
                contextsArray: [FlowContextName.customerActivityCreate],
                externalContextData: {
                  opportunityId,
                  opportunity: opportunityId,
                  salesActivity: { opportunity: opportunityId },
                  // Set current user as default owner
                  ...(props.userInfo?.employeeDetails?.employeeId && {
                    ownerEmployeeId: props.userInfo.employeeDetails.employeeId
                  })
                },
                prefixDataTestId: 'opportunity-activities',
                emptyStateBehavior: 'enable'
              },
              activityEntityActionProps: {
                contextsArray: [FlowContextName.customerActivityEntity],
                externalContextData: { opportunityId },
                prefixDataTestId: 'opportunity-activity-entity',
                emptyStateBehavior: 'enable'
              },
              activityTypeCatalog: ACTIVITY_TYPE,
              buildActivityPayload: buildCustomerActivityPayload,
              alignment: 'right',
              preSubmit: activityPreSubmit
            }
          },
          {
            id: 'notes-section',
            component: NoteSection as React.ComponentType<any>,
            props: {
              ...props,
              accessToken,
              opportunityId,
              notes: regularOpportunityNotes,
              noteActionProps: {
                contextsArray: [FlowContextName.customerNoteCreate],
                externalContextData: { opportunityId },
                prefixDataTestId: 'opportunity-notes',
                emptyStateBehavior: 'enable'
              },
              noteEntityActionProps: {
                contextsArray: [FlowContextName.customerNoteEntity],
                externalContextData: { opportunityId },
                prefixDataTestId: 'opportunity-note-entity',
                emptyStateBehavior: 'enable'
              },
              buildNotePayload: buildCustomerNotePayload,
              preSubmit: notePreSubmit
            }
          },
          {
            id: 'next-steps-section',
            component: NoteSection as React.ComponentType<any>,
            props: {
              ...props,
              accessToken,
              opportunityId,
              sectionTitle: t('notes-next-steps-section-title'),
              emptyStateTitle: t('notes-next-steps-empty-title'),
              emptyStateDescription: t('notes-next-steps-empty-description'),
              quickAddTriggerLabel: t('notes-next-steps-add-quick'),
              notes: nextStepOpportunityNotes,
              noteActionProps: {
                contextsArray: [FlowContextName.customerNoteCreate],
                externalContextData: {
                  opportunityId,
                  opportunity: opportunityId,
                  crmNote: { opportunity: opportunityId, noteType: 'NEXT_STEP_NOTE' }
                },
                prefixDataTestId: 'opportunity-next-steps',
                emptyStateBehavior: 'enable'
              },
              noteEntityActionProps: {
                contextsArray: [FlowContextName.customerNoteEntity],
                externalContextData: { opportunityId },
                prefixDataTestId: 'opportunity-next-step-entity',
                emptyStateBehavior: 'enable'
              },
              buildNotePayload: buildCustomerNextStepNotePayload,
              preSubmit: notePreSubmit
            }
          }
        ]}
        data-testid="opportunity-activities-notes-section-wrapper"
      />
    </>
  )
}
