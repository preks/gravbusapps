import React from 'react'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Button
} from '@newwork/nw-design-system'
import { Mail, Phone, Building2, Briefcase, ExternalLink } from 'lucide-react'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { EmployeeRef } from '@/common/data/employee/types/employeeBaseTypes'

export interface EmployeeHoverCardProps {
  /** Employee data object */
  employee: EmployeeRef
  /** Children to trigger the hover (usually the employee name) */
  children: React.ReactNode
}

/**
 * Employee Hover Card Component
 *
 * Displays a rich profile card when hovering over an employee's name.
 * Automatically extracts and displays:
 * - Profile picture and name
 * - Job position and organizational unit (if available)
 * - Work email and phone (extracted from communication array)
 *
 * The component gracefully handles missing data - only available fields are shown.
 *
 * @example
 * ```tsx
 * <EmployeeHoverCard
 *   employee={comment.creatorEmployee}
 * >
 *   <span className="gba:cursor-pointer hover:gba:underline">
 *     {comment.creatorEmployee.displayName}
 *   </span>
 * </EmployeeHoverCard>
 * ```
 */
export const EmployeeHoverCard: React.FC<EmployeeHoverCardProps> = ({ employee, children }) => {
  // Extract data from employee object
  const employeeName = employee.displayName || employee.fullName || 'Unknown'
  const employeePicture = employee.pictureThumbnail
  const employeeJobPosition = employee.employeePosition?.jobPosition?.name
  const employeeOrganizationalUnit = employee.employeePosition?.organizationalUnit?.name

  // Extract email and phone from communication array
  // Filter by purpose: INTERNAL and channel.value: Email or Phone
  const emailCommunication = employee.communication?.find(
    comm => comm.purpose === 'INTERNAL' && comm.channel?.value === 'Email'
  )
  const phoneCommunication = employee.communication?.find(
    comm => comm.purpose === 'INTERNAL' && (comm.channel?.value === 'Phone' || comm.channel?.value === 'Mobile')
  )

  const employeeWorkEmail = emailCommunication?.value
  const employeeWorkPhone = phoneCommunication?.value

  const handleViewProfile = () => {
    const employeeUrl = buildPlatformUrl('/platform/employee-record', { employeeId: employee.id })
    navigateTo(employeeUrl)
  }

  const handleEmailClick = () => {
    if (employeeWorkEmail) {
      globalThis.window.location.href = `mailto:${employeeWorkEmail}`
    }
  }

  const handlePhoneClick = () => {
    if (employeeWorkPhone) {
      globalThis.window.location.href = `tel:${employeeWorkPhone}`
    }
  }

  const initials = employeeName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const hasContactInfo = employeeWorkEmail || employeeWorkPhone

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="gba:w-80 gba:p-4" align="start" sideOffset={5}>
        {/* Avatar and Name Section */}
        <div className="gba:flex gba:items-start gba:gap-3 gba:mb-4">
          <div className="gba:relative">
            <Avatar className="gba:w-12 gba:h-12 gba:ring-2 gba:ring-border">
              <AvatarImage
                src={employeePicture ? `data:image/jpeg;base64,${employeePicture}` : undefined}
                alt={employeeName}
              />
              <AvatarFallback className="gba:text-sm gba:font-semibold">{initials}</AvatarFallback>
            </Avatar>
            {/* Online status indicator */}
            <div className="gba:absolute gba:bottom-0 gba:right-0 gba:w-3 gba:h-3 gba:bg-success gba:rounded-full gba:ring-2 gba:ring-card" />
          </div>

          <div className="gba:flex-1 gba:min-w-0">
            <h3 className="gba:text-base gba:font-semibold gba:text-foreground gba:mb-0.5 gba:truncate">
              {employeeName}
            </h3>
            {employeeJobPosition && (
              <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-sm gba:text-muted-foreground gba:mb-0.5">
                <Briefcase className="gba:w-3.5 gba:h-3.5 gba:shrink-0" />
                <span className="gba:truncate">{employeeJobPosition}</span>
              </div>
            )}
            {employeeOrganizationalUnit && (
              <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-sm gba:text-muted-foreground">
                <Building2 className="gba:w-3.5 gba:h-3.5 gba:shrink-0" />
                <span className="gba:truncate">{employeeOrganizationalUnit}</span>
              </div>
            )}
          </div>
        </div>

        {/* Contact Information */}
        {hasContactInfo && (
          <div className="gba:space-y-1.5 gba:mb-4 gba:pb-4 gba:border-b gba:border-border">
            {employeeWorkEmail && (
              <button
                onClick={handleEmailClick}
                className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-foreground hover:gba:text-primary gba:transition-colors gba:w-full gba:px-2 gba:py-1.5 gba:rounded-md hover:gba:bg-muted/50 gba:cursor-pointer gba:bg-transparent gba:border-0 gba:text-left"
              >
                <Mail className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:shrink-0" />
                <span className="gba:truncate gba:text-xs">{employeeWorkEmail}</span>
              </button>
            )}
            {employeeWorkPhone && (
              <button
                onClick={handlePhoneClick}
                className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-foreground hover:gba:text-primary gba:transition-colors gba:w-full gba:px-2 gba:py-1.5 gba:rounded-md hover:gba:bg-muted/50 gba:cursor-pointer gba:bg-transparent gba:border-0 gba:text-left"
              >
                <Phone className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:shrink-0" />
                <span className="gba:text-xs">{employeeWorkPhone}</span>
              </button>
            )}
          </div>
        )}

        {/* View Profile Button */}
        <Button
          onClick={handleViewProfile}
          variant="outline"
          size="sm"
          className="gba:w-full gba:justify-center gba:gap-2"
        >
          View Profile
          <ExternalLink className="gba:w-3.5 gba:h-3.5" />
        </Button>
      </HoverCardContent>
    </HoverCard>
  )
}

export default EmployeeHoverCard
