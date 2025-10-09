import React, { useState, useEffect, useRef } from 'react'
import {
  PlusCircleOutlined,
  UserOutlined,
  FileTextOutlined,
  CloseOutlined,
  EditOutlined,
  LoadingOutlined,
  CalendarOutlined,
  CloudUploadOutlined
} from '@ant-design/icons'
import { Button, List, Avatar, Spin, Alert, Empty, Tag, message, Timeline, Typography, Modal } from 'antd'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { ActivityDeletePopup } from '@/common/components/common-relations/popups/activity-delete-popup'
import { Clock, Calendar } from 'lucide-react'
import { startProcess } from '@/common/utils/start-process'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { NotesSection } from './NotesSection'
import { useGetContactActivities, ContactActivityData } from '../queries/ContactActivityQueries'
import { useGetContactDocuments, ContactDocumentData } from '../queries/ContactDocumentQueries'
import { useGetContactTasks, ContactTaskData } from '../queries/ContactTaskQueries'
import { useEmployeeData } from '@/business-apps/crm/common/hooks/useEmployeeData'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { useFileClient } from '@/common/network/files/useFileClient'
import { env } from '@/common/env/EnvUtils'
import dayjs from 'dayjs'
import { LanguageDropdown } from './LanguageDropdown'
import { translateMultipleTexts } from '../utils/translationService'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { CheckCircleOutlined } from '@ant-design/icons'
import { useSalesManagerEmployees } from '../../opportunity-record/hooks/useSalesManagerEmployees'

const { Text } = Typography

interface ActivityTimelineProps {
  contactId?: string
  context: BusinessAppContextProps
}

