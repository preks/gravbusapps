import React, { useState, useEffect } from 'react'
import { message } from 'antd'
import {
  Button,
  Separator,
  Label,
  Textarea,
  Switch,
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
import { ThumbsUp, XCircle, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react'
import { PiCalendarDuotone, PiUser } from 'react-icons/pi'
import { UnifiedTask } from '../../types'
import { useKogitoProcess } from '../../hooks/useKogitoProcess'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { useExpenseRelatedEntities } from '../../hooks/useExpenseRelatedEntities'
import { getModuleInfo } from '../../utils/moduleIcons'
import { getInitials } from '../../utils/avatarUtils'
import { TeamAbsenceCalendar } from '../TeamAbsenceCalendar'
import dayjs from 'dayjs'

interface ApproveSpecialLeaveDetailsProps {
  task: UnifiedTask
  taskDetails: any
  accessToken: string
  userInfo?: any
  onClose: () => void
  onTaskCompleted?: (taskId: string) => void
  onTaskUpdated: () => void
  employeeId?: string
}

export const ApproveSpecialLeaveDetails: React.FC<ApproveSpecialLeaveDetailsProps> = ({
  task,
  taskDetails,
  accessToken,
  userInfo,
  onClose,
  onTaskCompleted,
  onTaskUpdated
}) => {
  const [showComment, setShowComment] = useState(false)
  const [comment, setComment] = useState('')
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [absenceTypeName, setAbsenceTypeName] = useState<string>('Special Leave')
  const [substituteEmployeeName, setSubstituteEmployeeName] = useState<string>('')
  const [isLoadingSubstitute, setIsLoadingSubstitute] = useState(false)
  const [actualAbsenceStatus, setActualAbsenceStatus] = useState<string | null>(null)
  const [actualApprovalNote, setActualApprovalNote] = useState<string | null>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(false)

  const graphqlClient = useGraphqlClient(accessToken)

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

  // Extract absence data from task parameters or inputs
  const taskInputs = task.sourceMetadata?.inputs || task.inputs
  const employeeAbsence = (taskDetails?.parameters?.employeeAbsence || taskInputs?.employeeAbsence) as any
  const creatorName = taskInputs?.creatorName as string | undefined
  const supervisorId = userInfo?.employeeDetails?.employeeId

  // Debug logging
  console.log('🔍 ApproveSpecialLeaveDetails - employeeAbsence:', employeeAbsence)
  console.log('🔍 ApproveSpecialLeaveDetails - creatorName:', creatorName)
  console.log('🔍 ApproveSpecialLeaveDetails - task.referenceTaskName:', task.referenceTaskName)

  // Fetch employee details for avatar and display name
  const { entities, isLoading: isLoadingEntities } = useExpenseRelatedEntities({
    employeeId: employeeAbsence?.employeeId,
    costCenterId: undefined,
    projectId: undefined,
    accessToken
  })

  // Debug logging for fetched entities
  console.log('🔍 ApproveSpecialLeaveDetails - entities.employee:', entities.employee)

  // Get module info for badge and icon
  const moduleInfo = getModuleInfo(task.name, task.type)
  const ModuleIcon = moduleInfo.icon

  // For completed tasks, try to get approval note from task outputs/inputs
  const taskOutputApprovalNote = React.useMemo(() => {
    if (task.status !== 'COMPLETED') return null

    // Check outputs first
    if (task.sourceMetadata?.outputs?.approvalNote) {
      return task.sourceMetadata.outputs.approvalNote
    }

    // Check if stored in inputs (some processes store it there)
    if (taskInputs?.approvalNote) {
      return taskInputs.approvalNote
    }

    return null
  }, [task.status, task.sourceMetadata, taskInputs])

  // Fetch absence type name from catalog
  useEffect(() => {
    const fetchAbsenceType = async () => {
      if (!accessToken || !employeeAbsence?.typeRef) return

      try {
        // Extract code from format like "AbsenceType:v1:A023"
        const absenceTypeCode = employeeAbsence.typeRef.split(':').pop()

        console.log('Fetching absence type for code:', absenceTypeCode, 'Full typeRef:', employeeAbsence.typeRef)

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
              additionalValue1
              additionalValue2
              catalogId
              parentEntryId
            }
          }
        `

        const absenceTypeResponse = await graphqlClient.request<{ CatalogEntry: any[] }>(catalogQuery, {
          code: absenceTypeCode
        })

        console.log('Absence type response:', absenceTypeResponse)

        if (absenceTypeResponse.CatalogEntry && absenceTypeResponse.CatalogEntry.length > 0) {
          const catalogEntry = absenceTypeResponse.CatalogEntry[0]
          console.log('Found catalog entry:', catalogEntry)
          // The value field should contain the human-readable name like "Marriage", "Childbirth", etc.
          setAbsenceTypeName(catalogEntry.value || 'Special Leave')
        } else {
          console.warn('Absence type not found in catalog for code:', absenceTypeCode)
          setAbsenceTypeName('Special Leave')
        }
      } catch (error) {
        console.error('Error fetching absence type:', error)
        setAbsenceTypeName('Special Leave')
      }
    }

    fetchAbsenceType()
  }, [accessToken, employeeAbsence?.typeRef, graphqlClient])

  // Fetch real-time absence status for completed tasks
  useEffect(() => {
    const fetchAbsenceStatus = async () => {
      if (!accessToken || !employeeAbsence?.id || task.status !== 'COMPLETED') return

      setIsLoadingStatus(true)
      try {
        const absenceQuery = `
          query GetAbsenceStatus($absenceId: uuid!) {
            EmployeeAbsence(where: {id: {_eq: $absenceId}}, limit: 1) {
              id
              status
              approvalNote
              approverId
            }
            EmployeeAbsenceRecord(
              where: {employeeAbsenceId: {_eq: $absenceId}}
              orderBy: {changeDate: DESC}
              limit: 1
            ) {
              id
              description
              status
            }
          }
        `

        const response = await graphqlClient.request<{
          EmployeeAbsence: any[]
          EmployeeAbsenceRecord: any[]
        }>(absenceQuery, {
          absenceId: employeeAbsence.id
        })

        if (response.EmployeeAbsence && response.EmployeeAbsence.length > 0) {
          const absence = response.EmployeeAbsence[0]
          setActualAbsenceStatus(absence.status)

          // Priority order for approval note:
          // 1. Task outputs/inputs (most reliable for completed tasks)
          // 2. EmployeeAbsence.approvalNote
          // 3. EmployeeAbsenceRecord.description
          if (taskOutputApprovalNote) {
            setActualApprovalNote(taskOutputApprovalNote)
          } else if (absence.approvalNote) {
            setActualApprovalNote(absence.approvalNote)
          } else if (response.EmployeeAbsenceRecord && response.EmployeeAbsenceRecord.length > 0) {
            const record = response.EmployeeAbsenceRecord[0]
            setActualApprovalNote(record.description)
          } else {
            setActualApprovalNote(null)
          }
        } else {
          // Fallback to task data if fetch fails
          setActualAbsenceStatus(employeeAbsence.status)
          setActualApprovalNote(taskOutputApprovalNote || employeeAbsence.approvalNote)
        }
      } catch (error) {
        console.error('Error fetching absence status:', error)
        // Fallback to task data if fetch fails
        setActualAbsenceStatus(employeeAbsence.status)
        setActualApprovalNote(employeeAbsence.approvalNote)
      } finally {
        setIsLoadingStatus(false)
      }
    }

    fetchAbsenceStatus()
  }, [accessToken, employeeAbsence?.id, task.status, graphqlClient, taskOutputApprovalNote])

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
      await continueProcess({
        domain: 'employee-time',
        processName: 'approveEmployeeSpecialLeave',
        payload: {
          approval: 'APPROVED',
          approvalNote: comment || '',
          event: 'pse_submit'
        }
      })

      message.success({
        content: 'Special leave request approved successfully',
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
      await continueProcess({
        domain: 'employee-time',
        processName: 'approveEmployeeSpecialLeave',
        payload: {
          approval: 'REJECTED',
          approvalNote: comment,
          event: 'pse_submit'
        }
      })

      message.success({
        content: 'Special leave request rejected successfully',
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
    <div className="gba:space-y-6" data-testid="approve-special-leave-details">
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
            <h2 className="gba:text-xl gba:font-semibold gba:text-foreground" data-testid="approve-special-leave-title">
              {task.referenceTaskName || 'Approve Special Leave Request'}
            </h2>
          </div>
          <p className="gba:text-sm gba:text-muted-foreground gba:ml-7" data-testid="absence-type">
            {absenceTypeName}
          </p>
        </div>
        <Badge variant="warning" data-testid="approve-special-leave-status-badge">
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

      {/* Special Leave Request Information */}
      {employeeAbsence && typeof employeeAbsence === 'object' && (
        <>
          <div>
            <h4 className="gba:font-semibold gba:mb-4 gba:text-lg">Special Leave Request Details</h4>
            <div className="gba:bg-muted gba:p-4 gba:rounded-lg gba:space-y-3">
              <div className="gba:flex gba:items-start gba:gap-3">
                <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                  Leave Type:
                </span>
                <span className="gba:text-sm gba:flex-1 gba:font-medium">{absenceTypeName}</span>
              </div>
              {/* Duration (Start - End Date) in one line */}
              {employeeAbsence.startDate && employeeAbsence.endDate && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                    Duration:
                  </span>
                  <span className="gba:text-sm gba:flex-1 gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
                    <span>{dayjs(employeeAbsence.startDate).format('MMM D, YYYY')}</span>
                    {employeeAbsence.cutHalfDayStart && (
                      <Badge variant="info" className="gba:text-xs">
                        Half Day
                      </Badge>
                    )}
                    <span className="gba:text-muted-foreground">→</span>
                    <span>{dayjs(employeeAbsence.endDate).format('MMM D, YYYY')}</span>
                    {employeeAbsence.cutHalfDayEnd && (
                      <Badge variant="info" className="gba:text-xs">
                        Half Day
                      </Badge>
                    )}
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
              {employeeAbsence.balance !== undefined && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                    Remaining Balance:
                  </span>
                  <span className="gba:text-sm gba:flex-1 gba:font-medium gba:text-success">
                    {employeeAbsence.balance} hours
                  </span>
                </div>
              )}
              {employeeAbsence.substituteEmployee && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                    Substitute:
                  </span>
                  <span className="gba:text-sm gba:flex-1">
                    {isLoadingSubstitute ? <Spinner size="sm" /> : substituteEmployeeName || 'Loading...'}
                  </span>
                </div>
              )}
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

      {/* Approval Decision - Show for completed tasks */}
      {task.status === 'COMPLETED' && (
        <>
          {isLoadingStatus ? (
            <div className="gba:flex gba:justify-center gba:p-6">
              <Spinner size="lg" />
            </div>
          ) : (
            <>
              {/* Status Header with Badge */}
              <div
                className="gba:flex gba:items-center gba:gap-3 gba:p-4 gba:rounded-lg"
                style={{
                  backgroundColor:
                    actualAbsenceStatus === 'APPROVED'
                      ? 'var(--color-success-secondary)'
                      : 'var(--color-destructive-secondary)'
                }}
              >
                {actualAbsenceStatus === 'APPROVED' ? (
                  <CheckCircle className="gba:h-6 gba:w-6 gba:text-success" />
                ) : (
                  <AlertCircle className="gba:h-6 gba:w-6 gba:text-destructive" />
                )}
                <div className="gba:flex-1">
                  <h4 className="gba:font-semibold gba:text-lg">
                    Special Leave Request {actualAbsenceStatus === 'APPROVED' ? 'Approved' : 'Rejected'}
                  </h4>
                  {task.completedAt && (
                    <p className="gba:text-sm gba:text-muted-foreground">
                      Completed on{' '}
                      {new Date(task.completedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  )}
                </div>
                <Badge variant={actualAbsenceStatus === 'APPROVED' ? 'success' : 'destructive'}>
                  {actualAbsenceStatus || 'UNKNOWN'}
                </Badge>
              </div>

              {/* Manager's Decision Details */}
              <div>
                <h4 className="gba:font-semibold gba:mb-4 gba:text-lg">Manager Decision</h4>
                <div className="gba:bg-muted gba:p-4 gba:rounded-lg gba:space-y-3">
                  <div className="gba:flex gba:items-start gba:gap-3">
                    <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                      Decision:
                    </span>
                    <span
                      className={`gba:text-sm gba:flex-1 gba:font-medium ${
                        actualAbsenceStatus === 'APPROVED' ? 'gba:text-success' : 'gba:text-destructive'
                      }`}
                    >
                      {actualAbsenceStatus === 'APPROVED' ? '✓ Approved' : '✗ Rejected'}
                    </span>
                  </div>
                  {task.assignment?.ownerName && (
                    <div className="gba:flex gba:items-start gba:gap-3">
                      <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                        Decided by:
                      </span>
                      <span className="gba:text-sm gba:flex-1">{task.assignment.ownerName}</span>
                    </div>
                  )}
                  {actualApprovalNote && actualApprovalNote.trim() !== '' ? (
                    <div className="gba:flex gba:items-start gba:gap-3">
                      <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                        Manager's Note:
                      </span>
                      <span className="gba:text-sm gba:flex-1 gba:italic">{actualApprovalNote}</span>
                    </div>
                  ) : (
                    <div className="gba:flex gba:items-start gba:gap-3">
                      <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                        Manager's Note:
                      </span>
                      <span className="gba:text-sm gba:flex-1 gba:text-muted-foreground gba:italic">
                        No comment provided
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}
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
                data-testid="special-leave-approval-comment-input"
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
              data-testid="special-leave-reject-button"
              className="gba:flex gba:items-center gba:gap-2"
            >
              <XCircle className="gba:h-4 gba:w-4" />
              {isRejecting ? 'Rejecting...' : 'Reject'}
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isApproving || isRejecting}
              data-testid="special-leave-approve-button"
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
