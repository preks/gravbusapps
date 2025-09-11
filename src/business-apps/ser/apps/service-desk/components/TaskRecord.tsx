import React, { useState, useEffect } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

// Import nw-design-system components
import { 
  PageLayout,
  Card, CardContent, CardHeader, CardTitle,
  Button, 
  Badge,
  Separator,
  Progress,
  Avatar, AvatarFallback,
  Textarea,
  Alert,
  Spinner,
  Timeline,
  TimelineItem,
  type KpiCardData
} from '@newwork/nw-design-system';

// Fallback to Ant Design for components not yet available in nw-design-system
import { Typography, message, Descriptions } from 'antd';

// Import Phosphor icons
import { 
  ArrowLeftIcon, UserIcon, ClockIcon, WarningIcon, CheckCircleIcon, 
  ChatCircleIcon, PaperPlaneRightIcon, UserCheckIcon, UserMinusIcon, 
  ArrowClockwiseIcon, TargetIcon, ClipboardIcon, InfoIcon, WarningCircleIcon,
  TrendUpIcon, Link as LinkIcon
} from '@phosphor-icons/react';

// Import types and hooks
import type { SubmittedRequest } from 'packages/services-plus-core';
import { useTicketDetail } from '../hooks/useTicketDetail';
import { useTicketActions } from '../hooks/useTicketActions';
import { EmployeeDisplayName } from './EmployeeDisplayName';
import { formatRequestId, getSLAStatus } from '../../../utils';
import { createConductorWorkflowEngine } from '../../../services';
import { DynamicFormGenerator } from '../../../components/DynamicFormGenerator';
import { DynamicFormField, DynamicFormValues } from '../../../types/flowTemplate';

const { Text } = Typography;

// Status configuration with Phosphor icons - updated for ALL original API status values
const STATUS_CONFIG = {
  // Core statuses
  SCHEDULED: { color: 'secondary', icon: TargetIcon, label: 'Scheduled' },
  OPEN: { color: 'secondary', icon: ClockIcon, label: 'Open' },
  IN_PROGRESS: { color: 'default', icon: TrendUpIcon, label: 'In Progress' },
  COMPLETED: { color: 'secondary', icon: CheckCircleIcon, label: 'Completed' },
  REJECTED: { color: 'outline', icon: UserMinusIcon, label: 'Rejected' },
  FAILED: { color: 'destructive', icon: WarningIcon, label: 'Failed' },
  PAUSED: { color: 'destructive', icon: WarningIcon, label: 'Paused' },
  // Workflow engine specific statuses (preserved as-is)
  READY: { color: 'secondary', icon: TargetIcon, label: 'Ready' },
  QUEUED: { color: 'secondary', icon: ClockIcon, label: 'Queued' },
  RUNNING: { color: 'default', icon: TrendUpIcon, label: 'Running' },
  DONE: { color: 'secondary', icon: CheckCircleIcon, label: 'Done' },
  ERROR: { color: 'destructive', icon: WarningIcon, label: 'Error' },
  CANCELLED: { color: 'outline', icon: UserMinusIcon, label: 'Cancelled' },
  CANCELED: { color: 'outline', icon: UserMinusIcon, label: 'Canceled' },
  SKIPPED: { color: 'outline', icon: CheckCircleIcon, label: 'Skipped' },
  TIMED_OUT: { color: 'destructive', icon: WarningIcon, label: 'Timed Out' },
  UNKNOWN: { color: 'outline', icon: ClockIcon, label: 'Unknown' }
} as const;

export interface TaskRecordProps extends BusinessAppContextProps {
  taskId: string;
  deskKey: string;
  onClose?: () => void;
}

/**
 * Task Record - Comprehensive task detail view using Simple Page layout
 * Shows all task information with beautiful KPI cards and organized content sections
 */
