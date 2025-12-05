import React from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'
import { useEmployeeDetails } from '../../queries/employeeQueries'
import { AvatarWithInitials } from '../shared/AvatarWithInitials'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { getOperationBadge } from './utils/displayUtils'

interface EmployeeDisplayProps {
  employeeId: string
  accessToken: string
  operation?: 'create' | 'update' | 'delete' | 'read'
}

/**
 * Employee Display - Only used for employee:// link chips in markdown
 * FlowBot returns entity data directly in chat responses
 */
export const EmployeeDisplay: React.FC<EmployeeDisplayProps> = ({ employeeId, accessToken, operation }) => {
  const { state } = useEmployeeDetails(employeeId, accessToken)

  if (state.state === 'loading') {
    return (
      <Card className="gba:w-full gba:animate-pulse">
        <CardContent className="gba:p-4">
          <div className="gba:h-16 gba:bg-muted gba:rounded" />
        </CardContent>
      </Card>
    )
  }

  if (state.state === 'error') {
    return (
      <Card className="gba:w-full">
        <CardContent className="gba:p-4">
          <p className="gba:text-destructive gba:text-sm">{state.message}</p>
        </CardContent>
      </Card>
    )
  }

  const employee = state.employee
  const manager = state.manager

  const handleClick = () => {
    if (employeeId) {
      const url = buildPlatformUrl('/platform/employee-record', {
        employeeId: employeeId
      })
      navigateTo(url)
    }
  }

  return (
    <Card
      className="gba:w-full gba:rounded-2xl gba:border gba:border-border gba:shadow-lg gba:overflow-hidden gba:cursor-pointer hover:gba:border-primary/50 gba:transition-all"
      data-testid="employee-display"
      onClick={handleClick}
    >
      <CardContent className="gba:p-6">
        {operation &&
          (() => {
            const operationBadge = getOperationBadge(operation)
            return operationBadge ? (
              <div className="gba:flex gba:justify-between gba:items-start gba:mb-4">
                <span className="gba:text-lg gba:font-semibold">Employee</span>
                <span
                  className={`gba:text-sm gba:font-medium gba:px-2.5 gba:py-0.5 gba:rounded-xl ${
                    operationBadge.variant === 'success'
                      ? 'gba:bg-success-secondary gba:text-success'
                      : operationBadge.variant === 'destructive'
                        ? 'gba:bg-destructive-secondary gba:text-destructive'
                        : 'gba:bg-info-secondary gba:text-info'
                  }`}
                >
                  {operationBadge.text}
                </span>
              </div>
            ) : null
          })()}

        <div className="gba:flex gba:items-center gba:gap-4 gba:mb-4">
          <AvatarWithInitials
            firstName={employee.firstName}
            lastName={employee.lastName}
            pictureThumbnail={employee.pictureThumbnail}
            size={48}
          />
          <div>
            <div className="gba:font-bold gba:text-sm" data-testid="employee-name">
              {employee.firstName} {employee.lastName}
            </div>
            {employee.jobPositionName && (
              <div className="gba:text-xs gba:text-muted-foreground" data-testid="employee-position">
                {employee.jobPositionName}
              </div>
            )}
          </div>
        </div>

        {manager && (
          <div className="gba:mt-4 gba:pt-4 gba:border-t gba:border-border">
            <p className="gba:text-xs gba:font-bold gba:mb-2">Manager:</p>
            <div className="gba:flex gba:items-center gba:gap-3">
              <AvatarWithInitials
                firstName={manager.firstName}
                lastName={manager.lastName}
                pictureThumbnail={manager.pictureThumbnail}
                size={36}
              />
              <div>
                <div className="gba:text-xs" data-testid="manager-name">
                  {manager.firstName} {manager.lastName}
                </div>
                {manager.jobPositionName && (
                  <div className="gba:text-xs gba:text-muted-foreground" data-testid="manager-position">
                    {manager.jobPositionName}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default EmployeeDisplay
