import React, { useState, useEffect } from 'react';
import { 
  Card, Button, Tag, Timeline, Input, Alert, Space, Typography, Divider, 
  Select, Row, Col, Steps, Badge, message, Tooltip, Modal, Drawer 
} from 'antd';
import { 
  User, Clock, AlertCircle, ArrowRight, CheckCircle, PlayCircle,
  Send, Users, Calendar, Eye, EyeOff, MessageSquare, UserPlus,
  UserMinus, RotateCw, FastForward, FileText, Info
} from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import type { StepReceiver, StepInstance, Comment, TicketStatus, SubmittedRequest } from 'packages/services-plus-core';
import { useTicketDetail } from '../hooks/useTicketDetail';
import { useTicketActions } from '../hooks/useTicketActions';
import { getWorkflowEngine, setWorkflowEngineCurrentUser } from '../../../services/workflowEngineProvider';
import { getUserDisplayName } from '../../../utils/userUtils';

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// Priority options for SLA calculation
const PRIORITY_OPTIONS = [
  { value: 'critical', label: 'Critical', hours: 4, color: '#ff4d4f' },
  { value: 'high', label: 'High', hours: 8, color: '#ff7a45' },
  { value: 'medium', label: 'Medium', hours: 24, color: '#faad14' },
  { value: 'low', label: 'Low', hours: 72, color: '#52c41a' },
];

// Mock users for assignment picker
const MOCK_USERS = [
  { id: 'user1', name: 'John Smith', email: 'john.smith@company.com' },
  { id: 'user2', name: 'Sarah Johnson', email: 'sarah.johnson@company.com' },
  { id: 'user3', name: 'Mike Wilson', email: 'mike.wilson@company.com' },
  { id: 'user4', name: 'Lisa Chen', email: 'lisa.chen@company.com' },
];

// Calculate SLA due date
const calculateSLADue = (ticket: StepInstance): { dueDate: Date | null; status: 'ok' | 'warning' | 'overdue'; hoursLeft: number } => {
  if (!ticket.startedAt) return { dueDate: null, status: 'ok', hoursLeft: 0 };
  
  // Default to medium priority for demo
  const priority = PRIORITY_OPTIONS[2]; // medium - 24 hours
  const startDate = new Date(ticket.startedAt);
  const dueDate = new Date(startDate.getTime() + (priority.hours * 60 * 60 * 1000));
  
  const now = new Date();
  const timeDiff = dueDate.getTime() - now.getTime();
  const hoursLeft = timeDiff / (1000 * 60 * 60);
  
  let status: 'ok' | 'warning' | 'overdue' = 'ok';
  if (hoursLeft < 0) status = 'overdue';
  else if (hoursLeft < 2) status = 'warning';
  
  return { dueDate, status, hoursLeft };
};

export interface TicketDetailProps extends BusinessAppContextProps {
  ticketId: string;
  deskKey: StepReceiver;
  onTicketUpdate?: () => void;
}

