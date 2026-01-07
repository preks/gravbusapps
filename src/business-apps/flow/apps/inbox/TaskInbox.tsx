import React, { useState, useEffect } from 'react'
import { message } from 'antd'
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  OrderedListOutlined,
  EyeOutlined
} from '@ant-design/icons'
import {
  Button,
  Card,
  CardContent,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Alert,
  Tabs as NwTabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@newwork/nw-design-system'
import {
  Inbox,
  User,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle,
  UserCheck,
  Eye,
  FileText,
  Info,
  ArrowRight,
  Zap
} from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { env } from '@/common/env/EnvUtils'
import { TaskDetailsTab } from './components'
import { FlowManagement } from '../../common/components'
import { QuickTaskModal, QuickTaskFormData, QuickTaskFlowService } from '../../common/components/flow-quick-task'

// Remove unused Ant Design destructuring

interface TaskInboxProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

interface Task {
  id: string
  flowId?: string
  referenceTaskName?: string
  type?: string
  name?: string
  status: string
  priority?: number
  title?: string
  message?: string
  stepIndex?: number
  form?: any[] // Backend uses 'form'
  inputs?: any[] // Legacy field for backward compatibility
  links?: any[]
  taskCategory?: string
  dueDate?: string
  scheduledAt?: string
  availableActions?: {
    canClaim?: boolean
    canComplete?: boolean
    canReassign?: boolean
    canReject?: boolean
    canUnclaim?: boolean
  }
  assignment?: {
    assignmentMode?: string
    currentStatus?: string
    assignedTo?: string
    assignedAt?: string
    isUserOwner?: boolean
    allowReassignment?: boolean
    targets?: any
    assignmentHistory?: Array<{
      action: string
      userId: string
      changedBy: string
      changedAt: string
    }>
    assignmentAction?: string
    assignmentIteration?: number
  }
  workflowMeta?: {
    rootWorkflowId: string
  }
}

interface TaskStats {
  assigned: number
  claimable: number
  inProgress: number
  scheduled: number
  completed: number
  total: number
  overdue: number
  dueSoon: number
  userName?: string
}

// Utility Functions
const formatDueDate = (dueDateISO?: string): string => {
  if (!dueDateISO) return 'No due date'

  try {
    const dueDate = new Date(dueDateISO)
    const now = new Date()
    const diffMs = dueDate.getTime() - now.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    const dateStr = dueDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    if (diffMs < 0) {
      return `${dateStr} (overdue)`
    } else if (diffHours < 24) {
      return `${dateStr} (${diffHours}h remaining)`
    } else if (diffDays < 7) {
      return `${dateStr} (${diffDays}d remaining)`
    }

    return dateStr
  } catch {
    return dueDateISO
  }
}

const formatCompletionDate = (completionDateISO?: string): string => {
  if (!completionDateISO) return 'Unknown completion date'

  try {
    const completionDate = new Date(completionDateISO)
    const now = new Date()
    const diffMs = now.getTime() - completionDate.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    const dateStr = completionDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    if (diffHours < 1) {
      return `${dateStr} (just now)`
    } else if (diffHours < 24) {
      return `${dateStr} (${diffHours}h ago)`
    } else if (diffDays < 7) {
      return `${dateStr} (${diffDays}d ago)`
    }

    return dateStr
  } catch {
    return completionDateISO
  }
}

const isTaskOverdue = (dueDateISO?: string): boolean => {
  if (!dueDateISO) return false
  try {
    return new Date() > new Date(dueDateISO)
  } catch {
    return false
  }
}

const isTaskDueSoon = (dueDate?: string): boolean => {
  if (!dueDate) return false
  const due = new Date(dueDate)
  const now = new Date()
  const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60)
  return diffHours > 0 && diffHours <= 2
}

const isJustClaimable = (task: Task): boolean => {
  const actions = task.availableActions
  if (!actions) return false

  return (
    actions.canClaim === true &&
    actions.canComplete !== true &&
    actions.canReject !== true &&
    actions.canReassign !== true &&
    actions.canUnclaim !== true
  )
}

// Import mock users data
import { mockUsers, type User as MockUser } from '../../data/mockUsers'

// Coerce formData types based on task schema (NUMBER → number)
const coerceFormDataBySchema = (task: Task | null, formData: any): any => {
  if (!task || !formData) return formData
  const inputs: any[] = task.form || task.inputs || []
  if (!Array.isArray(inputs) || inputs.length === 0) return formData

  const result: any = { ...formData }
  inputs.forEach((input: any) => {
    const name = input?.name
    if (!name) return
    const t = String(input?.type || '').toUpperCase()
    const value = result[name]
    if (t === 'NUMBER') {
      if (value === '' || value === null || typeof value === 'undefined') {
        result[name] = undefined
      } else if (typeof value === 'string') {
        const parsed = Number(value)
        if (!Number.isNaN(parsed)) {
          result[name] = parsed
        }
      }
    }
  })
  return result
}

