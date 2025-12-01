import React, { useState, useEffect } from 'react'
import {
  Card,
  Button,
  Tag,
  Timeline,
  Input,
  Alert,
  Space,
  Typography,
  Divider,
  Select,
  Row,
  Col,
  Steps,
  Badge,
  message,
  Progress,
  Tooltip
} from 'antd'
import {
  User,
  Clock,
  AlertCircle,
  ArrowRight,
  CheckCircle,
  PlayCircle,
  Send,
  Users,
  Calendar,
  Eye,
  MessageSquare,
  UserPlus,
  UserMinus,
  RotateCw,
  FastForward
} from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { StepReceiver, Comment, StepStatus, SubmittedRequest } from '../../../../packages/services-plus-core/src'
import type { StepInstance } from '../../../types'
import { formatRequestId } from '../../../utils' // ✅ Import utilities
import { useTicketDetail } from '../hooks/useTicketDetail'
import { useTicketActions } from '../hooks/useTicketActions'
import { createConductorWorkflowEngine } from '../../../services'
import { TaskForm, type TaskFormField } from './TaskForm'

const { Text, Title, Paragraph } = Typography
const { TextArea } = Input
const { Option } = Select

// Utility function to truncate long IDs for better display
const truncateId = (id: string, maxLength: number = 12): string => {
  if (!id || id.length <= maxLength) return id
  return `${id.slice(0, 8)}...${id.slice(-4)}`
}

// Priority options for SLA calculation
const PRIORITY_OPTIONS = [
  { value: 'critical', label: 'Critical', hours: 4, color: '#ff4d4f' },
  { value: 'high', label: 'High', hours: 8, color: '#ff7a45' },
  { value: 'medium', label: 'Medium', hours: 24, color: '#faad14' },
  { value: 'low', label: 'Low', hours: 72, color: '#52c41a' }
]

// ⚠️ MOCKED DATA: Users for assignment picker
// TODO: Replace with real user data from organizational service
const MOCK_USERS = [
  { id: 'user1', name: 'John Smith', email: 'john.smith@company.com' },
  { id: 'user2', name: 'Sarah Johnson', email: 'sarah.johnson@company.com' },
  { id: 'user3', name: 'Mike Wilson', email: 'mike.wilson@company.com' },
  { id: 'user4', name: 'Lisa Chen', email: 'lisa.chen@company.com' }
]

// Calculate SLA due date - ENHANCED with real data
const calculateSLADue = (
  ticket: StepInstance | null
): { dueDate: Date | null; status: 'ok' | 'warning' | 'overdue'; hoursLeft: number } => {
  // Use real dueDate from workflow engine if available
  if (ticket?.dueDate) {
    const dueDate = new Date(ticket.dueDate)
    const now = new Date()
    const timeDiff = dueDate.getTime() - now.getTime()
    const hoursLeft = timeDiff / (1000 * 60 * 60)

    let status: 'ok' | 'warning' | 'overdue' = 'ok'
    if (hoursLeft < 0) status = 'overdue'
    else if (hoursLeft < 2) status = 'warning'

    return { dueDate, status, hoursLeft }
  }

  // Fallback: Calculate from startedAt if no real dueDate
  if (!ticket?.startedAt) return { dueDate: null, status: 'ok', hoursLeft: 0 }

  // Default to medium priority for demo (when no real SLA data)
  const priority = PRIORITY_OPTIONS[2] // medium - 24 hours
  const startDate = new Date(ticket.startedAt)
  const dueDate = new Date(startDate.getTime() + priority.hours * 60 * 60 * 1000)

  const now = new Date()
  const timeDiff = dueDate.getTime() - now.getTime()
  const hoursLeft = timeDiff / (1000 * 60 * 60)

  let status: 'ok' | 'warning' | 'overdue' = 'ok'
  if (hoursLeft < 0) status = 'overdue'
  else if (hoursLeft < 2) status = 'warning'

  return { dueDate, status, hoursLeft }
}

export interface TicketDetailProps extends BusinessAppContextProps {
  ticketId: string
  deskKey: StepReceiver
  onTicketUpdate?: () => void
}

