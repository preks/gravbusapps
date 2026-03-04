import React, { useState } from 'react'
import { UserAddOutlined, CloseCircleOutlined, CheckCircleOutlined, EyeOutlined, LikeOutlined } from '@ant-design/icons'
import {
  Badge,
  Button,
  Switch,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { MessageSquare } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { InputRenderer } from '../../creator/components/shared/InputRenderer'
import { LinksRenderer } from '../../creator/components/shared/LinksRenderer'
import FlowDataSourceSelect from '@/business-apps/flow/common/components/data-source/FlowDataSourceSelect'
import FlowDataSourceMultiSelect from '@/business-apps/flow/common/components/data-source/FlowDataSourceMultiSelect'
import { mockUsers, type User as MockUser } from '../../../data/mockUsers'

// Removed Ant Design destructuring - now using nw-design-system components
// Using a generic Task type to avoid conflicts with parent component

interface TaskDetailsTabProps extends BusinessAppContextProps {
  task: any // Using any to avoid type conflicts with parent Task interface
  stepType?: string
  hasLinks: boolean
  hasInputBlocks: boolean
  taskFormData: any
  reassignUserId: string
  prefixDataTestId: string
  isCompleted?: boolean
  onComplete: () => void
  onClaim: () => void
  onRelease: () => void
  onReassign: () => void
  onReject: () => void
  setReassignUserId: (value: string) => void
  setRejectionComment: (value: string) => void
  setTaskFormData: (data: any) => void
  isTaskOverdue: (dueDate?: string) => boolean
  isTaskDueSoon: (dueDate?: string) => boolean
  isJustClaimable: (task: any) => boolean
}

export const TaskDetailsTab: React.FC<TaskDetailsTabProps> = ({
  task,
  stepType,
  hasLinks,
  hasInputBlocks,
  taskFormData,
  reassignUserId,
  prefixDataTestId,
  accessToken,
  isCompleted = false,
  onComplete,
  onClaim,
  onRelease,
  onReassign,
  onReject,
  setReassignUserId,
  setRejectionComment,
  setTaskFormData,
  isTaskOverdue,
  isTaskDueSoon,
  isJustClaimable
}) => {
  const [showComment, setShowComment] = useState(false)
  const [comment, setComment] = useState('')
  const [showReassignUI, setShowReassignUI] = useState(false)

  // Update parent comment state when local comment changes
  React.useEffect(() => {
    setRejectionComment(comment)
  }, [comment, setRejectionComment])

  // Use the same mock users as the main TaskInbox component
  const availableUsers = mockUsers

  return (
    <div className="gba:space-y-4">
      {/* Task Info Header */}
      <div className="gba:mb-4">
        <div className="gba:flex gba:flex-wrap gba:gap-2">
          {stepType && (
            <Badge variant="secondary" className="gba:text-sm gba:px-3 gba:py-1 gba:font-medium">
              {stepType.toUpperCase()}
            </Badge>
          )}

          {/* Due Date and Scheduled Time */}
          {task.dueDate && (
            <Badge
              variant="outline"
              style={{
                borderColor: isTaskOverdue(task.dueDate)
                  ? 'var(--color-danger-500)'
                  : isTaskDueSoon(task.dueDate)
                    ? 'var(--color-warning-500)'
                    : 'var(--color-success-500)',
                color: isTaskOverdue(task.dueDate)
                  ? 'var(--color-danger-700)'
                  : isTaskDueSoon(task.dueDate)
                    ? 'var(--color-warning-700)'
                    : 'var(--color-success-700)'
              }}
            >
              Due: {new Date(task.dueDate).toLocaleDateString()}{' '}
              {new Date(task.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Badge>
          )}
          {/* Scheduled pill removed per request */}
        </div>
      </div>

      {/* Task Message/Description */}
      {task.message && (
        <div className="gba:mb-4 gba:mt-6">
          <h3 className="gba:text-base gba:font-medium gba:mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Description
          </h3>
          <p className="gba:text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {task.message}
          </p>
        </div>
      )}

      {/* Links Section */}
      {hasLinks && (
        <div className="gba:mb-4">
          <h3 className="gba:text-base gba:font-medium gba:mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Attachments
          </h3>
          <LinksRenderer links={task.links!} />
        </div>
      )}

      {/* Input Form Section */}
      {hasInputBlocks && !isJustClaimable(task) && (
        <div className="gba:mb-4">
          <h3 className="gba:text-base gba:font-medium gba:mb-2" style={{ color: 'var(--color-text-primary)' }}>
            {isCompleted ? 'Submitted Data' : 'Form'}
          </h3>
          <div className="gba:space-y-4">
            {(task.form || task.inputs)!.map((input: any, index: number) => {
              const inputType = String(input?.type || '').toUpperCase()
              const dataTestId = `input-renderer-input-${index}`
              const currentValue = taskFormData?.[input.name]

              const handleChange = (value: any) => {
                console.log('Field changed:', input.name, value)
                setTaskFormData({
                  ...taskFormData,
                  [input.name]: value
                })
              }

              if (input?.dataSource && inputType === 'SELECT') {
                return (
                  <div key={index} className="gba:mb-4" data-testid={`${prefixDataTestId}-datasource-select-${index}`}>
                    <label className="gba:block gba:text-sm gba:font-medium gba:mb-2">{input.label}</label>
                    <FlowDataSourceSelect
                      value={String(currentValue ?? '')}
                      onValueChange={handleChange}
                      dataSource={input.dataSource}
                      accessToken={accessToken}
                      placeholder={input.placeholder || `Select ${input.label}`}
                      initialOptions={Array.isArray(input.options) ? input.options : undefined}
                      disabled={isCompleted || Boolean(input.readOnly)}
                      data-testid={dataTestId}
                    />
                    {input.description ? (
                      <p className="gba:text-xs gba:text-muted-foreground gba:mt-2">{input.description}</p>
                    ) : null}
                  </div>
                )
              }

              if (input?.dataSource && inputType === 'MULTISELECT') {
                return (
                  <div
                    key={index}
                    className="gba:mb-4"
                    data-testid={`${prefixDataTestId}-datasource-multiselect-${index}`}
                  >
                    <label className="gba:block gba:text-sm gba:font-medium gba:mb-2">{input.label}</label>
                    <FlowDataSourceMultiSelect
                      value={Array.isArray(currentValue) ? currentValue.map(String) : []}
                      onValueChange={handleChange}
                      dataSource={input.dataSource}
                      accessToken={accessToken}
                      placeholder={input.placeholder || `Select ${input.label}`}
                      initialOptions={Array.isArray(input.options) ? input.options : undefined}
                      disabled={isCompleted || Boolean(input.readOnly)}
                      data-testid={dataTestId}
                    />
                    {input.description ? (
                      <p className="gba:text-xs gba:text-muted-foreground gba:mt-2">{input.description}</p>
                    ) : null}
                  </div>
                )
              }

              return (
                <InputRenderer
                  key={index}
                  input={input}
                  index={index}
                  readOnly={isCompleted || Boolean(input.readOnly)}
                  value={currentValue ?? ''}
                  onChange={handleChange}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Comment Field - Only show for active tasks */}
      {!isCompleted && (
        <div className="gba:mb-4">
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
            <MessageSquare className="gba:h-4 gba:w-4" />
            <span className="gba:text-sm" style={{ color: 'var(--color-text-primary)' }}>
              Add Comment (Optional)
            </span>
            <Switch
              checked={showComment}
              onCheckedChange={checked => {
                setShowComment(checked)
                if (!checked) {
                  setComment('')
                }
              }}
            />
          </div>
          {showComment && (
            <Textarea
              rows={3}
              placeholder={
                stepType === 'APPROVAL'
                  ? 'Add approval comment or rejection reason...'
                  : 'Add comment about this action...'
              }
              value={comment}
              onChange={e => setComment(e.target.value)}
              maxLength={500}
              className="gba:w-full"
            />
          )}
        </div>
      )}

      {/* Reassignment UI - Only show for active tasks */}
      {!isCompleted && task.availableActions?.canReassign && showReassignUI && (
        <div
          className="gba:mb-4 gba:p-3 gba:rounded-md"
          style={{ border: '1px solid var(--color-border-default)', backgroundColor: 'var(--color-surface-secondary)' }}
        >
          <div className="gba:mb-3">
            <h4 className="gba:text-base gba:font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Reassign Task
            </h4>
          </div>
          <div className="gba:mb-3">
            <p className="gba:text-sm gba:mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              Select a user to reassign this task to:
            </p>
            <Select value={reassignUserId || ''} onValueChange={setReassignUserId}>
              <SelectTrigger className="gba:w-full">
                <SelectValue placeholder="Select user to reassign to..." />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map((user: MockUser) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} - {user.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="gba:flex gba:gap-2">
            <Button
              variant="default"
              size="sm"
              disabled={!reassignUserId}
              onClick={() => {
                onReassign()
                setShowReassignUI(false)
              }}
            >
              Reassign to User
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setReassignUserId('') // Clear user to release back to pool
                onReassign()
                setShowReassignUI(false)
              }}
            >
              Release to Pool
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowReassignUI(false)
                setReassignUserId('')
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Action Buttons - Only show for active tasks */}
      {!isCompleted && (
        <div
          className="gba:flex gba:gap-2 gba:flex-wrap gba:mt-6 gba:pt-4 gba:border-t"
          style={{ borderColor: 'var(--color-border-default)' }}
        >
          {/* Primary Complete Action - context-aware based on task type */}
          {task.availableActions?.canComplete && (
            <Button
              variant="default"
              onClick={() => {
                console.log('Completing task with form data:', taskFormData)
                onComplete()
              }}
              data-testid={`${prefixDataTestId}-complete-button`}
              className="gba:flex gba:items-center gba:gap-2"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-primary-foreground)',
                borderColor: 'var(--color-primary)'
              }}
            >
              {getCompleteButtonIcon(stepType)}
              {getCompleteButtonLabel(stepType)}
            </Button>
          )}

          {/* Reject Button - Only for APPROVAL tasks */}
          {task.availableActions?.canReject && stepType === 'APPROVAL' && (
            <Button
              variant="destructive"
              onClick={onReject}
              data-testid={`${prefixDataTestId}-reject-button`}
              className="gba:flex gba:items-center gba:gap-2"
            >
              <CloseCircleOutlined />
              Reject
            </Button>
          )}

          {/* Secondary Actions */}
          {task.availableActions?.canClaim && (
            <Button
              variant="secondary"
              onClick={onClaim}
              data-testid={`${prefixDataTestId}-claim-button`}
              className="gba:flex gba:items-center gba:gap-2"
            >
              <UserAddOutlined />
              Claim
            </Button>
          )}

          {task.availableActions?.canRelease && (
            <Button variant="secondary" onClick={onRelease} data-testid={`${prefixDataTestId}-release-button`}>
              Release
            </Button>
          )}

          {task.availableActions?.canUnclaim && (
            <Button
              variant="secondary"
              onClick={onRelease}
              data-testid={`${prefixDataTestId}-unclaim-button`}
              className="gba:flex gba:items-center gba:gap-2"
            >
              <CloseCircleOutlined />
              Unclaim
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// Helper functions for context-aware button labels and icons
const getCompleteButtonLabel = (stepType?: string): string => {
  switch (stepType) {
    case 'APPROVAL':
      return 'Approve'
    case 'INFORMATION':
      return 'Mark as Read'
    case 'ACKNOWLEDGE':
    case 'ACKNOWLEDGEMENT': // Handle both variations for backward compatibility
      return 'Acknowledge'
    case 'TASK':
    default:
      return 'Complete'
  }
}

const getCompleteButtonIcon = (stepType?: string) => {
  switch (stepType) {
    case 'APPROVAL':
      return <LikeOutlined />
    case 'INFORMATION':
      return <EyeOutlined />
    case 'ACKNOWLEDGE':
    case 'ACKNOWLEDGEMENT': // Handle both variations for backward compatibility
      return <CheckCircleOutlined />
    case 'TASK':
    default:
      return <CheckCircleOutlined />
  }
}
