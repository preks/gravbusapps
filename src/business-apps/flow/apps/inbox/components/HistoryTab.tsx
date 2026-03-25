import React, { useState, useEffect } from 'react'
import { Timeline, Card, Tag, Typography, Space, Spin, Alert, Button } from 'antd'
import {
  CheckCircleIcon,
  ClockIcon,
  UserIcon,
  ChatCircleIcon,
  ArrowsLeftRightIcon,
  PlayCircleIcon,
  EyeIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
  UserPlusIcon,
  XCircleIcon
} from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

const { Text, Title, Paragraph } = Typography

import { getFlowEngineBaseUrl } from '@/common/network/flows/flowEngineUrl'

interface Task {
  id: string
  flowId: string
  workflowMeta?: {
    rootWorkflowId: string
  }
}

interface HistoryTabProps extends BusinessAppContextProps {
  task: Task
  getAssignmentStatusColor: (status: string) => string
  prefixDataTestId?: string
}

interface HistoryEvent {
  type: 'step' | 'assignment' | 'comment'
  timestamp: string
  stepIndex: number
  stepTitle: string
  eventTitle: string
  description: string
  action?: string
  userId?: string
  userName?: string
  comment?: string
  metadata?: any
}

interface HistorySummary {
  totalSteps: number
  completedSteps: number
  totalAssignmentEvents: number
  totalComments: number
  participants: string[]
}

