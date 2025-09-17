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
    
    // Always include parent investment when provided via additional/external context
    const additional: any = (businessAppContext as any)?.additionalData || {};
    const external: any = additional.externalContextData || {};
    const investmentId =
      external.investmentId ||
      external.investment?.id ||
      external.investment ||
      additional.investmentId ||
      additional.investment?.id ||
      additional.investment;
    if (investmentId) {
      refs.investment = investmentId;
      // Also include the investment's account if available and not already set
      const accountId = additional.accountId || external.accountId || external.account?.id || additional.account?.id;
      if (accountId && !refs.account) {
        refs.account = accountId;
      }
    }
    return refs;
  };



  // Get owner employee ID from business app context
  const getOwnerEmployee = () => {
    console.log('🔍 Activity payload debug:', {
      'activity.ownerEmployee': activity.ownerEmployee,
      'activity.ownerEmployeeId': (activity as any)?.ownerEmployeeId,
      'fallbackUserId': businessAppContext.userInfo?.employeeDetails?.employeeId
    });
    
    if (activity.ownerEmployee?.id) {
      console.log('✅ Using activity.ownerEmployee.id:', activity.ownerEmployee.id);
      return activity.ownerEmployee.id;
    }
    // Also support flat field from UI segment
    const ownerId = (activity as any)?.ownerEmployeeId;
    if (ownerId) {
      console.log('✅ Using activity.ownerEmployeeId:', ownerId);
      return ownerId;
    }
    
    // Fallback to current user's employee ID from context
    if (businessAppContext.userInfo?.employeeDetails?.employeeId) {
      console.log('⚠️ Falling back to current user:', businessAppContext.userInfo.employeeDetails.employeeId);
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
    const additional: any = (businessAppContext as any)?.additionalData || {};
    const external: any = additional.externalContextData || {};
    const investmentId =
      // Primary: AppAction externalContextData (most common)
      external.investmentId ||
      external.investment?.id ||
      external.investment ||
      external.investmentTask?.investment ||
      external.investmentTask?.investmentId ||
      // Fallback: direct additionalData
      additional.investmentId ||
      additional.investment?.id ||
      additional.investment ||
      additional.investmentTask?.investment ||
      additional.investmentTask?.investmentId;
    if (investmentId) refs.investment = investmentId;
    console.log('🔍 Task Payload Debug - Investment search:', {
      externalContextData: external,
      additionalData: additional,
      foundInvestmentId: investmentId,
      finalRefs: refs
    });
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
    assignedEmployee: task.assignedEmployeeId || businessAppContext.userInfo?.employeeDetails?.employeeId || undefined,
    assignedUserId: task.assignedUserId || businessAppContext.userInfo?.id || undefined,
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
  options: { isUpdate?: boolean } = {}
) => {
  // Helper to build entity references (same pattern as activity)
  const getEntityRef = () => {
    const refs: Record<string, any> = {};
    if (note.account) refs.account = note.account.id;
    if (note.contact) refs.contact = note.contact.id;
    if (note.opportunity) refs.opportunity = note.opportunity.id;
    if (note.lead) refs.lead = note.lead.id;

    // Always include parent investment when provided via additionalData or externalContextData
    const additional: any = (businessAppContext as any)?.additionalData || {};
    const external: any = additional.externalContextData || {};

    const investmentId =
      external.investmentId ||
      external.investment?.id ||
      external.investment ||
      additional.investmentId ||
      additional.investment?.id ||
      additional.investment;

    if (investmentId) {
      refs.investment = investmentId;

      // Include the investment's account to satisfy backend validation when available
      const accountId =
        additional.accountId ||
        additional.account?.id ||
        external.accountId ||
        external.account?.id;
      if (accountId && !refs.account) {
        refs.account = accountId;
      }
    }

    // If related entity was not set via NoteSegment, try to infer from additional/external context
    if (!refs.account && (additional.accountId || additional.account?.id || external.accountId || external.account?.id)) {
      refs.account = additional.accountId || additional.account?.id || external.accountId || external.account?.id;
    }
    if (!refs.contact && (additional.contactId || additional.contact?.id || external.contactId || external.contact?.id)) {
      refs.contact = additional.contactId || additional.contact?.id || external.contactId || external.contact?.id;
    }
    if (!refs.opportunity && (additional.opportunityId || additional.opportunity?.id || external.opportunityId || external.opportunity?.id)) {
      refs.opportunity = additional.opportunityId || additional.opportunity?.id || external.opportunityId || external.opportunity?.id;
    }
    if (!refs.lead && (additional.leadId || additional.lead?.id || external.leadId || external.lead?.id)) {
      refs.lead = additional.leadId || additional.lead?.id || external.leadId || external.lead?.id;
    }
    return refs;
  };

  // Get author employee ID from business app context (same pattern as activity)
  const getAuthorEmployee = () => {
    if (note.authorEmployee?.id) {
      return note.authorEmployee.id;
    }
    
    // Fallback to current user's employee ID from context
    if (businessAppContext.userInfo?.employeeDetails?.employeeId) {
      return businessAppContext.userInfo.employeeDetails.employeeId;
    }
    
    console.warn('No author employee ID found in note data or business context');
    return undefined;
  };

  const payloadBody: any = {
    title: note.title,
    text: note.text,
    reminderDate: note.reminderDate ? toISOFormat(note.reminderDate) : null,
    authorEmployee: getAuthorEmployee(),
    ...getEntityRef(),
  };

  if (options.isUpdate) {
    // For updates, we need the noteId from additionalData
    const noteId = (businessAppContext as any)?.additionalData?.noteId;
    if (noteId) {
      payloadBody.id = noteId;
      
      // Include version if available (same pattern as activity)
      const version = (businessAppContext as any)?.additionalData?.noteVersion || note.version;
      if (version !== undefined) {
        payloadBody.version = version;
      }
    }
  }

  return {
    investmentNote: payloadBody,
  };
};
