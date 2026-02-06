'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import dayjs from 'dayjs'
import { Employee, EmployeePerformanceGoal } from '../../hooks/useEmployeeData'
import { Card, CardHeader, CardTitle, CardContent, useTranslation } from '@newwork/nw-design-system'
import { Empty, Spin } from 'antd'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { employeePerformanceQuery } from '../../queries/performanceQueries'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { UserInfoProps } from '../../../../../../../common/BusinessAppContext'
import translations from '../../_i18n'

interface PerformanceTabProps {
  employee: Employee
  accessToken: string
  employeeId?: string // Optional employeeId override for permissions check
  userInfo?: UserInfoProps // Current user info for self-view check
  employeePerformanceGoals?: EmployeePerformanceGoal[]
}

// Extend the EmployeePerformanceGoal interface to include additional properties
interface ExtendedEmployeePerformanceGoal extends EmployeePerformanceGoal {
  id: string
  description?: string
  version?: number
}

/**
 * Performance Tab Component
 * Displays performance goals for the employee
 */
const PerformanceTab: React.FC<PerformanceTabProps> = ({
  employee,
  accessToken,
  employeePerformanceGoals = [],
  userInfo
}) => {
  const { t } = useTranslation(translations)
  const [localPerformanceGoals, setLocalPerformanceGoals] = useState<ExtendedEmployeePerformanceGoal[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const supevisor = useMemo(() => employee.employeePosition?.supervisor?.id, [employee])

  // Initialize GraphQL client
  const graphQLClient = useGraphqlClient(accessToken)

  // Fetch performance data
  const fetchPerformanceData = useCallback(async () => {
    if (!employee?.id) return

    try {
      setLoading(true)
      setError(null)

      const goalsResponse = await graphQLClient.request(employeePerformanceQuery, { employeeId: employee.id })

      if (goalsResponse) {
        setLocalPerformanceGoals(goalsResponse.EmployeePerformanceGoal || ([] as ExtendedEmployeePerformanceGoal[]))
      }
    } catch (err) {
      console.error('Error fetching performance data:', err)
      setError(t('performance-error-load'))
    } finally {
      setLoading(false)
    }
  }, [employee?.id, graphQLClient])

  useEffect(() => {
    // Initialize with props if available, otherwise fetch from API
    if (employeePerformanceGoals?.length) {
      setLocalPerformanceGoals(employeePerformanceGoals as ExtendedEmployeePerformanceGoal[])
    } else {
      fetchPerformanceData()
    }
  }, [employee?.id, accessToken, employeePerformanceGoals, fetchPerformanceData])

  // statusMap is recreated on each render since t() is stable but useMemo dependency would be ineffective
  const statusMap: Record<string, { label: string; color: string }> = {
    ON_TRACK: {
      label: t('performance-status-on-track'),
      color: 'gba:bg-success-secondary gba:text-success'
    },
    BEHIND_TARGET: {
      label: t('performance-status-behind-target'),
      color: 'gba:bg-destructive-secondary gba:text-destructive'
    },
    AT_RISK: {
      label: t('performance-status-at-risk'),
      color: 'gba:bg-warning-secondary gba:text-warning'
    },
    ACHIEVED: {
      label: t('performance-status-achieved'),
      color: 'gba:bg-info-secondary gba:text-info'
    },
    NOT_ACHIEVED: {
      label: t('performance-status-not-achieved'),
      color: 'gba:bg-muted gba:text-muted-foreground'
    }
  }

  const isGoalValid = (goal: ExtendedEmployeePerformanceGoal) => {
    return goal.title && goal.startDate && goal.dueDate
  }

  // Map status to display values and styles
  const getStatusInfo: (_status: string) => { label: string; color: string } = (status: string) => {
    return statusMap[status] || { label: status, color: 'gba:bg-gray-100 gba:text-gray-800' }
  }

  // Sort performance goals according to the specified rules
  const sortPerformanceGoals = (goals: ExtendedEmployeePerformanceGoal[]): ExtendedEmployeePerformanceGoal[] => {
    const today = dayjs().startOf('day')

    return [...goals].sort((a, b) => {
      // Primary sort: Status (Overdue > Active > Completed)
      const getStatusPriority = (goal: ExtendedEmployeePerformanceGoal): number => {
        const isOverdue = goal.dueDate && dayjs(goal.dueDate).isBefore(today) && goal.progressPercent < 100
        const isCompleted = goal.progressPercent === 100
        const isActive = !isOverdue && !isCompleted && goal.progressPercent < 100

        if (isOverdue) return 1 // Highest priority
        if (isActive) return 2 // Medium priority
        if (isCompleted) return 3 // Lowest priority
        return 4 // No due date or other cases
      }

      const statusPriorityA = getStatusPriority(a)
      const statusPriorityB = getStatusPriority(b)

      if (statusPriorityA !== statusPriorityB) {
        return statusPriorityA - statusPriorityB
      }

      // Secondary sort: Due Date (depends on status group)
      const dueDateA = a.dueDate ? dayjs(a.dueDate).valueOf() : Number.MAX_SAFE_INTEGER
      const dueDateB = b.dueDate ? dayjs(b.dueDate).valueOf() : Number.MAX_SAFE_INTEGER

      // Check if due dates are the same (within the same day)
      const sameDueDate = a.dueDate && b.dueDate && dayjs(a.dueDate).isSame(dayjs(b.dueDate), 'day')

      if (!sameDueDate && dueDateA !== dueDateB) {
        // For overdue goals: sort by due date DESCENDING (most overdue first)
        if (statusPriorityA === 1) {
          return dueDateB - dueDateA // Most overdue (oldest due date) first
        }
        // For active and completed goals: sort by due date ASCENDING (earliest first)
        return dueDateA - dueDateB
      }

      // Tertiary sort: Progress ascending (lowest progress first)
      const progressA = a.progressPercent || 0
      const progressB = b.progressPercent || 0

      return progressA - progressB
    })
  }

  // Get sorted performance goals
  const sortedPerformanceGoals = sortPerformanceGoals(localPerformanceGoals)

  // Handle loading state
  if (loading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-40" data-testid="performance-loading">
        <Spin size="large" />
      </div>
    )
  }

  // Handle error state
  if (error) {
    return (
      <div className="gba:text-center gba:text-red-600 gba:py-8" data-testid="performance-error">
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="gba:performance-tab gba:space-y-8" data-testid="performance-tab-container">
      {/* Performance Goals Headline with Action Button */}
      <div className="gba:flex gba:justify-between gba:items-start" data-testid="performance-goals-header">
        <div className="gba:performance-header">
          <div className="gba:font-bold gba:text-2xl" data-testid="performance-goals-title">
            {t('performance-title')}
          </div>
          <div className="gba:text-gray-500 gba:text-lg" data-testid="performance-goals-description">
            {t('performance-description')}
          </div>
        </div>

        <AppAction
          variant="update-primary"
          data-testid="employee-goal-add-button"
          contexts={[
            {
              context: FlowContextName.employeePerformanceGoal,
              contextData: { employeeId: employee?.id, employee: employee }
            }
          ]}
          prefixDataTestId="employee-goal-add"
          accessToken={accessToken}
          autoExecute={true}
        >
          {t('performance-edit-button')}
        </AppAction>
      </div>

      {/* Goals Content */}
      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:py-4">
        <section className="gba:flex gba:flex-col gba:gap-4">
          {!sortedPerformanceGoals?.length ? (
            <Empty description={t('performance-empty')} className="gba:py-10" data-testid="empty-goals-state" />
          ) : (
            <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-3">
              {sortedPerformanceGoals.map(goal => {
                if (!isGoalValid(goal)) {
                  return null
                }
                const statusInfo = getStatusInfo(goal.status)

                return (
                  <Card
                    key={`goal-${goal.title ?? ''}-${goal.status ?? ''}`}
                    className="gba:w-full"
                    data-testid={`goal-card-${goal.id}`}
                  >
                    <CardHeader>
                      <div className="gba:flex gba:flex-col gba:md:flex-row gba:md:items-center gba:justify-between">
                        <CardTitle className="gba:text-lg">{goal.title}</CardTitle>
                        <span
                          className={`gba:inline-flex gba:items-center gba:px-2.5 gba:py-0.5 gba:rounded-full gba:text-xs gba:font-medium gba:mt-2 gba:md:mt-0 ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="gba:mb-4">
                        <div className="gba:w-full gba:bg-gray-200 gba:rounded-full gba:h-2.5">
                          <div
                            className="gba:bg-blue-600 gba:h-2.5 gba:rounded-full"
                            style={{ width: `${goal.progressPercent}%` }}
                          ></div>
                        </div>
                        <div className="gba:flex gba:justify-between gba:mt-1 gba:text-sm gba:text-gray-600">
                          <span>{t('performance-progress')}</span>
                          <span>{goal.progressPercent}%</span>
                        </div>
                      </div>

                      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4 gba:text-sm">
                        <div>
                          <span className="gba:block gba:text-gray-500">{t('performance-start-date')}</span>
                          <span>{dayjs(goal.startDate).format('MMM D, YYYY')}</span>
                        </div>
                        <div>
                          <span className="gba:block gba:text-gray-500">{t('performance-due-date')}</span>
                          <span>{dayjs(goal.dueDate).format('MMM D, YYYY')}</span>
                        </div>
                        <div>
                          <span className="gba:block gba:text-gray-500">{t('performance-completion-date')}</span>
                          <span>{goal.completionDate ? dayjs(goal.completionDate).format('MMM D, YYYY') : '-'}</span>
                        </div>
                      </div>

                      {/* Edit button at the bottom right */}
                      {userInfo?.employeeDetails?.employeeId === supevisor && (
                        <div className="gba:flex gba:justify-end gba:mt-4">
                          <AppAction
                            variant="update-secondary"
                            data-testid={`employee-goal-edit-button-${goal.id}`}
                            contexts={[
                              {
                                context: FlowContextName.employeePerformanceGoal,
                                contextData: {
                                  employeeId: employee?.id,
                                  goalId: goal.id,
                                  title: goal.title,
                                  startDate: goal.startDate,
                                  dueDate: goal.dueDate,
                                  completionDate: goal.completionDate,
                                  progressPercent: goal.progressPercent,
                                  status: goal.status,
                                  version: goal.version
                                }
                              }
                            ]}
                            prefixDataTestId={`employee-goal-edit-${goal.id}`}
                            accessToken={accessToken}
                            autoExecute={true}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* Removed drawer - Edit buttons are now directly on cards */}
    </div>
  )
}

export default PerformanceTab