export const FlowHistoryTab: React.FC<HistoryTabProps> = ({
  task,
  getAssignmentStatusColor,
  prefixDataTestId = 'flow-history',
  ...context
}) => {
  const [events, setEvents] = useState<HistoryEvent[]>([])
  const [filteredEvents, setFilteredEvents] = useState<HistoryEvent[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())

  const flowId = task.workflowMeta?.rootWorkflowId || task.flowId

  useEffect(() => {
    if (flowId) {
      loadHistoryData()
    }
  }, [flowId])

  // Filter events whenever events or activeFilters change
  useEffect(() => {
    if (activeFilters.size === 0) {
      setFilteredEvents(events)
    } else {
      const filtered = events.filter(event => {
        if (activeFilters.has('steps') && event.type === 'step') return true
        if (activeFilters.has('completed') && event.action === 'STEP_COMPLETE') return true
        if (activeFilters.has('assignmentEvents') && event.type === 'assignment') return true
        if (activeFilters.has('comments') && event.type === 'comment') return true
        return false
      })
      setFilteredEvents(filtered)
    }
  }, [events, activeFilters])

  const toggleFilter = (filterType: string) => {
    const newFilters = new Set(activeFilters)
    if (newFilters.has(filterType)) {
      newFilters.delete(filterType)
    } else {
      newFilters.add(filterType)
    }
    setActiveFilters(newFilters)
  }

  const clearAllFilters = () => {
    setActiveFilters(new Set())
  }

  const loadHistoryData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Use the new comprehensive history API
      const baseUrl = getFlowEngineBaseUrl()
      const response = await fetch(`${baseUrl}/api/flows/${flowId}/history`)

      if (!response.ok) {
        throw new Error(`Failed to fetch history: ${response.status}`)
      }

      const data = await response.json()
      setEvents(data.events || [])
      setSummary(data.summary || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history data')
    } finally {
      setIsLoading(false)
    }
  }

  const getEventIcon = (event: HistoryEvent) => {
    switch (event.type) {
      case 'step':
        return <CheckCircleIcon />
      case 'assignment':
        switch (event.action) {
          case 'CLAIM':
            return <UserPlusIcon size={16} />
          case 'UNCLAIM':
            return <XCircleIcon size={16} />
          case 'REASSIGN':
            return <ArrowsLeftRightIcon size={16} />
          case 'COMPLETE':
            return <CheckCircleIcon />
          case 'REJECT':
            return <ThumbsDownIcon size={16} />
          default:
            return <PlayCircleIcon size={16} />
        }
      case 'comment':
        return <ChatCircleIcon size={16} />
      default:
        return <ClockIcon size={16} />
    }
  }

  const getEventColor = (event: HistoryEvent) => {
    switch (event.type) {
      case 'step':
        return 'green'
      case 'assignment':
        switch (event.action) {
          case 'CLAIM':
            return 'blue'
          case 'UNCLAIM':
            return 'orange'
          case 'REASSIGN':
            return 'purple'
          case 'COMPLETE':
            return 'green'
          case 'REJECT':
            return 'red'
          default:
            return 'blue'
        }
      case 'comment':
        return 'cyan'
      default:
        return 'gray'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert
        message="Error Loading History"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={loadHistoryData}>
            Retry
          </Button>
        }
      />
    )
  }

  return (
    <div data-testid={prefixDataTestId} style={{ padding: '16px' }}>
      <div style={{ marginBottom: '16px' }}>
        <Title level={5}>Flow History</Title>
        <Text type="secondary">Complete timeline of workflow steps, task assignments, and user comments</Text>

        {summary && (
          <div
            style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              alignItems: 'center',
              marginBottom: '20px',
              padding: '16px',
              backgroundColor: '#fafafa',
              borderRadius: '8px',
              border: '1px solid #e8e8e8'
            }}
          >
            <Text type="secondary" style={{ marginRight: '8px', fontSize: '14px', fontWeight: 500 }}>
              Filter by:
            </Text>

            <div
              onClick={() => toggleFilter('steps')}
              style={{
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: activeFilters.has('steps') ? '#1890ff' : 'white',
                color: activeFilters.has('steps') ? 'white' : '#1890ff',
                border: activeFilters.has('steps') ? '1px solid #1890ff' : '1px solid #d9d9d9',
                transition: 'all 0.2s ease',
                fontSize: '13px',
                fontWeight: 500,
                boxShadow: activeFilters.has('steps') ? '0 2px 4px rgba(24, 144, 255, 0.2)' : 'none'
              }}
              onMouseEnter={e => {
                if (!activeFilters.has('steps')) {
                  e.currentTarget.style.backgroundColor = '#f0f9ff'
                  e.currentTarget.style.borderColor = '#1890ff'
                }
              }}
              onMouseLeave={e => {
                if (!activeFilters.has('steps')) {
                  e.currentTarget.style.backgroundColor = 'white'
                  e.currentTarget.style.borderColor = '#d9d9d9'
                }
              }}
            >
              {summary.totalSteps} Steps
            </div>

            <div
              onClick={() => toggleFilter('completed')}
              style={{
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: activeFilters.has('completed') ? '#52c41a' : 'white',
                color: activeFilters.has('completed') ? 'white' : '#52c41a',
                border: activeFilters.has('completed') ? '1px solid #52c41a' : '1px solid #d9d9d9',
                transition: 'all 0.2s ease',
                fontSize: '13px',
                fontWeight: 500,
                boxShadow: activeFilters.has('completed') ? '0 2px 4px rgba(82, 196, 26, 0.2)' : 'none'
              }}
              onMouseEnter={e => {
                if (!activeFilters.has('completed')) {
                  e.currentTarget.style.backgroundColor = '#f6ffed'
                  e.currentTarget.style.borderColor = '#52c41a'
                }
              }}
              onMouseLeave={e => {
                if (!activeFilters.has('completed')) {
                  e.currentTarget.style.backgroundColor = 'white'
                  e.currentTarget.style.borderColor = '#d9d9d9'
                }
              }}
            >
              {summary.completedSteps} Completed
            </div>

            <div
              onClick={() => toggleFilter('assignmentEvents')}
              style={{
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: activeFilters.has('assignmentEvents') ? '#722ed1' : 'white',
                color: activeFilters.has('assignmentEvents') ? 'white' : '#722ed1',
                border: activeFilters.has('assignmentEvents') ? '1px solid #722ed1' : '1px solid #d9d9d9',
                transition: 'all 0.2s ease',
                fontSize: '13px',
                fontWeight: 500,
                boxShadow: activeFilters.has('assignmentEvents') ? '0 2px 4px rgba(114, 46, 209, 0.2)' : 'none'
              }}
              onMouseEnter={e => {
                if (!activeFilters.has('assignmentEvents')) {
                  e.currentTarget.style.backgroundColor = '#f9f0ff'
                  e.currentTarget.style.borderColor = '#722ed1'
                }
              }}
              onMouseLeave={e => {
                if (!activeFilters.has('assignmentEvents')) {
                  e.currentTarget.style.backgroundColor = 'white'
                  e.currentTarget.style.borderColor = '#d9d9d9'
                }
              }}
            >
              {summary.totalAssignmentEvents} Assignments
            </div>

            <div
              onClick={() => toggleFilter('comments')}
              style={{
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: activeFilters.has('comments') ? '#13c2c2' : 'white',
                color: activeFilters.has('comments') ? 'white' : '#13c2c2',
                border: activeFilters.has('comments') ? '1px solid #13c2c2' : '1px solid #d9d9d9',
                transition: 'all 0.2s ease',
                fontSize: '13px',
                fontWeight: 500,
                boxShadow: activeFilters.has('comments') ? '0 2px 4px rgba(19, 194, 194, 0.2)' : 'none'
              }}
              onMouseEnter={e => {
                if (!activeFilters.has('comments')) {
                  e.currentTarget.style.backgroundColor = '#e6fffb'
                  e.currentTarget.style.borderColor = '#13c2c2'
                }
              }}
              onMouseLeave={e => {
                if (!activeFilters.has('comments')) {
                  e.currentTarget.style.backgroundColor = 'white'
                  e.currentTarget.style.borderColor = '#d9d9d9'
                }
              }}
            >
              {summary.totalComments} Comments
            </div>

            {activeFilters.size > 0 && (
              <>
                <div style={{ width: '1px', height: '20px', backgroundColor: '#e8e8e8', margin: '0 4px' }} />
                <Button
                  size="small"
                  onClick={clearAllFilters}
                  style={{
                    borderRadius: '6px',
                    fontSize: '12px',
                    height: '28px'
                  }}
                >
                  Clear All ({filteredEvents.length}/{events.length})
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          <ClockIcon size={48} style={{ marginBottom: '16px' }} />
          <div>No history available</div>
        </div>
      ) : (
        <Timeline mode="left">
          {filteredEvents.map((event, index) => (
            <Timeline.Item
              key={`${event.type}-${event.stepIndex}-${index}`}
              dot={getEventIcon(event)}
              color={getEventColor(event)}
            >
              <Card size="small" style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <Text strong>{event.eventTitle}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {formatTimestamp(event.timestamp)} • {event.stepTitle}
                    </Text>
                    <div style={{ marginTop: '8px' }}>
                      <Text>{event.description}</Text>
                    </div>

                    {/* Show comment if this is a comment event */}
                    {event.type === 'comment' && event.comment && (
                      <div
                        style={{
                          marginTop: '8px',
                          padding: '8px',
                          backgroundColor: '#f6ffed',
                          border: '1px solid #b7eb8f',
                          borderRadius: '4px'
                        }}
                      >
                        <ChatCircleIcon size={16} style={{ marginRight: '4px', color: '#52c41a' }} />
                        <Text style={{ fontStyle: 'italic' }}>"{event.comment}"</Text>
                      </div>
                    )}

                    {/* Show metadata tags */}
                    <div style={{ marginTop: '8px' }}>
                      <Space wrap>
                        {/* Show appropriate category tag based on action type */}
                        {event.type === 'assignment' && ['COMPLETE', 'REJECT'].includes(event.action || '') ? (
                          <Tag color="volcano">TASK ACTION</Tag>
                        ) : (
                          <Tag color={getEventColor(event)}>{event.type.toUpperCase()}</Tag>
                        )}
                        {event.action && <Tag color="default">{event.action}</Tag>}
                        {event.userId && (
                          <Tag color="blue">
                            <UserIcon size={16} /> {event.userName || event.userId}
                          </Tag>
                        )}
                        {event.metadata?.assignmentMode && (
                          <Tag color="purple">{event.metadata.assignmentMode} Mode</Tag>
                        )}
                        {event.metadata?.reassignedTo && <Tag color="orange">→ {event.metadata.reassignedTo}</Tag>}
                      </Space>
                    </div>
                  </div>
                </div>
              </Card>
            </Timeline.Item>
          ))}
        </Timeline>
      )}
    </div>
  )
}