export const TaskRecord: React.FC<TaskRecordProps> = ({
  taskId,
  accessToken,
  userInfo,
  onClose,
}) => {
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [fullRequest, setFullRequest] = useState<SubmittedRequest | null>(null);
  const [availableActions, setAvailableActions] = useState<any>(null);
  const [flowComments, setFlowComments] = useState<any[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [taskFormData, setTaskFormData] = useState<DynamicFormValues>({});
  const [isSubmittingTaskForm, setIsSubmittingTaskForm] = useState(false);

  // Load task data
  const { 
    ticket, 
    isLoading, 
    error, 
    refetch 
  } = useTicketDetail({ 
    ticketId: taskId, 
    accessToken, 
    userInfo 
  });

  // Task actions
  const {
    claimTicket,
    unclaimTicket,
    completeTicket,
    rejectTicket,
    addComment,
    isLoading: isActionLoading
  } = useTicketActions({
    accessToken,
    userInfo,
    onSuccess: () => {
      // NOTE: Task IDs may change after actions due to workflow recreation
      // Refresh task detail and reload full request
      refetch();
      loadFullRequest();
      message.success('Task action completed successfully');
      
      // Suggest user to refresh the queue to see updated tasks
      console.log(`[TaskRecord] ℹ️ Task action completed - desk queue should be refreshed to see updated task IDs`);
    }
  });

  // Calculate KPI cards data
  const kpiCards: KpiCardData[] = React.useMemo(() => {
    if (!ticket) return [];

    const slaStatus = getSLAStatus(ticket);
    const statusConfig = STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.UNKNOWN;
    const StatusIcon = statusConfig.icon;

    // Calculate task age
    const createdAt = ticket.startedAt ? new Date(ticket.startedAt) : new Date();
    const now = new Date();
    const ageInHours = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
    const ageDisplay = ageInHours < 24 ? `${ageInHours}h` : `${Math.floor(ageInHours / 24)}d`;

    return [
      {
        id: 'task-status',
        title: 'Task Status',
        value: ticket.status, // Show raw status instead of transformed label
        icon: <StatusIcon className="gba:w-5 gba:h-5" />,
        trend: {
          value: ticket.status, // Show raw status in trend as well
          positive: ticket.status === 'COMPLETED' || ticket.status === 'DONE' || ticket.status === 'SKIPPED',
          trendIcon: (ticket.status === 'COMPLETED' || ticket.status === 'DONE' || ticket.status === 'SKIPPED') ? 'up' : 
                    (ticket.status === 'FAILED' || ticket.status === 'ERROR' || ticket.status === 'PAUSED' || ticket.status === 'TIMED_OUT') ? 'down' : 'none',
          badgeVariant: (ticket.status === 'COMPLETED' || ticket.status === 'DONE' || ticket.status === 'SKIPPED') ? 'success' : 
                       (ticket.status === 'FAILED' || ticket.status === 'ERROR' || ticket.status === 'PAUSED' || ticket.status === 'TIMED_OUT') ? 'destructive' : 'default'
        },
        subtitle: `Raw status value`,
      },
      {
        id: 'sla-progress',
        title: 'SLA Progress',
        value: slaStatus ? 
          (slaStatus.status === 'overdue' ? 'Overdue' : `${Math.floor(slaStatus.hoursLeft)}h left`) : 
          'No SLA',
        icon: <TargetIcon className="gba:w-5 gba:h-5" />,
        trend: slaStatus ? {
          value: slaStatus.status === 'overdue' ? 'Overdue' : `${Math.floor(slaStatus.hoursLeft)}h left`,
          positive: !(slaStatus.status === 'overdue' || slaStatus.hoursLeft < 8),
          trendIcon: slaStatus.status === 'overdue' ? 'down' : slaStatus.hoursLeft < 8 ? 'down' : 'up',
          badgeVariant: slaStatus.status === 'overdue' ? 'destructive' : slaStatus.hoursLeft < 8 ? 'warning' : 'success'
        } : {
          value: 'No SLA',
          positive: undefined,
          trendIcon: 'none'
        },
        subtitle: slaStatus && ticket.dueDate ? 
          `Due ${new Date(ticket.dueDate).toLocaleDateString()}` : 
          'No deadline set',
      },
      {
        id: 'task-age',
        title: 'Task Age',
        value: ageDisplay,
        icon: <ClockIcon className="gba:w-5 gba:h-5" />,
        trend: {
          value: ageDisplay,
          positive: ageInHours < 24,
          trendIcon: ageInHours > 72 ? 'down' : ageInHours > 24 ? 'none' : 'up',
          badgeVariant: ageInHours > 72 ? 'destructive' : ageInHours > 24 ? 'warning' : 'success'
        },
        subtitle: `Since ${createdAt.toLocaleDateString()}`,
      },
      {
        id: 'comments-count',
        title: 'Comments',
        value: ticket.comments?.length?.toString() || '0',
        icon: <ChatCircleIcon className="gba:w-5 gba:h-5" />,
        trend: {
          value: `${ticket.comments?.length || 0} comments`,
          positive: undefined,
          trendIcon: 'none'
        },
        subtitle: 'Total comments',
      }
    ];
  }, [ticket]);

  // Load full request details for overview
  const loadFullRequest = async () => {
    // Use rootWorkflowId for the main workflow request, fallback to workflowId for compatibility
    const workflowId = ticket?.workflowMeta?.rootWorkflowId || ticket?.workflowId || ticket?.requestId;
    if (!workflowId || !accessToken || !userInfo) return;
    
    try {
      const workflowEngine = createConductorWorkflowEngine({ accessToken, userInfo });
      const requestDetails = await workflowEngine.getRequest(workflowId);
      
      // 🔍 DEBUG: Log the full request data to see what we're getting
      console.log('[TaskRecord] 🔍 Full request data loaded:', {
        id: requestDetails?.id,
        titleSnapshot: requestDetails?.titleSnapshot,
        status: requestDetails?.status,
        stepsCount: requestDetails?.steps?.length,
        originalStepsCount: (requestDetails as any)?.originalSteps?.length,
        steps: requestDetails?.steps,
        originalSteps: (requestDetails as any)?.originalSteps,
        fullRequest: requestDetails
      });
      
      setFullRequest(requestDetails);
    } catch (error) {
      console.error('Failed to load full request:', error);
    }
  };

  // Load request details when ticket is available
  useEffect(() => {
    const workflowId = ticket?.workflowMeta?.rootWorkflowId || ticket?.workflowId || ticket?.requestId;
    if (workflowId) {
      loadFullRequest();
    }
  }, [ticket?.workflowMeta?.rootWorkflowId, ticket?.workflowId, ticket?.requestId]);

  // Load available actions for the task
  const loadAvailableActions = async () => {
    if (!ticket?.id) return;
    
    console.log('🔍 Loading available actions for task:', ticket.id);
    console.log('🔍 Full ticket data:', ticket);
    console.log('🔍 ticket.availableActions:', ticket.availableActions);
    
    // Use the availableActions from the ticket data (now preserved by the adapter)
    if (ticket.availableActions) {
      console.log('✅ Using availableActions from ticket data:', ticket.availableActions);
      setAvailableActions(ticket.availableActions);
    } else {
      console.log('⚠️ No availableActions in ticket data');
      setAvailableActions(null);
    }
  };

  // ✅ UPDATED: Load task step comments using new endpoint
  const loadFlowComments = async () => {
    if (!ticket?.id || !accessToken || !userInfo) {
      console.warn('⚠️ Missing required data for loading comments');
      return;
    }
    
    setIsLoadingComments(true);
    try {
      console.log('🔍 Loading task step comments for taskId:', ticket.id);
      
      const workflowEngine = createConductorWorkflowEngine({ accessToken, userInfo });
      
      // ✅ NEW: Use task-specific comments endpoint instead of flow comments
      // This gets ALL comments for this task step (including from recreated task instances)
      let response: { comments: any[]; totalComments: number };
      
      // Check if the new method exists (TypeScript interface might not be updated yet)
      if (typeof (workflowEngine as any).getTaskStepComments === 'function') {
        response = await (workflowEngine as any).getTaskStepComments(ticket.id);
      } else {
        console.warn('⚠️ getTaskStepComments method not available, falling back to empty comments');
        response = { comments: [], totalComments: 0 };
      }
      
      const comments = response.comments || [];
      console.log(`✅ Found ${comments.length} comments for task step ${ticket.id}`);
      
      // Transform comments to match expected format
      const transformedComments = comments.map((comment: any) => ({
        id: comment.taskId || `comment-${Date.now()}-${Math.random()}`,
        body: comment.comment,
        comment: comment.comment,
        message: comment.comment,
        authorName: comment.commentedBy,
        authorId: comment.commentedBy,
        userId: comment.commentedBy,
        createdAt: comment.commentedAt,
        timestamp: comment.commentedAt,
        action: comment.action,
        stepId: comment.stepIndex?.toString(),
        stepTitle: comment.stepTitle,
        taskId: comment.taskId
      }));
      
      setFlowComments(transformedComments);
      
    } catch (error) {
      console.error('❌ Failed to load task step comments:', error);
      setFlowComments([]);
    } finally {
      setIsLoadingComments(false);
    }
  };

  // Load available actions when ticket is available
  useEffect(() => {
    if (ticket?.id) {
      loadAvailableActions();
    }
  }, [ticket?.id, ticket?.availableActions, accessToken, userInfo]);

  // ✅ UPDATED: Load task step comments when ticket is available
  useEffect(() => {
    if (ticket?.id) {
      loadFlowComments();
    }
  }, [ticket?.id, accessToken, userInfo]);

  // Handle task actions
  const handleTaskAction = async (action: 'claim' | 'unclaim' | 'complete' | 'reject') => {
    if (!ticket) return;
    
    try {
      switch (action) {
        case 'claim':
          // Warn about potential task ID change
          console.warn(`[TaskRecord] ⚠️ Claiming task ${ticket.id} - task ID may change due to workflow recreation`);
          await claimTicket(ticket.id);
          break;
        case 'unclaim':
          await unclaimTicket(ticket.id);
          break;
        case 'complete':
          await completeTicket(ticket.id);
          break;
        case 'reject':
          await rejectTicket(ticket.id, 'Task rejected via Service Desk');
          break;
      }
      
      // ✅ Refresh available actions and comments after any action
      console.log(`🔄 Refreshing available actions and comments after ${action} action`);
      await loadAvailableActions();
      await loadFlowComments();
      
    } catch (error) {
      console.error(`Failed to ${action} task:`, error);
      message.error(`Failed to ${action} task`);
    }
  };

  // Handle comment submission
  const handleSubmitComment = async () => {
    if (!newComment.trim() || !ticket) return;
    
    setIsSubmittingComment(true);
    try {
      console.log(`[TaskRecord] Adding comment to task ${ticket.id}: "${newComment.trim()}"`);
      console.warn(`[TaskRecord] ⚠️ WARNING: Task ID may change after comment due to workflow recreation (same issue as CLAIM)`);
      
      // Use the addComment method from useTicketActions
      await addComment(ticket.id, newComment.trim());
      
      console.log(`[TaskRecord] ✅ Comment added successfully to task ${ticket.id} (task may have new ID now)`);
      message.success('Comment added successfully');
      setNewComment('');
      
      // NOTE: Task may have been recreated with new ID, so refetch may fail
      // The task detail will need to be refreshed from the queue to get the new ID
      try {
        await refetch();
        // Also reload flow comments to show the new comment
        await loadFlowComments();
      } catch (refetchError) {
        console.warn(`[TaskRecord] ⚠️ Could not refetch task ${ticket.id} - likely recreated with new ID:`, refetchError);
        message.warning('Comment added successfully, but task was recreated. Please refresh the queue to see the updated task.');
        
        // Close the task detail since the ID is now invalid
        if (onClose) {
          console.log(`[TaskRecord] Closing task detail due to task recreation`);
          onClose();
        }
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
      message.error(`Failed to add comment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Handle task form submission (complete task with form data)
  const handleTaskFormSubmit = async (formData: DynamicFormValues) => {
    if (!ticket) return;
    
    setIsSubmittingTaskForm(true);
    try {
      console.log(`[TaskRecord] Submitting task form for task ${ticket.id}:`, formData);
      
      const workflowEngine = createConductorWorkflowEngine({ accessToken, userInfo });
      
      // Complete the task with form data
      await (workflowEngine as any).completeTask(ticket.id, formData);
      
      console.log(`[TaskRecord] ✅ Task ${ticket.id} completed with form data successfully`);
      message.success('Task completed successfully');
      
      // Refresh task data
      await refetch();
      await loadFullRequest();
      await loadAvailableActions();
      await loadFlowComments();
      
    } catch (error) {
      console.error('Failed to complete task with form data:', error);
      message.error(`Failed to complete task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmittingTaskForm(false);
    }
  };

  // Transform task form fields to DynamicFormField format
  const transformTaskFormFields = (taskForm: any[]): DynamicFormField[] => {
    if (!taskForm || !Array.isArray(taskForm)) return [];
    
    return taskForm.map((field: any): DynamicFormField => ({
      type: field.type || 'TEXT',
      name: field.name || '',
      label: field.label || field.name || '',
      required: field.required || false,
      placeholder: field.placeholder,
      description: field.description,
      options: field.options?.map((opt: any) => ({
        value: opt.value || opt,
        label: opt.label || opt.value || opt
      })),
      validation: field.required ? [{ type: 'required' as const }] : undefined
    }));
  };

  // Get task form fields (prioritize 'form' over 'inputs')
  const getTaskFormFields = () => {
    if (!ticket) return [];
    
    const formFields = (ticket as any).form;
    const inputFields = (ticket as any).inputs;
    
    // Use form fields if available and not empty, otherwise use inputs
    let taskFormFields = null;
    if (formFields && Array.isArray(formFields) && formFields.length > 0) {
      taskFormFields = formFields;
    } else if (inputFields && Array.isArray(inputFields) && inputFields.length > 0) {
      taskFormFields = inputFields;
    }
    
    console.log('🔍 [TaskRecord] Task form detection:', {
      hasTicket: !!ticket,
      ticketId: ticket?.id,
      hasForm: !!formFields,
      formLength: formFields?.length || 0,
      hasInputs: !!inputFields,
      inputsLength: inputFields?.length || 0,
      selectedFieldsLength: taskFormFields?.length || 0,
      usingForm: taskFormFields === formFields,
      usingInputs: taskFormFields === inputFields
    });
    
    return taskFormFields || [];
  };

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div>
        {/* Back to Queue Button - Absolute Top Left */}
        <div className="gba:p-4 gba:pb-0">
          <Button variant="outline" onClick={onClose} className="gba:gap-2">
            <ArrowLeftIcon className="gba:w-4 gba:h-4" />
            {getTranslationFromI18nKeyAndLabel('services.actions.goBack', 'Go Back')}
          </Button>
        </div>

        <PageLayout
          headerTitle="Task Not Found"
          headerDescription="The requested task could not be found"
          headerIcon={WarningIcon}
        >
          <Alert variant="destructive">
            <WarningIcon className="gba:h-4 gba:w-4" />
            <div>
              <h4 className="gba:font-medium">{getTranslationFromI18nKeyAndLabel('services.error.title', 'Error')}</h4>
              <p className="gba:text-sm gba:mt-1">
                {error || getTranslationFromI18nKeyAndLabel('services.error.taskNotFound', 'Task not found')}
              </p>
            </div>
          </Alert>
        </PageLayout>
      </div>
    );
  }

  const slaStatus = getSLAStatus(ticket);
  const statusConfig = STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.UNKNOWN;
  const StatusIcon = statusConfig.icon;

  return (
    <div>
      {/* Back to Queue Button - Absolute Top Left */}
      <div className="gba:p-4 gba:pb-0">
        <Button variant="outline" onClick={onClose} className="gba:gap-2">
          <ArrowLeftIcon className="gba:w-4 gba:h-4" />
          Back to Queue
        </Button>
      </div>

      <PageLayout
        headerTitle={ticket.name || 'Untitled Task'}
        headerDescription={`Request ID: ${formatRequestId(ticket.workflowMeta?.rootWorkflowId || ticket.workflowId || ticket.requestId)} • ${ticket.desk || 'Unknown Desk'} • Task ID: ${ticket.id}`}
        headerIcon={StatusIcon}
        variant="ext1"
        headerContent={
          <Badge variant={statusConfig.color as any}>
            {ticket.status}
          </Badge>
        }
        kpiCardsData={kpiCards}
        sectionTitle="Task Information"
        sectionDescription="Complete details and activity for this task"
      >
      {/* Main Content Grid */}
      <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6">
        {/* Left Column - Primary Information */}
        <div className="gba:space-y-6">
          {/* Task Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="gba:flex gba:items-center gba:gap-3">
                <InfoIcon className="gba:w-5 gba:h-5" />
                Task Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Task Message/Description */}
              {ticket.message && (
                <div className="gba:mb-6 gba:space-y-3">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <div className="gba:w-2 gba:h-2 gba:bg-primary gba:rounded-full"></div>
                    <h4 className="gba:text-sm gba:font-medium gba:text-foreground">Description</h4>
                  </div>
                  <div className="gba:bg-muted/20 gba:rounded-lg gba:p-4 gba:border gba:border-muted/40">
                    <p className="gba:text-sm gba:text-muted-foreground gba:leading-relaxed gba:whitespace-pre-wrap">
                      {ticket.message}
                    </p>
                  </div>
                </div>
              )}

              {/* Task Links - Show related links if available */}
              {(ticket as any).links && (ticket as any).links.length > 0 && (
                <div className="gba:mb-6 gba:space-y-3">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <div className="gba:w-2 gba:h-2 gba:bg-blue-500 gba:rounded-full"></div>
                    <h4 className="gba:text-sm gba:font-medium gba:text-foreground">Related Links</h4>
                  </div>
                  <div className="gba:space-y-3">
                    {(ticket as any).links.map((link: any, index: number) => (
                      <div key={index} className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:bg-blue-50 gba:rounded-lg gba:border gba:border-blue-100">
                        <div className="gba:flex-shrink-0">
                          <LinkIcon className="gba:w-5 gba:h-5 gba:text-blue-600" />
                        </div>
                        <div className="gba:flex-1 gba:min-w-0">
                          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                            <h5 className="gba:text-sm gba:font-medium gba:text-blue-900 gba:truncate">
                              {link.name || 'Link'}
                            </h5>
                            {link.type && (
                              <Badge variant="outline" className="gba:text-xs gba:bg-blue-100 gba:text-blue-700 gba:border-blue-200">
                                {link.type}
                              </Badge>
                            )}
                          </div>
                          <p className="gba:text-xs gba:text-blue-600 gba:truncate" title={link.url}>
                            {link.url}
                          </p>
                        </div>
                        <div className="gba:flex-shrink-0">
                          <a 
                            href={link.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="gba:inline-flex gba:items-center gba:px-3 gba:py-1.5 gba:text-xs gba:font-medium gba:text-blue-700 gba:bg-blue-100 gba:rounded-md gba:border gba:border-blue-200 hover:gba:bg-blue-200 gba:transition-colors"
                            data-testid={`task-link-${index}`}
                          >
                            <LinkIcon className="gba:w-3 gba:h-3 gba:mr-1" />
                            Open
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Descriptions
                column={{ xs: 1, sm: 2 }}
                items={[
                  {
                    key: 'created',
                    label: 'Created',
                    children: ticket.startedAt 
                      ? new Date(ticket.startedAt).toLocaleString() 
                      : 'Unknown',
                  },
                  {
                    key: 'updated',
                    label: 'Last Updated',
                    children: ticket.updatedAt 
                      ? new Date(ticket.updatedAt).toLocaleString() 
                      : 'Not updated',
                  },
                  {
                    key: 'dueDate',
                    label: 'Due Date',
                    children: ticket.dueDate 
                      ? new Date(ticket.dueDate).toLocaleString()
                      : 'Not set',
                  },
                  {
                    key: 'desk',
                    label: 'Service Desk',
                    children: (
                      <Badge variant="outline">
                        {ticket.desk || 'Unknown'}
                      </Badge>
                    ),
                  }
                ]}
              />

              {/* SLA Progress */}
              {slaStatus && (
                <div className="gba:mt-6 gba:p-4 gba:bg-muted/30 gba:rounded-lg">
                  <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
                    <div className="gba:flex gba:items-center gba:gap-2 gba:font-semibold">
                      <TargetIcon className="gba:w-4 gba:h-4" />
                      SLA Progress
                    </div>
                    <Badge variant={slaStatus.status === 'overdue' ? 'destructive' : 'secondary'}>
                      {slaStatus.status === 'overdue' 
                        ? `${Math.abs(Math.floor(slaStatus.hoursLeft))}h overdue`
                        : `${Math.floor(slaStatus.hoursLeft)}h remaining`
                      }
                    </Badge>
                  </div>
                  <Progress 
                    value={slaStatus.status === 'overdue' ? 100 : 
                           Math.max(0, 100 - (slaStatus.hoursLeft / 24) * 100)}
                    className="gba:mb-2"
                  />
                  {ticket.dueDate && (
                    <p className="gba:text-xs gba:text-muted-foreground">
                      Due: {new Date(ticket.dueDate).toLocaleDateString()} at {new Date(ticket.dueDate).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>


          {/* Task Form Card - Show dynamic form if task has form fields and is not completed */}
          {(() => {
            const hasFormFields = getTaskFormFields().length > 0;
            const isTaskCompleted = ticket?.status === 'COMPLETED' || ticket?.status === 'DONE' || ticket?.status === 'SKIPPED' || 
                                     ticket?.status === 'REJECTED' || ticket?.status === 'CANCELLED' || ticket?.status === 'CANCELED';
            const shouldShowForm = hasFormFields && !isTaskCompleted;
            
            console.log('🔍 [TaskRecord] Task form card visibility check:', {
              hasFormFields,
              isTaskCompleted,
              taskStatus: ticket?.status,
              shouldShowForm,
              formFields: getTaskFormFields(),
              ticket: ticket
            });
            
            return shouldShowForm;
          })() && (
            <Card data-testid="task-form-card">
              <CardHeader>
                <CardTitle className="gba:flex gba:items-center gba:gap-3">
                  <CheckCircleIcon className="gba:w-5 gba:h-5" />
                  Complete Task
                  {getTaskFormFields().filter((f: any) => f.required).length > 0 && (
                    <Badge variant="secondary" className="gba:ml-2">
                      {getTaskFormFields().filter((f: any) => f.required).length} required
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">
                  Fill out the required information to complete this task.
                </p>
                
                <DynamicFormGenerator
                  schema={transformTaskFormFields(getTaskFormFields())}
                  initialValues={taskFormData}
                  onValuesChange={setTaskFormData}
                  onSubmit={handleTaskFormSubmit}
                  isSubmitting={isSubmittingTaskForm}
                  submitButtonText="Complete Task"
                  title="" // No title since we have card header
                  showCard={false} // Don't wrap in card since we're already in one
                />
              </CardContent>
            </Card>
          )}

          {/* Comments & Activity Card */}
          <Card>
            <CardHeader>
              <CardTitle className="gba:flex gba:items-center gba:gap-3">
                <ChatCircleIcon className="gba:w-5 gba:h-5" />
                Comments & Activity
                {flowComments?.length > 0 && (
                  <Badge variant="secondary" className="gba:ml-2">
                    {flowComments.length}
                  </Badge>
                )}
                {isLoadingComments && (
                  <Spinner className="gba:w-4 gba:h-4" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Comments List */}
              <div className="gba:mb-6">
                {isLoadingComments ? (
                  <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
                    <Spinner className="gba:w-8 gba:h-8 gba:mx-auto gba:mb-2" />
                    <p>Loading comments...</p>
                  </div>
                ) : flowComments && flowComments.length > 0 ? (
                  <div className="gba:space-y-4 gba:max-h-80 gba:overflow-y-auto">
                    {flowComments
                      .sort((a, b) => {
                        const dateA = new Date(a.createdAt || a.timestamp);
                        const dateB = new Date(b.createdAt || b.timestamp);
                        return dateA.getTime() - dateB.getTime();
                      })
                      .map((comment) => (
                      <div key={comment.id} className="gba:flex gba:gap-3 gba:p-4 gba:bg-muted/30 gba:rounded-lg">
                                                  <Avatar className="gba:flex-shrink-0">
                            <AvatarFallback>
                              <UserIcon className="gba:w-4 gba:h-4" />
                            </AvatarFallback>
                          </Avatar>
                        <div className="gba:flex-1">
                          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                            <span className="gba:text-sm gba:font-medium">
                              <EmployeeDisplayName
                                userId={comment.commentedBy || comment.authorId || comment.userId}
                                accessToken={accessToken}
                                showIcon={false}
                                fallback="Unknown User"
                                testId={`comment-author-${comment.id}`}
                              />
                            </span>
                            <span className="gba:text-xs gba:text-muted-foreground">
                              {new Date(comment.createdAt || comment.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="gba:text-sm">{comment.body || comment.comment || comment.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
                    <ChatCircleIcon className="gba:w-12 gba:h-12 gba:mx-auto gba:mb-2 gba:opacity-50" />
                    <p>No comments yet</p>
                  </div>
                )}
              </div>

              {/* Add Comment Form */}
              <Separator className="gba:my-6" />
              <div className="gba:space-y-4">
                <h4 className="gba:text-sm gba:font-semibold">Add Comment</h4>
                <Textarea
                  placeholder="Enter your comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <div className="gba:flex gba:justify-end">
                  <Button 
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || isSubmittingComment || isActionLoading}
                    className="gba:gap-2"
                  >
                    <PaperPlaneRightIcon className="gba:w-4 gba:h-4" />
                    {isSubmittingComment ? 'Adding...' : 'Add Comment'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Assignment & Request Overview */}
        <div className="gba:space-y-6">
          {/* Assignment & Ownership Card */}
          <Card>
            <CardHeader>
              <CardTitle className="gba:flex gba:items-center gba:gap-3">
                <UserCheckIcon className="gba:w-5 gba:h-5" />
                Assignment & Ownership
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Descriptions
                column={1}
                items={[
                  {
                    key: 'assignee',
                    label: 'Assigned To',
                    children: ticket.assignedToUserId ? (
                      <EmployeeDisplayName
                        userId={ticket.assignedToUserId}
                        accessToken={accessToken}
                        showIcon={true}
                        fallback={ticket.assignedToUserName || "Assigned User"}
                        testId="task-assignee"
                      />
                    ) : ticket.claimedByUserId ? (
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Badge variant="secondary">Claimed</Badge>
                        <EmployeeDisplayName
                          userId={ticket.claimedByUserId}
                          accessToken={accessToken}
                          showIcon={true}
                          fallback={ticket.claimedByUserName || "Claimed User"}
                          testId="task-claimed-by"
                        />
                      </div>
                    ) : (
                      <Badge variant="outline">Unassigned</Badge>
                    ),
                  },
                  {
                    key: 'requester',
                    label: 'Requested By',
                    children: ticket.requesterId ? (
                      <EmployeeDisplayName
                        userId={ticket.requesterId}
                        accessToken={accessToken}
                        showIcon={true}
                        fallback={ticket.requesterName || "Unknown User"}
                        testId="task-requester"
                      />
                    ) : (
                      <span className="gba:text-muted-foreground">Unknown</span>
                    ),
                  }
                ]}
              />

              {/* Quick Actions */}
              <Separator className="gba:my-4" />
              <div className="gba:flex gba:flex-wrap gba:gap-2">
                {/* 🔍 DEBUG: Log button visibility logic */}
                {(() => {
                  console.log('🔍 Button visibility debug:', {
                    ticketStatus: ticket.status,
                    availableActions: availableActions,
                    canClaim: availableActions?.canClaim,
                    canComplete: availableActions?.canComplete,
                    canUnclaim: availableActions?.canUnclaim,
                    canReject: availableActions?.canReject
                  });
                  return null;
                })()}
                
                {!(ticket.status === 'COMPLETED' || ticket.status === 'DONE' || ticket.status === 'SKIPPED' || 
                   ticket.status === 'REJECTED' || ticket.status === 'CANCELLED' || ticket.status === 'CANCELED') && (
                  <>
                    {/* ✅ Using availableActions from API instead of hardcoded logic */}
                    {availableActions?.canClaim && (
                                              <Button 
                          size="sm"
                          onClick={() => handleTaskAction('claim')}
                          disabled={isActionLoading}
                          className="gba:gap-2"
                        >
                          <UserCheckIcon className="gba:w-4 gba:h-4" />
                          Claim Task
                        </Button>
                    )}

                    {availableActions?.canUnclaim && (
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => handleTaskAction('unclaim')}
                        disabled={isActionLoading}
                        className="gba:gap-2"
                      >
                        <UserMinusIcon className="gba:w-4 gba:h-4" />
                        Unclaim
                      </Button>
                    )}

                    {availableActions?.canComplete && (
                        <Button 
                          size="sm"
                          onClick={() => handleTaskAction('complete')}
                          disabled={isActionLoading}
                          className="gba:gap-2 gba:bg-green-600 hover:gba:bg-green-700"
                        >
                          <CheckCircleIcon className="gba:w-4 gba:h-4" />
                          Complete
                        </Button>
                    )}

                    {availableActions?.canReject && (
                        <Button 
                          variant="destructive"
                          size="sm"
                          onClick={() => handleTaskAction('reject')}
                          disabled={isActionLoading}
                          className="gba:gap-2"
                        >
                          <WarningCircleIcon className="gba:w-4 gba:h-4" />
                          Reject
                        </Button>
                    )}
                  </>
                )}

                <Button 
                  variant="outline"
                  size="sm"
                  onClick={refetch}
                  disabled={isLoading}
                  className="gba:gap-2"
                >
                  <ArrowClockwiseIcon className="gba:w-4 gba:h-4" />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="gba:flex gba:items-center gba:gap-3">
                <ClipboardIcon className="gba:w-5 gba:h-5" />
                Request Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {fullRequest ? (
                <div className="gba:space-y-4">
                  <Descriptions
                    column={1}
                    size="small"
                    items={[
                      {
                        key: 'title',
                        label: 'Request Title',
                        children: <Text strong>{fullRequest.titleSnapshot}</Text>,
                      },
                      {
                        key: 'status',
                        label: 'Request Status',
                        children: (
                          <Badge variant="secondary">
                            {fullRequest.status.toUpperCase()}
                          </Badge>
                        ),
                      },
                      {
                        key: 'templateId',
                        label: 'Template ID',
                        children: (fullRequest as any).templateId ? (
                          <span className="gba:font-mono gba:text-sm gba:bg-muted gba:px-2 gba:py-1 gba:rounded" data-testid="template-id">
                            {(fullRequest as any).templateId}
                          </span>
                        ) : (
                          <span className="gba:text-muted-foreground">Not available</span>
                        ),
                      },
                      {
                        key: 'created',
                        label: 'Created',
                        children: new Date(fullRequest.createdAt).toLocaleDateString(),
                      }
                    ]}
                  />

                  {/* Progress Visualization */}
                  {fullRequest.progress && (
                    <div className="gba:p-4 gba:bg-muted/20 gba:rounded-lg">
                      <h4 className="gba:font-semibold gba:mb-2">Progress</h4>
                      <Progress 
                        value={fullRequest.progress.percentage}
                        className="gba:mb-2"
                      />
                      <p className="gba:text-xs gba:text-muted-foreground">
                        {fullRequest.progress.completedSteps} of {fullRequest.progress.totalSteps} steps completed
                      </p>
                    </div>
                  )}


                  {/* Recent Activity */}
                  {fullRequest.timeline && fullRequest.timeline.length > 0 && (
                    <div>
                      <h4 className="gba:font-semibold gba:mb-3">Recent Activity</h4>
                      <Timeline size="sm">
                        {fullRequest.timeline.slice(-3).map((item, idx) => (
                          <TimelineItem
                            key={idx}
                            title={item.message}
                            date={new Date(item.at).toLocaleDateString()}
                            actor={item.userName}
                            status="completed"
                            iconColor="primary"
                          />
                        ))}
                      </Timeline>
                    </div>
                  )}
                </div>
              ) : (
                <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
                  <ClipboardIcon className="gba:w-12 gba:h-12 gba:mx-auto gba:mb-2 gba:opacity-50" />
                  <p>Request details not available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Workflow Steps Card */}
          {fullRequest && ((fullRequest as any).originalSteps || fullRequest.steps) && ((fullRequest as any).originalSteps || fullRequest.steps).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="gba:flex gba:items-center gba:gap-3">
                  <ArrowClockwiseIcon className="gba:w-5 gba:h-5" />
                  Workflow Steps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="gba:text-sm gba:text-muted-foreground gba:mb-6">
                  This request follows {((fullRequest as any).originalSteps || fullRequest.steps).length} workflow steps:
                </p>
                
                <Timeline size="md" className="gba:max-w-none">
                  {((fullRequest as any).originalSteps || fullRequest.steps).map((step: any, index: number) => {
                    const isCompleted = step.status === 'COMPLETED';
                    const isInProgress = step.status === 'IN_PROGRESS';
                    const stepNumber = (step.stepIndex ?? index) + 1;
                    
                    // 🔍 DEBUG: Log step data to see what's available
                    console.log(`[TaskRecord] Step ${stepNumber} data:`, {
                      stepIndex: step.stepIndex,
                      title: step.title,
                      name: step.name,
                      displayTitle: step.name || step.title || `Step ${stepNumber}`,
                      status: step.status,
                      type: step.type,
                      fullStep: step
                    });
                    
                    // Map status to timeline status
                    const timelineStatus = isCompleted ? 'completed' : isInProgress ? 'in-progress' : 'pending';
                    
                    // Map status to icon color
                    const iconColor = isCompleted ? 'success' : isInProgress ? 'primary' : 'muted';
                    
                    // Create step description with details
                    const stepDetails = [];
                    if (step.type) stepDetails.push(`Type: ${step.type}`);
                    if (step.assignmentMode) stepDetails.push(`Assignment: ${step.assignmentMode}`);
                    if (step.totalTasks > 0 || step.completedTasks > 0) {
                      stepDetails.push(`Progress: ${step.completedTasks} of ${step.totalTasks} tasks completed`);
                    }
                    if (step.totalForks > 0) {
                      const forkText = `Forks: ${step.completedForks} of ${step.totalForks} completed`;
                      if (step.inProgressForks > 0) {
                        stepDetails.push(`${forkText} (${step.inProgressForks} in progress)`);
                      } else {
                        stepDetails.push(forkText);
                      }
                    }
                    
                    // Create a simple text description
                    const description = stepDetails.length > 0 ? stepDetails.join(' • ') : `Status: ${step.status.replace('_', ' ').toLowerCase()}`;
                    
                    return (
                      <TimelineItem
                        key={step.stepIndex || index}
                        title={step.title || step.name || `Step ${stepNumber}`}
                        description={description}
                        status={timelineStatus}
                        iconColor={iconColor}
                        icon={isCompleted ? <CheckCircleIcon className="gba:w-4 gba:h-4" /> : undefined}
                        date={`Step ${stepNumber}`}
                      />
                    );
                  })}
                </Timeline>
              </CardContent>
            </Card>
          )}

          {/* Assignment History Card */}
          {(ticket as any).assignment?.assignmentHistory && (ticket as any).assignment.assignmentHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="gba:flex gba:items-center gba:gap-3">
                  <ClockIcon className="gba:w-5 gba:h-5" />
                  Assignment History
                  <Badge variant="secondary" className="gba:ml-2">
                    {(ticket as any).assignment.assignmentHistory.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="gba:space-y-4">
                  {(ticket as any).assignment.assignmentHistory
                    .sort((a: any, b: any) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
                    .map((historyItem: any, index: number) => {
                      const isLatest = index === 0;
                      const actionConfig = {
                        CLAIM: { 
                          color: 'gba:text-green-700 gba:bg-green-50 gba:border-green-200', 
                          icon: UserCheckIcon, 
                          label: 'Claimed',
                          description: 'Task was claimed by user'
                        },
                        UNCLAIM: { 
                          color: 'gba:text-orange-700 gba:bg-orange-50 gba:border-orange-200', 
                          icon: UserMinusIcon, 
                          label: 'Unclaimed',
                          description: 'Task was unclaimed'
                        },
                        ASSIGN: { 
                          color: 'gba:text-blue-700 gba:bg-blue-50 gba:border-blue-200', 
                          icon: UserCheckIcon, 
                          label: 'Assigned',
                          description: 'Task was assigned to user'
                        },
                        REASSIGN: { 
                          color: 'gba:text-purple-700 gba:bg-purple-50 gba:border-purple-200', 
                          icon: ArrowClockwiseIcon, 
                          label: 'Reassigned',
                          description: 'Task was reassigned to different user'
                        }
                      };
                      
                      const config = actionConfig[historyItem.action as keyof typeof actionConfig] || {
                        color: 'gba:text-gray-700 gba:bg-gray-50 gba:border-gray-200',
                        icon: ClockIcon,
                        label: historyItem.action,
                        description: `Task action: ${historyItem.action}`
                      };
                      
                      const ActionIcon = config.icon;
                      
                      return (
                        <div 
                          key={index} 
                          className={`gba:flex gba:items-start gba:gap-3 gba:p-4 gba:rounded-lg gba:border ${config.color} ${isLatest ? 'gba:ring-2 gba:ring-offset-1 gba:ring-primary/20' : ''}`}
                          data-testid={`assignment-history-${index}`}
                        >
                          <div className="gba:flex-shrink-0 gba:mt-0.5">
                            <ActionIcon className="gba:w-5 gba:h-5" />
                          </div>
                          <div className="gba:flex-1 gba:min-w-0">
                            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                              <h4 className="gba:text-sm gba:font-semibold">
                                {config.label}
                                {isLatest && (
                                  <Badge variant="secondary" className="gba:ml-2 gba:text-xs">
                                    Latest
                                  </Badge>
                                )}
                              </h4>
                            </div>
                            <p className="gba:text-xs gba:mb-2 gba:opacity-80">
                              {config.description}
                            </p>
                            <div className="gba:flex gba:flex-col gba:gap-1 gba:text-xs">
                              <div className="gba:flex gba:items-center gba:gap-1">
                                <ClockIcon className="gba:w-3 gba:h-3" />
                                <span className="gba:font-medium">When:</span>
                                <span>{new Date(historyItem.changedAt).toLocaleString()}</span>
                              </div>
                              <div className="gba:flex gba:items-center gba:gap-1">
                                <UserIcon className="gba:w-3 gba:h-3" />
                                <span className="gba:font-medium">By:</span>
                                <EmployeeDisplayName
                                  userId={historyItem.changedBy}
                                  accessToken={accessToken}
                                  showIcon={false}
                                  fallback="Unknown User"
                                  testId={`assignment-history-user-${index}`}
                                />
                              </div>
                              {historyItem.changedTo && historyItem.changedTo !== historyItem.changedBy && (
                                <div className="gba:flex gba:items-center gba:gap-1">
                                  <ArrowClockwiseIcon className="gba:w-3 gba:h-3" />
                                  <span className="gba:font-medium">To:</span>
                                  <EmployeeDisplayName
                                    userId={historyItem.changedTo}
                                    accessToken={accessToken}
                                    showIcon={false}
                                    fallback="Unknown User"
                                    testId={`assignment-history-to-${index}`}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
                
                {/* Summary Stats */}
                <div className="gba:mt-6 gba:pt-4 gba:border-t gba:text-xs gba:text-muted-foreground gba:flex gba:justify-between">
                  <span>Total Actions: {(ticket as any).assignment.assignmentHistory.length}</span>
                  <span>
                    First Action: {new Date((ticket as any).assignment.assignmentHistory[(ticket as any).assignment.assignmentHistory.length - 1]?.changedAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      </PageLayout>
    </div>
  );
};
