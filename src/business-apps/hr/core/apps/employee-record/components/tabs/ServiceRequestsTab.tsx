'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Employee } from '../../hooks/useEmployeeData'
import { UserInfoProps } from '@/common/BusinessAppContext'
import { getUserRequests } from '../../services/service-requests/serviceRequestsService'
import type { SubmittedRequest } from '../../services/service-requests/serviceRequestsTypes'
import { Card, Badge, Spinner, Alert, Button } from '@newwork/nw-design-system'
import { PiReceipt, PiCheckCircle, PiClock, PiPlus } from 'react-icons/pi'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

interface ServiceRequestsTabProps {
  employee: Employee
  accessToken: string
  userInfo?: UserInfoProps
  isSelfView: boolean
  employeeId?: string
}

/**
 * Service Requests Tab Component
 * Displays service requests initiated by the employee
 */
const ServiceRequestsTab: React.FC<ServiceRequestsTabProps> = ({ employee, accessToken, userInfo, isSelfView }) => {
  const [requests, setRequests] = useState<SubmittedRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get user ID: use userInfo.id for self-view, otherwise get from employee.userId
  const userId = isSelfView ? userInfo?.id : employee.userId

  // Load employee's service requests
  useEffect(() => {
    const loadRequests = async () => {
      if (!userId) {
        setError('User ID not found for this employee. Please ensure the employee has a linked user account.')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const userRequests = await getUserRequests(userId, accessToken)
        // Sort: in-progress first, then by creation date (newest first)
        const sortedRequests = userRequests.sort((a, b) => {
          const aIsInProgress = a.status === 'in_progress' || a.status === 'open'
          const bIsInProgress = b.status === 'in_progress' || b.status === 'open'

          // If one is in-progress and the other isn't, prioritize in-progress
          if (aIsInProgress && !bIsInProgress) return -1
          if (!aIsInProgress && bIsInProgress) return 1

          // If both have same status category, sort by creation date (newest first)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })
        setRequests(sortedRequests)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load service requests')
      } finally {
        setIsLoading(false)
      }
    }

    loadRequests()
  }, [userId, accessToken])

  // Calculate statistics
  const stats = useMemo(() => {
    const total = requests.length
    const active = requests.filter(r => r.status === 'in_progress' || r.status === 'open').length
    const completed = requests.filter(r => r.status === 'completed').length
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

    return { total, active, completed, completionRate }
  }, [requests])

  // Format date with fallback
  const formatRequestDate = (dateString: string) => {
    const formatted = formatDate(dateString, 'date.short')
    // If formatDate returns ISO string (fallback), format it nicely
    if (formatted && formatted.includes('T')) {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }
    return formatted
  }

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success'
      case 'in_progress':
        return 'info'
      case 'open':
        return 'warning'
      case 'rejected':
      case 'canceled':
        return 'destructive'
      default:
        return 'default'
    }
  }

  // Format status text
  const formatStatusText = (status: string) => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  // Calculate progress
  const calculateProgress = (request: SubmittedRequest) => {
    const totalSteps = request.steps.length
    if (totalSteps === 0) return 0
    const completedSteps = request.steps.filter(s => s.status === 'COMPLETED' || s.status === 'DONE').length
    return Math.round((completedSteps / totalSteps) * 100)
  }

  // Get current step name
  const getCurrentStepName = (request: SubmittedRequest): string => {
    if (request.steps.length === 0) {
      return getTranslationFromI18nKeyAndLabel('lowcoder:hr_employee.service_requests_no_steps', 'No steps defined')
    }

    // Find the first in-progress step
    const inProgressStep = request.steps.find(s => s.status === 'IN_PROGRESS' || s.status === 'CLAIMED')
    if (inProgressStep) return inProgressStep.name

    // If no in-progress step, find the first pending/queued step
    const pendingStep = request.steps.find(
      s => s.status === 'PENDING' || s.status === 'QUEUED' || s.status === 'AVAILABLE' || s.status === 'SCHEDULED'
    )
    if (pendingStep) {
      const nextLabel = getTranslationFromI18nKeyAndLabel('lowcoder:hr_employee.service_requests_next_step', 'Next')
      return `${nextLabel}: ${pendingStep.name}`
    }

    // If all completed, show the last step
    const completedSteps = request.steps.filter(s => s.status === 'COMPLETED' || s.status === 'DONE')
    if (completedSteps.length === request.steps.length && completedSteps.length > 0) {
      const completedLabel = getTranslationFromI18nKeyAndLabel(
        'lowcoder:hr_employee.service_requests_completed_step',
        'Completed'
      )
      return `${completedLabel}: ${completedSteps[completedSteps.length - 1].name}`
    }

    // Fallback to first step
    return request.steps[0].name
  }

  const handleRequestClick = (requestId: string) => {
    const url = buildPlatformUrl('/platform/sales-demo/service-launcher', {
      view: 'myRequests',
      requestId: requestId
    })
    navigateTo(url)
  }

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6">
        <Alert variant="destructive">
          <h4 className="gba:font-semibold gba:mb-2">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:hr_employee.service_requests_error',
              'Error Loading Service Requests'
            )}
          </h4>
          <p>{error}</p>
        </Alert>
      </div>
    )
  }

  return (
    <div className="gba:service-requests-tab gba:space-y-6" data-testid="service-requests-tab">
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-start">
        <div>
          <h3 className="gba:text-2xl gba:font-bold gba:text-gray-900">
            {getTranslationFromI18nKeyAndLabel('lowcoder:hr_employee.service_requests_title', 'Service Requests')}
          </h3>
          <p className="gba:text-gray-600 gba:mt-1">
            {isSelfView
              ? getTranslationFromI18nKeyAndLabel(
                  'lowcoder:hr_employee.service_requests_desc_self',
                  'Your submitted service requests'
                )
              : getTranslationFromI18nKeyAndLabel(
                  'lowcoder:hr_employee.service_requests_desc_other',
                  `Service requests submitted by ${employee.displayName}`
                )}
          </p>
        </div>
        {isSelfView && (
          <div className="gba:flex gba:flex-col gba:items-end gba:gap-1">
            <Button
              onClick={() => navigateTo(buildPlatformUrl('/platform/sales-demo/service-launcher'))}
              className="gba:flex gba:items-center gba:gap-2"
              data-testid="create-new-request-button"
            >
              <PiPlus className="gba:h-4 gba:w-4" />
              {getTranslationFromI18nKeyAndLabel('lowcoder:hr_employee.service_requests_create_new', 'Service Portal')}
            </Button>
          </div>
        )}
      </div>

      {/* Statistics Badges */}
      <div className="gba:grid gba:grid-cols-2 gba:md:grid-cols-4 gba:gap-4">
        <Card className="gba:p-4 gba:border gba:border-gray-200">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:p-2 gba:bg-blue-100 gba:rounded-lg">
              <PiReceipt className="gba:w-5 gba:h-5 gba:text-blue-600" />
            </div>
            <div>
              <p className="gba:text-sm gba:text-gray-600">
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_employee.service_requests_total', 'Total')}
              </p>
              <p className="gba:text-2xl gba:font-bold gba:text-gray-900">{stats.total}</p>
            </div>
          </div>
        </Card>

        <Card className="gba:p-4 gba:border gba:border-gray-200">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:p-2 gba:bg-yellow-100 gba:rounded-lg">
              <PiClock className="gba:w-5 gba:h-5 gba:text-yellow-600" />
            </div>
            <div>
              <p className="gba:text-sm gba:text-gray-600">
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_employee.service_requests_active', 'Active')}
              </p>
              <p className="gba:text-2xl gba:font-bold gba:text-gray-900">{stats.active}</p>
            </div>
          </div>
        </Card>

        <Card className="gba:p-4 gba:border gba:border-gray-200">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:p-2 gba:bg-green-100 gba:rounded-lg">
              <PiCheckCircle className="gba:w-5 gba:h-5 gba:text-green-600" />
            </div>
            <div>
              <p className="gba:text-sm gba:text-gray-600">
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_employee.service_requests_completed', 'Completed')}
              </p>
              <p className="gba:text-2xl gba:font-bold gba:text-gray-900">{stats.completed}</p>
            </div>
          </div>
        </Card>

        <Card className="gba:p-4 gba:border gba:border-gray-200">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:p-2 gba:bg-purple-100 gba:rounded-lg">
              <PiCheckCircle className="gba:w-5 gba:h-5 gba:text-purple-600" />
            </div>
            <div>
              <p className="gba:text-sm gba:text-gray-600">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:hr_employee.service_requests_completion_rate',
                  'Completion Rate'
                )}
              </p>
              <p className="gba:text-2xl gba:font-bold gba:text-gray-900">{stats.completionRate}%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <Card className="gba:p-12 gba:text-center gba:border gba:border-gray-200">
          <PiReceipt className="gba:w-16 gba:h-16 gba:mx-auto gba:mb-4 gba:text-gray-400" />
          <h4 className="gba:text-lg gba:font-semibold gba:text-gray-900 gba:mb-2">
            {getTranslationFromI18nKeyAndLabel('lowcoder:hr_employee.no_service_requests', 'No Service Requests')}
          </h4>
          <p className="gba:text-gray-600">
            {isSelfView
              ? getTranslationFromI18nKeyAndLabel(
                  'lowcoder:hr_employee.no_service_requests_desc_self',
                  'You have not submitted any service requests yet.'
                )
              : getTranslationFromI18nKeyAndLabel(
                  'lowcoder:hr_employee.no_service_requests_desc_other',
                  'This employee has not submitted any service requests yet.'
                )}
          </p>
        </Card>
      ) : (
        <Card className="gba:border gba:border-gray-200">
          <div className="gba:overflow-x-auto">
            <table className="gba:w-full">
              <thead className="gba:bg-gray-50 gba:border-b gba:border-gray-200">
                <tr>
                  <th className="gba:px-6 gba:py-3 gba:text-left gba:text-xs gba:font-medium gba:text-gray-500 gba:uppercase gba:tracking-wider">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:hr_employee.service_requests_column_request',
                      'Request'
                    )}
                  </th>
                  <th className="gba:px-6 gba:py-3 gba:text-left gba:text-xs gba:font-medium gba:text-gray-500 gba:uppercase gba:tracking-wider">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:expense_request_list.expense_plan_table.status',
                      'Status'
                    )}
                  </th>
                  <th className="gba:px-6 gba:py-3 gba:text-left gba:text-xs gba:font-medium gba:text-gray-500 gba:uppercase gba:tracking-wider">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:hr_employee.service_requests_column_progress',
                      'Progress'
                    )}
                  </th>
                  <th className="gba:px-6 gba:py-3 gba:text-left gba:text-xs gba:font-medium gba:text-gray-500 gba:uppercase gba:tracking-wider">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:hr_employee.service_requests_column_created',
                      'Created'
                    )}
                  </th>
                  <th className="gba:px-6 gba:py-3 gba:text-left gba:text-xs gba:font-medium gba:text-gray-500 gba:uppercase gba:tracking-wider">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:hr_employee.service_requests_column_steps', 'Steps')}
                  </th>
                </tr>
              </thead>
              <tbody className="gba:bg-white gba:divide-y gba:divide-gray-200">
                {requests.map(request => {
                  const progress = calculateProgress(request)
                  return (
                    <tr
                      key={request.id}
                      className="gba:hover:bg-gray-50 gba:transition-colors"
                      data-testid={`request-row-${request.id}`}
                    >
                      <td className="gba:px-6 gba:py-4">
                        <div className="gba:flex gba:flex-col">
                          <button
                            onClick={() => handleRequestClick(request.id)}
                            className="gba:text-sm gba:font-medium gba:text-blue-600 hover:gba:text-blue-800 hover:gba:underline gba:text-left gba:cursor-pointer gba:bg-transparent gba:border-none gba:p-0"
                          >
                            {request.titleSnapshot}
                          </button>
                          <span className="gba:text-xs gba:text-gray-500 gba:mt-1">{getCurrentStepName(request)}</span>
                        </div>
                      </td>
                      <td className="gba:px-6 gba:py-4">
                        <Badge variant={getStatusBadgeVariant(request.status)}>
                          {formatStatusText(request.status)}
                        </Badge>
                      </td>
                      <td className="gba:px-6 gba:py-4">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <div className="gba:flex-1 gba:bg-gray-200 gba:rounded-full gba:h-2 gba:max-w-[100px]">
                            <div
                              className="gba:bg-blue-600 gba:h-2 gba:rounded-full gba:transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="gba:text-xs gba:text-gray-600 gba:font-medium">{progress}%</span>
                        </div>
                      </td>
                      <td className="gba:px-6 gba:py-4 gba:text-sm gba:text-gray-600">
                        {formatRequestDate(request.createdAt)}
                      </td>
                      <td className="gba:px-6 gba:py-4 gba:text-sm gba:text-gray-600">
                        {request.steps.filter(s => s.status === 'COMPLETED' || s.status === 'DONE').length} /{' '}
                        {request.steps.length}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

export default ServiceRequestsTab
