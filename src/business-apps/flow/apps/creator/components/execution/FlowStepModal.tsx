import React, { useState } from 'react'
import { Modal, Card, Button, Space, Typography, Form, message, Tag, Divider } from 'antd'
import {
  CheckIcon,
  XIcon,
  UserIcon,
  ChatCircleIcon,
  NotePencilIcon,
  InfoIcon,
  CheckCircleIcon,
  GearIcon
} from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { FlowStepType } from '../../types/flowTemplate'
import { InputRenderer } from '../shared/InputRenderer'
import { LinksRenderer } from '../shared/LinksRenderer'

const { Title, Text, Paragraph } = Typography

interface FlowStepModalProps {
  visible: boolean
  task: {
    taskId: string
    stepIndex: number
    title: string
    message: string
    stepType: FlowStepType
    links?: any[]
    inputs?: any[]
    assignee?: string
    assignmentMode?: string
    allowReassignment?: boolean
  }
  onComplete: (taskId: string, result: any) => Promise<void>
  onCancel: () => void
  readOnly?: boolean // Add read-only mode for preview
  'data-testid'?: string
}

export const FlowStepModal: React.FC<FlowStepModalProps> = ({
  visible,
  task,
  onComplete,
  onCancel,
  readOnly = false,
  'data-testid': testId = 'flow-step-modal'
}) => {
  const [form] = Form.useForm()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<'APPROVED' | 'REJECTED' | 'COMPLETED' | null>(null)

  const getStepIcon = (stepType: FlowStepType) => {
    switch (stepType) {
      case 'TASK':
        return <UserIcon size={16} className="gba:text-blue-500" />
      case 'APPROVAL':
        return <GearIcon size={16} className="gba:text-orange-500" />
      case 'INFORMATION':
        return <ChatCircleIcon size={16} className="gba:text-green-500" />
      case 'ACKNOWLEDGE':
        return <CheckCircleIcon size={16} className="gba:text-purple-500" />
      default:
        return <InfoIcon size={16} className="gba:text-gray-500" />
    }
  }

  const getFlowStepTypeLabel = (stepType: FlowStepType) => {
    switch (stepType) {
      case 'TASK':
        return getTranslationFromI18nKeyAndLabel('flow.step.task', 'Task')
      case 'APPROVAL':
        return getTranslationFromI18nKeyAndLabel('flow.step.approval', 'Approval')
      case 'INFORMATION':
        return getTranslationFromI18nKeyAndLabel('flow.step.information', 'Information')
      case 'ACKNOWLEDGE':
        return getTranslationFromI18nKeyAndLabel('flow.step.acknowledge', 'Acknowledge')
      default:
        return stepType
    }
  }

  const handleSubmit = async (action: 'APPROVED' | 'REJECTED' | 'COMPLETED') => {
    try {
      setIsSubmitting(true)

      // Validate form if there are inputs
      if (task.inputs && task.inputs.length > 0) {
        await form.validateFields()
      }

      const formData = form.getFieldsValue()

      const completionData = {
        result: action,
        stepIndex: task.stepIndex,
        stepType: task.stepType,
        inputData: formData,
        completedAt: new Date().toISOString(),
        completedBy: task.assignee || 'current-user'
      }

      await onComplete(task.taskId, completionData)
      message.success(
        action === 'APPROVED'
          ? getTranslationFromI18nKeyAndLabel('flow.step.approved', 'Step approved successfully')
          : action === 'REJECTED'
            ? getTranslationFromI18nKeyAndLabel('flow.step.rejected', 'Step rejected')
            : getTranslationFromI18nKeyAndLabel('flow.step.completed', 'Step completed successfully')
      )
    } catch (error) {
      console.error('Failed to complete step:', error)
      message.error(getTranslationFromI18nKeyAndLabel('flow.step.error', 'Failed to complete step'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const getActionButtons = () => {
    if (readOnly) {
      return null // No action buttons in read-only mode
    }

    switch (task.stepType) {
      case 'APPROVAL':
        return (
          <Space>
            <Button
              type="primary"
              danger
              icon={<XIcon size={16} />}
              onClick={() => handleSubmit('REJECTED')}
              loading={isSubmitting}
              data-testid={`${testId}-reject-button`}
            >
              {getTranslationFromI18nKeyAndLabel('flow.step.reject', 'Reject')}
            </Button>
            <Button
              type="primary"
              icon={<CheckIcon />}
              onClick={() => handleSubmit('APPROVED')}
              loading={isSubmitting}
              data-testid={`${testId}-approve-button`}
            >
              {getTranslationFromI18nKeyAndLabel('flow.step.approve', 'Approve')}
            </Button>
          </Space>
        )

      case 'INFORMATION':
      case 'ACKNOWLEDGE':
        return (
          <Button
            type="primary"
            icon={<CheckCircleIcon size={16} />}
            onClick={() => handleSubmit('COMPLETED')}
            loading={isSubmitting}
            data-testid={`${testId}-acknowledge-button`}
          >
            {task.stepType === 'INFORMATION'
              ? getTranslationFromI18nKeyAndLabel('flow.step.understood', 'Understood')
              : getTranslationFromI18nKeyAndLabel('flow.step.acknowledge', 'Acknowledge')}
          </Button>
        )

      default:
        return (
          <Button
            type="primary"
            icon={<CheckIcon />}
            onClick={() => handleSubmit('COMPLETED')}
            loading={isSubmitting}
            data-testid={`${testId}-complete-button`}
          >
            {getTranslationFromI18nKeyAndLabel('flow.step.complete', 'Complete')}
          </Button>
        )
    }
  }

  return (
    <Modal
      title={
        <div className="gba:flex gba:items-center gba:gap-3">
          {getStepIcon(task.stepType)}
          <div>
            <Title level={4} className="gba:mb-0">
              {task.title}
            </Title>
            <Tag color="blue" className="gba:mt-1">
              {getFlowStepTypeLabel(task.stepType)}
            </Tag>
          </div>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
      className="gba:flow-step-modal"
      data-testid={testId}
    >
      <div className="gba:space-y-6">
        {/* Step Message */}
        {task.message && (
          <Card size="small">
            <Paragraph className="gba:mb-0 gba:whitespace-pre-wrap">{task.message}</Paragraph>
          </Card>
        )}

        {/* Links */}
        <LinksRenderer links={task.links || []} testId={`${testId}-links`} />

        {/* Input Form */}
        {task.inputs && task.inputs.length > 0 && (
          <Card
            size="small"
            title={
              <div className="gba:flex gba:items-center gba:gap-2">
                <NotePencilIcon size={16} />
                <span>{getTranslationFromI18nKeyAndLabel('flow.step.inputForm', 'Input Form')}</span>
              </div>
            }
          >
            <Form form={form} layout="vertical" data-testid={`${testId}-form`}>
              {task.inputs.map((input, index) => (
                <InputRenderer key={index} input={input} index={index} testId={testId} readOnly={readOnly} />
              ))}
            </Form>
          </Card>
        )}

        {/* Assignment Info */}
        {task.assignmentMode && (
          <Card
            size="small"
            title={
              <div className="gba:flex gba:items-center gba:gap-2">
                <UserIcon size={16} />
                <span>{getTranslationFromI18nKeyAndLabel('flow.step.assignmentInfo', 'Assignment Information')}</span>
              </div>
            }
          >
            <div className="gba:space-y-2">
              <div>
                <Text strong>{getTranslationFromI18nKeyAndLabel('flow.step.assignedTo', 'Assigned to')}:</Text>{' '}
                {task.assignee || getTranslationFromI18nKeyAndLabel('flow.step.currentUser', 'Current User')}
              </div>
              <div>
                <Text strong>{getTranslationFromI18nKeyAndLabel('flow.step.assignmentMode', 'Assignment Mode')}:</Text>{' '}
                {task.assignmentMode === 'CLAIM'
                  ? getTranslationFromI18nKeyAndLabel('flow.step.claimable', 'Claimable')
                  : getTranslationFromI18nKeyAndLabel('flow.step.assigned', 'Assigned')}
              </div>
              {task.allowReassignment && (
                <div>
                  <Text type="secondary">
                    {getTranslationFromI18nKeyAndLabel(
                      'flow.step.reassignmentAllowed',
                      'Reassignment is allowed for this task'
                    )}
                  </Text>
                </div>
              )}
            </div>
          </Card>
        )}

        <Divider />

        {/* Action Buttons */}
        <div className="gba:flex gba:justify-end gba:gap-3">
          <Button onClick={onCancel} data-testid={`${testId}-cancel-button`}>
            {readOnly
              ? getTranslationFromI18nKeyAndLabel('flow.step.close', 'Close')
              : getTranslationFromI18nKeyAndLabel('flow.step.cancel', 'Cancel')}
          </Button>
          {getActionButtons()}
        </div>
      </div>
    </Modal>
  )
}
