import React, { useState, useEffect } from 'react'
import { Card, Timeline, Spin, Alert, Button, Tag, Progress, Statistic, Row, Col, Typography } from 'antd'
import {
  CheckCircleOutlined,
  PlayCircleOutlined,
  ClockCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  WarningOutlined
} from '@ant-design/icons'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getFlowEngineApiBaseUrl } from '@/common/network/flows/flowEngineUrl'

const { Title, Text } = Typography

interface FlowProgressTabProps extends BusinessAppContextProps {
  taskId: string
  flowId: string
  accessToken: string
}

interface StepData {
  stepIndex: number
  title: string
  type: string
  status: 'COMPLETED' | 'IN_PROGRESS' | 'SCHEDULED' | 'QUEUED'
  assignmentMode: string
  // Additional step properties that might be used in rendering
  dueDate?: string
  completedBy?: string
  completedAt?: string
  assignedTo?: string[]
  startedAt?: string
  scheduledAt?: string
  expectedStartAt?: string
  dueInMinutes?: number
  isFuture?: boolean
  isActive?: boolean
  message?: string
  // Fork data for approval steps
  totalForks?: number
  completedForks?: number
  rejectedForks?: number
  failedForks?: number
  canceledForks?: number
  inProgressForks?: number
  // Approval-specific fields for APPROVAL type steps
  approvalStatus?: 'APPROVED' | 'REJECTED' | 'PENDING' | 'MIXED'
  approvalCount?: {
    approved: number
    rejected: number
    failed: number
    canceled: number
    total: number
    pending: number
  }
  approvalRate?: number // percentage of approvals
}

interface ProgressData {
  flowId: string
  templateId: string
  name: string
  status: string
  createdAt: string
  progress: {
    currentStep: number
    totalSteps: number
    completedSteps: number
    percentage: number
    stepCounts: {
      total: number
      completed: number
      inProgress: number
      scheduled: number
      queued: number
    }
    upcomingSteps: number
  }
  steps: StepData[]
}

