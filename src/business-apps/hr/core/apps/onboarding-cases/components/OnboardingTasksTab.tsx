import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  AlertDescription,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useTranslation
} from '@newwork/nw-design-system'
import { AlertCircle, CheckCircle2, Clock, ListChecks, RefreshCw, UserPlus } from 'lucide-react'
import type { LinkedFlow } from '@/business-apps/common/apps/case-management/types'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { OnboardingTask } from '../services/OnboardingTasksClient'
import translations from '../_i18n'

interface OnboardingTasksTabProps {
  accessToken: string
  myTasks: OnboardingTask[]
  allTasks: OnboardingTask[]
  linkedFlows: LinkedFlow[]
  isLoading: boolean
  claimingTaskId: string | null
  error: string | null
  onRefresh: () => void
  onClaimTask: (taskId: string) => void
}

type TaskFilter = 'all' | 'open' | 'completed'
type TaskMode = 'my' | 'all-case'

interface AssigneeEmployee {
  id: string
  userId: string
  firstName?: string
  lastName?: string
  fullName?: string
  displayName?: string
  preferredName?: string
  pictureThumbnail?: string
}

const GET_EMPLOYEES_BY_USER_IDS = `
  query GetEmployeesByUserIds($userIds: [String!]!) {
    Employee(where: { userId: { _in: $userIds } }) {
      id
      userId
      firstName
      lastName
      fullName
      displayName
      preferredName
      pictureThumbnail
    }
  }
`

const completedStatuses = new Set(['COMPLETED', 'DONE', 'FINISHED'])
const activeStatuses = new Set(['OPEN', 'IN_PROGRESS', 'SCHEDULED', 'READY', 'QUEUED', 'CLAIMED', 'ASSIGNED'])

const formatStatusLabel = (status: string | undefined, t: (key: string) => string) => {
  const rawStatus = String(status || 'open')
  const normalized = rawStatus.replace(/_/g, '-').toLowerCase()
  const translationKeys: Record<string, string> = {
    open: 'hr-onboarding-task-status-open',
    'in-progress': 'hr-onboarding-task-status-in-progress',
    scheduled: 'hr-onboarding-task-status-scheduled',
    ready: 'hr-onboarding-task-status-ready',
    queued: 'hr-onboarding-task-status-queued',
    claimed: 'hr-onboarding-task-status-claimed',
    assigned: 'hr-onboarding-task-status-assigned',
    completed: 'hr-onboarding-task-status-completed',
    done: 'hr-onboarding-task-status-done',
    finished: 'hr-onboarding-task-status-finished',
    failed: 'hr-onboarding-task-status-failed',
    rejected: 'hr-onboarding-task-status-rejected'
  }
  const translationKey = translationKeys[normalized]
  if (translationKey) return t(translationKey)
  const value = rawStatus.replace(/_/g, ' ').toLowerCase()
  return value.charAt(0).toUpperCase() + value.slice(1)
}

const getTaskStatusTone = (status: string | undefined) => {
  const normalized = String(status || '').toUpperCase()
  if (completedStatuses.has(normalized)) return 'gba:bg-green-50 gba:text-green-700 gba:border-green-200'
  if (normalized === 'FAILED' || normalized === 'REJECTED') return 'gba:bg-red-50 gba:text-red-700 gba:border-red-200'
  return 'gba:bg-blue-50 gba:text-blue-700 gba:border-blue-200'
}

const getTaskIcon = (status: string | undefined) => {
  const normalized = String(status || '').toUpperCase()
  if (completedStatuses.has(normalized)) return <CheckCircle2 className="gba:h-4 gba:w-4 gba:text-green-600" />
  if (normalized === 'FAILED' || normalized === 'REJECTED')
    return <AlertCircle className="gba:h-4 gba:w-4 gba:text-red-600" />
  return <Clock className="gba:h-4 gba:w-4 gba:text-blue-600" />
}

const formatDateTime = (value: string | undefined) => {
  if (!value) return undefined
  return new Date(value).toLocaleString()
}

const getEmployeeDisplayName = (employee: AssigneeEmployee | undefined, fallback: string) =>
  employee?.displayName ||
  employee?.fullName ||
  employee?.preferredName ||
  [employee?.lastName, employee?.firstName].filter(Boolean).join(' ') ||
  fallback

const getInitials = (name: string) =>
  name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'

const getAvatarUrl = (pictureThumbnail: string | undefined) => {
  if (!pictureThumbnail) return undefined
  if (pictureThumbnail.startsWith('data:') || pictureThumbnail.startsWith('http')) return pictureThumbnail
  return `data:image/png;base64,${pictureThumbnail}`
}

const canClaimTask = (task: OnboardingTask) => {
  const assignmentStatus = String(task.assignment?.assignmentStatus || '').toUpperCase()
  const normalizedStatus = String(task.status || '').toUpperCase()
  if (task.availableActions?.canClaim) return true
  if (task.assignment?.assignedTo) return false
  return assignmentStatus === 'CLAIMABLE' || normalizedStatus === 'OPEN'
}

