import React from 'react'
import {
  Button,
  Badge,
  Spinner,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@newwork/nw-design-system'
import { ChevronLeft } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { TeamMemberAttendance } from '../hooks/useTeamAttendance'

export interface NotClockedInViewProps {
  teamAttendance: TeamMemberAttendance[]
  availableEmployeeIds: string[]
  notClockedInCount: number
  loadingAttendance: boolean
  onNavigateBack: () => void
  onNavigateToEmployee: (employeeId: string) => void
}

export const NotClockedInView: React.FC<NotClockedInViewProps> = ({
  teamAttendance,
  availableEmployeeIds,
  notClockedInCount,
  loadingAttendance,
  onNavigateBack,
  onNavigateToEmployee
}) => {
  // Filter to only show available employees who are not clocked in
  const notClockedInMembers = teamAttendance.filter(
    member => !member.isClockedIn && availableEmployeeIds.includes(member.employeeId)
  )

  return (
    <div className="gba:p-6 gba:h-full gba:flex gba:flex-col">
      {/* Header section */}
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
        <div className="gba:flex gba:items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateBack}
            className="gba:mr-4"
            data-testid="manager-dashboard-not-clocked-in-back-button"
          >
            <ChevronLeft size={16} className="gba:mr-1" />
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_backoffice.absence_details.back_to_dashboard',
              'Back to Dashboard'
            )}
          </Button>
          <h1 className="gba:text-xl gba:font-semibold">
            {getTranslationFromI18nKeyAndLabel(
              'master-data:hr.manager_dashboard.not_clocked_in_title',
              'Team Members Not Clocked In'
            )}
          </h1>
          <Badge variant="warning" className="gba:ml-3">
            {`${notClockedInCount} ${getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.available_not_clocked_in', 'available but not clocked in')}`}
          </Badge>
        </div>
      </div>

      {/* Loading State */}
      {loadingAttendance && (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
          <Spinner size="lg" />
        </div>
      )}

      {/* Empty State */}
      {!loadingAttendance && notClockedInMembers.length === 0 && (
        <div className="gba:text-center gba:py-12 gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel(
            'master-data:hr.manager_dashboard.all_clocked_in',
            'All available team members have clocked in'
          )}
        </div>
      )}

      {/* Team Members Table */}
      {!loadingAttendance && notClockedInMembers.length > 0 && (
        <div className="gba:flex-1 gba:overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.team_member', 'Team Member')}
                </TableHead>
                <TableHead>
                  {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.position', 'Position')}
                </TableHead>
                <TableHead>{getTranslationFromI18nKeyAndLabel('master-data:forms.status.label', 'Status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notClockedInMembers.map(member => (
                <TableRow
                  key={member.employeeId}
                  className="gba:cursor-pointer hover:gba:bg-muted/50"
                  onClick={() => onNavigateToEmployee(member.employeeId)}
                >
                  <TableCell>
                    <div className="gba:flex gba:items-center gba:gap-3">
                      <Avatar className="gba:h-10 gba:w-10">
                        <AvatarImage
                          src={
                            member.pictureThumbnail && !member.pictureThumbnail.startsWith('{')
                              ? `data:image/jpeg;base64,${member.pictureThumbnail}`
                              : undefined
                          }
                          alt={`${member.firstName} ${member.lastName}`}
                        />
                        <AvatarFallback>
                          {member.firstName?.[0]}
                          {member.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="gba:font-medium">
                          {member.firstName} {member.lastName}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{member.jobPositionName || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="warning">
                      {getTranslationFromI18nKeyAndLabel(
                        'master-data:hr.manager_dashboard.not_clocked_in',
                        'Not Clocked In'
                      )}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
