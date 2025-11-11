/**
 * AbsenceApprovalDetails Component
 * Dedicated view for absence request approval tasks from Kogito
 */

import React, { useState, useEffect } from 'react'
import {
  Button,
  Separator,
  Textarea,
  Switch,
  Label,
  Spinner,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@newwork/nw-design-system'
import { ThumbsUp, XCircle, MessageSquare } from 'lucide-react'
import { PiCalendarDuotone, PiUser } from 'react-icons/pi'
import { message } from 'antd'
import { UnifiedTask } from '../../types'
import { useKogitoProcess } from '../../hooks/useKogitoProcess'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { useExpenseRelatedEntities } from '../../hooks/useExpenseRelatedEntities'
import { getModuleInfo } from '../../utils/moduleIcons'
import { getInitials } from '../../utils/avatarUtils'
import { TeamAbsenceCalendar } from '../TeamAbsenceCalendar'
import dayjs from 'dayjs'

interface AbsenceApprovalDetailsProps {
  task: UnifiedTask
  accessToken: string
  userInfo?: any
  onTaskCompleted?: (taskId: string) => void
  onTaskUpdated: () => void
  onClose: () => void
}

export const AbsenceApprovalDetails: React.FC<AbsenceApprovalDetailsProps> = ({
  task,
  accessToken,
  userInfo,
  onTaskCompleted,
  onTaskUpdated,
  onClose
}) => {
  const [showComment, setShowComment] = useState(false)
  const [comment, setComment] = useState('')
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [substituteEmployeeName, setSubstituteEmployeeName] = useState<string>('')
  const [isLoadingSubstitute, setIsLoadingSubstitute] = useState(false)
  const [absenceTypeName, setAbsenceTypeName] = useState<string>('Vacation')

  const graphqlClient = useGraphqlClient(accessToken)

  // Extract absence data from task parameters or inputs FIRST (before using in hooks)
  const taskInputs = task.sourceMetadata?.inputs || task.inputs
  const employeeAbsence = taskInputs?.employeeAbsence as any
  const creatorName = taskInputs?.creatorName as string | undefined
  const supervisorId = userInfo?.employeeDetails?.employeeId

  // Fetch employee details for avatar and display name
  const { entities, isLoading: isLoadingEntities } = useExpenseRelatedEntities({
    employeeId: employeeAbsence?.employeeId,
    costCenterId: undefined,
    projectId: undefined,
    accessToken
  })

  // Get module info for badge and icon
  const moduleInfo = getModuleInfo(task.name, task.type)
  const ModuleIcon = moduleInfo.icon

  // Use common Kogito process hook
  const { continueProcess } = useKogitoProcess({
    task,
    accessToken,
    onSuccess: () => {
      // Callbacks handled in handleApprove/handleReject
    },
    onError: () => {
      // Error handling done in handleApprove/handleReject
    }
  })

  // Determine if this is a business trip (A101) which doesn't need balance display
  const isBusinessTrip = employeeAbsence?.typeRef?.includes('A101')

  // Fetch absence type name from catalog
  useEffect(() => {
    const fetchAbsenceTypeName = async () => {
      if (!accessToken || !employeeAbsence?.typeRef) return

      try {
        const absenceTypeCode = employeeAbsence.typeRef.split(':').pop()

        const catalogQuery = `
          query GetAbsenceType($code: String!) {
            CatalogEntry(
              where: {
                catalog: {
                  identifier: {_eq: "AbsenceType"},
                  version: {_eq: "v1"}
                },
                code: {_eq: $code}
              },
              limit: 1
            ) {
              id
              value
              code
            }
          }
        `

        const result = await graphqlClient.request<{ CatalogEntry: any[] }>(catalogQuery, {
          code: absenceTypeCode
        })

        if (result.CatalogEntry && result.CatalogEntry.length > 0) {
          setAbsenceTypeName(result.CatalogEntry[0].value || 'Vacation')
        }
      } catch (error) {
        console.error('Error fetching absence type:', error)
      }
    }

    fetchAbsenceTypeName()
  }, [accessToken, employeeAbsence?.typeRef, graphqlClient])

  // Fetch substitute employee name
  useEffect(() => {
    const fetchSubstituteEmployee = async () => {
      if (!accessToken || !employeeAbsence?.substituteEmployee) return

      setIsLoadingSubstitute(true)
      try {
        const employeeQuery = `
          query GetEmployee($employeeId: uuid!) {
            Employee(where: {id: {_eq: $employeeId}}, limit: 1) {
              id
              firstName
              lastName
              displayName
            }
          }
        `

        const response = await graphqlClient.request<{ Employee: any[] }>(employeeQuery, {
          employeeId: employeeAbsence.substituteEmployee
        })

        if (response.Employee && response.Employee.length > 0) {
          const employee = response.Employee[0]
          setSubstituteEmployeeName(employee.displayName || `${employee.firstName} ${employee.lastName}`)
        }
      } catch (error) {
        console.error('Error fetching substitute employee:', error)
      } finally {
        setIsLoadingSubstitute(false)
      }
    }

    fetchSubstituteEmployee()
  }, [accessToken, employeeAbsence?.substituteEmployee, graphqlClient])

  const handleApprove = async () => {
    setIsApproving(true)
    try {
      // Determine the correct process name from the task endpoint
      // For business trips, the endpoint may contain 'approveEmployeeWorkLeave' instead of 'approveEmployeeVacation'
      let processName = 'approveEmployeeVacation' // Default

      if (task.sourceMetadata?.endpoint) {
        const endpoint = task.sourceMetadata.endpoint as string
        // Check if this is a business trip approval (contains 'approveEmployeeWorkLeave')
        if (endpoint.includes('approveEmployeeWorkLeave')) {
          processName = 'approveEmployeeWorkLeave'
        }
      }

      // Use the exact same payload structure as the platform
      await continueProcess({
        domain: 'employee-time',
        processName,
        payload: {
          approval: 'APPROVED', // String value (APPROVED/REJECTED)
          approvalNote: comment || '', // Comment/note
          event: 'pse_submit' // Standard submit event
        }
      })

      message.success({
        content: 'Absence request approved successfully',
        duration: 3
      })

      // Close and refresh after short delay
      setTimeout(() => {
        if (onTaskCompleted && task.id) {
          onTaskCompleted(task.id)
        }
        onTaskUpdated()
        onClose()
      }, 500)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve'
      message.error({
        content: `Failed to approve: ${errorMessage}`,
        duration: 5
      })
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (!comment.trim()) {
      message.warning({
        content: 'Please provide a reason for rejection',
        duration: 3
      })
      setShowComment(true)
      return
    }

    setIsRejecting(true)
    try {
      // Determine the correct process name from the task endpoint
      // For business trips, the endpoint may contain 'approveEmployeeWorkLeave' instead of 'approveEmployeeVacation'
      let processName = 'approveEmployeeVacation' // Default

      if (task.sourceMetadata?.endpoint) {
        const endpoint = task.sourceMetadata.endpoint as string
        // Check if this is a business trip approval (contains 'approveEmployeeWorkLeave')
        if (endpoint.includes('approveEmployeeWorkLeave')) {
          processName = 'approveEmployeeWorkLeave'
        }
      }

      // Use the exact same payload structure as the platform
      await continueProcess({
        domain: 'employee-time',
        processName,
        payload: {
          approval: 'REJECTED', // String value (APPROVED/REJECTED)
          approvalNote: comment, // Comment/note (required for rejection)
          event: 'pse_submit' // Standard submit event
        }
      })

      message.success({
        content: 'Absence request rejected successfully',
        duration: 3
      })

      // Close and refresh after short delay
      setTimeout(() => {
        if (onTaskCompleted && task.id) {
          onTaskCompleted(task.id)
        }
        onTaskUpdated()
        onClose()
      }, 500)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reject'
      message.error({
        content: `Failed to reject: ${errorMessage}`,
        duration: 5
      })
    } finally {
      setIsRejecting(false)
    }
  }

  return (
    <div className="gba:space-y-6" data-testid="absence-approval-details">
      {/* Module Badge */}
      <div className="gba:flex gba:items-center gba:gap-2">
        <ModuleIcon className={`gba:h-5 gba:w-5 ${moduleInfo.color}`} />
        <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">{moduleInfo.name}</span>
      </div>

      {/* Header Section */}
      <div className="gba:flex gba:justify-between gba:items-start">
        <div className="gba:flex-1">
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
            <PiCalendarDuotone className="gba:h-5 gba:w-5 gba:text-primary" />
            <h2 className="gba:text-xl gba:font-semibold gba:text-foreground" data-testid="absence-approval-title">
              {task.referenceTaskName || 'Approve Absence Request'}
            </h2>
          </div>
          <p className="gba:text-sm gba:text-muted-foreground gba:ml-7" data-testid="absence-type">
            {absenceTypeName}
          </p>
        </div>
        <Badge variant="warning" data-testid="absence-approval-status-badge">
          Pending Approval
        </Badge>
      </div>

      <Separator />

      {/* Employee Information */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <PiUser className="gba:h-5 gba:w-5" />
            Employee
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-3">
          {isLoadingEntities ? (
            <div className="gba:flex gba:items-start gba:gap-3">
              <div className="gba:h-10 gba:w-10 gba:rounded-full gba:bg-muted gba:animate-pulse" />
              <div className="gba:flex-1">
                <div className="gba:h-5 gba:w-32 gba:bg-muted gba:rounded gba:animate-pulse gba:mb-2" />
                <div className="gba:h-4 gba:w-24 gba:bg-muted gba:rounded gba:animate-pulse" />
              </div>
            </div>
          ) : (
            <div className="gba:flex gba:items-start gba:gap-3">
              <Avatar className="gba:h-10 gba:w-10">
                {entities.employee?.avatarUrl ? (
                  <AvatarImage src={entities.employee.avatarUrl} alt={entities.employee.displayName} />
                ) : null}
                <AvatarFallback className="gba:bg-gradient-to-br gba:from-blue-500 gba:to-purple-600 gba:text-white">
                  {entities.employee?.displayName
                    ? getInitials(entities.employee.displayName)
                    : getInitials(creatorName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="gba:font-medium">{entities.employee?.displayName || creatorName}</p>
                {(entities.employee?.position || entities.employee?.organizationalUnit) && (
                  <p className="gba:text-sm gba:text-muted-foreground">
                    {[entities.employee?.position, entities.employee?.organizationalUnit].filter(Boolean).join(' • ')}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Absence Request Information */}
      {employeeAbsence && typeof employeeAbsence === 'object' && (
        <>
          <div>
            <h4 className="gba:font-semibold gba:mb-4 gba:text-lg">Vacation Request Details</h4>
            <div className="gba:bg-muted gba:p-4 gba:rounded-lg gba:space-y-3">
              {/* Duration (Start - End Date) in one line */}
              {employeeAbsence.startDate && employeeAbsence.endDate && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                    Duration:
                  </span>
                  <span className="gba:text-sm gba:flex-1">
                    {dayjs(employeeAbsence.startDate).format('MMM D, YYYY')} →{' '}
                    {dayjs(employeeAbsence.endDate).format('MMM D, YYYY')}
                  </span>
                </div>
              )}
              {employeeAbsence.workingDays !== undefined && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                    Working Days:
                  </span>
                  <span className="gba:text-sm gba:flex-1">{employeeAbsence.workingDays} days</span>
                </div>
              )}
              {employeeAbsence.workingHours !== undefined && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                    Working Hours:
                  </span>
                  <span className="gba:text-sm gba:flex-1">{employeeAbsence.workingHours} hours</span>
                </div>
              )}
              {employeeAbsence.balance !== undefined && !isBusinessTrip && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                    Remaining Balance:
                  </span>
                  <span className="gba:text-sm gba:flex-1 gba:font-medium gba:text-success">
                    {employeeAbsence.balance} days
                  </span>
                </div>
              )}
              <div className="gba:flex gba:items-start gba:gap-3">
                <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                  Substitute:
                </span>
                <span className="gba:text-sm gba:flex-1 gba:text-muted-foreground">
                  {employeeAbsence.substituteEmployee ? (
                    isLoadingSubstitute ? (
                      <Spinner size="sm" />
                    ) : (
                      substituteEmployeeName || 'Loading...'
                    )
                  ) : (
                    'No substitute assigned'
                  )}
                </span>
              </div>
              <div className="gba:flex gba:items-start gba:gap-3">
                <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                  Description:
                </span>
                <span className="gba:text-sm gba:flex-1 gba:text-muted-foreground">
                  {employeeAbsence.description?.trim() || 'No description provided'}
                </span>
              </div>
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Team Absence Calendar - Show team coverage during this absence period */}
      {employeeAbsence?.startDate && employeeAbsence?.endDate && supervisorId && !isLoadingEntities && (
        <>
          <TeamAbsenceCalendar
            accessToken={accessToken}
            supervisorId={supervisorId}
            startDate={employeeAbsence.startDate}
            endDate={employeeAbsence.endDate}
            currentAbsence={{
              employeeId: employeeAbsence.employeeId || entities.employee?.id || '',
              employeeName: entities.employee?.displayName || creatorName || 'Unknown',
              department: entities.employee?.organizationalUnit || undefined,
              type: absenceTypeName,
              status: 'PENDING_APPROVAL'
            }}
          />
          <Separator />
        </>
      )}

      {/* Comment Section and Action Buttons (only for non-completed tasks) */}
      {task.status !== 'COMPLETED' && (
        <>
          {/* Comment Section */}
          <div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
              <MessageSquare className="gba:h-4 gba:w-4" />
              <Label htmlFor="approval-comment" className="gba:text-sm gba:font-medium">
                Add Comment (Required for rejection)
              </Label>
              <Switch
                id="approval-comment"
                checked={showComment}
                onCheckedChange={checked => {
                  setShowComment(checked)
                  if (!checked) {
                    setComment('')
                  }
                }}
              />
            </div>
            {showComment && (
              <Textarea
                rows={3}
                placeholder="Add your approval comment or rejection reason..."
                value={comment}
                onChange={e => setComment(e.target.value)}
                maxLength={500}
                className="gba:w-full"
                data-testid="absence-approval-comment-input"
              />
            )}
          </div>

          {/* Action Buttons */}
          <div
            className="gba:flex gba:gap-2 gba:flex-wrap gba:justify-end gba:pt-4 gba:border-t"
            style={{ borderColor: 'var(--color-border-default)' }}
          >
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isRejecting || isApproving}
              data-testid="absence-reject-button"
              className="gba:flex gba:items-center gba:gap-2"
            >
              <XCircle className="gba:h-4 gba:w-4" />
              {isRejecting ? 'Rejecting...' : 'Reject'}
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isApproving || isRejecting}
              data-testid="absence-approve-button"
              className="gba:flex gba:items-center gba:gap-2 gba:bg-success gba:text-success-foreground hover:gba:bg-success/90"
            >
              <ThumbsUp className="gba:h-4 gba:w-4" />
              {isApproving ? 'Approving...' : 'Approve'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