export const OnboardingTasksTab: React.FC<OnboardingTasksTabProps> = ({
  accessToken,
  myTasks,
  allTasks,
  linkedFlows,
  isLoading,
  claimingTaskId,
  error,
  onRefresh,
  onClaimTask
}) => {
  const { t } = useTranslation(translations)
  const [taskMode, setTaskMode] = useState<TaskMode>('my')
  const [filter, setFilter] = useState<TaskFilter>('all')
  const [assigneesByUserId, setAssigneesByUserId] = useState<Record<string, AssigneeEmployee>>({})
  const requestedAssigneeUserIdsRef = useRef<Set<string>>(new Set())
  const graphqlClient = useGraphQLClient(accessToken)

  const flowNamesById = useMemo(() => {
    const map = new Map<string, string>()
    linkedFlows.forEach(flow => {
      map.set(flow.workflowId, flow.workflowName || flow.templateId || t('hr-onboarding-common-unnamed-flow'))
    })
    return map
  }, [linkedFlows])

  const tasks = taskMode === 'my' ? myTasks : allTasks
  const taskModeLabel = taskMode === 'my' ? t('hr-onboarding-tasks-my') : t('hr-onboarding-tasks-all-case')

  const summary = useMemo(() => {
    const completed = tasks.filter(task => completedStatuses.has(String(task.status || '').toUpperCase())).length
    const open = tasks.filter(task => activeStatuses.has(String(task.status || '').toUpperCase())).length

    return {
      total: tasks.length,
      open,
      completed
    }
  }, [tasks])

  const filteredTasks = useMemo(() => {
    if (filter === 'completed') {
      return tasks.filter(task => completedStatuses.has(String(task.status || '').toUpperCase()))
    }
    if (filter === 'open') {
      return tasks.filter(task => !completedStatuses.has(String(task.status || '').toUpperCase()))
    }
    return tasks
  }, [filter, tasks])

  useEffect(() => {
    const userIds = [
      ...new Set(
        filteredTasks
          .map(task => task.assignment?.assignedTo)
          .filter((userId): userId is string =>
            Boolean(userId && !assigneesByUserId[userId] && !requestedAssigneeUserIdsRef.current.has(userId))
          )
      )
    ]

    if (userIds.length === 0) return
    userIds.forEach(userId => requestedAssigneeUserIdsRef.current.add(userId))

    void graphqlClient
      .request<{ Employee: AssigneeEmployee[] }>(GET_EMPLOYEES_BY_USER_IDS, { userIds })
      .then(response => {
        setAssigneesByUserId(previous => {
          const next = { ...previous }
          response.Employee.forEach(employee => {
            next[employee.userId] = employee
          })
          return next
        })
      })
      .catch(err => {
        console.error('Failed to load onboarding task assignees:', err)
      })
  }, [assigneesByUserId, filteredTasks, graphqlClient])

  if (linkedFlows.length === 0) {
    return (
      <Card>
        <CardContent className="gba:py-10 gba:text-center gba:text-sm gba:text-muted-foreground">
          {t('hr-onboarding-tasks-start-flow-empty')}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="gba:space-y-4">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="gba:grid gba:grid-cols-1 gba:gap-3 gba:md:grid-cols-3">
        <Card>
          <CardContent className="gba:flex gba:items-center gba:justify-between gba:p-4">
            <div>
              <p className="gba:text-xs gba:text-muted-foreground">{taskModeLabel}</p>
              <p className="gba:text-2xl gba:font-semibold">{summary.total}</p>
            </div>
            <ListChecks className="gba:h-5 gba:w-5 gba:text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="gba:flex gba:items-center gba:justify-between gba:p-4">
            <div>
              <p className="gba:text-xs gba:text-muted-foreground">{t('hr-onboarding-common-open')}</p>
              <p className="gba:text-2xl gba:font-semibold">{summary.open}</p>
            </div>
            <Clock className="gba:h-5 gba:w-5 gba:text-blue-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="gba:flex gba:items-center gba:justify-between gba:p-4">
            <div>
              <p className="gba:text-xs gba:text-muted-foreground">{t('hr-onboarding-common-completed')}</p>
              <p className="gba:text-2xl gba:font-semibold">{summary.completed}</p>
            </div>
            <CheckCircle2 className="gba:h-5 gba:w-5 gba:text-green-600" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:justify-between gba:text-base">
            <span>{taskModeLabel}</span>
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
              <RefreshCw className={`gba:h-4 gba:w-4 gba:mr-2 ${isLoading ? 'gba:animate-spin' : ''}`} />
              {t('hr-onboarding-common-refresh')}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-3">
            <div className="gba:flex gba:flex-wrap gba:gap-2">
              {(['my', 'all-case'] as TaskMode[]).map(option => (
                <Button
                  key={option}
                  variant={taskMode === option ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTaskMode(option)}
                >
                  {option === 'my' ? t('hr-onboarding-tasks-my') : t('hr-onboarding-tasks-all-case')}
                </Button>
              ))}
            </div>

            <div className="gba:flex gba:flex-wrap gba:gap-2">
              {(['all', 'open', 'completed'] as TaskFilter[]).map(option => (
                <Button
                  key={option}
                  variant={filter === option ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(option)}
                  className="gba:capitalize"
                >
                  {option === 'all'
                    ? t('hr-onboarding-common-all')
                    : option === 'open'
                      ? t('hr-onboarding-common-open')
                      : t('hr-onboarding-common-completed')}
                </Button>
              ))}
            </div>
          </div>

          {isLoading && filteredTasks.length === 0 ? (
            <div className="gba:py-10 gba:text-center gba:text-sm gba:text-muted-foreground">
              {t('hr-onboarding-tasks-loading')}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="gba:py-10 gba:text-center gba:text-sm gba:text-muted-foreground">
              {t('hr-onboarding-tasks-empty')}
            </div>
          ) : (
            <div className="gba:relative gba:rounded-lg gba:border gba:overflow-hidden">
              {isLoading ? (
                <div className="gba:absolute gba:right-3 gba:top-3 gba:z-10 gba:flex gba:items-center gba:gap-2 gba:rounded-md gba:border gba:bg-background/95 gba:px-3 gba:py-1.5 gba:text-xs gba:text-muted-foreground gba:shadow-sm">
                  <RefreshCw className="gba:h-3.5 gba:w-3.5 gba:animate-spin" />
                  {t('hr-onboarding-tasks-refreshing')}
                </div>
              ) : null}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('hr-onboarding-common-task')}</TableHead>
                    <TableHead>{t('hr-onboarding-common-flow')}</TableHead>
                    <TableHead>{t('hr-onboarding-common-status')}</TableHead>
                    <TableHead>{t('hr-onboarding-common-assignee')}</TableHead>
                    <TableHead>{t('hr-onboarding-common-updated')}</TableHead>
                    <TableHead className="gba:text-right">{t('hr-onboarding-common-actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map(task => {
                    const taskWorkflowId = task.flowId || task.workflowId || task.requestId
                    const flowName = task.flowName || (taskWorkflowId ? flowNamesById.get(taskWorkflowId) : undefined)
                    const assignedTo = task.assignment?.assignedTo
                    const assignee = assignedTo ? assigneesByUserId[assignedTo] : undefined
                    const assigneeName = assignedTo ? getEmployeeDisplayName(assignee, assignedTo) : undefined
                    const assigneeAvatarUrl = getAvatarUrl(assignee?.pictureThumbnail)
                    const dateLabel = formatDateTime(task.dueDate) || formatDateTime(task.updatedAt || task.scheduledAt)
                    const canClaim = taskMode === 'my' && canClaimTask(task)
                    const isClaiming = claimingTaskId === task.id

                    return (
                      <TableRow key={task.id} className="gba:hover:bg-muted/40">
                        <TableCell className="gba:align-middle">
                          <div className="gba:flex gba:min-w-0 gba:items-start gba:gap-3">
                            <div className="gba:mt-0.5">{getTaskIcon(task.status)}</div>
                            <div className="gba:min-w-0">
                              <div className="gba:text-sm gba:font-medium gba:truncate">{task.title}</div>
                              {task.message ? (
                                <div className="gba:mt-1 gba:max-w-md gba:text-xs gba:text-muted-foreground gba:line-clamp-2">
                                  {task.message}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="gba:align-middle gba:text-sm">
                          {flowName || t('hr-onboarding-common-unknown-flow')}
                        </TableCell>
                        <TableCell className="gba:align-middle">
                          <Badge variant="outline" className={getTaskStatusTone(task.status)}>
                            {formatStatusLabel(task.status, t)}
                          </Badge>
                        </TableCell>
                        <TableCell className="gba:align-middle">
                          {assignedTo && assigneeName ? (
                            <div className="gba:flex gba:items-center gba:gap-2">
                              <Avatar className="gba:h-6 gba:w-6 gba:shrink-0">
                                {assigneeAvatarUrl ? <AvatarImage src={assigneeAvatarUrl} alt={assigneeName} /> : null}
                                <AvatarFallback className="gba:text-xs">{getInitials(assigneeName)}</AvatarFallback>
                              </Avatar>
                              <span className="gba:text-sm gba:truncate">{assigneeName}</span>
                            </div>
                          ) : (
                            <span className="gba:text-sm gba:text-muted-foreground">
                              {t('hr-onboarding-common-unassigned')}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="gba:align-middle gba:text-sm gba:text-muted-foreground">
                          {dateLabel
                            ? task.dueDate
                              ? t('hr-onboarding-common-due-date', { date: dateLabel })
                              : dateLabel
                            : '-'}
                        </TableCell>
                        <TableCell className="gba:align-middle">
                          <div className="gba:flex gba:justify-end">
                            {canClaim ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onClaimTask(task.id)}
                                disabled={isClaiming}
                                className="gba:gap-1 gba:text-xs"
                              >
                                <UserPlus className="gba:h-3.5 gba:w-3.5" />
                                {isClaiming ? t('hr-onboarding-common-claiming') : t('hr-onboarding-common-claim')}
                              </Button>
                            ) : (
                              <span className="gba:text-xs gba:text-muted-foreground">
                                {t('hr-onboarding-common-no-actions')}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
