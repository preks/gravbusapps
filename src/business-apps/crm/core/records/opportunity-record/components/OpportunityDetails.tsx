import React, { useState, useCallback, useMemo } from 'react'
import { Card, Tooltip } from 'antd'
import { Badge } from '@newwork/nw-design-system'
import {
  InfoCircleOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined
} from '@ant-design/icons'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getSalesPipelineStageBadgeVariant } from '@/common/utils/badgeUtils'
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

interface StageCondition {
  id: string
  stageConditionStatusId: string
  title: string
  description: string
  isCompleted: boolean
  generateTask?: boolean
  checkedType?: 'Automated' | 'User' | 'Manager' | 'Owner'
  deadlineEnabled?: boolean
  deadlineDuration?: number
  deadlineUnit?: string
  completedBy?: string | null // Real completed by employee name
  completedByEmployeeId?: string | null // Employee ID for navigation
  deadlineAt?: string | null // Real deadline date
  completedAt?: string | null // When it was completed
  details: {
    approvedBy: string
    dueDate: string
    relatedDocuments: string[]
  }
  externalTasks?: {
    id: string
    title: string
    status: 'Open' | 'In Progress' | 'Completed'
    assignee: string
    dueDate: string
  }[]
}

interface OpportunityDetailsProps {
  opportunityData: any
  stageConditionStatuses: any[]
  context: BusinessAppContextProps
}