interface TranslatedActivity extends ContactActivityData {
  translatedTitle?: string
  translatedDescription?: string
  isTranslating?: boolean
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ contactId, context }) => {
  // Read initial tab from URL parameters
  const getInitialTab = (): 'activities' | 'notes' | 'approvals' => {
    const urlParams = new URLSearchParams(window.location.search)
    const tabParam = urlParams.get('tab')
    if (tabParam === 'activities' || tabParam === 'notes' || tabParam === 'approvals') {
      return tabParam as 'activities' | 'notes' | 'approvals'
    }
    return 'activities'
  }

  const [activeTab, setActiveTab] = useState<'activities' | 'notes' | 'approvals'>(getInitialTab)
  const [activities, setActivities] = useState<TranslatedActivity[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(false)
  const [activitiesError, setActivitiesError] = useState<string | null>(null)
  const [notesKey, setNotesKey] = useState(0)
  const [selectedLanguage, setSelectedLanguage] = useState('Original')
  const [translating, setTranslating] = useState(false)
  const [approvalTasks, setApprovalTasks] = useState<ContactTaskData[]>([])
  const [approvalTasksLoading, setApprovalTasksLoading] = useState(false)
  const [approvalTasksError, setApprovalTasksError] = useState<string | null>(null)
  const originalActivitiesRef = useRef<ContactActivityData[]>([])
  const [deletePopup, setDeletePopup] = useState<{ open: boolean; activity?: ContactActivityData }>({ open: false })

  const { fetchContactActivities } = useGetContactActivities(context)
  const { fetchContactTasks } = useGetContactTasks(context)
  const { getEmployeeDisplayName } = useEmployeeData(context.accessToken)
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))
  const graphqlClient = useGraphQLClient(context.accessToken)
  const { salesManagers } = useSalesManagerEmployees(context.accessToken)

  // Listen for process completion to refetch approval tasks
  useProcessCompletion({
    onSuccess: () => {
      console.log('Process completed successfully, refreshing approval tasks')
      if (activeTab === 'approvals') {
        loadApprovalTasks()
      }
    },
    onFailure: () => {
      console.log('Process failed')
      message.error('Failed to create approval task')
    }
  })

  const loadActivities = async () => {
    if (!contactId) return

    setActivitiesLoading(true)
    setActivitiesError(null)

    try {
      const result = await fetchContactActivities({ contactId })
      // Sort activities by occurredAt in descending order (newest first), fallback to createdAt
      const sortedActivities = (result.SalesActivity || []).sort((a, b) => {
        const dateA = new Date(a.occurredAt || a.createdAt).getTime()
        const dateB = new Date(b.occurredAt || b.createdAt).getTime()
        return dateB - dateA
      })

      // Fetch creator employee information for activities where ownerEmployee is null
      const enhancedActivities = await Promise.all(
        sortedActivities.map(async activity => {
          if (!activity.ownerEmployee && activity.createdBy) {
            try {
              // Look up employee by userId
              const employeeQuery = `
                query GetEmployeeByUserId($userId: String!) {
                  Employee(where: {userId: {_eq: $userId}, isDeleted: {_eq: false}}, limit: 1) {
                    id
                    firstName
                    lastName
                    displayName
                    fullName
                  }
                }
              `

              const employeeResult = await graphqlClient.request(employeeQuery, { userId: activity.createdBy })
              const employee = employeeResult?.Employee?.[0]
              if (employee) {
                return { ...activity, ownerEmployee: employee }
              }
            } catch (error) {
              console.warn('Failed to fetch creator employee for activity:', activity.id, error)
            }
          }
          return activity
        })
      )

      // Store original activities for translation reference
      originalActivitiesRef.current = enhancedActivities
      setActivities(enhancedActivities)
    } catch (err) {
      setActivitiesError(err instanceof Error ? err.message : 'Failed to load activities')
    } finally {
      setActivitiesLoading(false)
    }
  }

  // Handle language change and translate activities
  useEffect(() => {
    const translateActivities = async () => {
      const originalActivities = originalActivitiesRef.current

      if (selectedLanguage === 'Original' || originalActivities.length === 0) {
        // Reset to original text for Original language or no activities
        setActivities(originalActivities)
        return
      }

      setTranslating(true)

      try {
        // Collect all text to translate from original activities
        const textsToTranslate: string[] = []
        const activityMapping: Array<{ activityIndex: number; titleIndex: number; descriptionIndex: number }> = []

        originalActivities.forEach((activity, activityIndex) => {
          const titleIndex = textsToTranslate.length
          textsToTranslate.push(activity.title)

          const descriptionIndex = textsToTranslate.length
          textsToTranslate.push(activity.description)

          activityMapping.push({ activityIndex, titleIndex, descriptionIndex })
        })

        const translatedTexts = await translateMultipleTexts(textsToTranslate, selectedLanguage, context.accessToken)

        const translatedActivities: TranslatedActivity[] = originalActivities.map((originalActivity, activityIndex) => {
          const mapping = activityMapping[activityIndex]
          return {
            ...originalActivity,
            translatedTitle: translatedTexts[mapping.titleIndex],
            translatedDescription: translatedTexts[mapping.descriptionIndex],
            isTranslating: false
          }
        })

        setActivities(translatedActivities)
      } catch (err) {
        console.error('Translation error:', err)
        message.error('Failed to translate activities')
        setActivities(originalActivities)
      } finally {
        setTranslating(false)
      }
    }

    if (activeTab === 'activities') {
      translateActivities()
    }
  }, [selectedLanguage, activeTab, context.accessToken])

  const loadApprovalTasks = async () => {
    if (!contactId) return

    setApprovalTasksLoading(true)
    setApprovalTasksError(null)

    try {
      const result = await fetchContactTasks({ contactId })

      // Filter for approval tasks only - check both possible field structures
      let approvalTasks = (result.SalesTask || []).filter(task => {
        // Check both type.value (catalog reference) and direct typeRef fields
        const taskTypeValue = task.type?.value
        const typeRef = task.typeRef

        return (
          // Check type.value field (catalog reference)
          (taskTypeValue && taskTypeValue.toLowerCase() === 'approval') ||
          // Check direct typeRef field for various formats
          (typeRef &&
            (typeRef.toLowerCase() === 'approval' ||
              typeRef === 'SalesTaskType:v1:APPROVAL' ||
              typeRef === 'SalesTaskType:v1:APPROVAL'))
        )
      })

      // Fetch creator employee information for tasks where creatorEmployee is null
      const enhancedTasks = await Promise.all(
        approvalTasks.map(async task => {
          if (!task.creatorEmployee && task.createdBy) {
            try {
              // Look up employee by userId
              const employeeQuery = `
                query GetEmployeeByUserId($userId: String!) {
                  Employee(where: {userId: {_eq: $userId}, isDeleted: {_eq: false}}, limit: 1) {
                    id
                    firstName
                    lastName
                    displayName
                    fullName
                  }
                }
              `

              const employeeResult = await graphqlClient.request(employeeQuery, { userId: task.createdBy })
              const employee = employeeResult?.Employee?.[0]
              if (employee) {
                return { ...task, creatorEmployee: employee }
              }
            } catch (error) {
              console.warn('Failed to fetch creator employee for task:', task.id, error)
            }
          }
          return task
        })
      )

      setApprovalTasks(enhancedTasks)
    } catch (err) {
      setApprovalTasksError(err instanceof Error ? err.message : 'Failed to load approval tasks')
    } finally {
      setApprovalTasksLoading(false)
    }
  }

  const getEmployeeDisplayNameFromObject = (employee: any): string => {
    if (!employee) return 'Unknown User'
    if (typeof employee === 'string') return getEmployeeDisplayName(employee)
    return (
      employee.displayName ||
      employee.fullName ||
      `${employee.firstName || ''} ${employee.lastName || ''}`.trim() ||
      employee.id ||
      'Unknown User'
    )
  }

  const refreshNotes = () => {
    setNotesKey(prev => prev + 1)
  }

  useEffect(() => {
    if (activeTab === 'activities') {
      loadActivities()
    } else if (activeTab === 'approvals') {
      loadApprovalTasks()
    }
  }, [contactId, activeTab])

  useEffect(() => {
    const handleFocus = () => {
      if (activeTab === 'activities') {
        loadActivities()
      } else if (activeTab === 'approvals') {
        loadApprovalTasks()
      }
      refreshNotes()
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
  }, [activeTab, contactId])

  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        if (event.detail?.resolution === 'success') {
          loadActivities()
          loadApprovalTasks()
          refreshNotes()

          return
        }
      } catch (err) {
        console.error('Error handling process completion:', err)
      }
    }

    const handlePostMessage = (event: MessageEvent) => {
      try {
        if (event.data?.type === 'CRM_DOCUMENT_UPLOADED' && event.data?.contactId === contactId) {
          // This part of the logic is no longer needed as documents are removed
        }
      } catch (err) {
        console.error('Error handling postMessage:', err)
      }
    }

    const handleAllEvents = (event: any) => {
      if ((event.type && event.type.includes('process')) || (event.type && event.type.includes('task'))) {
        handleProcessCompletion(event)
      }
    }

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

    window.addEventListener('message', handlePostMessage)

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
      window.removeEventListener('message', handlePostMessage)

      window.dispatchEvent = originalDispatchEvent
    }
  }, [contactId])

  const handleAddActivity = () => {
    if (contactId) {
      startProcess({
        domain: 'customer-relations',
        processName: 'saveSalesActivity',
        payload: {
          contactId
        },
        builderType: 'NATIVE_SCREEN'
      })
    }
  }

  const handleDeleteActivity = (activity: ContactActivityData) => {
    setDeletePopup({ open: true, activity })
  }

  const handleLanguageChange = (languageCode: string) => {
    setSelectedLanguage(languageCode)
  }

  const getActivityTypeValue = (activityType: any): string => {
    if (!activityType) return ''
    if (typeof activityType === 'string') return activityType
    if (activityType.value) return activityType.value
    return ''
  }

  const handleDeleteTask = (task: ContactTaskData) => {
    Modal.confirm({
      title: 'Confirm Deletion',
      content: `Are you sure you want to delete the approval task "${task.name}"?`,
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
                contactId: contactId
              }
            },
            {
              headers: { Authorization: `Bearer ${context.accessToken}` }
            }
          )
          setApprovalTasks(prevTasks => prevTasks.filter(t => t.id !== task.id))
          message.success('Approval task deleted successfully')
        } catch (error) {
          console.error('Error deleting approval task:', error)
          message.error('Failed to delete approval task')
        }
      }
    })
  }

  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1px solid #f0f0f0',
        overflow: 'hidden',
        marginBottom: '24px',
        height: 'fit-content'
      }}
      data-testid="contact-activity-timeline"
    >
      {/* Tab Navigation */}
      <div
        style={{
          borderBottom: '1px solid #f0f0f0',
          backgroundColor: '#fafafa'
        }}
      >
        <div style={{ display: 'flex' }}>
          <div
            style={{
              padding: '12px 24px',
              fontWeight: '500',
              color: activeTab === 'activities' ? '#1890ff' : '#8c8c8c',
              backgroundColor: activeTab === 'activities' ? 'white' : 'transparent',
              flex: 1,
              textAlign: 'center',
              cursor: 'pointer'
            }}
            onClick={() => setActiveTab('activities')}
            data-testid="activities-tab"
          >
            Activities
          </div>
          <div
            style={{
              padding: '12px 24px',
              fontWeight: '500',
              color: activeTab === 'notes' ? '#1890ff' : '#8c8c8c',
              backgroundColor: activeTab === 'notes' ? 'white' : 'transparent',
              flex: 1,
              textAlign: 'center',
              cursor: 'pointer'
            }}
            onClick={() => setActiveTab('notes')}
            data-testid="notes-tab"
          >
            Notes
          </div>
          <div
            style={{
              padding: '12px 24px',
              fontWeight: '500',
              color: activeTab === 'approvals' ? '#1890ff' : '#8c8c8c',
              backgroundColor: activeTab === 'approvals' ? 'white' : 'transparent',
              flex: 1,
              textAlign: 'center',
              cursor: 'pointer'
            }}
            onClick={() => setActiveTab('approvals')}
            data-testid="approvals-tab"
          >
            Approvals
          </div>
        </div>
      </div>

      {/* Activities Tab Content */}
      {activeTab === 'activities' && (
        <div data-testid="activities-content">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 24px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div className="gba:activities-title" style={{ fontSize: '18px', fontWeight: '500' }}>
                Activities
              </div>
              <LanguageDropdown selectedLanguage={selectedLanguage} onChange={handleLanguageChange} />
              {translating && <Spin indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />} size="small" />}
            </div>
            <AppAction
              contextsArray={[FlowContextName.customerActivityCreate]}
              externalContextData={{ contactId, contact: contactId, salesActivity: { contact: contactId } }}
              prefixDataTestId="contact-add-activity"
              accessToken={context.accessToken}
              emptyStateBehavior="enable"
              deferMainContextRequestsUntilClick
            >
              <Button type="primary" icon={<PlusCircleOutlined />} data-testid="add-activity-button">
                Add Activity
              </Button>
            </AppAction>
          </div>

          <div style={{ padding: '0 24px 24px' }}>
            {activitiesLoading && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin size="large" />
              </div>
            )}

            {activitiesError && (
              <Alert
                message="Error Loading Activities"
                description={activitiesError}
                type="error"
                showIcon
                style={{ marginBottom: '16px' }}
                action={
                  <Button size="small" onClick={loadActivities}>
                    Retry
                  </Button>
                }
              />
            )}

            {!activitiesLoading && !activitiesError && activities.length === 0 && (
              <Empty description="No activities yet" style={{ padding: '40px 0' }} data-testid="empty-activities">
                <div style={{ fontSize: '14px', color: '#8c8c8c' }}>Start by adding your first activity</div>
              </Empty>
            )}

            {!activitiesLoading && !activitiesError && activities.length > 0 && (
              <Timeline>
                {activities.map((activity, index) => (
                  <Timeline.Item key={activity.id || index} color="blue">
                    <div style={{ position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong>{activity.translatedTitle || activity.title}</Text>
                      </div>
                      <div>
                        <Text type="secondary">
                          {dayjs(activity.occurredAt || activity.createdAt).format('MMM D, YYYY [at] h:mm A')} -{' '}
                          {activity.ownerEmployee
                            ? getEmployeeDisplayNameFromObject(activity.ownerEmployee)
                            : activity.createdBy || 'Unknown User'}
                        </Text>
                      </div>
                      {getActivityTypeValue(activity.activityType) && (
                        <div style={{ marginTop: '4px', marginBottom: '4px' }}>
                          <span
                            style={{
                              backgroundColor: '#f0f0f0',
                              color: '#333',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}
                          >
                            {getActivityTypeValue(activity.activityType)}
                          </span>
                        </div>
                      )}
                      <div style={{ marginTop: '4px' }}>
                        <div>{activity.translatedDescription || activity.description}</div>
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
                        onClick={() => handleDeleteActivity(activity)}
                        data-testid={`delete-activity-${activity.id}`}
                      />
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            )}
          </div>
        </div>
      )}

      {/* Notes Tab Content */}
      {activeTab === 'notes' && (
        <div data-testid="notes-content">
          <NotesSection key={notesKey} contactId={contactId} context={context} />
        </div>
      )}

      {/* Approvals Tab Content */}
      {activeTab === 'approvals' && (
        <div data-testid="approvals-content">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 24px'
            }}
          >
            <div style={{ fontSize: '18px', fontWeight: '500' }}>Approval Tasks</div>
            <AppAction
              contextsArray={[FlowContextName.createCustomerTask]}
              externalContextData={{
                contactId,
                typeRef: 'SalesTaskType:v1:APPROVAL'
              }}
              prefixDataTestId="contact-approvals"
              accessToken={context.accessToken}
              emptyStateBehavior="enable"
              deferMainContextRequestsUntilClick
            >
              <Button type="primary" icon={<PlusCircleOutlined />} data-testid="request-approval-button">
                Request Approval
              </Button>
            </AppAction>
          </div>

          <div style={{ padding: '0 24px 24px' }}>
            {approvalTasksLoading && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin size="large" />
                <div style={{ marginTop: '16px', color: '#8c8c8c' }}>Loading approval tasks...</div>
              </div>
            )}

            {approvalTasksError && (
              <Alert
                message="Error Loading Approval Tasks"
                description={approvalTasksError}
                type="error"
                showIcon
                style={{ marginBottom: '16px' }}
                action={
                  <Button size="small" onClick={loadApprovalTasks}>
                    Retry
                  </Button>
                }
              />
            )}

            {!approvalTasksLoading && !approvalTasksError && approvalTasks.length === 0 && (
              <Empty description="No approval tasks" style={{ padding: '40px 0' }} data-testid="empty-approval-tasks">
                <div style={{ fontSize: '14px', color: '#8c8c8c' }}>
                  No approval tasks have been created for this contact yet.
                </div>
              </Empty>
            )}

            {!approvalTasksLoading && !approvalTasksError && approvalTasks.length > 0 && (
              <Timeline>
                {approvalTasks.map(task => (
                  <Timeline.Item
                    key={task.id}
                    dot={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                    style={{ position: 'relative' }}
                  >
                    <div style={{ paddingRight: '40px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <Text strong style={{ fontSize: '16px' }}>
                          {task.name}
                        </Text>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <span
                            style={{
                              background: '#e6f7ff',
                              color: '#1890ff',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}
                          >
                            Approval
                          </span>
                          <span
                            style={{
                              background:
                                task.priority?.value === 'High'
                                  ? '#fff2e8'
                                  : task.priority?.value === 'Medium'
                                    ? '#f6ffed'
                                    : '#f0f0f0',
                              color:
                                task.priority?.value === 'High'
                                  ? '#fa8c16'
                                  : task.priority?.value === 'Medium'
                                    ? '#52c41a'
                                    : '#8c8c8c',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}
                          >
                            {task.priority?.value || 'Normal'}
                          </span>
                        </div>
                      </div>
                      <div style={{ marginBottom: '4px' }}>
                        <Text type="secondary">
                          {dayjs(task.createdAt).format('MMM D, YYYY [at] h:mm A')}
                          {' - '}
                          Created by{' '}
                          {task.creatorEmployee
                            ? getEmployeeDisplayNameFromObject(task.creatorEmployee)
                            : task.createdBy || 'Unknown User'}
                        </Text>
                      </div>
                      {task.assignedEmployee && (
                        <div style={{ marginBottom: '4px' }}>
                          <Text type="secondary">
                            Assigned to: {getEmployeeDisplayNameFromObject(task.assignedEmployee)}
                          </Text>
                        </div>
                      )}
                      {task.dueDate && (
                        <div style={{ marginBottom: '4px' }}>
                          <Text type="secondary">Due: {dayjs(task.dueDate).format('MMM D, YYYY [at] h:mm A')}</Text>
                        </div>
                      )}
                      {task.description && (
                        <div style={{ marginTop: '8px' }}>
                          <Text>{task.description}</Text>
                        </div>
                      )}
                    </div>
                    <Button
                      type="text"
                      icon={<CloseOutlined />}
                      size="small"
                      style={{ position: 'absolute', right: 0, top: 0, padding: '4px', lineHeight: 1 }}
                      onClick={() => handleDeleteTask(task)}
                      data-testid={`delete-approval-task-${task.id}`}
                    />
                  </Timeline.Item>
                ))}
              </Timeline>
            )}
          </div>
        </div>
      )}

      {deletePopup.open && deletePopup.activity ? (
        <ActivityDeletePopup
          isOpen={deletePopup.open}
          onClose={() => setDeletePopup({ open: false })}
          accessToken={context.accessToken}
          activityId={deletePopup.activity!.id}
          activityVersion={deletePopup.activity!.version}
          activityTitle={deletePopup.activity!.title}
          domain="crm"
        />
      ) : null}
    </div>
  )
}
