import React, { useState } from 'react'
import { message } from 'antd'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Separator,
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@newwork/nw-design-system'
import { PiCalendarDuotone, PiClock, PiUser, PiCheckCircle } from 'react-icons/pi'
import { Check } from 'lucide-react'
import { UnifiedTask } from '../../types'
import { useKogitoProcess } from '../../hooks/useKogitoProcess'
import { useExpenseRelatedEntities } from '../../hooks/useExpenseRelatedEntities'
import { formatDate } from '@/common/utils/windowUtils'
import { getModuleInfo } from '../../utils/moduleIcons'
import { TeamAbsenceCalendar } from '../TeamAbsenceCalendar'

interface SickLeaveAcknowledgementDetailsProps {
  task: UnifiedTask
  taskDetails: any
  accessToken: string
  userInfo?: any
  onClose: () => void
  onTaskCompleted: (taskId: string) => void
  onTaskUpdated: () => void
}

export const SickLeaveAcknowledgementDetails: React.FC<SickLeaveAcknowledgementDetailsProps> = ({
  task,
  taskDetails,
  accessToken,
  userInfo,
  onClose,
  onTaskCompleted,
  onTaskUpdated
}) => {
  const [isAcknowledging, setIsAcknowledging] = useState(false)

  const { continueProcess } = useKogitoProcess({
    task,
    accessToken,
    onSuccess: () => {},
    onError: () => {}
  })

  const absence = taskDetails?.parameters?.employeeAbsence
  const supervisorId = userInfo?.employeeDetails?.employeeId

  // Fetch employee details for avatar and display name
  const { entities, isLoading: isLoadingEntities } = useExpenseRelatedEntities({
    employeeId: absence?.employeeId,
    costCenterId: undefined,
    projectId: undefined,
    accessToken
  })

  const getInitials = (name: string): string => {
    const parts = name.split(' ').filter(Boolean)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  if (!absence) {
    return (
      <div className="gba:p-6">
        <p className="gba:text-sm gba:text-muted-foreground">No sick leave data available</p>
      </div>
    )
  }

  const moduleInfo = getModuleInfo(task.name, task.type)
  const ModuleIcon = moduleInfo.icon
  const creatorName = task.sourceMetadata?.creatorName || 'Unknown'

  // Format absence type
  const absenceType = absence.typeRef?.split(':').pop() || 'Sick Leave'

  // Calculate duration display
  const durationParts = []
  if (absence.workingDays) {
    durationParts.push(`${absence.workingDays} working day${absence.workingDays !== 1 ? 's' : ''}`)
  }
  if (absence.workingHours) {
    durationParts.push(`${absence.workingHours} hour${absence.workingHours !== 1 ? 's' : ''}`)
  }
  const durationDisplay = durationParts.join(', ') || 'N/A'

  const handleAcknowledge = async () => {
    setIsAcknowledging(true)
    try {
      await continueProcess({
        domain: 'employee-time',
        processName: 'acknowledgeSickLeave',
        payload: {
          event: 'pse_submit'
        }
      })

      message.success({
        content: 'Sick leave acknowledged successfully',
        duration: 3
      })

      setTimeout(() => {
        if (onTaskCompleted && task.id) {
          onTaskCompleted(task.id)
        }
        onTaskUpdated()
        onClose()
      }, 500)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to acknowledge'
      message.error({
        content: `Failed to acknowledge: ${errorMessage}`,
        duration: 5
      })
    } finally {
      setIsAcknowledging(false)
    }
  }

  return (
    <div className="gba:space-y-6" data-testid="sick-leave-acknowledgement-details">
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
            <h2 className="gba:text-xl gba:font-semibold gba:text-foreground" data-testid="sick-leave-title">
              Acknowledge Sick Leave
            </h2>
          </div>
          <p className="gba:text-sm gba:text-muted-foreground gba:ml-7" data-testid="sick-leave-type">
            Type: {absenceType}
          </p>
        </div>
        <Badge variant="success" data-testid="sick-leave-status-badge">
          Approved
        </Badge>
      </div>

      {absence.description && (
        <>
          <div>
            <p className="gba:text-sm gba:text-muted-foreground gba:italic" data-testid="sick-leave-description">
              {absence.description}
            </p>
          </div>
          <Separator />
        </>
      )}

      {/* Employee Information */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <PiUser className="gba:h-5 gba:w-5" />
            Employee Information
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
                <p className="gba:text-sm gba:text-muted-foreground">Submitted by</p>
              </div>
            </div>
          )}

          {absence.substituteEmployee && (
            <>
              <Separator />
              <div>
                <p className="gba:text-xs gba:text-muted-foreground gba:mb-1">Substitute Employee</p>
                <p className="gba:text-sm gba:font-medium">{absence.substituteEmployee}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Absence Period Details */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
            <PiCalendarDuotone className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
            Absence Period
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
          <div>
            <p className="gba:text-sm gba:text-muted-foreground">Start Date</p>
            <p className="gba:text-lg gba:font-semibold">{formatDate(absence.startDate, 'date.short')}</p>
            {absence.cutHalfDayStart && (
              <Badge variant="info" className="gba:text-xs gba:mt-1">
                Half Day
              </Badge>
            )}
          </div>
          <div>
            <p className="gba:text-sm gba:text-muted-foreground">End Date</p>
            <p className="gba:text-lg gba:font-semibold">{formatDate(absence.endDate, 'date.short')}</p>
            {absence.cutHalfDayEnd && (
              <Badge variant="info" className="gba:text-xs gba:mt-1">
                Half Day
              </Badge>
            )}
          </div>
          <div>
            <p className="gba:text-sm gba:text-muted-foreground">Duration</p>
            <p className="gba:text-base gba:font-semibold">{durationDisplay}</p>
          </div>
          <div>
            <p className="gba:text-sm gba:text-muted-foreground">Calendar Days</p>
            <p className="gba:text-base gba:font-semibold">
              {absence.calendarDays || 0} day{absence.calendarDays !== 1 ? 's' : ''}
            </p>
          </div>
          {absence.balance !== null && absence.balance !== undefined && (
            <div>
              <p className="gba:text-sm gba:text-muted-foreground">Balance</p>
              <p className="gba:text-base gba:font-semibold">{absence.balance} hours</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Absence Calendar - Show team coverage during this sick leave period */}
      {absence?.startDate && absence?.endDate && supervisorId && (
        <>
          <TeamAbsenceCalendar
            accessToken={accessToken}
            supervisorId={supervisorId}
            startDate={absence.startDate}
            endDate={absence.endDate}
          />
          <Separator />
        </>
      )}

      {/* Acknowledgement Note */}
      <Card className="gba:bg-info-secondary gba:border-info">
        <CardContent className="gba:pt-6">
          <div className="gba:flex gba:items-start gba:gap-3">
            <PiCheckCircle className="gba:h-5 gba:w-5 gba:text-info gba:mt-0.5" />
            <div>
              <p className="gba:text-sm gba:font-medium gba:text-foreground">
                This sick leave has already been approved automatically.
              </p>
              <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
                Please review the information above and acknowledge to confirm you have been notified.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Button (only for non-completed tasks) */}
      {task.status !== 'COMPLETED' && (
        <div
          className="gba:flex gba:gap-2 gba:flex-wrap gba:justify-end gba:pt-4 gba:border-t"
          style={{ borderColor: 'var(--color-border-default)' }}
        >
          <Button
            variant="default"
            onClick={handleAcknowledge}
            disabled={isAcknowledging}
            data-testid="acknowledge-button"
            className="gba:min-w-[140px]"
          >
            {isAcknowledging ? (
              <PiClock className="gba:mr-2 gba:h-4 gba:w-4 gba:animate-spin" />
            ) : (
              <Check className="gba:mr-2 gba:h-4 gba:w-4" />
            )}
            Acknowledge
          </Button>
        </div>
      )}
    </div>
  )
}