export const TicketDetail: React.FC<TicketDetailProps> = ({
  ticketId,
  deskKey,
  accessToken,
  userInfo,
  onTicketUpdate,
}) => {
  const [commentText, setCommentText] = useState<string>('');
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);
  const [assigneeId, setAssigneeId] = useState<string>('');

  const [overallRequest, setOverallRequest] = useState<SubmittedRequest | null>(null);
  const [isLoadingRequest, setIsLoadingRequest] = useState<boolean>(false);
  const [showOverallRequest, setShowOverallRequest] = useState<boolean>(false);
  const [showCommentModal, setShowCommentModal] = useState<boolean>(false);
  const [localComments, setLocalComments] = useState<Comment[]>([]);

  // Optimistic update states
  const [optimisticTicket, setOptimisticTicket] = useState<StepInstance | null>(null);
  const [isOptimisticUpdate, setIsOptimisticUpdate] = useState<boolean>(false);

  // Fetch ticket details
  const { ticket, isLoading, error, refetch } = useTicketDetail({
    ticketId,
    accessToken,
  });

  // Use optimistic ticket if available, otherwise use real ticket
  const displayTicket = optimisticTicket || ticket;
  
  // Combine real comments with local comments
  const allComments = displayTicket ? [...displayTicket.comments, ...localComments] : [];

  // Ticket actions (claim, assign, advance, comment)
  const { 
    claimTicket, 
    assignTicket, 
    advanceTicket, 
    addComment,
    isPerformingAction 
  } = useTicketActions({
    accessToken,
    onSuccess: () => {
      setOptimisticTicket(null);
      setIsOptimisticUpdate(false);
      refetch();
      onTicketUpdate?.();
    },
  });

  const currentUserId = userInfo?.employeeDetails?.employeeId;
  const currentUserDisplayName = getUserDisplayName(userInfo, 'Current User');

  // Fetch overall request details
  useEffect(() => {
    const fetchOverallRequest = async () => {
      if (!ticket?.requestId) return;
      
      setIsLoadingRequest(true);
      try {
        const workflowEngine = getWorkflowEngine(currentUserId || 'default-user');
        const request = await workflowEngine.getRequest(ticket.requestId);
        setOverallRequest(request);
      } catch (err) {
        console.error('Failed to fetch overall request:', err);
      } finally {
        setIsLoadingRequest(false);
      }
    };

    fetchOverallRequest();
  }, [ticket?.requestId, currentUserId]);

  // Ensure mock engine uses the logged-in user's ID for actions
  useEffect(() => {
    if (currentUserId) {
      setWorkflowEngineCurrentUser(currentUserId);
    }
  }, [currentUserId]);

  // Handle claim ticket with optimistic update
  const handleClaim = async () => {
    if (!ticket) return;
    
    // Optimistic update
    setOptimisticTicket({
      ...ticket,
      claimedByUserId: currentUserId || 'current-user',
      status: 'claimed' as TicketStatus
    });
    setIsOptimisticUpdate(true);
    
    message.loading(getTranslationFromI18nKeyAndLabel('services.ticket.claiming', 'Claiming ticket...'), 0.5);
    
    try {
      await claimTicket(ticket.id);
      message.success(getTranslationFromI18nKeyAndLabel('services.ticket.claimed.success', 'Ticket claimed successfully'));
    } catch (err) {
      setOptimisticTicket(null);
      setIsOptimisticUpdate(false);
      message.error(getTranslationFromI18nKeyAndLabel('services.ticket.claimed.error', 'Failed to claim ticket'));
    }
  };

  // Handle unclaim ticket
  const handleUnclaim = async () => {
    if (!ticket) return;
    
    // Optimistic update
    setOptimisticTicket({
      ...ticket,
      claimedByUserId: undefined,
      status: 'queued' as TicketStatus
    });
    setIsOptimisticUpdate(true);
    
    message.loading(getTranslationFromI18nKeyAndLabel('services.ticket.unclaiming', 'Unclaiming ticket...'), 0.5);
    
    try {
      // Note: This would need to be added to the workflow engine interface
      // For now, simulating with a claim to null
      message.success(getTranslationFromI18nKeyAndLabel('services.ticket.unclaimed.success', 'Ticket unclaimed successfully'));
    } catch (err) {
      setOptimisticTicket(null);
      setIsOptimisticUpdate(false);
      message.error(getTranslationFromI18nKeyAndLabel('services.ticket.unclaimed.error', 'Failed to unclaim ticket'));
    }
  };

  // Handle assign ticket
  const handleAssign = async () => {
    if (!ticket || !assigneeId) return;
    
    // Optimistic update
    setOptimisticTicket({
      ...ticket,
      assignedToUserId: assigneeId,
      status: 'in_progress' as TicketStatus
    });
    setIsOptimisticUpdate(true);
    
    message.loading(getTranslationFromI18nKeyAndLabel('services.ticket.assigning', 'Assigning ticket...'), 0.5);
    
    try {
      await assignTicket(ticket.id, assigneeId);
      setAssigneeId('');
      message.success(getTranslationFromI18nKeyAndLabel('services.ticket.assigned.success', 'Ticket assigned successfully'));
    } catch (err) {
      setOptimisticTicket(null);
      setIsOptimisticUpdate(false);
      message.error(getTranslationFromI18nKeyAndLabel('services.ticket.assigned.error', 'Failed to assign ticket'));
    }
  };

  // Handle advance ticket
  const handleAdvance = async () => {
    if (!ticket) return;
    
    // Optimistic update
    setOptimisticTicket({
      ...ticket,
      status: 'done' as TicketStatus,
      completedAt: new Date().toISOString()
    });
    setIsOptimisticUpdate(true);
    
    message.loading(getTranslationFromI18nKeyAndLabel('services.ticket.advancing', 'Completing step...'), 0.5);
    
    try {
      await advanceTicket(ticket.id);
      message.success(getTranslationFromI18nKeyAndLabel('services.ticket.advanced.success', 'Step completed successfully'));
    } catch (err) {
      setOptimisticTicket(null);
      setIsOptimisticUpdate(false);
      message.error(getTranslationFromI18nKeyAndLabel('services.ticket.advanced.error', 'Failed to complete step'));
    }
  };

  // Handle add comment locally (no backend)
  const handleAddComment = () => {
    if (!displayTicket || !commentText.trim()) return;
    
    // Create new local comment
    const newComment: Comment = {
      id: `local-${Date.now()}`,
      stepId: displayTicket.id,
      authorId: currentUserDisplayName,
      body: commentText.trim(),
      createdAt: new Date().toISOString(),
      visibleToDownstream: true
    };
    
    // Add to local comments
    setLocalComments(prev => [...prev, newComment]);
    setCommentText('');
    setShowCommentModal(false);
    
    message.success(getTranslationFromI18nKeyAndLabel('services.ticket.comment.added', 'Comment added'));
  };

  // Get status color
  const getStatusColor = (status: TicketStatus): string => {
    switch (status) {
      case 'queued': return 'blue';
      case 'claimed': return 'orange';
      case 'in_progress': return 'processing';
      case 'waiting': return 'yellow';
      case 'done': return 'green';
      case 'canceled': return 'red';
      default: return 'default';
    }
  };

  // Calculate SLA info
  const slaInfo = displayTicket ? calculateSLADue(displayTicket) : { dueDate: null, status: 'ok' as const, hoursLeft: 0 };

  // Loading state
  if (isLoading) {
    return (
      <div data-testid="ticket-detail-loading" className="gba:p-4">
        <Card loading={true} />
      </div>
    );
  }

  // Error state
  if (error || !displayTicket) {
    return (
      <div data-testid="ticket-detail-error" className="gba:p-4">
        <Alert
          message={getTranslationFromI18nKeyAndLabel(
            'services.ticket.error.title',
            'Error Loading Ticket'
          )}
          description={getTranslationFromI18nKeyAndLabel(
            'services.ticket.error.description',
            'Failed to load ticket details. Please try again.'
          )}
          type="error"
          showIcon
        />
      </div>
    );
  }

  const canClaim = displayTicket.status === 'queued' && !displayTicket.claimedByUserId;
  const canUnclaim = displayTicket.claimedByUserId === currentUserId;
  const canAssign = displayTicket.status === 'queued' || displayTicket.status === 'claimed';
  const canAdvance = displayTicket.status === 'in_progress' || 
                    (displayTicket.status === 'claimed' && displayTicket.claimedByUserId === currentUserId);
  const isAssignedToUser = displayTicket.assignedToUserId === currentUserId || 
                          displayTicket.claimedByUserId === currentUserId;

  return (
    <div className="gba:w-full gba:space-y-6" data-testid={`ticket-detail-${ticketId}`}>
      {/* Enhanced Header */}
      <Card className="gba:mb-6">
            <div className="gba:flex gba:justify-between gba:items-start gba:mb-6">
              <div className="gba:flex-1">
                <div className="gba:flex gba:items-center gba:gap-3 gba:mb-3">
                  <Title level={3} className="gba:mb-0">
                    {displayTicket.name}
                  </Title>
                  {isOptimisticUpdate && (
                    <Badge 
                      status="processing" 
                      text={getTranslationFromI18nKeyAndLabel('services.ticket.updating', 'Updating...')} 
                    />
                  )}
                </div>
                
                <div className="gba:flex gba:items-center gba:gap-4 gba:mb-4">
                  <Text code className="gba:text-sm">
                    {getTranslationFromI18nKeyAndLabel('services.ticket.id', 'ID')}: {displayTicket.id}
                  </Text>
                  <Tag color={getStatusColor(displayTicket.status)} className="gba:text-sm">
                    {getTranslationFromI18nKeyAndLabel(
                      `services.status.${displayTicket.status}`,
                      displayTicket.status.replace('_', ' ').toUpperCase()
                    )}
                  </Tag>
                  <div className="gba:flex gba:items-center gba:gap-1">
                    <User className="gba:w-4 gba:h-4 gba:text-gray-400" />
                    <Text className="gba:text-sm">{deskKey}</Text>
                  </div>
                </div>

                {/* SLA Due Information */}
                {slaInfo.dueDate && (
                  <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
                    {slaInfo.status === 'overdue' && <AlertCircle className="gba:w-4 gba:h-4 gba:text-red-500" />}
                    {slaInfo.status === 'warning' && <Clock className="gba:w-4 gba:h-4 gba:text-yellow-500" />}
                    {slaInfo.status === 'ok' && <CheckCircle className="gba:w-4 gba:h-4 gba:text-green-500" />}
                    <Text 
                      className="gba:text-sm"
                      style={{ 
                        color: slaInfo.status === 'overdue' ? '#ff4d4f' : 
                               slaInfo.status === 'warning' ? '#faad14' : '#52c41a' 
                      }}
                    >
                      <strong>
                        {getTranslationFromI18nKeyAndLabel('services.ticket.sla.due', 'SLA Due')}: {' '}
                      </strong>
                      {slaInfo.dueDate.toLocaleString()}
                      {slaInfo.status === 'overdue' && ' (Overdue)'}
                      {slaInfo.status === 'warning' && ` (${Math.round(slaInfo.hoursLeft)}h left)`}
                    </Text>
                  </div>
                )}

                {/* Assignment Info */}
                <div className="gba:mb-4">
                  {displayTicket.assignedToUserId ? (
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <User className="gba:w-4 gba:h-4 gba:text-blue-500" />
                      <Text>
                        {getTranslationFromI18nKeyAndLabel('services.ticket.assignedTo', 'Assigned to')}: {' '}
                        <strong>{displayTicket.assignedToUserId}</strong>
                      </Text>
                    </div>
                  ) : displayTicket.claimedByUserId ? (
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <User className="gba:w-4 gba:h-4 gba:text-orange-500" />
                      <Text>
                        {getTranslationFromI18nKeyAndLabel('services.ticket.claimedBy', 'Claimed by')}: {' '}
                        <strong>{displayTicket.claimedByUserId}</strong>
                      </Text>
                    </div>
                  ) : (
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <User className="gba:w-4 gba:h-4 gba:text-gray-400" />
                      <Text type="secondary">
                        {getTranslationFromI18nKeyAndLabel('services.ticket.unassigned', 'Unassigned')}
                      </Text>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Enhanced Action Buttons */}
            <div className="gba:border-t gba:pt-4">
              <Space wrap>
                {/* Claim/Unclaim Actions */}
                {canClaim && (
                  <Button
                    type="primary"
                    icon={<UserPlus className="gba:w-4 gba:h-4" />}
                    onClick={handleClaim}
                    loading={isPerformingAction}
                    data-testid="claim-ticket-button"
                  >
                    {getTranslationFromI18nKeyAndLabel('services.ticket.actions.claim', 'Claim')}
                  </Button>
                )}
                
                {canUnclaim && (
                  <Button
                    icon={<UserMinus className="gba:w-4 gba:h-4" />}
                    onClick={handleUnclaim}
                    loading={isPerformingAction}
                    data-testid="unclaim-ticket-button"
                  >
                    {getTranslationFromI18nKeyAndLabel('services.ticket.actions.unclaim', 'Unclaim')}
                  </Button>
                )}

                {/* Assign Action */}
                {canAssign && (
                  <Space.Compact>
                    <Select
                      placeholder={getTranslationFromI18nKeyAndLabel('services.ticket.actions.assignTo', 'Assign to...')}
                      value={assigneeId}
                      onChange={setAssigneeId}
                      style={{ width: 200 }}
                      data-testid="assign-user-select"
                      size="middle"
                    >
                      {MOCK_USERS.map(user => (
                        <Option key={user.id} value={user.id}>
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <User className="gba:w-4 gba:h-4" />
                            <div>
                              <div className="gba:text-sm">{user.name}</div>
                              <div className="gba:text-xs gba:text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </Option>
                      ))}
                    </Select>
                    <Button
                      type="primary"
                      icon={<Users className="gba:w-4 gba:h-4" />}
                      onClick={handleAssign}
                      disabled={!assigneeId}
                      loading={isPerformingAction}
                      data-testid="assign-ticket-button"
                    >
                      {getTranslationFromI18nKeyAndLabel('services.ticket.actions.assign', 'Assign')}
                    </Button>
                  </Space.Compact>
                )}
                
                {/* Advance/Complete Action */}
                {canAdvance && (
                  <Button
                    type="primary"
                    icon={<FastForward className="gba:w-4 gba:h-4" />}
                    onClick={handleAdvance}
                    loading={isPerformingAction}
                    data-testid="advance-ticket-button"
                  >
                    {getTranslationFromI18nKeyAndLabel('services.ticket.actions.complete', 'Complete Step')}
                  </Button>
                )}

                {/* Overall Request Button */}
                <Button
                  icon={<FileText className="gba:w-4 gba:h-4" />}
                  onClick={() => setShowOverallRequest(true)}
                  data-testid="show-overall-request-button"
                >
                  {getTranslationFromI18nKeyAndLabel('services.ticket.actions.viewRequest', 'View Request')}
                </Button>
              </Space>
            </div>
          </Card>

          {/* Enhanced Comments Section */}
          <Card 
            title={
              <div className="gba:flex gba:items-center gba:justify-between">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <MessageSquare className="gba:w-4 gba:h-4" />
                  {getTranslationFromI18nKeyAndLabel('services.ticket.comments.title', 'Comments')}
                  <Badge count={allComments.length} showZero style={{ backgroundColor: '#1890ff' }} />
                </div>
                <Button
                  type="primary"
                  size="small"
                  icon={<MessageSquare className="gba:w-4 gba:h-4" />}
                  onClick={() => setShowCommentModal(true)}
                  data-testid="add-comment-modal-button"
                >
                  {getTranslationFromI18nKeyAndLabel('services.ticket.comments.add', 'Add Comment')}
                </Button>
              </div>
            }
          >
            {/* Comments Timeline */}
            {allComments.length > 0 ? (
              <Timeline className="gba:mt-4">
                {allComments.map((comment: Comment) => (
                  <Timeline.Item 
                    key={comment.id} 
                    data-testid={`comment-${comment.id}`}
                    dot={<MessageSquare className="gba:w-3 gba:h-3" />}
                  >
                    <div className="gba:space-y-3">
                      <div className="gba:flex gba:justify-between gba:items-start">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <User className="gba:w-4 gba:h-4 gba:text-gray-400" />
                          <Text strong className="gba:text-sm">{comment.authorId}</Text>
                        </div>
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Calendar className="gba:w-3 gba:h-3 gba:text-gray-400" />
                          <Text type="secondary" className="gba:text-xs">
                            {new Date(comment.createdAt).toLocaleString()}
                          </Text>
                        </div>
                      </div>
                      
                      <div className="gba:bg-gray-50 gba:p-3 gba:rounded-lg">
                        <Paragraph className="gba:mb-0 gba:text-sm">
                          {comment.body}
                        </Paragraph>
                      </div>
                      
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Eye className="gba:w-3 gba:h-3 gba:text-green-500" />
                        <Tag size="small" color="green" className="gba:text-xs">
                          {getTranslationFromI18nKeyAndLabel(
                            'services.ticket.comments.visibility',
                            'Visible downstream'
                          )}
                        </Tag>
                        {comment.id.startsWith('local-') && (
                          <Tag size="small" color="blue" className="gba:text-xs">
                            {getTranslationFromI18nKeyAndLabel('services.ticket.comments.local', 'Local')}
                          </Tag>
                        )}
                      </div>
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            ) : (
              <div className="gba:text-center gba:py-8">
                <MessageSquare className="gba:w-8 gba:h-8 gba:text-gray-300 gba:mx-auto gba:mb-2" />
                <Text type="secondary">
                  {getTranslationFromI18nKeyAndLabel(
                    'services.ticket.comments.empty',
                    'No comments yet'
                  )}
                </Text>
              </div>
            )}
          </Card>

      {/* Overall Request Modal */}
      <Modal
        title={
          <div className="gba:flex gba:items-center gba:gap-2">
            <FileText className="gba:w-5 gba:h-5" />
            {getTranslationFromI18nKeyAndLabel('services.ticket.overall.title', 'Overall Request')}
          </div>
        }
        open={showOverallRequest}
        onCancel={() => setShowOverallRequest(false)}
        footer={[
          <Button key="close" onClick={() => setShowOverallRequest(false)}>
            {getTranslationFromI18nKeyAndLabel('services.modal.close', 'Close')}
          </Button>
        ]}
        width={800}
        data-testid="overall-request-modal"
      >
        {isLoadingRequest ? (
          <div className="gba:text-center gba:py-8">
            <RotateCw className="gba:w-8 gba:h-8 gba:text-gray-300 gba:mx-auto gba:mb-2 gba:animate-spin" />
            <Text type="secondary">
              {getTranslationFromI18nKeyAndLabel(
                'services.ticket.overall.loading',
                'Loading request details...'
              )}
            </Text>
          </div>
        ) : overallRequest ? (
          <div className="gba:space-y-6">
            {/* Request Info */}
            <Card size="small">
              <div className="gba:space-y-2">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Info className="gba:w-4 gba:h-4 gba:text-blue-500" />
                  <Text strong>
                    {getTranslationFromI18nKeyAndLabel('services.ticket.overall.request', 'Request')}: {overallRequest.requestKey}
                  </Text>
                </div>
                <div className="gba:flex gba:items-center gba:gap-2">
                  <User className="gba:w-4 gba:h-4 gba:text-gray-400" />
                  <Text type="secondary">
                    {getTranslationFromI18nKeyAndLabel('services.ticket.overall.submitted', 'Submitted by')}: {overallRequest.submittedByUserId}
                  </Text>
                </div>
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Calendar className="gba:w-4 gba:h-4 gba:text-gray-400" />
                  <Text type="secondary">
                    {getTranslationFromI18nKeyAndLabel('services.ticket.overall.date', 'Date')}: {new Date(overallRequest.submittedAt).toLocaleString()}
                  </Text>
                </div>
              </div>
            </Card>

            {/* Workflow Steps Progress */}
            <Card 
              size="small"
              title={
                <div className="gba:flex gba:items-center gba:gap-2">
                  <ArrowRight className="gba:w-4 gba:h-4" />
                  {getTranslationFromI18nKeyAndLabel('services.ticket.overall.steps', 'Workflow Steps')}
                </div>
              }
            >
              <Steps
                direction="vertical"
                size="small"
                current={overallRequest.steps.findIndex(step => step.id === displayTicket.id)}
              >
                {overallRequest.steps.map((step, index) => {
                  const isCurrentStep = step.id === displayTicket.id;
                  const stepStatus = step.status === 'done' ? 'finish' : 
                                   step.status === 'in_progress' || step.status === 'claimed' ? 'process' :
                                   step.status === 'canceled' ? 'error' : 'wait';
                  
                  return (
                    <Steps.Step
                      key={step.id}
                      title={
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Text strong={isCurrentStep} className="gba:text-sm">
                            {step.name}
                          </Text>
                          {isCurrentStep && (
                            <Badge status="processing" />
                          )}
                        </div>
                      }
                      description={
                        <div className="gba:space-y-2">
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <Tag size="small" color={getStatusColor(step.status as TicketStatus)}>
                              {step.status.toUpperCase()}
                            </Tag>
                            {step.desk && (
                              <Text className="gba:text-xs gba:text-gray-500">
                                {step.desk}
                              </Text>
                            )}
                          </div>
                          
                          {/* Step Timestamps */}
                          <div className="gba:space-y-1">
                            {step.startedAt && (
                              <div className="gba:flex gba:items-center gba:gap-1">
                                <PlayCircle className="gba:w-3 gba:h-3 gba:text-gray-400" />
                                <Text className="gba:text-xs gba:text-gray-500">
                                  Started: {new Date(step.startedAt).toLocaleString()}
                                </Text>
                              </div>
                            )}
                            
                            {step.completedAt && (
                              <div className="gba:flex gba:items-center gba:gap-1">
                                <CheckCircle className="gba:w-3 gba:h-3 gba:text-green-500" />
                                <Text className="gba:text-xs gba:text-gray-500">
                                  Completed: {new Date(step.completedAt).toLocaleString()}
                                </Text>
                              </div>
                            )}
                            
                            {(step.assignedToUserId || step.claimedByUserId) && (
                              <div className="gba:flex gba:items-center gba:gap-1">
                                <User className="gba:w-3 gba:h-3 gba:text-blue-500" />
                                <Text className="gba:text-xs gba:text-gray-500">
                                  {step.assignedToUserId ? `Assigned: ${step.assignedToUserId}` : `Claimed: ${step.claimedByUserId}`}
                                </Text>
                              </div>
                            )}
                          </div>
                        </div>
                      }
                      status={stepStatus}
                    />
                  );
                })}
              </Steps>
            </Card>
          </div>
        ) : (
          <div className="gba:text-center gba:py-8">
            <FileText className="gba:w-8 gba:h-8 gba:text-gray-300 gba:mx-auto gba:mb-2" />
            <Text type="secondary">
              {getTranslationFromI18nKeyAndLabel(
                'services.ticket.overall.notFound',
                'Request details not available'
              )}
            </Text>
          </div>
        )}
      </Modal>

      {/* Add Comment Modal */}
      <Modal
        title={
          <div className="gba:flex gba:items-center gba:gap-2">
            <MessageSquare className="gba:w-5 gba:h-5" />
            {getTranslationFromI18nKeyAndLabel('services.ticket.comments.add.title', 'Add Comment')}
          </div>
        }
        open={showCommentModal}
        onCancel={() => {
          setShowCommentModal(false);
          setCommentText('');
        }}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => {
              setShowCommentModal(false);
              setCommentText('');
            }}
          >
            {getTranslationFromI18nKeyAndLabel('services.modal.cancel', 'Cancel')}
          </Button>,
          <Button
            key="add"
            type="primary"
            icon={<Send className="gba:w-4 gba:h-4" />}
            onClick={handleAddComment}
            disabled={!commentText.trim()}
            data-testid="modal-add-comment-button"
          >
            {getTranslationFromI18nKeyAndLabel('services.ticket.comments.add', 'Add Comment')}
          </Button>
        ]}
        width={600}
        data-testid="add-comment-modal"
      >
        <div className="gba:space-y-4">
          {/* Visibility Info */}
          <div className="gba:flex gba:items-center gba:gap-2 gba:p-3 gba:bg-green-50 gba:border gba:border-green-200 gba:rounded-lg">
            <Eye className="gba:w-4 gba:h-4 gba:text-green-500" />
            <Text className="gba:text-sm gba:text-green-700">
              {getTranslationFromI18nKeyAndLabel(
                'services.ticket.comments.visibility.downstream',
                'This comment will be visible to all downstream steps and team members'
              )}
            </Text>
          </div>

          {/* Comment Input */}
          <div>
            <Text className="gba:block gba:mb-2 gba:font-medium">
              {getTranslationFromI18nKeyAndLabel('services.ticket.comments.input.label', 'Comment')}
            </Text>
            <TextArea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={getTranslationFromI18nKeyAndLabel(
                'services.ticket.comments.placeholder',
                'Add a comment visible to downstream steps...'
              )}
              rows={6}
              data-testid="modal-comment-input"
              className="gba:w-full"
              autoFocus
            />
            <Text className="gba:text-xs gba:text-gray-500 gba:mt-1">
              {getTranslationFromI18nKeyAndLabel('services.ticket.comments.plain.help', 'Plain text formatting')}
            </Text>
          </div>

          {/* Current User Info */}
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-gray-600">
            <User className="gba:w-4 gba:h-4" />
            <Text>
              {getTranslationFromI18nKeyAndLabel('services.ticket.comments.posting.as', 'Posting as')}: {' '}
              <strong>{currentUserDisplayName}</strong>
            </Text>
          </div>
        </div>
      </Modal>
    </div>
  );
};
