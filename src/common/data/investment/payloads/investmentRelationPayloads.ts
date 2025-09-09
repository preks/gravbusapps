import { Activity } from '@/common/components/common-relations/form-segments';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { toISOFormat } from '@/common/utils/dateFormatter';
import type { NoteSegmentSchema } from '@/common/components/common-relations/form-segments';

export const buildActivityPayload = (
  activity: Activity,
  businessAppContext: BusinessAppContextProps,
  options: { isUpdate?: boolean } = {}
) => {
  // Helper to build entity references
  const getEntityRef = () => {
    const refs: Record<string, any> = {};
    if (activity.account) refs.account = activity.account.id;
    if (activity.contact) refs.contact = activity.contact.id;
    if (activity.opportunity) refs.opportunity = activity.opportunity.id;
    if (activity.lead) refs.lead = activity.lead.id;
    
    // Always include parent investment when provided via additionalData
    const investmentId = (businessAppContext as any)?.additionalData?.investmentId;
    if (investmentId) {
      refs.investment = investmentId;
      console.log('🔍 Activity Payload Debug - Investment ID found:', investmentId);
      
      // CRITICAL: Include the investment's account to satisfy backend validation
      // Backend validation expects at least one traditional parent reference
      const accountId = (businessAppContext as any)?.additionalData?.accountId;
      if (accountId && !refs.account) {
        refs.account = accountId;
        console.log('🔍 Activity Payload Debug - Also adding investment account:', accountId);
      }
    } else {
      console.log('⚠️ Activity Payload Debug - No investment ID in additionalData:', businessAppContext?.additionalData);
    }
    console.log('🔍 Activity Payload Debug - Final refs:', refs);
    return refs;
  };



  // Get owner employee ID from business app context
  const getOwnerEmployee = () => {
    if (activity.ownerEmployee?.id) {
      return activity.ownerEmployee.id;
    }
    
    // Fallback to current user's employee ID from context
    if (businessAppContext.userInfo?.employeeDetails?.employeeId) {
      return businessAppContext.userInfo.employeeDetails.employeeId;
    }
    
    return undefined;
  };

  const payloadBody = {
    title: activity.title,
    description: activity.description,
    occurredAt: toISOFormat(activity.occurredAt),
    activityTypeRef: activity.activityTypeRef || undefined,
    ownerEmployee: getOwnerEmployee(),
    ...getEntityRef(),
    ...(options.isUpdate && activity.id && {
      id: activity.id,
      version: activity.version,
    }),
  };

  const finalPayload = {
    investmentActivity: payloadBody,
  };

  console.log('🔍 Activity Payload Debug - Final payload being sent:', JSON.stringify(finalPayload, null, 2));
  return finalPayload;
};

// ==============================
// Investment Task Payload
// ==============================

export interface InvestmentTaskFormData {
  id?: string;
  version?: number;
  title: string;
  code?: string;
  description: string;
  taskTypeRef: string;
  taskPriorityRef: string;
  taskStatusRef?: string;
  taskTiming?: string; // DEADLINE | SCHEDULED
  dueDate: string | null;
  // optional scheduling fields
  templateStartDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  assignedEmployeeId?: string;
  assignedUserId?: string;
  creatorEmployeeId?: string;
  creatorUserId?: string;
  // related entity (only one)
  account?: { id: string };
  contact?: { id: string };
  opportunity?: { id: string };
  lead?: { id: string };
}

export const buildInvestmentTaskPayload = (
  task: InvestmentTaskFormData,
  businessAppContext: BusinessAppContextProps,
  options: { isUpdate?: boolean } = {}
) => {
  const getEntityRef = () => {
    const refs: Record<string, any> = {};
    if (task.account) refs.account = task.account.id;
    if (task.contact) refs.contact = task.contact.id;
    if (task.opportunity) refs.opportunity = task.opportunity.id;
    if (task.lead) refs.lead = task.lead.id;
    // Always include parent investment when provided via additionalData
    const investmentId = (businessAppContext as any)?.additionalData?.investmentId;
    if (investmentId) refs.investment = investmentId;
    return refs;
  };


  const payloadBody: any = {
    name: task.title,
    code: task.code || undefined,
    description: task.description,
    taskTypeRef: task.taskTypeRef,
    taskPriorityRef: task.taskPriorityRef,
    taskStatusRef: task.taskStatusRef || undefined,
    taskTiming: task.taskTiming || undefined,
    dueDate: task.dueDate ? toISOFormat(task.dueDate) : null,
    templateStartDate: task.templateStartDate ? toISOFormat(task.templateStartDate) : undefined,
    startDate: task.startDate ? toISOFormat(task.startDate) : undefined,
    endDate: task.endDate ? toISOFormat(task.endDate) : undefined,
    assignedEmployee: task.assignedEmployeeId || undefined,
    assignedUserId: task.assignedUserId || undefined,
    ...getEntityRef(),
  };

  // Creator fields handling: create vs update
  if (options.isUpdate) {
    if (task.creatorEmployeeId) {
      payloadBody.creatorEmployee = task.creatorEmployeeId;
    }
    if (task.creatorUserId) {
      payloadBody.creatorUserId = task.creatorUserId;
    }
  } else {
    payloadBody.creatorEmployee = businessAppContext.userInfo?.employeeDetails?.employeeId;
    payloadBody.creatorUserId = businessAppContext.userInfo?.id;
  }

  if (options.isUpdate && task.id) {
    payloadBody.id = task.id;
    payloadBody.version = task.version;
  }

  return {
    investmentTask: payloadBody,
  };
};

// ==============================
// Investment Note Payload
// ==============================

export const buildInvestmentNotePayload = (
  note: NoteSegmentSchema,
  businessAppContext: BusinessAppContextProps,
  additionalData?: { accountId?: string; contactId?: string; opportunityId?: string; leadId?: string; investmentId?: string },
  options: { isUpdate?: boolean } = {}
) => {
  const getEntityRef = () => {
    if (note.account) return { account: note.account.id };
    if (note.contact) return { contact: note.contact.id };
    if (note.opportunity) return { opportunity: note.opportunity.id };
    if (note.lead) return { lead: note.lead.id };
    // Fallback to additionalData if provided
    if (additionalData?.accountId) return { account: additionalData.accountId };
    if (additionalData?.contactId) return { contact: additionalData.contactId };
    if (additionalData?.opportunityId) return { opportunity: additionalData.opportunityId };
    if (additionalData?.leadId) return { lead: additionalData.leadId };
    if (additionalData?.investmentId) return { investment: additionalData.investmentId };
    return {} as Record<string, any>;
  };

  const payloadBody: any = {
    title: note.title,
    text: note.text,
    reminderDate: note.reminderDate ? toISOFormat(note.reminderDate) : null,
    authorEmployee: businessAppContext.userInfo?.employeeDetails?.employeeId,
    ...getEntityRef(),
  };

  if (options.isUpdate) {
    // For updates, we need the noteId from additionalData
    const noteId = (businessAppContext as any)?.additionalData?.noteId;
    if (noteId) {
      payloadBody.id = noteId;
      // Note: version is typically handled by the backend, but can be added if needed
    }
  }

  return {
    investmentNote: payloadBody,
  };
};