const TaskInbox: React.FC<TaskInboxProps> = ({ prefixDataTestId = 'TaskInbox', accessToken, userInfo, ...context }) => {
  // Get logged-in user's ID from userInfo
  const loggedInUserId = userInfo?.id || userInfo?.employeeDetails?.employeeId || 'user-001'
  const loggedInEmployeeId = userInfo?.employeeDetails?.employeeId || ''
  const loggedInUserName =
    userInfo?.givenName && userInfo?.familyName
      ? `${userInfo.givenName} ${userInfo.familyName}`
      : userInfo?.userName || 'Unknown User'

  const [selectedUserId, setSelectedUserId] = useState<string>(loggedInUserId)
  const [tasks, setTasks] = useState<Task[]>([])
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isTaskModalVisible, setIsTaskModalVisible] = useState(false)
  const [taskModalLoading, setTaskModalLoading] = useState(false)
  const [taskFormData, setTaskFormData] = useState<any>({})
  const [reassignUserId, setReassignUserId] = useState<string>('')
  const [rejectionComment, setRejectionComment] = useState<string>('')
  const [currentView, setCurrentView] = useState<'open' | 'completed' | 'initiated' | 'participated'>('open')
  const [completedTasks, setCompletedTasks] = useState<Task[]>([])
  const [completedLoading, setCompletedLoading] = useState(false)
  const [completedError, setCompletedError] = useState<string | null>(null)
  const [isQuickTaskModalOpen, setIsQuickTaskModalOpen] = useState(false)

  // Handle URL parameters for initial tab selection
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const tabParam = urlParams.get('tab')

    if (tabParam && ['open', 'completed', 'initiated', 'participated'].includes(tabParam)) {
      setCurrentView(tabParam as 'open' | 'completed' | 'initiated' | 'participated')
    }
  }, [])

  const API_BASE =
    (env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || env('NEXT_PUBLIC_BASE_URL') + '/flow-engine') + '/api'

  // Fetch open tasks and stats for selected user
  const fetchUserData = async (userId: string) => {
    setLoading(true)
    setTaskModalLoading(false) // Reset task modal loading when refreshing list
    setError(null)

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` })
      }

      const [tasksResponse, statsResponse] = await Promise.all([
        fetch(`${API_BASE}/tasks/user/${userId}`, { headers }),
        fetch(`${API_BASE}/tasks/user/${userId}/stats`, { headers })
      ])

      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json()
        // Transform tasks to ensure flowId is available
        const transformedTasks = (tasksData.tasks || []).map((task: any) => ({
          ...task,
          flowId: task.flowId || task.workflowMeta?.rootWorkflowId || task.id
        }))
        setTasks(transformedTasks)
      } else {
        throw new Error('Failed to fetch tasks')
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setTaskStats(statsData.statistics || statsData.data || statsData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks')
      console.error('Error fetching tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch completed tasks for selected user
  const fetchCompletedTasks = async (userId: string) => {
    setCompletedLoading(true)
    setCompletedError(null)

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` })
      }

      const response = await fetch(`${API_BASE}/tasks/user/${userId}/completed`, { headers })

      if (response.ok) {
        const data = await response.json()
        // Transform completed tasks to ensure flowId is available
        const transformedTasks = (data.tasks || []).map((task: any) => ({
          ...task,
          flowId: task.flowId || task.workflowMeta?.rootWorkflowId || task.id
        }))
        setCompletedTasks(transformedTasks)
      } else {
        throw new Error('Failed to fetch completed tasks')
      }
    } catch (err) {
      setCompletedError(err instanceof Error ? err.message : 'Failed to fetch completed tasks')
      console.error('Error fetching completed tasks:', err)
    } finally {
      setCompletedLoading(false)
    }
  }

  useEffect(() => {
    if (selectedUserId) {
      fetchUserData(selectedUserId)
      fetchCompletedTasks(selectedUserId)
    }
  }, [selectedUserId])

  const performTaskAction = async (taskId: string, action: string, payload: any = {}) => {
    setActionLoading(taskId + action)
    try {
      let endpoint = ''
      let body: any = { userId: selectedUserId, ...payload }

      switch (action) {
        case 'CLAIM':
          endpoint = `${API_BASE}/tasks/${taskId}/claim`
          break
        case 'UNCLAIM':
          endpoint = `${API_BASE}/tasks/${taskId}/unclaim`
          break
        case 'REASSIGN':
          endpoint = `${API_BASE}/tasks/${taskId}/reassign`
          body = { currentUserId: selectedUserId, newUserId: reassignUserId, ...payload }
          break
        case 'REJECT':
          endpoint = `${API_BASE}/tasks/${taskId}/reject`
          body = { userId: selectedUserId, rejectionComment, ...payload }
          break
        case 'COMPLETE':
          endpoint = `${API_BASE}/tasks/${taskId}/complete`
          // Ensure NUMBER fields are sent as numbers
          {
            const taskForSchema =
              selectedTask && selectedTask.id === taskId ? selectedTask : tasks.find(t => t.id === taskId) || null
            const normalizedFormData = coerceFormDataBySchema(taskForSchema as any, taskFormData)
            body = {
              userId: selectedUserId,
              action: 'COMPLETE',
              formData: normalizedFormData,
              ...payload
            }
          }
          break
        default:
          throw new Error(`Unknown action: ${action}`)
      }

      // Include comment if provided (from the comment field in TaskDetailsTab)
      if (rejectionComment && rejectionComment.trim()) {
        body.comment = rejectionComment.trim()
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` })
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })

      if (response.ok) {
        message.success(`Task ${action.toLowerCase()}ed successfully`)
        await fetchUserData(selectedUserId)
        // If task was completed, refresh completed tasks too
        if (action === 'COMPLETE') {
          await fetchCompletedTasks(selectedUserId)
        }

        if (isTaskModalVisible) {
          setIsTaskModalVisible(false)
          setTaskFormData({})
          setReassignUserId('')
          setRejectionComment('')
        }
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || `Failed to ${action.toLowerCase()} task`)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to ${action.toLowerCase()} task`
      setError(errorMessage)
      message.error(errorMessage)
    } finally {
      setActionLoading(null)
    }
  }

  // Fetch fresh task data when opening modal
  const fetchFreshTaskData = async (taskId: string): Promise<Task | null> => {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` })
      }

      const response = await fetch(`${API_BASE}/tasks/${taskId}?userId=${selectedUserId}`, { headers })

      if (response.ok) {
        const taskData = await response.json()
        return taskData.task || taskData
      } else {
        console.warn(`Failed to fetch fresh task data: ${response.status}`)
        return null
      }
    } catch (err) {
      console.error('Error fetching fresh task data:', err)
      return null
    }
  }

  const handleTaskClick = async (task: Task) => {
    // Show modal immediately with cached data
    setSelectedTask(task)
    setIsTaskModalVisible(true)
    setTaskModalLoading(true)

    // Initialize form with cached data first
    const initializeFormData = (taskData: Task) => {
      const initialFormData: any = {}
      ;(taskData.form || taskData.inputs)?.forEach((input: any) => {
        // Initialize different input types with appropriate default values
        switch (input.type) {
          case 'CHECKBOX':
            initialFormData[input.name] = input.options && input.options.length > 0 ? [] : false
            break
          case 'RADIO':
          case 'radio':
            initialFormData[input.name] = ''
            break
          case 'MULTISELECT':
            initialFormData[input.name] = []
            break
          case 'SELECT':
            initialFormData[input.name] = ''
            break
          case 'NUMBER':
            initialFormData[input.name] = undefined
            break
          case 'DATE':
            initialFormData[input.name] = null
            break
          case 'DATETIME':
            initialFormData[input.name] = null
            break
          default:
            initialFormData[input.name] = ''
        }
      })
      setTaskFormData(initialFormData)
    }

    // Initialize with cached data
    initializeFormData(task)

    // Fetch fresh task data
    try {
      const freshTaskData = await fetchFreshTaskData(task.id)
      if (freshTaskData) {
        // Update with fresh data
        setSelectedTask(freshTaskData)
        initializeFormData(freshTaskData)
        console.log('Refreshed task data:', freshTaskData.id)
      }
    } catch (err) {
      console.warn('Using cached task data due to fetch error:', err)
    } finally {
      setTaskModalLoading(false)
    }
  }

  // Handle Quick Task submission
  const handleQuickTaskSubmit = async (data: QuickTaskFormData) => {
    try {
      // Execute the quick task using the service method
      await QuickTaskFlowService.executeQuickTask({
        formData: data,
        uploadResults: [], // File upload can be added later if needed
        accessToken,
        initiatorId: userInfo?.id || 'unknown',
        apiBaseUrl: API_BASE.replace('/api', '')
      })

      message.success(`Quick Task "${data.title}" created successfully!`)

      // Refresh the task list to show the new task
      await fetchUserData(selectedUserId)
    } catch (error) {
      message.error(`Failed to create Quick Task: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /* eslint-disable newwork-local/no-hardcoded-colors */
  const getTaskTypeIcon = (task: Task) => {
    switch (task.type) {
      case 'APPROVAL':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />
      case 'ACKNOWLEDGE':
        return <EyeOutlined style={{ color: '#1890ff' }} />
      case 'TASK':
        return <OrderedListOutlined style={{ color: '#722ed1' }} />
      case 'INFORMATION':
        return <InfoCircleOutlined style={{ color: '#faad14' }} />
      default:
        return <ClockCircleOutlined style={{ color: '#8c8c8c' }} />
    }
  }
  /* eslint-enable newwork-local/no-hardcoded-colors */

  const handleQuickClaim = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation()
    await performTaskAction(taskId, 'CLAIM')
  }

  // Task handlers for component callbacks
  const taskHandlers = {
    onComplete: () => performTaskAction(selectedTask!.id, 'COMPLETE'),
    onClaim: () => performTaskAction(selectedTask!.id, 'CLAIM'),
    onRelease: () => performTaskAction(selectedTask!.id, 'UNCLAIM'),
    onReassign: () => performTaskAction(selectedTask!.id, 'REASSIGN'),
    onReject: () => performTaskAction(selectedTask!.id, 'REJECT'),
    setReassignUserId,
    setRejectionComment
  }

  // Since we removed filters, just return all tasks
  const filterTasks = (taskList: Task[]) => {
    return taskList
  }

  // Get unified open tasks (both assigned and claimable)
  const filteredOpenTasks = filterTasks(tasks).sort((a: Task, b: Task) => {
    // Sort by priority: overdue > due soon > assigned > claimable > others
    const getTaskPriority = (task: Task) => {
      if (isTaskOverdue(task.dueDate)) return 1
      if (isTaskDueSoon(task.dueDate)) return 2
      if (task.assignment?.assignedTo === selectedUserId) return 3 // Assigned tasks first
      if (task.availableActions?.canClaim) return 4 // Claimable tasks second
      return 5
    }

    const aPriority = getTaskPriority(a)
    const bPriority = getTaskPriority(b)

    if (aPriority !== bPriority) return aPriority - bPriority

    // If same priority, sort by due date
    if (!a.dueDate && !b.dueDate) return 0
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  })

  // Calculate accurate statistics from actual filtered tasks
  const accurateStats = {
    assigned: filteredOpenTasks.filter(task => task.assignment?.assignedTo === selectedUserId).length,
    claimable: filteredOpenTasks.filter(task => task.availableActions?.canClaim).length,
    overdue: filteredOpenTasks.filter(task => isTaskOverdue(task.dueDate)).length,
    dueSoon: filteredOpenTasks.filter(task => isTaskDueSoon(task.dueDate) && !isTaskOverdue(task.dueDate)).length
  }

  // Sort completed tasks by completion date (most recent first)
  const filteredCompletedTasks = filterTasks(completedTasks).sort((a: Task, b: Task) => {
    const getCompletionDate = (task: Task) => {
      if (task.assignment?.assignmentHistory) {
        const completionEntry = task.assignment.assignmentHistory
          .filter((entry: any) => entry.action === 'COMPLETE')
          .sort((a: any, b: any) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())[0]
        return completionEntry?.changedAt
      }
      return null
    }

    const aCompletion = getCompletionDate(a)
    const bCompletion = getCompletionDate(b)

    if (!aCompletion && !bCompletion) return 0
    if (!aCompletion) return 1
    if (!bCompletion) return -1
    return new Date(bCompletion).getTime() - new Date(aCompletion).getTime()
  })

  return (
    <div
      className="gba:min-h-screen gba:bg-gradient-to-br gba:from-blue-50 gba:to-indigo-100 gba:p-6"
      data-testid={prefixDataTestId}
    >
      {/* Header */}
      <div className="gba:mb-8">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
          <div className="gba:flex gba:items-center gba:gap-4">
            <div className="gba:p-3 gba:bg-gradient-to-r gba:from-blue-600 gba:to-indigo-600 gba:rounded-xl gba:shadow-lg">
              <Inbox className="gba:h-8 gba:w-8 gba:text-white" />
            </div>
            <div>
              <h1 className="gba:text-3xl gba:font-bold gba:text-gray-900">Task Inbox</h1>
              <p className="gba:text-lg gba:text-gray-600">Manage your workflow tasks from the custom flow engine</p>
            </div>
          </div>

          {/* Top Right: User Selection and Quick Task Button */}
          <div className="gba:flex gba:items-center gba:gap-3">
            <Button
              onClick={() => setIsQuickTaskModalOpen(true)}
              className="gba:bg-gradient-to-r gba:from-blue-600 gba:to-indigo-600 hover:gba:from-blue-700 hover:gba:to-indigo-700 gba:text-white gba:shadow-lg"
              data-testid={`${prefixDataTestId}-QuickTaskButton`}
            >
              <Zap className="gba:h-4 gba:w-4 gba:mr-2" />
              Quick Task
            </Button>

            <Select
              value={selectedUserId}
              onValueChange={setSelectedUserId}
              data-testid={`${prefixDataTestId}-UserSelect`}
            >
              <SelectTrigger className="gba:w-64 gba:bg-white gba:shadow-sm">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {/* Logged-in user first */}
                <SelectItem key={loggedInUserId} value={loggedInUserId}>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <div className="gba:w-8 gba:h-8 gba:rounded-full gba:bg-gradient-to-br gba:from-green-500 gba:to-emerald-500 gba:flex gba:items-center gba:justify-center gba:text-white gba:text-xs gba:font-medium">
                      {loggedInUserName
                        .split(' ')
                        .map(n => n[0])
                        .join('')}
                    </div>
                    <div>
                      <div className="gba:font-medium">{loggedInUserName} (You)</div>
                      <div className="gba:text-xs gba:text-gray-500">
                        {userInfo?.employeeDetails?.organizationalUnit?.name || 'Your Tasks'}
                      </div>
                    </div>
                  </div>
                </SelectItem>

                {/* Other mock users for testing */}
                {mockUsers
                  .filter(user => user.id !== loggedInUserId)
                  .map((user: MockUser) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <div className="gba:w-8 gba:h-8 gba:rounded-full gba:bg-gradient-to-br gba:from-blue-500 gba:to-purple-500 gba:flex gba:items-center gba:justify-center gba:text-white gba:text-xs gba:font-medium">
                          {user.name
                            .split(' ')
                            .map(n => n[0])
                            .join('')}
                        </div>
                        <div>
                          <div className="gba:font-medium">{user.name}</div>
                          <div className="gba:text-xs gba:text-gray-500">
                            {user.role} • {user.department}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <Card className="gba:shadow-xl gba:border-0 gba:bg-white/80 gba:backdrop-blur-sm">
        <CardContent className="gba:p-6">
          {/* Productivity Dashboard */}
          {taskStats && (
            <div className="gba:bg-white gba:border gba:border-gray-200 gba:rounded-lg gba:p-6 gba:mb-6 gba:shadow-sm">
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
                <div>
                  <h2 className="gba:text-lg gba:font-semibold gba:text-gray-900 gba:mb-1">Task Overview</h2>
                  <p className="gba:text-gray-600 gba:text-sm">Current status of your workflow tasks</p>
                </div>
                <div className="gba:text-right">
                  <div className="gba:text-2xl gba:font-bold gba:text-gray-900">{filteredOpenTasks.length}</div>
                  <div className="gba:text-gray-500 gba:text-sm">Total Open Tasks</div>
                </div>
              </div>

              <div className="gba:grid gba:grid-cols-4 gba:gap-6">
                <div className="gba:bg-white gba:border gba:border-gray-200 gba:rounded-lg gba:p-4 hover:gba:border-blue-300 gba:transition-colors">
                  <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
                    <div className="gba:p-2 gba:bg-blue-50 gba:rounded-md">
                      <UserCheck className="gba:h-4 gba:w-4 gba:text-blue-600" />
                    </div>
                    <div className="gba:text-2xl gba:font-bold gba:text-gray-900">{accurateStats.assigned}</div>
                  </div>
                  <div className="gba:text-gray-700 gba:font-medium gba:text-sm">Assigned to You</div>
                </div>

                <div className="gba:bg-white gba:border gba:border-gray-200 gba:rounded-lg gba:p-4 hover:gba:border-green-300 gba:transition-colors">
                  <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
                    <div className="gba:p-2 gba:bg-green-50 gba:rounded-md">
                      <User className="gba:h-4 gba:w-4 gba:text-green-600" />
                    </div>
                    <div className="gba:text-2xl gba:font-bold gba:text-gray-900">{accurateStats.claimable}</div>
                  </div>
                  <div className="gba:text-gray-700 gba:font-medium gba:text-sm">Available to Claim</div>
                </div>

                <div className="gba:bg-white gba:border gba:border-gray-200 gba:rounded-lg gba:p-4 hover:gba:border-red-300 gba:transition-colors">
                  <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
                    <div className="gba:p-2 gba:bg-red-50 gba:rounded-md">
                      <AlertTriangle className="gba:h-4 gba:w-4 gba:text-red-600" />
                    </div>
                    <div className="gba:text-2xl gba:font-bold gba:text-gray-900">{accurateStats.overdue}</div>
                  </div>
                  <div className="gba:text-gray-700 gba:font-medium gba:text-sm">Overdue</div>
                </div>

                <div className="gba:bg-white gba:border gba:border-gray-200 gba:rounded-lg gba:p-4 hover:gba:border-amber-300 gba:transition-colors">
                  <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
                    <div className="gba:p-2 gba:bg-amber-50 gba:rounded-md">
                      <Clock className="gba:h-4 gba:w-4 gba:text-amber-600" />
                    </div>
                    <div className="gba:text-2xl gba:font-bold gba:text-gray-900">{accurateStats.dueSoon}</div>
                  </div>
                  <div className="gba:text-gray-700 gba:font-medium gba:text-sm">Due Soon</div>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert className="gba:mb-4" variant="destructive">
              <div>
                <h4 className="gba:font-medium">Error Loading Tasks</h4>
                <p className="gba:text-sm">{error}</p>
              </div>
            </Alert>
          )}

          {/* Loading State */}
          {loading && (
            <div className="gba:text-center gba:py-12">
              <Spinner className="gba:w-8 gba:h-8 gba:mx-auto gba:mb-4" />
              <p className="gba:text-gray-500">Loading tasks...</p>
            </div>
          )}

          {/* Tasks and Flows Display - Unified Layout with Tabs */}
          <NwTabs
            value={currentView}
            onValueChange={value => {
              const newView = value as 'open' | 'completed' | 'initiated' | 'participated'
              setCurrentView(newView)

              // Update URL without page reload
              const url = new URL(window.location.href)
              url.searchParams.set('tab', newView)
              window.history.replaceState({}, '', url.toString())
            }}
            className="gba:w-full"
          >
            <TabsList className="gba:grid gba:w-full gba:grid-cols-4 gba:bg-gray-50 gba:p-1 gba:rounded-lg">
              <TabsTrigger value="open" className="gba:flex gba:items-center gba:gap-2 gba:py-3">
                <span>Open Tasks</span>
                <Badge variant="secondary">{filteredOpenTasks.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="completed" className="gba:flex gba:items-center gba:gap-2 gba:py-3">
                <span>Completed Tasks</span>
              </TabsTrigger>
              <TabsTrigger value="initiated" className="gba:flex gba:items-center gba:gap-2 gba:py-3">
                <span>Initiated Flows</span>
              </TabsTrigger>
              <TabsTrigger value="participated" className="gba:flex gba:items-center gba:gap-2 gba:py-3">
                <span>Participated Flows</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="open" className="gba:mt-6">
              {!loading && (
                <div className="gba:bg-gray-50/50 gba:rounded-lg gba:p-4">
                  {filteredOpenTasks.length === 0 ? (
                    <div className="gba:text-center gba:py-12">
                      <FileTextOutlined className="gba:text-6xl gba:mb-4 gba:text-gray-400" />
                      <h3 className="gba:text-lg gba:font-medium gba:mb-2 gba:text-gray-900">No tasks found</h3>
                      <p className="gba:text-gray-600">No open tasks available at the moment</p>
                    </div>
                  ) : (
                    <div className="gba:space-y-3">
                      {filteredOpenTasks.map(task => {
                        const isOverdue = isTaskOverdue(task.dueDate)
                        const isDueSoon = isTaskDueSoon(task.dueDate)
                        const isAssigned = task.assignment?.assignedTo === selectedUserId
                        const canClaim = task.availableActions?.canClaim

                        return (
                          <div
                            key={task.id}
                            className={`gba:bg-white gba:border gba:rounded-lg gba:p-4 gba:shadow-sm hover:gba:shadow-md gba:transition-all gba:duration-200 gba:cursor-pointer gba:border-l-4 ${
                              isOverdue
                                ? 'gba:border-l-red-500 hover:gba:border-red-300'
                                : isDueSoon
                                  ? 'gba:border-l-amber-500 hover:gba:border-amber-300'
                                  : isAssigned
                                    ? 'gba:border-l-blue-500 hover:gba:border-blue-300'
                                    : 'gba:border-l-gray-300 hover:gba:border-gray-400'
                            }`}
                            onClick={() => handleTaskClick(task)}
                            data-testid={`${prefixDataTestId}-TaskCard-${task.id}`}
                          >
                            <div className="gba:flex gba:items-center gba:gap-4">
                              {/* Task Type Icon */}
                              <div
                                className={`gba:p-3 gba:rounded-lg gba:flex-shrink-0 ${
                                  task.type === 'APPROVAL'
                                    ? 'gba:bg-green-100 gba:text-green-700'
                                    : task.type === 'ACKNOWLEDGE'
                                      ? 'gba:bg-blue-100 gba:text-blue-700'
                                      : task.type === 'TASK'
                                        ? 'gba:bg-purple-100 gba:text-purple-700'
                                        : task.type === 'INFORMATION'
                                          ? 'gba:bg-orange-100 gba:text-orange-700'
                                          : 'gba:bg-gray-100 gba:text-gray-700'
                                }`}
                              >
                                {task.type === 'APPROVAL' ? (
                                  <CheckCircle className="gba:h-5 gba:w-5" />
                                ) : task.type === 'ACKNOWLEDGE' ? (
                                  <Eye className="gba:h-5 gba:w-5" />
                                ) : task.type === 'TASK' ? (
                                  <FileText className="gba:h-5 gba:w-5" />
                                ) : task.type === 'INFORMATION' ? (
                                  <Info className="gba:h-5 gba:w-5" />
                                ) : (
                                  <FileText className="gba:h-5 gba:w-5" />
                                )}
                              </div>

                              {/* Task Content */}
                              <div className="gba:flex-1 gba:min-w-0">
                                {/* Title and Status Row */}
                                <div className="gba:flex gba:items-center gba:gap-3 gba:mb-2">
                                  <h3 className="gba:font-semibold gba:text-base gba:text-gray-900 gba:truncate">
                                    {task.title || task.name || 'Untitled Task'}
                                  </h3>

                                  {/* Priority Badges */}
                                  {isOverdue && (
                                    <Badge
                                      variant="destructive"
                                      className="gba:flex gba:items-center gba:gap-1"
                                      style={{
                                        backgroundColor: 'var(--color-danger-500)',
                                        color: 'var(--color-on-danger)'
                                      }}
                                    >
                                      <AlertTriangle className="gba:h-3 gba:w-3" />
                                      Overdue
                                    </Badge>
                                  )}
                                  {isDueSoon && !isOverdue && (
                                    <Badge
                                      variant="outline"
                                      className="gba:flex gba:items-center gba:gap-1"
                                      style={{
                                        borderColor: 'var(--color-warning-500)',
                                        color: 'var(--color-warning-700)'
                                      }}
                                    >
                                      <Clock className="gba:h-3 gba:w-3" />
                                      Due Soon
                                    </Badge>
                                  )}

                                  {/* Assignment Status - Removed assigned pill per request */}
                                  {canClaim ? (
                                    <Badge variant="secondary" className="gba:flex gba:items-center gba:gap-1">
                                      <User className="gba:h-3 gba:w-3" />
                                      Available
                                    </Badge>
                                  ) : (
                                    !isAssigned && (
                                      <Badge variant="outline" className="gba:flex gba:items-center gba:gap-1">
                                        <User className="gba:h-3 gba:w-3" />
                                        In Progress
                                      </Badge>
                                    )
                                  )}
                                </div>

                                {/* Description */}
                                <p className="gba:text-sm gba:text-gray-600 gba:mb-2 gba:line-clamp-1">
                                  {task.message || `Task ID: ${task.id}`}
                                </p>

                                {/* Meta Information */}
                                <div className="gba:flex gba:items-center gba:gap-4 gba:text-xs gba:text-gray-500">
                                  {/* Flow ID */}
                                  <div className="gba:flex gba:items-center gba:gap-1">
                                    <span>Flow:</span>
                                    <code className="gba:font-mono gba:text-blue-600">
                                      {task.flowId ? task.flowId.substring(0, 8) + '...' : 'Unknown'}
                                    </code>
                                  </div>

                                  {/* Due Date */}
                                  {task.dueDate && (
                                    <div className="gba:flex gba:items-center gba:gap-1">
                                      <Calendar className="gba:h-3 gba:w-3" />
                                      <span>{formatDueDate(task.dueDate)}</span>
                                    </div>
                                  )}

                                  {/* Task Type */}
                                  <div className="gba:flex gba:items-center gba:gap-1">
                                    <span>Type:</span>
                                    <span className="gba:font-medium">{task.type || 'TASK'}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Action Button */}
                              <div className="gba:flex gba:items-center gba:gap-2 gba:flex-shrink-0">
                                {canClaim && (
                                  <Button
                                    size="sm"
                                    onClick={e => handleQuickClaim(e, task.id)}
                                    disabled={actionLoading === task.id + 'CLAIM'}
                                    data-testid={`${prefixDataTestId}-QuickClaimButton-${task.id}`}
                                    className="gba:bg-blue-600 hover:gba:bg-blue-700 gba:text-white"
                                  >
                                    {actionLoading === task.id + 'CLAIM' ? (
                                      <>
                                        <Spinner className="gba:w-3 gba:h-3 gba:mr-1" />
                                        Claiming...
                                      </>
                                    ) : (
                                      <>
                                        <UserCheck className="gba:h-3 gba:w-3 gba:mr-1" />
                                        Claim
                                      </>
                                    )}
                                  </Button>
                                )}

                                {/* View Details Button */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={e => {
                                    e.stopPropagation()
                                    handleTaskClick(task)
                                  }}
                                >
                                  <ArrowRight className="gba:h-3 gba:w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="gba:mt-6">
              {!completedLoading && (
                <div className="gba:bg-gray-50/50 gba:rounded-lg gba:p-4">
                  {completedError && (
                    <Alert className="gba:mb-4" variant="destructive">
                      <div>
                        <h4 className="gba:font-medium">Error Loading Completed Tasks</h4>
                        <p className="gba:text-sm">{completedError}</p>
                      </div>
                    </Alert>
                  )}

                  {filteredCompletedTasks.length === 0 ? (
                    <div className="gba:text-center gba:py-12">
                      <CheckCircleOutlined className="gba:text-6xl gba:mb-4 gba:text-gray-400" />
                      <h3 className="gba:text-lg gba:font-medium gba:mb-2 gba:text-gray-900">No completed tasks</h3>
                      <p className="gba:text-gray-600">Completed tasks will appear here</p>
                    </div>
                  ) : (
                    <div className="gba:space-y-3">
                      {filteredCompletedTasks.map(task => {
                        const completionEntry = task.assignment?.assignmentHistory
                          ?.filter((entry: any) => entry.action === 'COMPLETE')
                          ?.sort(
                            (a: any, b: any) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
                          )[0]

                        return (
                          <div
                            key={task.id}
                            className="gba:bg-white gba:border gba:border-gray-200 gba:rounded-lg gba:p-4 gba:shadow-sm hover:gba:shadow-md gba:transition-all gba:duration-200 gba:cursor-pointer gba:border-l-4 gba:border-l-green-500 gba:opacity-80"
                            onClick={() => handleTaskClick(task)}
                            data-testid={`${prefixDataTestId}-CompletedTaskCard-${task.id}`}
                          >
                            <div className="gba:flex gba:items-center gba:gap-4">
                              {/* Task Type Icon - Completed */}
                              <div className="gba:p-3 gba:rounded-lg gba:bg-green-100 gba:text-green-700 gba:flex-shrink-0">
                                <CheckCircle className="gba:h-5 gba:w-5" />
                              </div>

                              {/* Task Content */}
                              <div className="gba:flex-1 gba:min-w-0">
                                {/* Title and Completion Badge */}
                                <div className="gba:flex gba:items-center gba:gap-3 gba:mb-2">
                                  <h3 className="gba:font-semibold gba:text-base gba:text-gray-900 gba:truncate">
                                    {task.title || task.name || 'Untitled Task'}
                                  </h3>
                                  <Badge
                                    variant="outline"
                                    className="gba:bg-green-50 gba:border-green-200 gba:text-green-700 gba:flex gba:items-center gba:gap-1"
                                  >
                                    <CheckCircle className="gba:h-3 gba:w-3" />
                                    Completed
                                  </Badge>
                                </div>

                                {/* Description */}
                                <p className="gba:text-sm gba:text-gray-600 gba:mb-2 gba:line-clamp-1">
                                  {task.message || `Task ID: ${task.id}`}
                                </p>

                                {/* Meta Information */}
                                <div className="gba:flex gba:items-center gba:gap-4 gba:text-xs gba:text-gray-500">
                                  {/* Flow ID */}
                                  <div className="gba:flex gba:items-center gba:gap-1">
                                    <span>Flow:</span>
                                    <code className="gba:font-mono gba:text-blue-600">
                                      {task.flowId ? task.flowId.substring(0, 8) + '...' : 'Unknown'}
                                    </code>
                                  </div>

                                  {/* Completion Date */}
                                  {completionEntry && (
                                    <div className="gba:flex gba:items-center gba:gap-1">
                                      <Calendar className="gba:h-3 gba:w-3" />
                                      <span>{formatCompletionDate(completionEntry.changedAt)}</span>
                                    </div>
                                  )}

                                  {/* Task Type */}
                                  <div className="gba:flex gba:items-center gba:gap-1">
                                    <span>Type:</span>
                                    <span className="gba:font-medium">{task.type || 'TASK'}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Completion Details */}
                              <div className="gba:flex gba:items-center gba:gap-3 gba:flex-shrink-0">
                                {completionEntry && (
                                  <div className="gba:text-right">
                                    <div className="gba:text-xs gba:text-gray-500">Completed by</div>
                                    <div className="gba:text-sm gba:font-medium gba:text-gray-900">
                                      {mockUsers.find(u => u.id === completionEntry.userId)?.name || 'Unknown User'}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {completedLoading && (
                <div className="gba:text-center gba:py-12">
                  <Spinner className="gba:w-8 gba:h-8 gba:mx-auto gba:mb-4" />
                  <p className="gba:text-gray-500">Loading completed tasks...</p>
                </div>
              )}
            </TabsContent>

            {/* Initiated Flows Tab */}
            <TabsContent value="initiated" className="gba:mt-6">
              <div className="gba:bg-gray-50/50 gba:rounded-lg gba:p-4">
                <FlowManagement
                  variant="inbox"
                  filterType="initiated"
                  listTitle="Initiated Flows"
                  userId={selectedUserId}
                  accessToken={accessToken}
                  showActions={true}
                  hideFilters={false}
                  hiddenTabs={[]} // Show all tabs for initiated flows
                  prefixDataTestId={`${prefixDataTestId}-InitiatedFlows`}
                />
              </div>
            </TabsContent>

            {/* Participated Flows Tab */}
            <TabsContent value="participated" className="gba:mt-6">
              <div className="gba:bg-gray-50/50 gba:rounded-lg gba:p-4">
                <FlowManagement
                  variant="inbox"
                  filterType="participated"
                  listTitle="Participated Flows"
                  userId={selectedUserId}
                  accessToken={accessToken}
                  showActions={false} // Limited actions for participated flows
                  hideFilters={false}
                  hiddenTabs={['data']} // Hide data tab for participated flows
                  prefixDataTestId={`${prefixDataTestId}-ParticipatedFlows`}
                />
              </div>
            </TabsContent>
          </NwTabs>
        </CardContent>
      </Card>

      {/* Task Modal using modular components */}
      <Dialog
        open={isTaskModalVisible && !!selectedTask}
        onOpenChange={open => {
          if (!open) {
            setIsTaskModalVisible(false)
            setTaskModalLoading(false)
            setTaskFormData({})
            setReassignUserId('')
            setRejectionComment('')
          }
        }}
      >
        <DialogContent
          className="gba:max-w-[530px] gba:w-full"
          style={{
            maxHeight: '90vh',
            overflow: 'auto',
            backgroundColor: '#ffffff', // eslint-disable-line newwork-local/no-hardcoded-colors
            border: '1px solid var(--color-border-default)',
            borderRadius: 'var(--border-radius-lg)',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <DialogHeader className="gba:pb-4 gba:border-b" style={{ borderColor: 'var(--color-border-default)' }}>
            <DialogTitle>
              <div className="gba:flex gba:flex-col gba:gap-2">
                <div className="gba:flex gba:items-center gba:gap-2">
                  {selectedTask && getTaskTypeIcon(selectedTask)}
                  <span className="gba:text-lg gba:font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {selectedTask?.title || selectedTask?.name}
                  </span>
                </div>
                <div className="gba:px-0 gba:py-0 gba:inline-block gba:w-fit">
                  <span className="gba:text-xs gba:font-mono" style={{ color: 'var(--color-muted-foreground)' }}>
                    Task ID: {selectedTask?.id}
                  </span>
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>
          {taskModalLoading && (
            <div className="gba:text-center gba:py-5">
              <Spinner className="gba:w-8 gba:h-8 gba:mx-auto gba:mb-4" />
              <p className="gba:text-gray-600">Refreshing task data...</p>
            </div>
          )}
          {!taskModalLoading && selectedTask && (
            <div className="gba:w-full">
              <TaskDetailsTab
                task={selectedTask}
                stepType={selectedTask.type}
                hasLinks={!!(selectedTask.links && selectedTask.links.length > 0)}
                hasInputBlocks={
                  !!(
                    (selectedTask.form || selectedTask.inputs) &&
                    (selectedTask.form || selectedTask.inputs)!.length > 0
                  )
                }
                taskFormData={taskFormData}
                reassignUserId={reassignUserId}
                prefixDataTestId={prefixDataTestId}
                isCompleted={selectedTask.status === 'COMPLETED'}
                onComplete={taskHandlers.onComplete}
                onClaim={taskHandlers.onClaim}
                onRelease={taskHandlers.onRelease}
                onReassign={taskHandlers.onReassign}
                onReject={taskHandlers.onReject}
                setReassignUserId={taskHandlers.setReassignUserId}
                setRejectionComment={taskHandlers.setRejectionComment}
                setTaskFormData={setTaskFormData}
                isTaskOverdue={isTaskOverdue}
                isTaskDueSoon={isTaskDueSoon}
                isJustClaimable={isJustClaimable}
                accessToken={accessToken}
                {...context}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Quick Task Modal */}
      <QuickTaskModal
        open={isQuickTaskModalOpen}
        onOpenChange={setIsQuickTaskModalOpen}
        accessToken={accessToken}
        onSubmit={handleQuickTaskSubmit}
        title="Blink"
        description="Fill out the form to create and assign a task instantly"
        employeeId={loggedInEmployeeId}
        config={{
          assigneeSelector: { mode: 'employee-search', required: true },
          enableFileUpload: true,
          enableDueDate: true,
          maxFiles: 5,
          maxFileSize: 10,
          allowedFileTypes: ['.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.zip']
        }}
      />
    </div>
  )
}

export default TaskInbox
