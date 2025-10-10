import React from 'react'
import { List, Tag, Typography } from 'antd'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

const { Text, Title } = Typography

interface Task {
  id: string
  assignment?: {
    currentStatus?: string
    assignmentIteration?: number
    assignmentHistory?: Array<{
      action: string
      changedBy: string
      userId?: string
      changedAt: string
    }>
  }
}

interface AssignmentHistoryTabProps extends BusinessAppContextProps {
  task: Task
  getAssignmentStatusColor: (status: string) => string
}

export const AssignmentHistoryTab: React.FC<AssignmentHistoryTabProps> = ({
  task,
  getAssignmentStatusColor,
  ...context
}) => {
  return (
    <div>
      {task.assignment?.assignmentHistory && task.assignment.assignmentHistory.length > 0 ? (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <Text strong>Current Status: </Text>
            <Tag color={getAssignmentStatusColor(task.assignment.currentStatus || '')}>
              {task.assignment.assignmentStatus}
            </Tag>
            <Text style={{ marginLeft: '8px' }}>(Iteration {task.assignment.assignmentIteration || 0})</Text>
          </div>

          <Title level={5}>Action History</Title>
          <List
            dataSource={task.assignment.assignmentHistory}
            renderItem={(historyItem: any, index: number) => (
              <List.Item>
                <div style={{ width: '100%' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Tag
                        color={
                          historyItem.action === 'claim'
                            ? 'green'
                            : historyItem.action === 'release'
                              ? 'orange'
                              : 'blue'
                        }
                      >
                        {historyItem.action.toUpperCase()}
                      </Tag>
                      <Text strong>{historyItem.changedBy}</Text>
                      {historyItem.userId && historyItem.userId !== historyItem.changedBy && (
                        <Text type="secondary">→ {historyItem.userId}</Text>
                      )}
                    </div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {new Date(historyItem.changedAt).toLocaleString()}
                    </Text>
                  </div>
                </div>
              </List.Item>
            )}
          />
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Text type="secondary">No assignment history available</Text>
        </div>
      )}
    </div>
  )
}