const FlowProgressTab: React.FC<FlowProgressTabProps> = ({ taskId, flowId, accessToken }) => {
  const [progressData, setProgressData] = useState<ProgressData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProgressData = async (forceRefresh = false) => {
    if (!flowId) return

    setIsLoading(true)
    setError(null)

    try {
      const API_BASE = getFlowEngineApiBaseUrl()

      // Add cache-busting parameter when forcing refresh
      const cacheBuster = forceRefresh ? `?_=${Date.now()}` : ''

      // Include authentication headers
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` })
      }

      const [progressResponse, stepsResponse] = await Promise.all([
        fetch(`${API_BASE}/flows/${flowId}/progress${cacheBuster}`, { headers }),
        fetch(`${API_BASE}/flows/${flowId}/progress/steps${cacheBuster}`, { headers })
      ])

      if (!progressResponse.ok) {
        throw new Error(`Failed to fetch progress data: ${progressResponse.statusText}`)
      }

      if (!stepsResponse.ok) {
        throw new Error(`Failed to fetch steps data: ${stepsResponse.statusText}`)
      }

      const [progressData, stepsData] = await Promise.all([progressResponse.json(), stepsResponse.json()])

      console.log('Debug - Raw steps data:', stepsData.data?.steps) // Debug logging

      // Transform API response to match component expectations
      if (progressData.status === 'success' && progressData.data?.flow) {
        const flowData = progressData.data.flow

        // Transform step data from /progress/steps endpoint
        let transformedSteps: StepData[] = []
        let actualCompletedSteps = 0
        if (stepsData.status === 'success' && stepsData.data?.steps) {
          transformedSteps = stepsData.data.steps.map((step: any, index: number) => {
            const mappedStep: StepData = {
              stepIndex: step.rootTaskIndex ?? index,
              title: step.rootTaskTitle || `Step ${index + 1}`,
              type: step.stepType || 'TASK', // Use backend-provided step type
              assignmentMode: step.assignmentMode || 'CLAIM',
              status: step.stepStatus || 'QUEUED',
              totalForks: step.totalForks,
              completedForks: step.completedForks,
              rejectedForks: step.rejectedForks,
              failedForks: step.failedForks,
              canceledForks: step.canceledForks,
              inProgressForks: step.inProgressForks
            }

            // Determine step type based on title or other criteria (fallback if backend doesn't provide type)
            if (
              !step.stepType &&
              mappedStep.title &&
              (mappedStep.title.toLowerCase().includes('approval') ||
                mappedStep.title.toLowerCase().includes('approve') ||
                mappedStep.title.toLowerCase().includes('review'))
            ) {
              mappedStep.type = 'APPROVAL'
            }

            // Add real approval data for APPROVAL type steps using fork statistics
            if (mappedStep.type === 'APPROVAL') {
              // Use actual fork data from backend to determine approval status
              const totalForks = step.totalForks || 1
              const completedForks = step.completedForks || 0 // Completed (approved)
              const rejectedForks = step.rejectedForks || 0 // Rejected
              const failedForks = step.failedForks || 0 // Failed
              const canceledForks = step.canceledForks || 0 // Canceled
              const inProgressForks = step.inProgressForks || 0 // Pending
              const pendingForks = Math.max(
                0,
                totalForks - completedForks - rejectedForks - failedForks - canceledForks - inProgressForks
              )

              // Determine overall approval status based on real task statuses
              let approvalStatus: 'APPROVED' | 'REJECTED' | 'PENDING' | 'MIXED' = 'PENDING'

              if (mappedStep.status === 'COMPLETED') {
                // Step is completed - determine if approved or rejected based on fork results
                if (rejectedForks > 0 && completedForks === 0) {
                  approvalStatus = 'REJECTED'
                } else if (completedForks > 0 && rejectedForks === 0) {
                  approvalStatus = 'APPROVED'
                } else if (completedForks > 0 && rejectedForks > 0) {
                  approvalStatus = 'MIXED'
                } else if (completedForks > 0) {
                  approvalStatus = 'APPROVED'
                }
              } else if (mappedStep.status === 'IN_PROGRESS') {
                approvalStatus = 'PENDING'
              }

              mappedStep.approvalStatus = approvalStatus
              mappedStep.approvalCount = {
                approved: completedForks,
                rejected: rejectedForks,
                failed: failedForks,
                canceled: canceledForks,
                total: totalForks,
                pending: pendingForks + inProgressForks
              }
              mappedStep.approvalRate = totalForks > 0 ? Math.round((completedForks / totalForks) * 100) : 0
            }

            return mappedStep
          })

          // Count actual completed steps from step data
          actualCompletedSteps = transformedSteps.filter(step => step.status === 'COMPLETED').length
        }

        const transformedData = {
          flowId: flowData.rootWorkflowId,
          templateId: flowData.templateId,
          name: flowData.rootWorkflowName,
          status: flowData.workflowStatus,
          createdAt: new Date().toISOString(), // Fallback since API doesn't provide this
          progress: {
            currentStep: actualCompletedSteps, // Use actual completed count
            percentage: flowData.userTaskProgressPercentage,
            completedSteps: actualCompletedSteps, // Use actual completed count instead of API value
            totalSteps: flowData.totalSteps,
            stepCounts: {
              total: flowData.totalUserTasks || transformedSteps.length,
              completed: flowData.completedUserTasks || actualCompletedSteps,
              inProgress:
                flowData.inProgressUserTasks || transformedSteps.filter(s => s.status === 'IN_PROGRESS').length,
              scheduled: Math.max(
                0,
                (flowData.totalUserTasks || transformedSteps.length) -
                  (flowData.completedUserTasks + flowData.inProgressUserTasks)
              ),
              queued: flowData.queuedUserTasks || transformedSteps.filter(s => s.status === 'QUEUED').length
            },
            upcomingSteps: Math.max(0, flowData.totalSteps - actualCompletedSteps) // Use actual completed count
          },
          steps: transformedSteps
        }

        console.log('Debug - Transformed data:', transformedData) // Debug logging
        setProgressData(transformedData)
      } else {
        throw new Error(progressData.message || 'Invalid API response format')
      }
    } catch (err) {
      console.error('Error fetching progress data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  // Initial load when flowId changes
  useEffect(() => {
    if (flowId) {
      console.log('Debug - Loading progress for flowId:', flowId) // Debug logging
      fetchProgressData(true) // Always use cache-busting for initial load
    }
  }, [flowId])

  // Manual refresh function
  const handleRefresh = () => {
    fetchProgressData(true)
  }

  const getStepIcon = (status: string, isActive: boolean) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />
      case 'IN_PROGRESS':
        return <PlayCircleOutlined style={{ color: '#1890ff' }} />
      case 'SCHEDULED':
        return <ClockCircleOutlined style={{ color: '#faad14' }} />
      case 'QUEUED':
      default:
        return <PauseCircleOutlined style={{ color: '#d9d9d9' }} />
    }
  }

  const getStepColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'green'
      case 'IN_PROGRESS':
        return 'blue'
      case 'SCHEDULED':
        return 'orange'
      case 'QUEUED':
        return 'default'
      default:
        return 'default'
    }
  }

  const isStepOverdue = (step: StepData) => {
    if (step.status === 'SCHEDULED' && step.dueDate) {
      return new Date(step.dueDate) < new Date()
    }
    return false
  }

  const getStepDescription = (step: StepData) => {
    if (step.status === 'COMPLETED' && step.completedBy) {
      const completedTime = step.completedAt
        ? ` on ${new Date(step.completedAt).toLocaleDateString()} at ${new Date(step.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : ''
      return `Completed by ${step.completedBy}${completedTime}`
    }
    if (step.status === 'IN_PROGRESS' && step.assignedTo && step.assignedTo.length > 0) {
      const startedTime = step.startedAt
        ? ` (started ${new Date(step.startedAt).toLocaleDateString()} at ${new Date(step.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
        : ''
      return `Assigned to ${step.assignedTo.join(', ')}${startedTime}`
    }
    if (step.status === 'SCHEDULED') {
      const dueInfo = step.dueDate
        ? ` - Due ${new Date(step.dueDate).toLocaleDateString()} at ${new Date(step.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : ''
      const scheduledInfo = step.scheduledAt
        ? ` (scheduled for ${new Date(step.scheduledAt).toLocaleDateString()} at ${new Date(step.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
        : ''
      return `${step.assignmentMode} mode - ${step.type}${dueInfo}${scheduledInfo}`
    }
    if (step.status === 'QUEUED' && step.expectedStartAt) {
      const expectedStartInfo = `Expected to start ${new Date(step.expectedStartAt).toLocaleDateString()} at ${new Date(step.expectedStartAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      const durationInfo = step.dueInMinutes ? ` (estimated ${step.dueInMinutes} minutes)` : ''
      return `${expectedStartInfo}${durationInfo}`
    }
    if (step.isFuture) {
      return `Waiting for previous steps to complete`
    }
    return step.message || `${step.assignmentMode} mode - ${step.type}`
  }

  // Get approval status tags for APPROVAL type steps
  const getApprovalStatusTags = (step: StepData) => {
    if (step.type !== 'APPROVAL' || !step.approvalStatus) {
      return null
    }

    const tags = []

    // Overall approval status tag
    switch (step.approvalStatus) {
      case 'APPROVED':
        tags.push(
          <Tag key="approved" color="green" icon={<CheckCircleOutlined />}>
            Approved
          </Tag>
        )
        break
      case 'REJECTED':
        tags.push(
          <Tag key="rejected" color="red" icon={<WarningOutlined />}>
            Rejected
          </Tag>
        )
        break
      case 'PENDING':
        tags.push(
          <Tag key="pending" color="orange" icon={<ClockCircleOutlined />}>
            Awaiting Approval
          </Tag>
        )
        break
      case 'MIXED':
        tags.push(
          <Tag key="mixed" color="purple" icon={<PlayCircleOutlined />}>
            Partial Approval
          </Tag>
        )
        break
    }

    // Approval count/progress tag for multi-approver steps
    if (step.approvalCount && step.approvalCount.total > 1) {
      const { approved, rejected, failed, canceled, total, pending } = step.approvalCount
      const approvalRate = Math.round((approved / total) * 100)

      tags.push(
        <Tag key="count" color="blue">
          {approved}/{total} Approved ({approvalRate}%)
        </Tag>
      )

      if (rejected > 0) {
        tags.push(
          <Tag key="rejected-count" color="volcano">
            {rejected} Rejected
          </Tag>
        )
      }

      if (failed > 0) {
        tags.push(
          <Tag key="failed-count" color="red">
            {failed} Failed
          </Tag>
        )
      }

      if (canceled > 0) {
        tags.push(
          <Tag key="canceled-count" color="default">
            {canceled} Canceled
          </Tag>
        )
      }

      if (pending > 0) {
        tags.push(
          <Tag key="pending-count" color="default">
            {pending} Pending
          </Tag>
        )
      }
    }

    return <div style={{ marginTop: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>{tags}</div>
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert
        message="Error Loading Flow Progress"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={() => fetchProgressData(true)} icon={<ReloadOutlined />}>
            Retry
          </Button>
        }
      />
    )
  }

  if (!progressData) {
    return (
      <Alert
        message="No Progress Data"
        description="Flow progress information is not available."
        type="info"
        showIcon
      />
    )
  }

  return (
    <div style={{ padding: '16px' }}>
      <Title level={4} style={{ marginBottom: '16px' }}>
        Detailed Progress
      </Title>

      {/* Overall Progress Section */}
      <Card
        title={progressData.name}
        style={{ marginBottom: '24px' }}
        extra={<Tag color={progressData.status === 'RUNNING' ? 'processing' : 'default'}>{progressData.status}</Tag>}
      >
        <div style={{ marginBottom: '16px' }}>
          <Text strong>Overall Progress</Text>
          <Progress
            percent={progressData.progress.percentage}
            status={progressData.status === 'RUNNING' ? 'active' : 'normal'}
            format={percent => `${progressData.progress.completedSteps}/${progressData.progress.totalSteps} steps`}
          />
        </div>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <Tag color="green">{progressData.progress.stepCounts.completed} Completed</Tag>
          <Tag color="blue">{progressData.progress.stepCounts.inProgress} In Progress</Tag>
          <Tag color="orange">{progressData.progress.stepCounts.scheduled} Scheduled</Tag>
          <Tag color="default">{progressData.progress.stepCounts.queued} Queued</Tag>
        </div>
      </Card>

      {/* Step Progress Section */}
      <Card
        title="Step Progress"
        extra={
          <Button size="small" icon={<ReloadOutlined />} onClick={() => fetchProgressData(true)} loading={isLoading}>
            Refresh
          </Button>
        }
      >
        <Timeline>
          {progressData.steps.map(step => (
            <Timeline.Item
              key={step.stepIndex}
              dot={getStepIcon(step.status, step.isActive ?? false)}
              color={getStepColor(step.status)}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Text strong>{step.title}</Text>
                  <Tag color={getStepColor(step.status)}>{step.status.replace('_', ' ')}</Tag>
                  <Text type="secondary">Step {step.stepIndex + 1}</Text>
                </div>
                <Text type="secondary" style={{ marginBottom: '12px' }}>
                  {getStepDescription(step)}
                </Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {step.status === 'COMPLETED' && step.completedAt && (
                    <Tag color="default" icon={<CheckCircleOutlined />}>
                      {new Date(step.completedAt).toLocaleDateString()}{' '}
                      {new Date(step.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Tag>
                  )}
                  {step.status === 'SCHEDULED' && step.dueDate && (
                    <Tag
                      color={isStepOverdue(step) ? 'red' : 'default'}
                      icon={isStepOverdue(step) ? <WarningOutlined /> : <ClockCircleOutlined />}
                    >
                      {isStepOverdue(step) ? 'Overdue: ' : 'Due: '}
                      {new Date(step.dueDate).toLocaleDateString()}{' '}
                      {new Date(step.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Tag>
                  )}
                  {step.status === 'SCHEDULED' && step.scheduledAt && (
                    <Tag color="default" icon={<ClockCircleOutlined />}>
                      Scheduled: {new Date(step.scheduledAt).toLocaleDateString()}{' '}
                      {new Date(step.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Tag>
                  )}
                  {step.status === 'QUEUED' && step.expectedStartAt && (
                    <Tag color="default" icon={<ClockCircleOutlined />}>
                      Expected: {new Date(step.expectedStartAt).toLocaleDateString()}{' '}
                      {new Date(step.expectedStartAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Tag>
                  )}
                  {step.status === 'QUEUED' && step.dueInMinutes && <Tag color="default">~{step.dueInMinutes} min</Tag>}
                </div>
                {/* Approval status tags for APPROVAL type steps */}
                {getApprovalStatusTags(step)}
              </div>
            </Timeline.Item>
          ))}
        </Timeline>
      </Card>
    </div>
  )
}

export default FlowProgressTab
