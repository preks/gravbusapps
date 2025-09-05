import React, { useState, useEffect } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

// Import nw-design-system components
import { 
  Card, CardContent, CardHeader, CardTitle,
  Button, 
  Badge,
  Separator,
  PageHeader,
  Progress,
  Avatar, AvatarFallback,
  Textarea,
  Alert,
  Spinner
} from '@newwork/nw-design-system';

// Fallback to Ant Design for components not yet available in nw-design-system
import { 
  Typography, message, Timeline,
  Descriptions, Statistic
} from 'antd';

// Import Lucide icons
import { 
  ArrowLeft, User, Clock, AlertTriangle, CheckCircle, 
  MessageSquare, Send, UserCheck, UserX, 
  RotateCw, Target, Clipboard, Info, AlertCircle
} from 'lucide-react';

// Import types and hooks
import type { SubmittedRequest } from 'packages/services-plus-core';
import { useTicketDetail } from '../hooks/useTicketDetail';
import { useTicketActions } from '../hooks/useTicketActions';
import { EmployeeDisplayName } from './EmployeeDisplayName';
import { formatRequestId } from '../../../utils';
import { createConductorWorkflowEngine } from '../../../services';

const { Text } = Typography;

// Status configuration
const STATUS_CONFIG = {
  pending: { color: 'default', icon: Clock, label: 'Pending' },
  ready: { color: 'processing', icon: Clock, label: 'Ready' },
  in_progress: { color: 'processing', icon: CheckCircle, label: 'In Progress' },
  blocked: { color: 'error', icon: AlertTriangle, label: 'Blocked' },
  done: { color: 'success', icon: CheckCircle, label: 'Done' },
  canceled: { color: 'default', icon: UserX, label: 'Canceled' }
} as const;

export interface TaskDetailScreenProps extends BusinessAppContextProps {
  taskId: string;
  deskKey: string;
  onClose?: () => void;
}

/**
 * Comprehensive Task Detail Screen
 * Shows all task information, comments, actions, and timeline
 */