export const OpportunityDetails: React.FC<OpportunityDetailsProps> = ({
  opportunityData,
  stageConditionStatuses,
  context
}) => {
  // Track hover state for condition icons
  const [hoveredConditionId, setHoveredConditionId] = useState<string | null>(null)

  // Create stable mouse event handlers
  const handleConditionMouseLeave = useCallback(() => {
    setHoveredConditionId(null)
  }, [])

  // Stable context array for conditions
  const conditionContextsArray = useMemo(() => [FlowContextName.saveOpportunityStageConditionStatus], [])

  // Create stable props for all conditions to prevent AppActionMenu re-renders
  const conditionProps = useMemo(() => {
    const props: Record<
      string,
      {
        mouseHandlers: {
          onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => void
          onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => void
        }
        externalContextData: { stageConditionStatusId: string }
        contextsArray: FlowContextName[]
      }
    > = {}

    stageConditionStatuses.forEach(statusData => {
      const conditionId = statusData.id
      props[conditionId] = {
        mouseHandlers: {
          onMouseEnter: () => setHoveredConditionId(conditionId),
          onMouseLeave: handleConditionMouseLeave
        },
        externalContextData: {
          stageConditionStatusId: conditionId
        },
        contextsArray: conditionContextsArray
      }
    })

    return props
  }, [stageConditionStatuses, handleConditionMouseLeave, conditionContextsArray])

  // Transform real stage condition status data to UI format
  const transformStageConditionStatusToUI = (statusData: any): StageCondition => {
    const config = statusData.configSnapshot || statusData.salesPipelineStageCondition?.objectValue || {}

    // Extract deadline information
    const deadlineEnabled = config.deadline_enabled || false
    const deadlineDuration = config.deadline_duration || 1
    const deadlineUnit = config.deadline_duration_measurement_unit_ref === 'MeasurementUnit:v1:DAY' ? 'Days' : 'Weeks'

    // Calculate due date based on deadline
    const dueDate = statusData.deadlineAt
      ? new Date(statusData.deadlineAt).toISOString().split('T')[0]
      : new Date(Date.now() + deadlineDuration * (deadlineUnit === 'Days' ? 1 : 7) * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0]

    // Get approver information - prefer displayName, fallback to firstName + lastName
    const getEmployeeName = (employee: any) => {
      if (!employee) return 'System'
      return (
        employee.displayName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unknown Employee'
      )
    }

    const approvedBy = getEmployeeName(statusData.completedByEmployee)

    // Determine check type
    const checkedType = config.check_type === 'MANUAL' ? 'User' : 'Automated'

    return {
      id: statusData.salesPipelineStageCondition?.code || statusData.id,
      stageConditionStatusId: statusData.id, // Add the stage condition status ID for the action button
      title: statusData.salesPipelineStageCondition?.value || 'Unknown Condition',
      description: config.description || 'No description available',
      isCompleted: statusData.completed || false,
      generateTask: config.generate_task || config.generateTask || false,
      checkedType: checkedType as 'Automated' | 'User' | 'Manager' | 'Owner',
      deadlineEnabled,
      deadlineDuration,
      deadlineUnit,
      completedBy: statusData.completedByEmployee ? getEmployeeName(statusData.completedByEmployee) : null,
      completedByEmployeeId: statusData.completedByEmployee?.id || null,
      deadlineAt: statusData.deadlineAt,
      completedAt: statusData.completedAt,
      details: {
        approvedBy,
        dueDate,
        relatedDocuments: ['Condition_Template.docx', 'Requirements_Checklist.pdf']
      },
      externalTasks: statusData.generateTask
        ? [
            {
              id: `task-${statusData.id}`,
              title: `Complete ${statusData.salesPipelineStageCondition?.value || 'condition'} requirements`,
              status: statusData.completed ? ('Completed' as const) : ('In Progress' as const),
              assignee: approvedBy,
              dueDate
            }
          ]
        : []
    }
  }

  // Filter stage conditions to only show those belonging to the current stage
  const getCurrentStageConditions = (stageConditionStatuses: any[], currentStage: string): any[] => {
    const expectedStageId = `SalesPipelineStage:v1:${currentStage}`
    return stageConditionStatuses.filter(statusData => {
      const parentEntryId = statusData.salesPipelineStageCondition?.parentEntryId
      return parentEntryId === expectedStageId
    })
  }

  // Use real data if available, filter for current stage, otherwise fall back to empty array
  const currentStageConditionStatuses =
    stageConditionStatuses.length > 0
      ? getCurrentStageConditions(stageConditionStatuses, opportunityData?.salesPipelineStage?.code || '')
      : []

  const stageConditions: StageCondition[] = currentStageConditionStatuses.map(transformStageConditionStatusToUI)

  // Sort conditions: incomplete (false) first, then completed (true)
  const sortedStageConditions = [...stageConditions].sort((a, b) => {
    if (a.isCompleted === b.isCompleted) return 0
    return a.isCompleted ? 1 : -1 // false comes before true
  })

  // Handle navigation to employee record
  const handleEmployeeNavigation = (employeeId: string) => {
    const employeeUrl = buildPlatformUrl('/platform/employee-record', { employeeId })
    navigateTo(employeeUrl)
  }

  const cardTitle = (
    <div className="gba:flex gba:items-center gba:justify-between gba:w-full">
      <span>Stage required conditions</span>
      <Tooltip
        title="They are conditions what need to be fulfilled and approved for stage transitions."
        placement="topRight"
      >
        <InfoCircleOutlined className="gba:text-gray-400 hover:gba:text-gray-600 gba:cursor-help" />
      </Tooltip>
    </div>
  )

  return (
    <Card
      title={cardTitle}
      className="gba:h-full gba:w-full"
      style={{ width: '100%' }}
      data-testid="opportunity-details-card"
    >
      <div className="gba:space-y-3">
        {/* Stage Information */}
        <div className="gba:flex gba:justify-center gba:p-3 gba:bg-gray-50 gba:rounded-lg gba:border gba:border-gray-200">
          <Badge variant={getSalesPipelineStageBadgeVariant(opportunityData?.salesPipelineStage)}>
            {opportunityData?.salesPipelineStage?.value || 'No Stage'}
          </Badge>
        </div>

        {/* Stage Conditions List */}
        <div className="gba:space-y-3 gba:max-h-96 gba:overflow-y-auto gba:pr-1">
          {sortedStageConditions.length > 0 ? (
            sortedStageConditions.map(condition => (
              <div
                key={condition.id}
                className="gba:p-4 gba:rounded-lg gba:border gba:border-gray-200 gba:bg-hsl(var(--background)) hover:gba:bg-gray-50 gba:transition-colors"
                data-testid={`stage-condition-${condition.id}`}
              >
                {/* Header with Status Icon and Title */}
                <div className="gba:mb-2">
                  {/* Due Date - top-left on very small screens */}
                  {condition.deadlineAt && (
                    <div className="gba:sm:hidden gba:mb-2 gba:text-xs gba:text-gray-500">
                      <CalendarOutlined className="gba:text-gray-400 gba:mr-1" />
                      <span>
                        {new Date(condition.deadlineAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  )}

                  <div className="gba:flex gba:items-center gba:gap-2">
                    <div className="gba:flex-shrink-0">
                      <AppActionMenu
                        data-testid={`stage-condition-status-icon-${condition.stageConditionStatusId}`}
                        contextsArray={conditionProps[condition.stageConditionStatusId]?.contextsArray}
                        externalContextData={conditionProps[condition.stageConditionStatusId]?.externalContextData}
                        prefixDataTestId="stage-condition-status-icon"
                        accessToken={context.accessToken}
                        emptyStateBehavior="disable"
                        deferMainContextRequestsUntilClick={false}
                        autoExecuteSingleAction={true}
                        style={{ display: 'inline-block' }}
                        onMouseEnter={conditionProps[condition.stageConditionStatusId]?.mouseHandlers.onMouseEnter}
                        onMouseLeave={conditionProps[condition.stageConditionStatusId]?.mouseHandlers.onMouseLeave}
                      >
                        <div
                          className="gba:p-0 gba:rounded-full gba:transition-colors gba:border-0 gba:relative gba:cursor-pointer gba:inline-flex gba:items-center gba:justify-center"
                          style={{
                            minWidth: 'auto',
                            minHeight: 'auto',
                            background:
                              hoveredConditionId === condition.stageConditionStatusId ? '#f3f4f6' : 'transparent',
                            width: '32px',
                            height: '32px'
                          }}
                          onClick={e => e.stopPropagation()}
                        >
                          {/* Show appropriate icon based on hover state */}
                          {hoveredConditionId === condition.stageConditionStatusId ? (
                            // Hover State Icon (opposite of current state)
                            condition.isCompleted ? (
                              <CloseCircleFilled className="gba:text-2xl gba:text-warning" />
                            ) : (
                              <CheckCircleFilled className="gba:text-2xl gba:text-success" />
                            )
                          ) : // Default State Icon
                          condition.isCompleted ? (
                            <CheckCircleFilled className="gba:text-2xl gba:text-success" />
                          ) : (
                            <CloseCircleFilled className="gba:text-2xl gba:text-muted-foreground" />
                          )}
                        </div>
                      </AppActionMenu>
                    </div>

                    <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1 gba:min-w-0">
                      <h4 className="gba:text-sm gba:font-bold gba:text-gray-800">{condition.title}</h4>
                      {condition.description && (
                        <Tooltip
                          title={condition.description}
                          placement="top"
                          styles={{
                            root: { maxWidth: '300px' }
                          }}
                        >
                          <InfoCircleOutlined className="gba:text-gray-400 hover:gba:text-gray-600 gba:cursor-help gba:text-xs gba:flex-shrink-0" />
                        </Tooltip>
                      )}
                    </div>

                    {/* Due Date - inline on larger screens */}
                    {condition.deadlineAt && (
                      <div className="gba:hidden gba:lg:flex gba:flex-shrink-0 gba:text-xs gba:text-gray-500 gba:bg-gray-50 gba:px-2 gba:py-1 gba:rounded-md gba:border">
                        <CalendarOutlined className="gba:text-gray-400 gba:mr-1" />
                        <span>{new Date(condition.deadlineAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Due Date - below title on medium screens */}
                  {condition.deadlineAt && (
                    <div className="gba:hidden gba:sm:block gba:lg:hidden gba:mt-1 gba:ml-12 gba:text-xs gba:text-gray-500">
                      <CalendarOutlined className="gba:text-gray-400 gba:mr-1" />
                      <span>{new Date(condition.deadlineAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Completion Information */}
                {condition.isCompleted && (condition.completedBy || condition.completedAt) && (
                  <div className="gba:mt-2 gba:inline-block gba:px-3 gba:py-1 gba:bg-green-100 gba:border gba:border-green-300 gba:rounded-full gba:text-xs gba:text-green-800">
                    <div className="gba:font-medium">
                      {/* Date and Time - always together */}
                      {condition.completedAt && (
                        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
                          <div className="gba:flex gba:items-center gba:gap-1">
                            <CalendarOutlined style={{ fontSize: '10px' }} />
                            <span>
                              {new Date(condition.completedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                          <div className="gba:flex gba:items-center gba:gap-1">
                            <ClockCircleOutlined style={{ fontSize: '10px' }} />
                            <span>
                              {new Date(condition.completedAt).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Employee - separate line on small screens */}
                      {condition.completedBy && (
                        <div
                          className={`gba:flex gba:items-center gba:gap-1 ${condition.completedAt ? 'gba:mt-1 gba:sm:mt-0 gba:sm:ml-3 gba:sm:inline-flex' : ''}`}
                        >
                          <UserOutlined style={{ fontSize: '10px' }} />
                          {condition.completedByEmployeeId ? (
                            <button
                              onClick={() => handleEmployeeNavigation(condition.completedByEmployeeId!)}
                              className="gba:font-medium gba:text-green-800 hover:gba:text-green-900 gba:underline gba:cursor-pointer gba:bg-transparent gba:border-none gba:p-0"
                              title={`Navigate to ${condition.completedBy}'s employee record`}
                              data-testid={`employee-link-${condition.completedByEmployeeId}`}
                            >
                              {condition.completedBy}
                            </button>
                          ) : (
                            <span>{condition.completedBy}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="gba:text-center gba:py-8 gba:text-gray-500">
              <InfoCircleOutlined className="gba:text-2xl gba:mb-2" />
              <p className="gba:text-sm">No stage conditions configured for this opportunity</p>
              <p className="gba:text-xs gba:mt-1">
                Stage conditions will appear here when configured for the current pipeline stage
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
