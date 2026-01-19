import React from 'react'
import { List, Space, Tag, Typography, Button } from 'antd'
import { UserOutlined, CalendarOutlined, FormOutlined, LinkOutlined, UserAddOutlined } from '@ant-design/icons'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

const { Text } = Typography

// Use the Task interface from the parent component - remove duplicate definition

interface TaskListCardProps<T = any> extends BusinessAppContextProps {
  task: T
  stepType?: string
  assignmentStatus?: string
  hasInputBlocks: boolean
  hasLinks: boolean
  actionLoading: string | null
  prefixDataTestId: string
  isCompleted?: boolean
  onTaskClick: (task: T) => void
  onQuickClaim: (e: React.MouseEvent, taskId: string) => void
  getTaskTypeIcon: (task: T) => React.ReactNode
  getTaskStatusColor: (status: string) => string
  getStepTypeColor: (stepType: string) => string
  getAssignmentStatusColor: (status: string) => string
  getDueDateTag: (task: T) => React.ReactNode
  isTaskOverdue: (dueDate?: string) => boolean
  isTaskDueSoon: (dueDate?: string) => boolean
  formatDueDate: (dueDate: string) => string
}

export const TaskListCard: React.FC<TaskListCardProps<any>> = ({
  task,
  stepType,
  assignmentStatus,
  hasInputBlocks,
  hasLinks,
  actionLoading,
  prefixDataTestId,
  isCompleted = false,
  onTaskClick,
  onQuickClaim,
  getTaskTypeIcon,
  getTaskStatusColor,
  getStepTypeColor,
  getAssignmentStatusColor,
  getDueDateTag,
  isTaskOverdue,
  isTaskDueSoon,
  formatDueDate,
  ...context
}) => {
  return (
    <List.Item
      key={task.id}
      onClick={() => onTaskClick(task)}
      style={{ cursor: 'pointer' }}
      data-testid={`${prefixDataTestId}-task-item-${task.id}`}
      actions={
        !isCompleted && task.availableActions?.canClaim
          ? [
              <Button
                key="quick-claim"
                type="primary"
                size="small"
                icon={<UserAddOutlined />}
                loading={actionLoading === task.id + 'CLAIM'}
                onClick={e => onQuickClaim(e, task.id)}
                data-testid={`${prefixDataTestId}-quick-claim-${task.id}`}
              >
                Claim
              </Button>
            ]
          : undefined
      }
    >
      <List.Item.Meta
        avatar={getTaskTypeIcon(task)}
        title={
          <Space wrap style={{ alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{task.title || task.name}</span>
            {stepType && (
              <Tag
                color={getStepTypeColor(stepType)}
                style={{
                  fontSize: '12px',
                  padding: '2px 8px',
                  fontWeight: 'bold',
                  marginLeft: '8px'
                }}
              >
                {stepType.toUpperCase()}
              </Tag>
            )}

            {/* Due Date Tag */}
            {getDueDateTag(task)}

            {hasInputBlocks && (
              <Tag color="orange" style={{ fontSize: '11px' }}>
                <FormOutlined /> {(task.form || task.inputs)!.length} Fields
              </Tag>
            )}

            {hasLinks && (
              <Tag color="purple" style={{ fontSize: '11px' }}>
                <LinkOutlined /> {task.links!.length} Links
              </Tag>
            )}
          </Space>
        }
        description={
          <div>
            <div>{task.message || 'No description available'}</div>
            {task.assignment?.assignedTo && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Assigned to: {task.assignment.assignedTo}
              </Text>
            )}
            {!isCompleted && task.dueDate && (
              <div style={{ marginTop: '4px' }}>
                <Text
                  type="secondary"
                  style={{
                    fontSize: '12px',
                    color: isTaskOverdue(task.dueDate) ? '#ff4d4f' : isTaskDueSoon(task.dueDate) ? '#faad14' : '#8c8c8c'
                  }}
                >
                  <CalendarOutlined /> Due: {formatDueDate(task.dueDate)}
                </Text>
              </div>
            )}
          </div>
        }
      />
    </List.Item>
  )
}