export const TicketDetail: React.FC<TicketDetailProps> = ({
  ticketId,
  deskKey,
  accessToken,
  userInfo,
  onTicketUpdate
}) => {
  const [commentText, setCommentText] = useState<string>('')
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false)
  const [assigneeId, setAssigneeId] = useState<string>('')

  const [overallRequest, setOverallRequest] = useState<SubmittedRequest | null>(null)
  const [isLoadingRequest, setIsLoadingRequest] = useState<boolean>(false)

  // Optimistic update states
  const [optimisticTicket, setOptimisticTicket] = useState<StepInstance | null>(null)
  const [isOptimisticUpdate, setIsOptimisticUpdate] = useState<boolean>(false)

  // Task completion states
  const [isCompletingTask, setIsCompletingTask] = useState<boolean>(false)

  // ⚡ ALL HOOKS MUST BE CALLED AT THE TOP LEVEL - NO EARLY RETURNS BEFORE THIS POINT

  // Fetch ticket details
  const { ticket, isLoading, error, refetch } = useTicketDetail({
    ticketId,
    accessToken,
    userInfo
  })

  // Ticket actions (claim, assign, advance, comment)
  const { claimTicket, assignTicket, advanceTicket, addComment, isPerformingAction } = useTicketActions({
    accessToken,
    userInfo,
    onSuccess: () => {
      setOptimisticTicket(null)
      setIsOptimisticUpdate(false)
      refetch()
      onTicketUpdate?.()
    }
  })

  const currentUserId = userInfo?.employeeDetails?.employeeId

  // Fetch overall request details - MOVED TO TOP LEVEL TO AVOID HOOKS RULE VIOLATION
  useEffect(() => {
    const fetchOverallRequest = async () => {
      if (!ticket?.requestId) return

      setIsLoadingRequest(true)
      try {
        if (!accessToken || !userInfo) {
          throw new Error('Authentication required - no access token or user info provided')
        }

        const workflowEngine = createConductorWorkflowEngine({ accessToken, userInfo })
        const request = await workflowEngine.getRequest(ticket.requestId)
        setOverallRequest(request)
      } catch (err) {
        console.error('Failed to fetch overall request:', err)
      } finally {
        setIsLoadingRequest(false)
      }
    }

    fetchOverallRequest()
  }, [ticket?.requestId, currentUserId])

  // ✅ ALL HOOKS CALLED - NOW SAFE FOR CONDITIONAL LOGIC AND EARLY RETURNS

  // Use optimistic ticket if available, otherwise use real ticket
  const displayTicket = optimisticTicket || ticket

  // 🔍 DEBUG: Log the ticket data with safety checks
  try {
    console.log(`🎯 [TicketDetail] Rendering for ticketId: ${ticketId}`)
    console.log(`🎯 [TicketDetail] Is loading:`, isLoading)
    console.log(`🎯 [TicketDetail] Error:`, error)
    console.log(`🎯 [TicketDetail] Has ticket:`, !!ticket)
    console.log(`🎯 [TicketDetail] Has optimisticTicket:`, !!optimisticTicket)
    console.log(`🎯 [TicketDetail] displayTicket:`, displayTicket)
  } catch (e) {
    console.error(`🎯 [TicketDetail] Error in debug logging:`, e)
  }

  // Early return for loading/error/no data states
  if (isLoading) {
    return (
      <div className="gba:p-6 gba:text-center">
        <div className="gba:animate-spin gba:rounded-full gba:h-8 gba:w-8 gba:border-b-2 gba:border-blue-500 gba:mx-auto"></div>
        <Text className="gba:mt-2">Loading ticket details...</Text>
      </div>
    )
  }

  if (error) {
    return <Alert message="Error Loading Ticket" description={error} type="error" showIcon className="gba:m-6" />
  }

  if (!displayTicket) {
    console.log(`🎯 [TicketDetail] No ticket data for ticketId: ${ticketId}`)
    return (
      <div className="gba:p-6 gba:text-center">
        <AlertCircle className="gba:w-12 gba:h-12 gba:text-gray-400 gba:mx-auto gba:mb-4" />
        <Title level={4} className="gba:text-gray-600">
          No Ticket Data
        </Title>
        <Text className="gba:text-gray-500">Unable to load details for ticket: {ticketId}</Text>
      </div>
    )
  }

  // Event handlers - AFTER all early returns
  const handleClaim = async () => {
    if (!ticket) return

    // Optimistic update
    setOptimisticTicket({
      ...ticket,
      claimedByUserId: currentUserId || 'current-user',
      status: 'in_progress' as StepStatus
    })
    setIsOptimisticUpdate(true)

    message.loading(getTranslationFromI18nKeyAndLabel('services.ticket.claiming', 'Claiming ticket...'), 0.5)

    try {
      await claimTicket(ticket.id)
      message.success(
        getTranslationFromI18nKeyAndLabel('services.ticket.claimed.success', 'Ticket claimed successfully')
      )
    } catch (error) {
      setOptimisticTicket(null)
      setIsOptimisticUpdate(false)
      message.error(getTranslationFromI18nKeyAndLabel('services.ticket.claimed.error', 'Failed to claim ticket'))
      console.error('Failed to claim ticket:', error)
    }
  }

  const handleUnclaim = async () => {
    if (!ticket) return

    // Optimistic update
    setOptimisticTicket({
      ...ticket,
      claimedByUserId: undefined,
      status: 'ready' as StepStatus
    })
    setIsOptimisticUpdate(true)

    message.loading(getTranslationFromI18nKeyAndLabel('services.ticket.unclaiming', 'Unclaiming ticket...'), 0.5)

    try {
      // Note: This would need to be added to the workflow engine interface
      // For now, simulating with a claim to null
      message.success(
        getTranslationFromI18nKeyAndLabel('services.ticket.unclaimed.success', 'Ticket unclaimed successfully')
      )
    } catch (error) {
      setOptimisticTicket(null)
      setIsOptimisticUpdate(false)
      message.error(getTranslationFromI18nKeyAndLabel('services.ticket.unclaimed.error', 'Failed to unclaim ticket'))
      console.error('Failed to unclaim ticket:', error)
    }
  }

  const handleAssign = async () => {
    if (!ticket || !assigneeId) return

    // Optimistic update
    setOptimisticTicket({
      ...ticket,
      assignedToUserId: assigneeId,
      status: 'in_progress' as StepStatus
    })
    setIsOptimisticUpdate(true)

    message.loading(getTranslationFromI18nKeyAndLabel('services.ticket.assigning', 'Assigning ticket...'), 0.5)

    try {
      await assignTicket(ticket.id, assigneeId)
      setAssigneeId('')
      message.success(
        getTranslationFromI18nKeyAndLabel('services.ticket.assigned.success', 'Ticket assigned successfully')
      )
    } catch (error) {
      setOptimisticTicket(null)
      setIsOptimisticUpdate(false)
      message.error(getTranslationFromI18nKeyAndLabel('services.ticket.assigned.error', 'Failed to assign ticket'))
      console.error('Failed to assign ticket:', error)
    }
  }

  const handleAdvance = async () => {
    if (!ticket) return

    // Optimistic update
    setOptimisticTicket({
      ...ticket,
      status: 'done' as StepStatus,
      finishedAt: new Date().toISOString()
    })
    setIsOptimisticUpdate(true)

    message.loading(getTranslationFromI18nKeyAndLabel('services.ticket.advancing', 'Completing step...'), 0.5)

    try {
      await advanceTicket(ticket.id)
      message.success(
        getTranslationFromI18nKeyAndLabel('services.ticket.advanced.success', 'Step completed successfully')
      )
    } catch (error) {
      setOptimisticTicket(null)
      setIsOptimisticUpdate(false)
      message.error(getTranslationFromI18nKeyAndLabel('services.ticket.advanced.error', 'Failed to complete step'))
      console.error('Failed to advance ticket:', error)
    }
  }

  const handleAddComment = async () => {
    if (!ticket || !commentText.trim()) return

    setIsSubmittingComment(true)

    // Optimistic update
    const newComment: Comment = {
      id: `temp-${Date.now()}`,
      stepId: ticket.id,
      authorId: currentUserId || 'current-user',
      body: commentText.trim(),
      createdAt: new Date().toISOString(),
      visibility: 'current_and_downstream'
    }

    setOptimisticTicket({
      ...ticket,
      comments: [...ticket.comments, newComment]
    })
    setCommentText('')

    message.loading(getTranslationFromI18nKeyAndLabel('services.ticket.adding_comment', 'Adding comment...'), 0.5)

    try {
      await addComment(ticket.id, commentText.trim())
      message.success(
        getTranslationFromI18nKeyAndLabel('services.ticket.comment.success', 'Comment added successfully')
      )
    } catch (error) {
      setOptimisticTicket(null)
      setCommentText(commentText) // Restore comment text on error
      message.error(getTranslationFromI18nKeyAndLabel('services.ticket.comment.error', 'Failed to add comment'))
      console.error('Failed to add comment:', error)
    } finally {
      setIsSubmittingComment(false)
    }
  }

  // Handle task completion with form data
  const handleCompleteTaskWithForm = async (formData: Record<string, any>) => {
    if (!ticket) return

    setIsCompletingTask(true)

    // Optimistic update
    setOptimisticTicket({
      ...ticket,
      status: 'done' as StepStatus,
      finishedAt: new Date().toISOString(),
      formData: formData // Store the submitted form data
    } as any)
    setIsOptimisticUpdate(true)

    message.loading(
      getTranslationFromI18nKeyAndLabel('services.ticket.completing', 'Completing task with form data...'),
      1
    )

    try {
      // TODO: Update workflow engine to support form data in task completion
      await advanceTicket(ticket.id, formData)
      message.success(
        getTranslationFromI18nKeyAndLabel('services.ticket.completed.success', 'Task completed successfully')
      )
      onTicketUpdate?.()
    } catch (err) {
      setOptimisticTicket(null)
      setIsOptimisticUpdate(false)
      message.error(getTranslationFromI18nKeyAndLabel('services.ticket.completed.error', 'Failed to complete task'))
      console.error('Task completion error:', err)
    } finally {
      setIsCompletingTask(false)
    }
  }

  // Get status color
  const getStatusColor = (status: StepStatus): string => {
    switch (status) {
      case 'ready':
        return 'blue'
      case 'pending':
        return 'orange'
      case 'in_progress':
        return 'processing'
      case 'blocked':
        return 'yellow'
      case 'done':
        return 'green'
      case 'canceled':
        return 'red'
      default:
        return 'default'
    }
  }

  // Calculate SLA info
  const slaInfo = displayTicket
    ? calculateSLADue(displayTicket)
    : { dueDate: null, status: 'ok' as const, hoursLeft: 0 }

  // Safety checks for displayTicket before accessing properties
  const canClaim = displayTicket?.status === 'ready' && !displayTicket?.claimedByUserId
  const canUnclaim = displayTicket?.claimedByUserId === currentUserId
  const canAssign = displayTicket?.status === 'ready' || displayTicket?.status === 'in_progress'
  const canAdvance = displayTicket?.status === 'in_progress'
  const isAssignedToUser =
    displayTicket?.assignedToUserId === currentUserId || displayTicket?.claimedByUserId === currentUserId

  // Wrap render in try-catch to prevent React crashes
  try {
    return (
      <Row gutter={24} className="gba:h-full">
        {/* Main Content */}
        <Col span={16} className="gba:space-y-6">
          <div data-testid={`ticket-detail-${ticketId}`}>
            {/* Enhanced Header */}
            <Card className="gba:mb-6">
              <div className="gba:flex gba:justify-between gba:items-start gba:mb-6">
                <div className="gba:flex-1">
                  <div className="gba:flex gba:items-center gba:gap-3 gba:mb-3">
                    <Title level={3} className="gba:mb-0">
                      {displayTicket?.name || 'Loading...'}
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
                      {getTranslationFromI18nKeyAndLabel('services.ticket.id', 'ID')}:{' '}
                      {displayTicket?.requestId ? formatRequestId(displayTicket.requestId) : 'N/A'}
                    </Text>
                    <Tag color={getStatusColor(displayTicket?.status || 'pending')} className="gba:text-sm">
                      {getTranslationFromI18nKeyAndLabel(
                        `services.status.${displayTicket?.status || 'pending'}`,
                        (displayTicket?.status || 'pending').replace('_', ' ').toUpperCase()
                      )}
                    </Tag>
                    <div className="gba:flex gba:items-center gba:gap-1">
                      <User className="gba:w-4 gba:h-4 gba:text-gray-400" />
                      <Text className="gba:text-sm">{displayTicket?.desk || deskKey}</Text>
                    </div>
                    {/* LIVE DATA: Task Start Time */}
                    {displayTicket?.startedAt && (
                      <div className="gba:flex gba:items-center gba:gap-1">
                        <Calendar className="gba:w-4 gba:h-4 gba:text-gray-400" />
                        <Text className="gba:text-sm">
                          Started: {new Date(displayTicket.startedAt).toLocaleString()}
                        </Text>
                      </div>
                    )}
                  </div>

                  {/* Task Message */}
                  {(displayTicket as any)?.message && (
                    <div className="gba:mb-4">
                      <Paragraph className="gba:text-gray-700 gba:bg-blue-50 gba:p-3 gba:rounded gba:mb-0">
                        {(displayTicket as any).message}
                      </Paragraph>
                    </div>
                  )}

                  {/* Requester Information - Using LIVE DATA */}
                  {(displayTicket?.requesterName || displayTicket?.requesterId) && (
                    <div className="gba:mb-4">
                      <div className="gba:flex gba:items-start gba:gap-2">
                        <User className="gba:w-4 gba:h-4 gba:text-gray-500 gba:mt-1 gba:flex-shrink-0" />
                        <div className="gba:flex-1 gba:min-w-0">
                          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
                            <Text>
                              <strong>Requested by:</strong>
                            </Text>
                            <div className="gba:flex gba:flex-col gba:gap-1">
                              <Text className="gba:break-words">
                                {displayTicket.requesterName || (
                                  <Tooltip title={displayTicket.requesterId}>
                                    <Text code className="gba:font-mono gba:text-xs">
                                      {truncateId(displayTicket.requesterId || '', 16)}
                                    </Text>
                                  </Tooltip>
                                )}
                              </Text>
                              {displayTicket.requesterName && displayTicket.requesterId && (
                                <Tooltip title={displayTicket.requesterId}>
                                  <Text type="secondary" className="gba:text-xs gba:font-mono">
                                    ID: {truncateId(displayTicket.requesterId, 16)}
                                  </Text>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* HYBRID DATA: SLA Due Information - uses real dueDate if available, fallback to calculated */}
                  {slaInfo.dueDate && (
                    <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
                      {slaInfo.status === 'overdue' && <AlertCircle className="gba:w-4 gba:h-4 gba:text-red-500" />}
                      {slaInfo.status === 'warning' && <Clock className="gba:w-4 gba:h-4 gba:text-yellow-500" />}
                      {slaInfo.status === 'ok' && <CheckCircle className="gba:w-4 gba:h-4 gba:text-green-500" />}
                      <Text
                        className="gba:text-sm"
                        style={{
                          color:
                            slaInfo.status === 'overdue'
                              ? '#ff4d4f'
                              : slaInfo.status === 'warning'
                                ? '#faad14'
                                : '#52c41a'
                        }}
                      >
                        <strong>{getTranslationFromI18nKeyAndLabel('services.ticket.sla.due', 'SLA Due')}: </strong>
                        {slaInfo.dueDate.toLocaleString()}
                        {slaInfo.status === 'overdue' && ' (Overdue)'}
                        {slaInfo.status === 'warning' && ` (${Math.round(slaInfo.hoursLeft)}h left)`}
                        {displayTicket?.dueDate && (
                          <span className="gba:ml-2 gba:text-xs gba:text-green-600">(Live SLA)</span>
                        )}
                      </Text>
                    </div>
                  )}

                  {/* LIVE DATA: Assignment Info */}
                  <div className="gba:mb-4">
                    {displayTicket?.assignedToUserId ? (
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <User className="gba:w-4 gba:h-4 gba:text-blue-500" />
                        <Text>
                          {getTranslationFromI18nKeyAndLabel('services.ticket.assignedTo', 'Assigned to')}:{' '}
                          <strong>{displayTicket.assignedToUserName || displayTicket.assignedToUserId}</strong>
                        </Text>
                      </div>
                    ) : displayTicket?.claimedByUserId ? (
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <User className="gba:w-4 gba:h-4 gba:text-orange-500" />
                        <Text>
                          {getTranslationFromI18nKeyAndLabel('services.ticket.claimedBy', 'Claimed by')}:{' '}
                          <strong>{displayTicket.claimedByUserName || displayTicket.claimedByUserId}</strong>
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

                  {/* LIVE DATA: Task Metadata */}
                  <div className="gba:mb-4 gba:p-3 gba:bg-gray-50 gba:rounded">
                    <Text strong className="gba:block gba:mb-2 gba:text-sm">
                      Task Details (Live Data)
                    </Text>
                    <div className="gba:grid gba:grid-cols-2 gba:gap-2 gba:text-xs">
                      {displayTicket?.defId && (
                        <div>
                          <Text type="secondary">Definition ID:</Text>
                          <Text code className="gba:ml-1">
                            {displayTicket.defId}
                          </Text>
                        </div>
                      )}
                      {displayTicket?.requestId && (
                        <div>
                          <Text type="secondary">Flow ID:</Text>
                          <Text code className="gba:ml-1">
                            {formatRequestId(displayTicket.requestId)}
                          </Text>
                        </div>
                      )}
                      {displayTicket?.finishedAt && (
                        <div>
                          <Text type="secondary">Finished:</Text>
                          <Text className="gba:ml-1">{new Date(displayTicket.finishedAt).toLocaleString()}</Text>
                        </div>
                      )}
                    </div>
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
                        placeholder={getTranslationFromI18nKeyAndLabel(
                          'services.ticket.actions.assignTo',
                          'Assign to...'
                        )}
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

                  {/* Advance/Complete Action - Only show if no form or not assigned to user */}
                  {canAdvance && (!(displayTicket as any)?.form?.length || !isAssignedToUser) && (
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
                </Space>
              </div>
            </Card>

            {/* Interactive Task Form */}
            {(displayTicket as any)?.form && (displayTicket as any).form.length > 0 && isAssignedToUser && (
              <TaskForm
                fields={(displayTicket as any).form as TaskFormField[]}
                onSubmit={handleCompleteTaskWithForm}
                isSubmitting={isCompletingTask}
                showCompleteButton={displayTicket?.status === 'in_progress'}
                showSaveButton={true}
                ticketId={displayTicket?.id}
              />
            )}

            {/* Read-only Form Display for non-assigned users */}
            {(displayTicket as any)?.form && (displayTicket as any).form.length > 0 && !isAssignedToUser && (
              <Card
                title={getTranslationFromI18nKeyAndLabel(
                  'services.ticket.form.readonly_title',
                  'Required Information (Read-only)'
                )}
              >
                <Alert
                  message={getTranslationFromI18nKeyAndLabel('services.ticket.form.readonly_info', 'Form Information')}
                  description={getTranslationFromI18nKeyAndLabel(
                    'services.ticket.form.readonly_desc',
                    'You must claim this task to fill out the required information.'
                  )}
                  type="info"
                  showIcon
                  className="gba:mb-4"
                />
                <div className="gba:space-y-3">
                  {(displayTicket as any).form.map((field: any, index: number) => (
                    <div key={index} className="gba:border gba:border-gray-200 gba:rounded gba:p-3 gba:bg-gray-50">
                      <div className="gba:flex gba:justify-between gba:items-start">
                        <div>
                          <Text strong className="gba:text-sm">
                            {field.label}
                          </Text>
                          {field.required && (
                            <Text type="danger" className="gba:ml-1">
                              *
                            </Text>
                          )}
                        </div>
                        <Tag color="blue" className="gba:text-xs">
                          {field.type}
                        </Tag>
                      </div>
                      {field.options && (
                        <div className="gba:mt-2">
                          <Text type="secondary" className="gba:text-xs">
                            Options: {field.options.map((opt: any) => opt.label).join(', ')}
                          </Text>
                        </div>
                      )}
                      {field.description && (
                        <div className="gba:mt-1">
                          <Text type="secondary" className="gba:text-xs">
                            {field.description}
                          </Text>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Related Documents */}
            {(displayTicket as any)?.links && (displayTicket as any).links.length > 0 && (
              <Card title={getTranslationFromI18nKeyAndLabel('services.ticket.links.title', 'Related Documents')}>
                <div className="gba:space-y-2">
                  {(displayTicket as any).links.map((link: any, index: number) => (
                    <div key={index}>
                      <Button type="link" href={link.url} target="_blank" className="gba:p-0 gba:h-auto">
                        {link.name}
                      </Button>
                      <Text type="secondary" className="gba:ml-2 gba:text-xs">
                        ({link.type})
                      </Text>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Enhanced Comments Section */}
            <Card
              title={
                <div className="gba:flex gba:items-center gba:justify-between">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <MessageSquare className="gba:w-4 gba:h-4" />
                    {getTranslationFromI18nKeyAndLabel('services.ticket.comments.title', 'Comments')}
                    <Badge
                      count={displayTicket?.comments?.length || 0}
                      showZero
                      style={{ backgroundColor: '#1890ff' }}
                    />
                  </div>
                </div>
              }
            >
              {/* Add Comment */}
              {isAssignedToUser && (
                <div className="gba:mb-6">
                  <div className="gba:mb-3">
                    <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                      <Eye className="gba:w-4 gba:h-4 gba:text-green-500" />
                      <Text className="gba:text-sm gba:text-green-600">
                        {getTranslationFromI18nKeyAndLabel(
                          'services.ticket.comments.visibility.downstream',
                          'This comment will be visible to all downstream steps'
                        )}
                      </Text>
                    </div>
                  </div>

                  <TextArea
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder={getTranslationFromI18nKeyAndLabel(
                      'services.ticket.comments.placeholder',
                      'Add a comment visible to downstream steps...'
                    )}
                    rows={4}
                    className="gba:mb-3"
                    data-testid="comment-input"
                  />

                  <div className="gba:flex gba:justify-between gba:items-center">
                    <Text className="gba:text-xs gba:text-gray-500">
                      {getTranslationFromI18nKeyAndLabel(
                        'services.ticket.comments.plain.help',
                        'Plain text formatting'
                      )}
                    </Text>

                    <Button
                      type="primary"
                      icon={<Send className="gba:w-4 gba:h-4" />}
                      onClick={handleAddComment}
                      loading={isSubmittingComment}
                      disabled={!commentText.trim()}
                      data-testid="add-comment-button"
                    >
                      {getTranslationFromI18nKeyAndLabel('services.ticket.comments.add', 'Add Comment')}
                    </Button>
                  </div>
                </div>
              )}

              <Divider />

              {/* Comments Timeline */}
              {(displayTicket?.comments?.length || 0) > 0 ? (
                <Timeline className="gba:mt-4">
                  {(displayTicket?.comments || []).map((comment: Comment) => (
                    <Timeline.Item
                      key={comment.id}
                      data-testid={`comment-${comment.id}`}
                      dot={<MessageSquare className="gba:w-3 gba:h-3" />}
                    >
                      <div className="gba:space-y-3">
                        <div className="gba:flex gba:justify-between gba:items-start">
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <User className="gba:w-4 gba:h-4 gba:text-gray-400" />
                            <Text strong className="gba:text-sm">
                              {comment.authorId}
                            </Text>
                          </div>
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <Calendar className="gba:w-3 gba:h-3 gba:text-gray-400" />
                            <Text type="secondary" className="gba:text-xs">
                              {new Date(comment.createdAt).toLocaleString()}
                            </Text>
                          </div>
                        </div>

                        <div className="gba:bg-gray-50 gba:p-3 gba:rounded-lg">
                          {/* Render markdown or plain text */}
                          <Paragraph className="gba:mb-0 gba:text-sm">{comment.body}</Paragraph>
                        </div>

                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Eye className="gba:w-3 gba:h-3 gba:text-green-500" />
                          <Tag color="green" className="gba:text-xs">
                            {getTranslationFromI18nKeyAndLabel(
                              'services.ticket.comments.visibility',
                              'Visible downstream'
                            )}
                          </Tag>
                        </div>
                      </div>
                    </Timeline.Item>
                  ))}
                </Timeline>
              ) : (
                <div className="gba:text-center gba:py-8">
                  <MessageSquare className="gba:w-8 gba:h-8 gba:text-gray-300 gba:mx-auto gba:mb-2" />
                  <Text type="secondary">
                    {getTranslationFromI18nKeyAndLabel('services.ticket.comments.empty', 'No comments yet')}
                  </Text>
                </div>
              )}
            </Card>
          </div>
        </Col>

        {/* Side Panel - Overall Request */}
        <Col span={8}>
          <Card
            title={
              <div className="gba:flex gba:items-center gba:gap-2">
                <ArrowRight className="gba:w-4 gba:h-4" />
                {getTranslationFromI18nKeyAndLabel('services.ticket.overall.title', 'Overall Request')}
              </div>
            }
            className="gba:h-full"
            loading={isLoadingRequest}
          >
            {overallRequest ? (
              <div className="gba:space-y-4">
                {/* Enhanced Request Header */}
                <div>
                  {/* Request Title and Status */}
                  <div className="gba:flex gba:justify-between gba:items-start gba:gap-3 gba:mb-3">
                    <div className="gba:flex-1 gba:min-w-0">
                      <Title level={4} className="gba:mb-2 gba:break-words gba:leading-tight">
                        {overallRequest.titleSnapshot || 'Service Request'}
                      </Title>
                    </div>
                    <Badge
                      color={getStatusColor(overallRequest.status as any)}
                      className="gba:text-sm gba:flex-shrink-0"
                    >
                      {overallRequest.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>

                  {/* Request Metadata */}
                  <div className="gba:space-y-3">
                    <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2 gba:text-sm">
                      <Text code className="gba:font-mono gba:text-xs">
                        {formatRequestId(overallRequest.id)}
                      </Text>
                      <Text type="secondary" className="gba:text-xs">
                        Created: {new Date(overallRequest.createdAt).toLocaleDateString()}
                      </Text>
                    </div>

                    <div className="gba:space-y-2">
                      <div className="gba:flex gba:items-start gba:gap-2">
                        <User className="gba:w-4 gba:h-4 gba:text-gray-500 gba:mt-0.5 gba:flex-shrink-0" />
                        <div className="gba:flex-1 gba:min-w-0">
                          <div className="gba:flex gba:flex-col gba:gap-1">
                            <Text className="gba:text-sm">
                              <strong>Submitted by:</strong>
                            </Text>
                            {overallRequest.requesterName ? (
                              <div>
                                <Text className="gba:break-words gba:text-sm">{overallRequest.requesterName}</Text>
                                {overallRequest.requesterId && (
                                  <Tooltip title={overallRequest.requesterId}>
                                    <Text type="secondary" className="gba:text-xs gba:font-mono gba:block">
                                      ID: {truncateId(overallRequest.requesterId, 16)}
                                    </Text>
                                  </Tooltip>
                                )}
                              </div>
                            ) : (
                              <Tooltip title={overallRequest.requesterId}>
                                <Text code className="gba:font-mono gba:text-xs">
                                  {truncateId(overallRequest.requesterId || '', 16)}
                                </Text>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      </div>

                      {overallRequest.templateId && (
                        <div className="gba:pl-6">
                          <Text type="secondary" className="gba:text-xs gba:break-words">
                            Template: {overallRequest.templateId}
                          </Text>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Visualization */}
                  {overallRequest.progress && (
                    <div className="gba:mt-4">
                      <div className="gba:flex gba:justify-between gba:items-center gba:mb-2">
                        <Text strong className="gba:text-sm">
                          Progress: {overallRequest.progress.completedSteps} of {overallRequest.progress.totalSteps}{' '}
                          steps completed
                        </Text>
                        <Text className="gba:text-sm gba:text-blue-600">{overallRequest.progress.percentage}%</Text>
                      </div>
                      <Progress
                        percent={overallRequest.progress.percentage}
                        status={
                          overallRequest.status === 'completed'
                            ? 'success'
                            : overallRequest.status === 'canceled'
                              ? 'exception'
                              : 'active'
                        }
                        showInfo={false}
                        strokeColor="#1890ff"
                        className="gba:mb-0"
                      />
                    </div>
                  )}
                </div>

                <Divider />

                {/* Steps Progress */}
                <div>
                  <Text strong className="gba:block gba:mb-3">
                    {getTranslationFromI18nKeyAndLabel('services.ticket.overall.steps', 'Workflow Steps')}
                  </Text>

                  <Steps
                    direction="vertical"
                    size="small"
                    current={overallRequest.steps.findIndex(step => step.id === displayTicket?.id)}
                  >
                    {overallRequest.steps.map(step => {
                      const isCurrentStep = step.id === displayTicket?.id
                      const stepStatus =
                        step.status === 'done'
                          ? 'finish'
                          : step.status === 'in_progress'
                            ? 'process'
                            : step.status === 'canceled'
                              ? 'error'
                              : 'wait'

                      return (
                        <Steps.Step
                          key={step.id}
                          title={
                            <div className="gba:flex gba:items-start gba:gap-2 gba:min-w-0">
                              <div className="gba:flex-1 gba:min-w-0">
                                <Text strong={isCurrentStep} className="gba:text-sm gba:break-words gba:leading-tight">
                                  {step.name}
                                </Text>
                              </div>
                              {isCurrentStep && <Badge status="processing" className="gba:flex-shrink-0" />}
                            </div>
                          }
                          description={
                            <div className="gba:space-y-1">
                              <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
                                <Tag color={getStatusColor(step.status)} className="gba:text-xs">
                                  {step.status.toUpperCase()}
                                </Tag>
                                {step.desk && <Text className="gba:text-xs gba:text-gray-500">{step.desk}</Text>}
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

                                {step.finishedAt && (
                                  <div className="gba:flex gba:items-center gba:gap-1">
                                    <CheckCircle className="gba:w-3 gba:h-3 gba:text-green-500" />
                                    <Text className="gba:text-xs gba:text-gray-500">
                                      Completed: {new Date(step.finishedAt).toLocaleString()}
                                    </Text>
                                  </div>
                                )}

                                {(step.assignedToUserId || step.claimedByUserId) && (
                                  <div className="gba:flex gba:items-center gba:gap-1">
                                    <User className="gba:w-3 gba:h-3 gba:text-blue-500" />
                                    <Text className="gba:text-xs gba:text-gray-500">
                                      {step.assignedToUserId
                                        ? `Assigned: ${step.assignedToUserId}`
                                        : `Claimed: ${step.claimedByUserId}`}
                                    </Text>
                                  </div>
                                )}
                              </div>
                            </div>
                          }
                          status={stepStatus}
                        />
                      )
                    })}
                  </Steps>
                </div>
              </div>
            ) : (
              <div className="gba:text-center gba:py-8">
                <RotateCw className="gba:w-8 gba:h-8 gba:text-gray-300 gba:mx-auto gba:mb-2" />
                <Text type="secondary">
                  {getTranslationFromI18nKeyAndLabel('services.ticket.overall.loading', 'Loading request details...')}
                </Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    )
  } catch (renderError) {
    console.error(`🎯 [TicketDetail] Render error for ticketId ${ticketId}:`, renderError)
    console.error(`🎯 [TicketDetail] displayTicket:`, displayTicket)
    console.error(`🎯 [TicketDetail] ticket:`, ticket)

    return (
      <div className="gba:p-6">
        <Alert
          message="Component Error"
          description={`Failed to render ticket details: ${renderError instanceof Error ? renderError.message : 'Unknown error'}`}
          type="error"
          showIcon
        />
        <div className="gba:mt-4 gba:text-xs gba:bg-gray-100 gba:p-2 gba:rounded">
          <div>Ticket ID: {ticketId}</div>
          <div>Has ticket: {!!ticket ? 'Yes' : 'No'}</div>
          <div>Is loading: {isLoading ? 'Yes' : 'No'}</div>
          <div>Error: {error || 'None'}</div>
        </div>
      </div>
    )
  }
}