export const TaskDetailScreen: React.FC<TaskDetailScreenProps> = ({
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
    isLoading: isActionLoading
  } = useTicketActions({
    accessToken,
    userInfo,
    onSuccess: () => {
      refetch();
      loadFullRequest(); // Reload request overview after actions
      message.success('Task action completed successfully');
    }
  });

  // Load full request details for overview
  const loadFullRequest = async () => {
    if (!ticket?.requestId || !accessToken || !userInfo) return;
    
    try {
      const workflowEngine = createConductorWorkflowEngine({ accessToken, userInfo });
      const requestDetails = await workflowEngine.getRequest(ticket.requestId);
      setFullRequest(requestDetails);
    } catch (error) {
      console.error('Failed to load full request:', error);
    }
  };

  // Load request details when ticket is available
  useEffect(() => {
    if (ticket?.requestId) {
      loadFullRequest();
    }
  }, [ticket?.requestId, accessToken, userInfo]);

  // Handle comment submission
  const handleSubmitComment = async () => {
    if (!newComment.trim() || !ticket || !userInfo) return;
    
    setIsSubmittingComment(true);
    try {
      // TODO: Implement comment submission via workflow engine
      console.log('Submitting comment:', newComment);
      message.success('Comment submitted successfully');
      setNewComment('');
      refetch();
    } catch (error) {
      console.error('Failed to submit comment:', error);
      message.error('Failed to submit comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Calculate SLA status
  const getSLAStatus = () => {
    if (!ticket?.dueDate) return null;
    
    const now = new Date();
    const dueDate = new Date(ticket.dueDate);
    const hoursLeft = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursLeft < 0) return { status: 'overdue', hoursLeft: Math.abs(hoursLeft), color: 'error' };
    if (hoursLeft < 2) return { status: 'warning', hoursLeft, color: 'warning' };
    return { status: 'ok', hoursLeft, color: 'success' };
  };

  // Handle task actions
  const handleTaskAction = async (action: string) => {
    if (!ticket || !userInfo?.id) return;

    try {
      switch (action) {
        case 'claim':
          await claimTicket(ticket.id);
          break;
        case 'unclaim':
          await unclaimTicket(ticket.id);
          break;
        case 'complete':
          await completeTicket(ticket.id, {});
          break;
        case 'reject':
          await rejectTicket(ticket.id, 'Task rejected by user');
          break;
      }
    } catch (error) {
      console.error(`Failed to ${action} task:`, error);
      message.error(`Failed to ${action} task`);
    }
  };

  if (isLoading) {
    return (
      <div className="nw:min-h-screen nw:bg-muted/50 nw:p-6">
        <div className="nw:max-w-4xl nw:mx-auto nw:flex nw:justify-center nw:items-center nw:min-h-96">
          <div className="nw:text-center">
            <Spinner className="nw:mb-4" />
            <p className="nw:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('services.loading.task', 'Loading task details...')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="nw:min-h-screen nw:bg-background nw:p-6">
        <div className="layout-content">
          <Card>
            <CardContent className="nw:p-8">
              <Alert variant="destructive" className="nw:mb-4">
                <AlertTriangle className="nw:h-4 nw:w-4" />
                <div>
                  <h4 className="nw:font-medium">{getTranslationFromI18nKeyAndLabel('services.error.title', 'Error')}</h4>
                  <p className="nw:text-sm nw:mt-1">
                    {error || getTranslationFromI18nKeyAndLabel('services.error.taskNotFound', 'Task not found')}
                  </p>
                </div>
              </Alert>
              
              <Button 
                onClick={onClose} 
                variant="outline"
                className="nw:gap-2"
              >
                <ArrowLeft className="nw:w-4 nw:h-4" />
                {getTranslationFromI18nKeyAndLabel('services.actions.goBack', 'Go Back')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const slaStatus = getSLAStatus();
  const statusConfig = STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;


  return (
    <div className="nw:min-h-screen nw:bg-background">
      {/* Proper nw-design-system Header */}
      <PageHeader
        title={ticket.name || 'Untitled Task'}
        description={`Task ID: ${ticket.id || 'Unknown'} • Request: ${formatRequestId(ticket.requestId)}`}
        icon={
          <div className="nw:w-12 nw:h-12 nw:bg-primary/10 nw:rounded-xl nw:flex nw:items-center nw:justify-center">
            <StatusIcon className="nw:w-6 nw:h-6 nw:text-primary" />
          </div>
        }
        actions={
          <div className="nw:flex nw:items-center nw:gap-4">
            <Button 
              variant="outline"
              onClick={onClose}
              data-testid="back-to-queue-button"
              className="nw:gap-2"
            >
              <ArrowLeft className="nw:w-4 nw:h-4" />
              {getTranslationFromI18nKeyAndLabel('services.actions.backToQueue', 'Back to Queue')}
            </Button>
            
            <div className="nw:flex nw:items-center nw:gap-2">
              <Badge variant="secondary">
                {statusConfig.label}
              </Badge>
              <Badge variant="outline">
                {ticket.desk || 'Unknown'}
              </Badge>
            </div>
          </div>
        }
      />

      {/* Main Content using proper layout classes */}
      <main className="layout-content gap-md nw:py-6">
        <div className="nw:grid nw:grid-cols-1 lg:nw:grid-cols-3 nw:gap-6">
          {/* Left Column - Task Details & Comments */}
          <div className="lg:nw:col-span-2 nw:space-y-6">
            {/* Task Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="nw:flex nw:items-center nw:gap-3">
                  <div className="nw:w-8 nw:h-8 nw:bg-primary/10 nw:rounded-lg nw:flex nw:items-center nw:justify-center">
                    <Info className="nw:w-4 nw:h-4 nw:text-primary" />
                  </div>
                  {getTranslationFromI18nKeyAndLabel('services.task.details', 'Task Details')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Descriptions
                  column={{ xs: 1, sm: 2 }}
                  items={[
                    {
                      key: 'status',
                      label: 'Status',
                      children: (
                        <Badge variant="secondary">
                          {statusConfig.label}
                        </Badge>
                      ),
                    },
                    {
                      key: 'desk',
                      label: 'Desk',
                      children: <Badge variant="outline">{ticket.desk || 'Unknown'}</Badge>,
                    },
                    {
                      key: 'created',
                      label: 'Created',
                      children: ticket.startedAt ? new Date(ticket.startedAt).toLocaleString() : 'Unknown',
                    },
                    {
                      key: 'updated',
                      label: 'Last Updated',
                      children: ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString() : 'Not updated',
                    },
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
                        <div className="nw:flex nw:items-center nw:gap-2">
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
                        <span className="nw:text-muted-foreground">Unknown</span>
                      ),
                    },
                  ]}
                />

                {/* SLA Progress */}
                {slaStatus && (
                  <div className="nw:mt-6 nw:p-4 nw:bg-muted/50 nw:rounded-lg">
                    <div className="nw:flex nw:items-center nw:justify-between nw:mb-3">
                      <div className="nw:flex nw:items-center nw:gap-2 nw:font-semibold">
                        <Target className="nw:w-4 nw:h-4" />
                        SLA Progress
                      </div>
                      <Badge 
                        variant={slaStatus.status === 'overdue' ? 'destructive' : 'secondary'}
                      >
                        {slaStatus.status === 'overdue' 
                          ? `${Math.floor(slaStatus.hoursLeft)}h overdue`
                          : `${Math.floor(slaStatus.hoursLeft)}h remaining`
                        }
                      </Badge>
                    </div>
                    <Progress 
                      value={slaStatus.status === 'overdue' ? 100 : 
                             Math.max(0, 100 - (slaStatus.hoursLeft / 24) * 100)}
                      className="nw:mb-2"
                    />
                    {ticket.dueDate && (
                      <p className="nw:text-xs nw:text-muted-foreground">
                        Due: {new Date(ticket.dueDate).toLocaleDateString()} at {new Date(ticket.dueDate).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Task Actions */}
            <Card data-testid="task-actions-card">
              <CardHeader>
                <CardTitle className="nw:flex nw:items-center nw:gap-3">
                  <div className="nw:w-8 nw:h-8 nw:bg-primary/10 nw:rounded-lg nw:flex nw:items-center nw:justify-center">
                    <UserCheck className="nw:w-4 nw:h-4 nw:text-primary" />
                  </div>
                  Task Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="nw:flex nw:flex-wrap nw:gap-3">
                  {/* Primary Actions */}
                  {ticket.status !== 'done' && ticket.status !== 'canceled' && (
                    <>
                      {!ticket.claimedByUserId && !ticket.assignedToUserId && (
                        <Button 
                          size="lg"
                          onClick={() => handleTaskAction('claim')}
                          disabled={isActionLoading}
                          data-testid="claim-task-button"
                          className="nw:gap-2"
                        >
                          <UserCheck className="nw:w-4 nw:h-4" />
                          {getTranslationFromI18nKeyAndLabel('services.task.claim', 'Claim Task')}
                        </Button>
                      )}

                      {ticket.claimedByUserId === userInfo?.id && (
                        <Button 
                          variant="outline"
                          size="lg"
                          onClick={() => handleTaskAction('unclaim')}
                          disabled={isActionLoading}
                          data-testid="unclaim-task-button"
                          className="nw:gap-2"
                        >
                          <UserX className="nw:w-4 nw:h-4" />
                          {getTranslationFromI18nKeyAndLabel('services.task.unclaim', 'Unclaim Task')}
                        </Button>
                      )}

                      {(ticket.claimedByUserId === userInfo?.id || ticket.assignedToUserId === userInfo?.id) && (
                        <>
                          <Button 
                            size="lg"
                            onClick={() => handleTaskAction('complete')}
                            disabled={isActionLoading}
                            data-testid="complete-task-button"
                            className="nw:gap-2 nw:bg-green-600 hover:nw:bg-green-700"
                          >
                            <CheckCircle className="nw:w-4 nw:h-4" />
                            {getTranslationFromI18nKeyAndLabel('services.task.complete', 'Complete Task')}
                          </Button>

                          <Button 
                            variant="destructive"
                            size="lg"
                            onClick={() => handleTaskAction('reject')}
                            disabled={isActionLoading}
                            data-testid="reject-task-button"
                            className="nw:gap-2"
                          >
                            <AlertCircle className="nw:w-4 nw:h-4" />
                            {getTranslationFromI18nKeyAndLabel('services.task.reject', 'Reject Task')}
                          </Button>
                        </>
                      )}
                    </>
                  )}

                  {/* Secondary Actions */}
                  <Button 
                    variant="outline"
                    onClick={refetch}
                    disabled={isLoading}
                    data-testid="refresh-task-button"
                    size="lg"
                    className="nw:gap-2"
                  >
                    <RotateCw className="nw:w-4 nw:h-4" />
                    {getTranslationFromI18nKeyAndLabel('services.task.refresh', 'Refresh')}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Comments Section */}
            <Card data-testid="task-comments-card">
              <CardHeader>
                <CardTitle className="nw:flex nw:items-center nw:gap-3">
                  <div className="nw:w-8 nw:h-8 nw:bg-primary/10 nw:rounded-lg nw:flex nw:items-center nw:justify-center">
                    <MessageSquare className="nw:w-4 nw:h-4 nw:text-primary" />
                  </div>
                  Comments
                  {ticket.comments?.length > 0 && (
                    <Badge variant="secondary" className="nw:ml-2">
                      {ticket.comments.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>

                {/* Comments List */}
                <div className="nw:mb-6">
                  {ticket.comments && ticket.comments.length > 0 ? (
                    <div className="nw:space-y-4 nw:max-h-80 nw:overflow-y-auto">
                      {ticket.comments.map((comment) => (
                        <div key={comment.id} className="nw:flex nw:gap-3 nw:p-4 nw:bg-muted/50 nw:rounded-lg">
                          <Avatar className="nw:flex-shrink-0">
                            <AvatarFallback>
                              <User className="nw:w-4 nw:h-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="nw:flex-1">
                            <div className="nw:flex nw:items-center nw:gap-2 nw:mb-1">
                              <span className="nw:text-sm nw:font-medium">
                                {comment.authorName || comment.authorId}
                              </span>
                              <span className="nw:text-xs nw:text-muted-foreground">
                                {new Date(comment.createdAt).toLocaleString()}
                              </span>
                              {comment.action && (
                                <Badge variant="outline">{comment.action}</Badge>
                              )}
                            </div>
                            <p className="nw:text-sm">
                              {comment.body}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="nw:text-center nw:py-8 nw:text-muted-foreground">
                      <MessageSquare className="nw:w-12 nw:h-12 nw:mx-auto nw:mb-2 nw:opacity-50" />
                      <p>{getTranslationFromI18nKeyAndLabel('services.task.noComments', 'No comments yet')}</p>
                    </div>
                  )}
                </div>

                {/* Add Comment Form */}
                <Separator className="nw:my-6" />
                <div className="nw:space-y-4">
                  <h4 className="nw:text-sm nw:font-semibold">
                    {getTranslationFromI18nKeyAndLabel('services.task.addComment', 'Add Comment')}
                  </h4>
                  <Textarea
                    placeholder={getTranslationFromI18nKeyAndLabel('services.task.commentPlaceholder', 'Enter your comment...')}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={4}
                    data-testid="comment-input"
                  />
                  <div className="nw:flex nw:justify-end">
                    <Button 
                      onClick={handleSubmitComment}
                      disabled={!newComment.trim() || isSubmittingComment}
                      data-testid="submit-comment-button"
                      className="nw:gap-2"
                    >
                      <Send className="nw:w-4 nw:h-4" />
                      {getTranslationFromI18nKeyAndLabel('services.task.addComment', 'Add Comment')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Request Overview */}
          <div className="nw:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="nw:flex nw:items-center nw:gap-3">
                  <div className="nw:w-8 nw:h-8 nw:bg-primary/10 nw:rounded-lg nw:flex nw:items-center nw:justify-center">
                    <Clipboard className="nw:w-4 nw:h-4 nw:text-primary" />
                  </div>
                  Request Overview
                </CardTitle>
              </CardHeader>
              <CardContent>

              {fullRequest ? (
                <div className="nw:space-y-6">
                    {/* Request Statistics */}
                    <div className="nw:grid nw:grid-cols-2 nw:gap-4">
                      <div>
                        <Statistic 
                          title="Progress" 
                          value={fullRequest.progress?.percentage || 0} 
                          suffix="%" 
                          valueStyle={{ color: '#1890ff', fontSize: '18px' }}
                        />
                      </div>
                      <div>
                        <Statistic 
                          title="Steps" 
                          value={fullRequest.progress?.completedSteps || 0}
                          suffix={`/${fullRequest.progress?.totalSteps || 0}`}
                          valueStyle={{ fontSize: '18px' }}
                        />
                      </div>
                    </div>

                    {/* Request Details */}
                    <Descriptions
                      column={1}
                      size="small"
                      items={[
                        {
                          key: 'title',
                          label: 'Title',
                          children: <Text strong>{fullRequest.titleSnapshot}</Text>,
                        },
                        {
                          key: 'status',
                          label: 'Status',
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
                        },
                        {
                          key: 'requester',
                          label: 'Requester',
                          children: fullRequest.requesterId ? (
                            <EmployeeDisplayName
                              userId={fullRequest.requesterId}
                              accessToken={accessToken}
                              showIcon={true}
                              fallback={fullRequest.requesterName || "Unknown User"}
                              testId="request-requester"
                            />
                          ) : (
                            <Text type="secondary">Unknown</Text>
                          ),
                        },
                      ]}
                    />

                    {/* Progress Visualization */}
                    {fullRequest.progress && (
                      <div className="nw:mt-4">
                        <h4 className="nw:font-semibold nw:block nw:mb-2">Request Progress</h4>
                        <Progress 
                          value={fullRequest.progress.percentage}
                          className="nw:mb-3"
                        />
                        <p className="nw:text-xs nw:text-muted-foreground">
                          {fullRequest.progress.completedSteps} of {fullRequest.progress.totalSteps} steps completed
                        </p>
                      </div>
                    )}

                    {/* Timeline Preview */}
                    {fullRequest.timeline && fullRequest.timeline.length > 0 && (
                      <div className="nw:mt-4">
                        <h4 className="nw:font-semibold nw:block nw:mb-3">Recent Activity</h4>
                        <Timeline
                          items={fullRequest.timeline.slice(-3).map((item) => ({
                            children: (
                              <div>
                                <p className="nw:text-xs nw:text-muted-foreground">
                                  {new Date(item.at).toLocaleDateString()}
                                </p>
                                <div className="nw:text-sm">{item.message}</div>
                                {item.userName && (
                                  <p className="nw:text-xs nw:text-muted-foreground">
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
                <div className="nw:text-center nw:py-8 nw:text-muted-foreground">
                  <Clipboard className="nw:w-12 nw:h-12 nw:mx-auto nw:mb-2 nw:opacity-50" />
                  <p>Request details not available</p>
                </div>
              )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};