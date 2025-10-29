import React, { useState, useEffect } from 'react'
import { Spin, Alert, Button, Timeline, Typography, message, Modal } from 'antd'
import { PlusCircleOutlined, CloseOutlined } from '@ant-design/icons'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetSalesTasks, SalesTaskData } from '../queries/OpportunityTaskQueries'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import dayjs from 'dayjs'
import { useEmployeeData } from '@/business-apps/crm/common/hooks/useEmployeeData'

const { Text } = Typography

interface TasksSectionProps {
  opportunityId?: string
  context: BusinessAppContextProps
}

export const TasksSection: React.FC<TasksSectionProps> = ({ opportunityId, context }) => {
  const [tasks, setTasks] = useState<SalesTaskData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { fetchSalesTasks } = useGetSalesTasks(context)
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))
  const { getEmployeeDisplayName } = useEmployeeData(context.accessToken)

  const loadTasks = async () => {
    if (!opportunityId) return

    setLoading(true)
    setError(null)

    try {
      const result = await fetchSalesTasks({ opportunityId })

      // Filter out approval tasks - they should only appear in the Approvals tab
      const nonApprovalTasks = (result.SalesTask || []).filter(task => {
        const isApprovalTask =
          task.typeRef === 'SalesTaskType:v1:APPROVAL' ||
          task.typeRef?.toLowerCase() === 'approval' ||
          task.typeRef?.split(':').pop()?.toLowerCase() === 'approval'
        return !isApprovalTask
      })

      // Sort tasks by createdAt in descending order (newest first)
      const sortedTasks = nonApprovalTasks.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      setTasks(sortedTasks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [opportunityId])

  // Add focus event listener to refresh data when user returns to the tab
  useEffect(() => {
    const handleFocus = () => {
      loadTasks()
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        handleFocus()
      }
    })

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleFocus)
    }
  }, [opportunityId])

  // Listen for process completion events to refresh tasks
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        if (event.detail?.resolution === 'success') {
          loadTasks()
          return
        }

        // Also check for different event structure
        const response = event.detail?.response
        if (response?.detail?.resolution === 'success') {
          loadTasks()
        }
      } catch (err) {
        console.error('Error handling process completion:', err)
      }
    }

    // Universal event listener to capture all events
    const handleAllEvents = (event: any) => {
      if (event.type && (event.type.includes('process') || event.type.includes('task'))) {
        handleProcessCompletion(event)
      }
    }

    // Listen to multiple possible event names (comprehensive list like lead record)
    const eventNames = [
      'com.newwork.process.taskCompletion',
      'com.newwork.process.completion',
      'com.newwork.process.continue',
      'com.newwork.process.processCompletion',
      'processCompletion',
      'taskCompletion',
      'taskCompleted',
      'processCompleted',
      'task-completion',
      'process-completion'
    ]

    eventNames.forEach(eventName => {
      window.addEventListener(eventName, handleProcessCompletion as EventListener)
    })

    // Add a universal listener for debugging (like lead record)
    const originalDispatchEvent = window.dispatchEvent
    window.dispatchEvent = function (event: Event) {
      if (event.type && (event.type.includes('process') || event.type.includes('task'))) {
        handleAllEvents(event)
      }
      return originalDispatchEvent.call(this, event)
    }

    return () => {
      eventNames.forEach(eventName => {
        window.removeEventListener(eventName, handleProcessCompletion as EventListener)
      })

      // Restore original dispatchEvent
      window.dispatchEvent = originalDispatchEvent
    }
  }, [opportunityId])

  const handleDeleteTask = (task: SalesTaskData) => {
    Modal.confirm({
      title: 'Confirm Deletion',
      content: `Are you sure you want to delete the task "${task.name || 'Untitled Task'}"?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await restClient.post(
            '/customer-relations/saveSalesTask',
            {
              changeMode: 'DELETE',
              salesTask: {
                id: task.id,
                version: task.version,
                opportunity: opportunityId
              }
            },
            {
              headers: { Authorization: `Bearer ${context.accessToken}` }
            }
          )

          // Remove the task from the local state
          setTasks(prevTasks => prevTasks.filter(t => t.id !== task.id))
          message.success('Task deleted successfully')
        } catch (error) {
          console.error('Error deleting task:', error)
          message.error('Failed to delete task')
        }
      }
    })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'red'
      case 'medium':
        return 'orange'
      case 'low':
        return 'green'
      default:
        return 'blue'
    }
  }

  const getPriorityValue = (priority: any): string => {
    if (!priority) return 'Unknown'
    if (typeof priority === 'string') return priority
    if (priority.value) return priority.value
    return 'Unknown'
  }

  const getTypeValue = (type: any): string => {
    if (!type) return 'Unknown'
    if (typeof type === 'string') return type
    if (type.value) return type.value
    return 'Unknown'
  }

  return (
    <div
      className="gba:bg-background"
      style={{
        borderRadius: '8px',
        border: '1px solid #f0f0f0',
        overflow: 'hidden',
        marginBottom: '24px'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px'
        }}
      >
        <div className="gba:tasks-title" style={{ fontSize: '18px', fontWeight: '500' }}>
          Tasks
        </div>
        <AppAction
          accessToken={context.accessToken}
          contextsArray={[FlowContextName.createCustomerTask]}
          externalContextData={{ opportunityId }}
          prefixDataTestId="opportunity-tasks"
          emptyStateBehavior="enable"
        >
          <Button type="primary" icon={<PlusCircleOutlined />} data-testid="add-task-button">
            Add Task
          </Button>
        </AppAction>
      </div>

      <div style={{ padding: '0 24px 24px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
          </div>
        )}

        {error && (
          <Alert
            message="Error Loading Tasks"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: '16px' }}
            action={
              <Button size="small" onClick={loadTasks}>
                Retry
              </Button>
            }
          />
        )}

        {!loading && !error && tasks.length > 0 && (
          <Timeline>
            {tasks.map((task, index) => (
              <Timeline.Item key={task.id || index} color={getPriorityColor(getPriorityValue(task.priority))}>
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong>{task.name}</Text>
                  </div>
                  <div>
                    <Text type="secondary">
                      {dayjs(task.createdAt).format('MMM D, YYYY [at] h:mm A')} -{' '}
                      {getEmployeeDisplayName(task.createdBy)}
                    </Text>
                  </div>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}
                  >
                    <div style={{ flex: 1 }}>
                      {task.description && <div style={{ marginBottom: '4px' }}>{task.description}</div>}
                      <div className="gba:text-muted-foreground" style={{ fontSize: '12px' }}>
                        {getPriorityValue(task.priority)} priority • {getTypeValue(task.type)}
                        {task.dueDate && (
                          <span
                            style={{
                              color: dayjs(task.dueDate).isBefore(dayjs(), 'day') ? '#ff4d4f' : undefined,
                              fontWeight: dayjs(task.dueDate).isBefore(dayjs(), 'day') ? '500' : undefined
                            }}
                          >
                            • Due: {dayjs(task.dueDate).format('MMM D, YYYY')}
                            {dayjs(task.dueDate).isBefore(dayjs(), 'day') && ' (Overdue)'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    type="text"
                    icon={<CloseOutlined />}
                    size="small"
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      padding: '4px',
                      lineHeight: 1
                    }}
                    onClick={() => handleDeleteTask(task)}
                    data-testid={`delete-task-${task.id}`}
                  />
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        )}

        {!loading && !error && tasks.length === 0 && (
          <div className="gba:text-muted-foreground" style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '16px', marginBottom: '8px' }}>No tasks yet</div>
            <div style={{ fontSize: '14px' }}>Add tasks to track your progress with this opportunity</div>
          </div>
        )}
      </div>
    </div>
  )
}
