import React, { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { buildPlatformUrl } from '@/common/utils/navigationUtils';
import { useGetInvestmentTasksByInvestmentId } from '../../hooks/useInvestmentTasksByInvestmentId';
import { useGetInvestmentActivitiesByInvestmentId } from '../../hooks/useInvestmentActivitiesByInvestmentId';
import { useGetInvestmentNotesByInvestmentId } from '../../hooks/useInvestmentNotesByInvestmentId';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import AccountSection from "@/common/components/common-relations/record-sections/account-section/AccountSection";
import ContactSection from "@/common/components/common-relations/record-sections/contact-section/ContactSection";
import ActivitySection from "@/common/components/common-relations/record-sections/activity-section/ActivitySection";
import NoteSection from "@/common/components/common-relations/record-sections/note-section/NoteSection";
import TaskSection from "@/common/components/common-relations/record-sections/task-section/TaskSection";
import SectionWrapper from "@/common/components/common-relations/record-sections/section-card/SectionCard";
import type { TaskReference } from '@/common/components/common-relations/detail-sheets/task-detail-sheet';

interface InvestmentHomeTabProps extends BusinessAppContextProps {
  investmentId: string;
  investment?: any;
}

export const InvestmentHomeTab: React.FC<InvestmentHomeTabProps> = ({ 
  investmentId,
  investment,
  ...context 
}) => {
  // Real data state
  const [tasks, setTasks] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  
  // Build reference URLs for IRM context
  const buildReferenceUrl = (reference: TaskReference): string => {
    switch (reference.type) {
      case 'lead': 
        return buildPlatformUrl('/platform/irm/lead-record', { leadId: reference.id });
      case 'account': 
        return buildPlatformUrl('/platform/irm/account-record', { accountId: reference.id });
      case 'contact': 
        return buildPlatformUrl('/platform/irm/contact-record', { contactId: reference.id });
      case 'opportunity': 
        return buildPlatformUrl('/platform/irm/opportunity-record', { opportunityId: reference.id });
      case 'investment':
        return buildPlatformUrl('/platform/irm/investment-record', { investmentId: reference.id });
      default: 
        return '';
    }
  };
  
  
  const { fetchInvestmentTasksByInvestmentId } = useGetInvestmentTasksByInvestmentId(context);
  const { fetchInvestmentActivitiesByInvestmentId } = useGetInvestmentActivitiesByInvestmentId(context);
  const { fetchInvestmentNotesByInvestmentId } = useGetInvestmentNotesByInvestmentId(context);

  const loadTasks = useCallback(async () => {
    if (!investmentId) return;
    
    try {
      const tasksData = await fetchInvestmentTasksByInvestmentId(investmentId);
      // Filter out approval tasks - only show regular tasks
      const regularTasks = (tasksData || []).filter((task: any) => {
        const taskTypeCode = task?.taskType?.code || '';
        const taskTypeValue = task?.taskType?.value || '';
        return taskTypeCode?.toUpperCase() !== 'APPROVAL' && taskTypeValue?.toUpperCase() !== 'APPROVAL';
      });
      setTasks(regularTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  }, [investmentId, fetchInvestmentTasksByInvestmentId]);

  const loadActivities = useCallback(async () => {
    if (!investmentId) return;
    
    setActivitiesLoading(true);
    setActivitiesError(null);
    
    try {
      const activitiesData = await fetchInvestmentActivitiesByInvestmentId(investmentId);
      setActivities(activitiesData || []);
    } catch (error) {
      console.error('Error loading activities:', error);
      setActivitiesError(error instanceof Error ? error.message : 'Failed to load activities');
    } finally {
      setActivitiesLoading(false);
    }
  }, [investmentId, fetchInvestmentActivitiesByInvestmentId]);

  const loadNotes = useCallback(async () => {
    if (!investmentId) return;
    
    try {
      const notesData = await fetchInvestmentNotesByInvestmentId(investmentId);
      setNotes(notesData || []);
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  }, [investmentId, fetchInvestmentNotesByInvestmentId]);

  const loadApprovals = useCallback(async () => {
    if (!investmentId) return;
    
    try {
      const tasksData = await fetchInvestmentTasksByInvestmentId(investmentId);
      // Filter only approval tasks - taskType code or value must be 'APPROVAL'
      const approvalTasks = (tasksData || []).filter((task: any) => {
        const taskTypeCode = task?.taskType?.code || '';
        const taskTypeValue = task?.taskType?.value || '';
        return taskTypeCode?.toUpperCase() === 'APPROVAL' || taskTypeValue?.toUpperCase() === 'APPROVAL';
      });
      setApprovals(approvalTasks);
    } catch (err) {
      // Failed to load approvals
    }
  }, [investmentId, fetchInvestmentTasksByInvestmentId]);

  // Handle process events
  const handleProcessEvent = useCallback((event: Event) => {
    try {
      const customEvent = event as CustomEvent;
      
      // Check for successful completion
      if (customEvent.detail?.resolution === 'success') {
        loadTasks();
        loadActivities();
        loadNotes();
        loadApprovals();
        return;
      }
      
      // Check for different event structures
      const response = customEvent.detail?.response;
      if (response?.detail?.resolution === 'success' || response?.investment) {
        loadTasks();
        loadActivities();
        loadNotes();
        loadApprovals();
        return;
      }
      
      // Check for continue events with payload (task/activity/note creation/update)
      if (customEvent.type === 'com.newwork.process.continue' && customEvent.detail?.payload) {
        loadTasks();
        loadActivities();
        loadNotes();
        loadApprovals();
        return;
      }
      
      // Handle process completion events by investmentId (legacy support)
      if (customEvent.detail?.investmentId === investmentId) {
        loadTasks();
        loadActivities();
        loadNotes();
        loadApprovals();
      }
    } catch (err) {
      console.error('Error handling process event in InvestmentHomeTab:', err);
    }
  }, [investmentId, loadTasks, loadActivities, loadNotes, loadApprovals]);

  useEffect(() => {
    loadTasks();
    loadActivities();
    loadNotes();
    loadApprovals();
  }, [loadTasks, loadActivities, loadNotes, loadApprovals]);

  // Listen for process events to refresh data
  useEffect(() => {
    const eventTypes = [
      'com.newwork.process.continue',
      'com.newwork.process.processCompletion',
      'com.newwork.process.taskCompletion',
      'com.newwork.process.completion',
      'processCompletion',
      'taskCompletion',
      'taskCompleted',
      'processCompleted'
    ];
    
    eventTypes.forEach(eventType => {
      window.addEventListener(eventType, handleProcessEvent);
    });
    
    return () => {
      eventTypes.forEach(eventType => {
        window.removeEventListener(eventType, handleProcessEvent);
      });
    };
  }, [handleProcessEvent]);

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
              ...context,
              account: investment?.investmentAccount ? {
                id: investment.investmentAccount.id,
                name: investment.investmentAccount.name,
                email: investment.investmentAccount.email,
                phone: investment.investmentAccount.phone,
                website: investment.investmentAccount.website,
                legalForm: investment.investmentAccount.legalForm?.value,
                industry: investment.investmentAccount.industryClass?.value,
                size: investment.investmentAccount.companySize?.value,
                revenue: investment.investmentAccount.accountAnnualRevenueBand?.value,
                numberOfEmployees: investment.investmentAccount.companySize,
                annualRevenue: investment.investmentAccount.accountAnnualRevenueBand,
              } : undefined,
              address: investment?.investmentAccount ? (() => {
                const addresses = investment.investmentAccount.addresses || [];
                const primaryAddress = addresses.find((addr: any) => addr.addressType === 'PRIMARY_ADDRESS');
                const address = primaryAddress || addresses[0];

                return address ? {
                  addressLine: address.addressLine,
                  postalCode: address.postalCode,
                  locality: address.locality,
                  country: typeof address.country === 'string' ? address.country : address.country?.value,
                  region: typeof address.region === 'string' ? address.region : address.region?.value,
                } : undefined;
              })() : undefined,
              accountId: investment?.investmentAccount?.id,
              recordUrl: investment?.investmentAccount?.id
                ? buildPlatformUrl('/platform/irm/account-record', {
                    accountId: investment.investmentAccount.id,
                    source: 'investment-relations',
                    fromEntity: 'investments'
                  })
                : undefined,
              actionButtonProps: investment?.investmentAccount?.id ? {
                contextsArray: [FlowContextName.investmentAccountEntity],
                externalContextData: { accountId: investment.investmentAccount.id },
                prefixDataTestId: "investment-record-account-action"
              } : undefined
            }
          }
        ]}
        data-testid="investment-account-section-wrapper"
      />

      {/* Contact Section - 1/3 width */}
      <SectionWrapper
        className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-4 gba:lg:col-span-4 gba:row-span-1"
        sections={[
          {
            id: 'contact-section',
            component: ContactSection,
            props: {
              ...context,
              contact: {
                id: investment?.investmentAccount?.investmentAccountContact?.[0]?.contact?.id || null,
                firstName: investment?.investmentAccount?.investmentAccountContact?.[0]?.contact?.firstName || null,
                lastName: investment?.investmentAccount?.investmentAccountContact?.[0]?.contact?.lastName || null,
                email: investment?.investmentAccount?.investmentAccountContact?.[0]?.contact?.email || null,
                phone: investment?.investmentAccount?.investmentAccountContact?.[0]?.contact?.phone || null,
                jobTitle: investment?.investmentAccount?.investmentAccountContact?.[0]?.contact?.jobPosition || null,
                department: investment?.investmentAccount?.investmentAccountContact?.[0]?.contact?.department || null,
                communicationChannels: investment?.investmentAccount?.investmentAccountContact?.[0]?.contact?.communicationChannels || null
              },
              contactId: investment?.investmentAccount?.investmentAccountContact?.[0]?.contact?.id || null,
              recordUrl: investment?.investmentAccount?.investmentAccountContact?.[0]?.contact?.id
                ? buildPlatformUrl('/platform/irm/contact-record', {
                    contactId: investment.investmentAccount.investmentAccountContact[0].contact.id,
                    source: 'investment-relations',
                    fromEntity: 'investments'
                  })
                : undefined,
              actionButtonProps: investment?.investmentAccount?.investmentAccountContact?.[0]?.contact?.id ? {
                contextsArray: [FlowContextName.investmentContactEntity],
                externalContextData: { contactId: investment.investmentAccount.investmentAccountContact[0].contact.id },
                prefixDataTestId: "investment-record-contact-action"
              } : undefined
            }
          }
        ]}
        data-testid="investment-contact-section-wrapper"
      />

      {/* Activities Section - 1/3 width, full height */}
      <SectionWrapper
        className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-4 gba:lg:col-span-4 gba:row-span-5"
        sections={[
          {
            id: 'activities-section',
            component: ActivitySection,
            props: {
              ...context,
              activities: activities,
              activitiesLoading: activitiesLoading,
              activitiesError: activitiesError,
              onReloadActivities: loadActivities,
              activitySectionActionProps: {
                contextsArray: [FlowContextName.createInvestmentActivity],
                externalContextData: { investmentId },
                prefixDataTestId: "investment-activity",
                emptyStateBehavior: 'enable'
              },
              activityEntityActionProps: {
                contextsArray: [FlowContextName.investmentActivityEntity],
                externalContextData: { investmentId },
                prefixDataTestId: "investment-activity-entity",
                emptyStateBehavior: 'enable'
              }
            }
          }
        ]}
        data-testid="investment-activities-section-wrapper"
      />

      {/* Tasks & Approvals - 2/3 width, spans 2 rows */}
      <SectionWrapper
        className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-8 gba:lg:col-span-8 gba:row-span-2"
        sections={[
          {
            id: 'tasks-section',
            component: TaskSection,
            props: {
              ...context,
              buildReferenceUrl,
              tasks: tasks.map(task => ({
                id: task.id,
                title: task.title || task.name || getTranslationFromI18nKeyAndLabel('crm.common.untitledTask', 'Untitled Task'),
                description: task.description,
                createdAt: task.createdAt,
                due: task.dueDate,
                assignee: task.assignedDisplayName,
                statusCode: (task.statusCode || task.status || task.taskStatus?.code || task.taskStatus?.value || 'PENDING') as any,
                taskStatus: task.taskStatus,
                taskPriority: task.taskPriority,
                assigneeEmployee: task.assignedEmployee,
                reference: task.lead ? {
                  type: 'lead' as const,
                  id: task.lead.id,
                  name: `${task.lead.firstName || ''} ${task.lead.lastName || ''}`.trim() || task.lead.code || 'Lead'
                } : task.account ? {
                  type: 'account' as const,
                  id: task.account.id,
                  name: task.account.name || task.account.code || 'Account'
                } : task.contact ? {
                  type: 'contact' as const,
                  id: task.contact.id,
                  name: `${task.contact.firstName || ''} ${task.contact.lastName || ''}`.trim() || task.contact.code || 'Contact'
                } : task.opportunity ? {
                  type: 'opportunity' as const,
                  id: task.opportunity.id,
                  name: task.opportunity.name || task.opportunity.code || 'Opportunity'
                } : task.investment ? {
                  type: 'investment' as const,
                  id: task.investment.id,
                  name: task.investment.name || task.investment.code || 'Investment'
                } : undefined
              })),
              taskActionProps: {
                contextsArray: [FlowContextName.investmentTaskCreate],
                externalContextData: { investmentId },
                prefixDataTestId: "investment-task",
                emptyStateBehavior: 'enable'
              },
              taskEntityActionProps: {
                contextsArray: [FlowContextName.investmentTaskEntity],
                externalContextData: { investmentId },
                prefixDataTestId: "investment-task-entity",
                emptyStateBehavior: 'enable'
              }
            }
          },
          {
            id: 'approval-tasks-section',
            component: TaskSection,
            props: {
              ...context,
              sectionTitle: 'Approval Tasks',
              buildReferenceUrl,
              tasks: approvals.map(approval => ({
                id: approval.id,
                title: approval.title || approval.name || getTranslationFromI18nKeyAndLabel('crm.common.untitledApproval', 'Approval Task'),
                description: approval.description,
                createdAt: approval.createdAt,
                due: approval.dueDate,
                assignee: approval.assignedDisplayName,
                statusCode: (approval.statusCode || approval.status || approval.taskStatus?.code || approval.taskStatus?.value || 'PENDING') as any,
                taskStatus: approval.taskStatus,
                taskPriority: approval.taskPriority,
                assigneeEmployee: approval.assignedEmployee,
                reference: approval.lead ? {
                  type: 'lead' as const,
                  id: approval.lead.id,
                  name: `${approval.lead.firstName || ''} ${approval.lead.lastName || ''}`.trim() || approval.lead.code || 'Lead'
                } : approval.account ? {
                  type: 'account' as const,
                  id: approval.account.id,
                  name: approval.account.name || approval.account.code || 'Account'
                } : approval.contact ? {
                  type: 'contact' as const,
                  id: approval.contact.id,
                  name: `${approval.contact.firstName || ''} ${approval.contact.lastName || ''}`.trim() || approval.contact.code || 'Contact'
                } : approval.opportunity ? {
                  type: 'opportunity' as const,
                  id: approval.opportunity.id,
                  name: approval.opportunity.name || approval.opportunity.code || 'Opportunity'
                } : approval.investment ? {
                  type: 'investment' as const,
                  id: approval.investment.id,
                  name: approval.investment.name || approval.investment.code || 'Investment'
                } : undefined
              })),
              taskActionProps: {
                contextsArray: [FlowContextName.investmentTaskCreate],
                externalContextData: { 
                  investmentId,
                  typeRef: 'InvestmentTaskType:v1:APPROVAL',
                  investmentTask: { investment: investmentId, type: 'InvestmentTaskType:v1:APPROVAL' }
                },
                prefixDataTestId: "investment-approval",
                emptyStateBehavior: 'enable'
              },
              taskEntityActionProps: {
                contextsArray: [FlowContextName.investmentTaskEntity],
                externalContextData: { investmentId },
                prefixDataTestId: "investment-approval-entity",
                emptyStateBehavior: 'enable'
              }
            }
          }
        ]}
        data-testid="investment-tasks-approvals-section-wrapper"
      />

      {/* Notes Section - 2/3 width, spans 2 rows */}
      <SectionWrapper
        className="gba:col-span-1 gba:sm:col-span-3 gba:md:col-span-8 gba:lg:col-span-8 gba:row-span-2"
        sections={[
          {
            id: 'notes-section',
            component: NoteSection,
            props: {
              ...context,
              notes: notes.map(note => ({
                id: note.id,
                noteTitle: note.title || note.displayName || getTranslationFromI18nKeyAndLabel('crm.common.untitledNote', 'Untitled Note'),
                noteText: note.text || '',
                createdAt: note.createdAt,
                createdBy: note.authorDisplayName || note.authorEmployee?.displayName || getTranslationFromI18nKeyAndLabel('crm.common.unknown', 'Unknown'),
                authorEmployee: note.authorEmployee,
                reminderAt: note.reminderDate
              })),
              noteActionProps: {
                contextsArray: [FlowContextName.createInvestmentNote],
                externalContextData: { investmentId },
                prefixDataTestId: "investment-note",
                emptyStateBehavior: 'enable'
              },
              noteEntityActionProps: {
                contextsArray: [FlowContextName.investmentNoteEntity],
                externalContextData: { investmentId },
                prefixDataTestId: "investment-note-entity",
                emptyStateBehavior: 'enable'
              }
            }
          }
        ]}
        data-testid="investment-notes-section-wrapper"
      />
    </>
  );
};

export default InvestmentHomeTab;
