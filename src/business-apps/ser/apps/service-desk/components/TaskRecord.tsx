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
  type KpiCardData
} from '@newwork/nw-design-system';

// Fallback to Ant Design for components not yet available in nw-design-system
import { Typography, message, Timeline, Descriptions } from 'antd';

// Import Phosphor icons
import { 
  ArrowLeftIcon, UserIcon, ClockIcon, WarningIcon, CheckCircleIcon, 
  ChatCircleIcon, PaperPlaneRightIcon, UserCheckIcon, UserMinusIcon, 
  ArrowClockwiseIcon, TargetIcon, ClipboardIcon, InfoIcon, WarningCircleIcon,
  TrendUpIcon
} from '@phosphor-icons/react';

// Import types and hooks
import type { SubmittedRequest } from 'packages/services-plus-core';
import { useTicketDetail } from '../hooks/useTicketDetail';
import { useTicketActions } from '../hooks/useTicketActions';
import { EmployeeDisplayName } from './EmployeeDisplayName';
import { formatRequestId, getSLAStatus } from '../../../utils';
import { createConductorWorkflowEngine } from '../../../services';

const { Text } = Typography;

// Status configuration with Phosphor icons
const STATUS_CONFIG = {
  pending: { color: 'secondary', icon: ClockIcon, label: 'Pending' },
  ready: { color: 'secondary', icon: TargetIcon, label: 'Ready' },
  in_progress: { color: 'default', icon: TrendUpIcon, label: 'In Progress' },
  blocked: { color: 'destructive', icon: WarningIcon, label: 'Blocked' },
  done: { color: 'secondary', icon: CheckCircleIcon, label: 'Completed' },
  canceled: { color: 'outline', icon: UserMinusIcon, label: 'Canceled' }
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
    const statusConfig = STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
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
        value: statusConfig.label,
        icon: <StatusIcon className="gba:w-5 gba:h-5" />,
        trend: {
          value: statusConfig.label,
          positive: ticket.status === 'done',
          trendIcon: ticket.status === 'done' ? 'up' : ticket.status === 'blocked' ? 'down' : 'none',
          badgeVariant: ticket.status === 'done' ? 'success' : ticket.status === 'blocked' ? 'destructive' : 'default'
        },
        subtitle: `Current state`,
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
    const workflowId = ticket?.workflowId || ticket?.requestId;
    if (!workflowId || !accessToken || !userInfo) return;
    
    try {
      const workflowEngine = createConductorWorkflowEngine({ accessToken, userInfo });
      const requestDetails = await workflowEngine.getRequest(workflowId);
      setFullRequest(requestDetails);
    } catch (error) {
      console.error('Failed to load full request:', error);
    }
  };

  // Load request details when ticket is available
  useEffect(() => {
    const workflowId = ticket?.workflowId || ticket?.requestId;
    if (workflowId) {
      loadFullRequest();
    }
  }, [ticket?.workflowId, ticket?.requestId]);

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
  const statusConfig = STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
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
        headerDescription={`Request ID: ${formatRequestId(ticket.workflowId || ticket.requestId)} • ${ticket.desk || 'Unknown Desk'} • Task ID: ${ticket.id}`}
        headerIcon={StatusIcon}
        variant="ext1"
        headerContent={
          <Badge variant={statusConfig.color as any}>
            {statusConfig.label}
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
                {ticket.status !== 'done' && ticket.status !== 'canceled' && (
                  <>
                    {!ticket.claimedByUserId && !ticket.assignedToUserId && (
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

                    {ticket.claimedByUserId === userInfo?.id && (
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

                    {(ticket.claimedByUserId === userInfo?.id || ticket.assignedToUserId === userInfo?.id) && (
                      <>
                        <Button 
                          size="sm"
                          onClick={() => handleTaskAction('complete')}
                          disabled={isActionLoading}
                          className="gba:gap-2 gba:bg-green-600 hover:gba:bg-green-700"
                        >
                          <CheckCircleIcon className="gba:w-4 gba:h-4" />
                          Complete
                        </Button>

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
                      </>
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

          {/* Comments & Activity Card */}
          <Card>
            <CardHeader>
              <CardTitle className="gba:flex gba:items-center gba:gap-3">
                <ChatCircleIcon className="gba:w-5 gba:h-5" />
                Comments & Activity
                {ticket.comments?.length > 0 && (
                  <Badge variant="secondary" className="gba:ml-2">
                    {ticket.comments.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Comments List */}
              <div className="gba:mb-6">
                {ticket.comments && ticket.comments.length > 0 ? (
                  <div className="gba:space-y-4 gba:max-h-80 gba:overflow-y-auto">
                    {ticket.comments.map((comment) => (
                      <div key={comment.id} className="gba:flex gba:gap-3 gba:p-4 gba:bg-muted/30 gba:rounded-lg">
                                                  <Avatar className="gba:flex-shrink-0">
                            <AvatarFallback>
                              <UserIcon className="gba:w-4 gba:h-4" />
                            </AvatarFallback>
                          </Avatar>
                        <div className="gba:flex-1">
                          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                            <span className="gba:text-sm gba:font-medium">
                              {comment.authorName || comment.authorId}
                            </span>
                            <span className="gba:text-xs gba:text-muted-foreground">
                              {new Date(comment.createdAt).toLocaleString()}
                            </span>
                            {comment.action && (
                              <Badge variant="outline">{comment.action}</Badge>
                            )}
                          </div>
                          <p className="gba:text-sm">{comment.body}</p>
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

        {/* Right Column - Request Overview */}
        <div className="gba:space-y-6">
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
                      <Timeline
                        items={fullRequest.timeline.slice(-3).map((item) => ({
                          children: (
                            <div>
                              <p className="gba:text-xs gba:text-muted-foreground">
                                {new Date(item.at).toLocaleDateString()}
                              </p>
                              <div className="gba:text-sm">{item.message}</div>
                              {item.userName && (
                                <p className="gba:text-xs gba:text-muted-foreground">
                                  by {item.userName}
                                </p>
                              )}
                            </div>
                          )
                        }))}
                      />
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
        </div>
      </div>
      </PageLayout>
    </div>
  );
};
