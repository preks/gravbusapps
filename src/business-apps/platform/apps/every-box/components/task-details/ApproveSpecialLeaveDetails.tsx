import React, { useState, useEffect } from 'react'
import { message } from 'antd'
import { Button, Separator, Label, Textarea, Switch, Spinner } from '@newwork/nw-design-system'
import { ThumbsUp, XCircle, MessageSquare, User } from 'lucide-react'
import { UnifiedTask } from '../../types'
import { useKogitoProcess } from '../../hooks/useKogitoProcess'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { TeamAbsenceCalendar } from '../TeamAbsenceCalendar'

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
      {/* Requester Information */}
      {creatorName && (
        <div className="gba:flex gba:items-center gba:gap-2">
          <User className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
          <span className="gba:text-sm gba:text-muted-foreground">Requested by:</span>
          <span className="gba:text-sm gba:font-medium">{creatorName}</span>
        </div>
      )}

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
              {employeeAbsence.startDate && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                    Start Date:
                  </span>
                  <span className="gba:text-sm gba:flex-1">
                    {new Date(employeeAbsence.startDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                    {employeeAbsence.cutHalfDayStart && ' (Half Day)'}
                  </span>
                </div>
              )}
              {employeeAbsence.endDate && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                    End Date:
                  </span>
                  <span className="gba:text-sm gba:flex-1">
                    {new Date(employeeAbsence.endDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                    {employeeAbsence.cutHalfDayEnd && ' (Half Day)'}
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
              {employeeAbsence.effectiveDays !== undefined && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                    Effective Days:
                  </span>
                  <span className="gba:text-sm gba:flex-1">{employeeAbsence.effectiveDays} days</span>
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
      {employeeAbsence?.startDate && employeeAbsence?.endDate && supervisorId && (
        <>
          <TeamAbsenceCalendar
            accessToken={accessToken}
            supervisorId={supervisorId}
            startDate={employeeAbsence.startDate}
            endDate={employeeAbsence.endDate}
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
