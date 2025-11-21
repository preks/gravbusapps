'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import dayjs from 'dayjs'
import { Employee, EmployeePerformanceGoal } from '../../hooks/useEmployeeData'
import { Card } from '@newwork/gravity-ui-catalog'
import { Empty, Spin } from 'antd'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { employeePerformanceQuery } from '../../queries/performanceQueries'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { UserInfoProps } from '../../../../../../../common/BusinessAppContext'

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
      setError('Failed to load performance data')
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

  const statusMap: Record<string, { label: string; color: string }> = {
    ON_TRACK: {
      label: 'On Track',
      color: 'gba:bg-success-secondary gba:text-success'
    },
    BEHIND_TARGET: {
      label: 'Behind Target',
      color: 'gba:bg-destructive-secondary gba:text-destructive'
    },
    AT_RISK: {
      label: 'At Risk',
      color: 'gba:bg-warning-secondary gba:text-warning'
    },
    ACHIEVED: {
      label: 'Achieved',
      color: 'gba:bg-info-secondary gba:text-info'
    },
    NOT_ACHIEVED: {
      label: 'Not Achieved',
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
            {getTranslationFromI18nKeyAndLabel('lowcoder:hr_performance.performance_goals', 'Performance Goals')}
          </div>
          <div className="gba:text-gray-500 gba:text-lg" data-testid="performance-goals-description">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:hr_performance.goals_description',
              'View and manage employee performance goals'
            )}
          </div>
        </div>

        <AppAction
          variant="update-primary"
          data-testid="employee-goal-add-button"
          contexts={[{ context: FlowContextName.employeePerformanceGoal, contextData: { employeeId: employee?.id } }]}
          prefixDataTestId="employee-goal-add"
          accessToken={accessToken}
          autoExecute={true}
        >
          {getTranslationFromI18nKeyAndLabel('lowcoder:new_goal.set_new_goal', 'Set New Goal')}
        </AppAction>
      </div>

      {/* Goals Content */}
      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:py-4">
        <section className="gba:flex gba:flex-col gba:gap-4">
          {!sortedPerformanceGoals?.length ? (
            <Empty description="No goals available" className="gba:py-10" data-testid="empty-goals-state" />
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
                    variant="outlined"
                    className="gba:w-full gba:border gba:border-gray-200 gba:shadow-md gba:hover:shadow-lg gba:transition-all"
                    data-testid={`goal-card-${goal.id}`}
                  >
                    <div className="gba:flex gba:flex-col gba:md:flex-row gba:md:items-center gba:justify-between gba:mb-4">
                      <h3 className="gba:text-lg gba:font-medium">{goal.title}</h3>
                      <span
                        className={`gba:inline-flex gba:items-center gba:px-2.5 gba:py-0.5 gba:rounded-full gba:text-xs gba:font-medium gba:mt-2 gba:md:mt-0 ${statusInfo.color}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>

                    <div className="gba:mb-4">
                      <div className="gba:w-full gba:bg-gray-200 gba:rounded-full gba:h-2.5">
                        <div
                          className="gba:bg-blue-600 gba:h-2.5 gba:rounded-full"
                          style={{ width: `${goal.progressPercent}%` }}
                        ></div>
                      </div>
                      <div className="gba:flex gba:justify-between gba:mt-1 gba:text-sm gba:text-gray-600">
                        <span>progress</span>
                        <span>{goal.progressPercent}%</span>
                      </div>
                    </div>

                    <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4 gba:text-sm">
                      <div>
                        <span className="gba:block gba:text-gray-500">Start Date</span>
                        <span>{dayjs(goal.startDate).format('MMM D, YYYY')}</span>
                      </div>
                      <div>
                        <span className="gba:block gba:text-gray-500">Due Date</span>
                        <span>{dayjs(goal.dueDate).format('MMM D, YYYY')}</span>
                      </div>
                      <div>
                        <span className="gba:block gba:text-gray-500">Completion Date</span>
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
