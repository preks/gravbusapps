import React from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardAction,
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@newwork/nw-design-system'
import { CaretRightIcon as ChevronRight } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { DirectReport } from '../hooks/useDirectReports'
import { TeamMemberAttendance } from '../hooks/useTeamAttendance'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'

export interface MyTeamCardProps {
  directReports: DirectReport[]
  teamAttendance: TeamMemberAttendance[]
  onLeaveCount: number
  remoteCount: number
  loadingDirectReports: boolean
  loadingAvailability: boolean
  onNavigateToTeammates: () => void
  onNavigateToEmployee: (employeeId: string) => void
  accessToken: string
  userOrgData?: {
    organizationalUnitId?: string
    costCenterId?: string
    siteLocationId?: string
    companyId?: string
  }
}

const LoadingSkeleton: React.FC = () => (
  <div className="gba:flex gba:gap-2 gba:flex-wrap">
    {[1, 2, 3, 4, 5, 6].map(i => (
      <div key={i} className="gba:h-10 gba:w-10 gba:bg-muted gba:rounded-full gba:animate-pulse" />
    ))}
  </div>
)

const getAvatarTitle = (report: DirectReport, isAvailable: boolean): string => {
  const fullName = `${report.firstName} ${report.lastName}`
  if (isAvailable) return fullName
  const absenceType =
    report.currentAbsence?.type ||
    getTranslationFromI18nKeyAndLabel('master-data:manager_dashboard.on_leave', 'On Leave')
  return `${fullName} - ${absenceType}`
}

export const MyTeamCard: React.FC<MyTeamCardProps> = ({
  directReports,
  teamAttendance,
  onLeaveCount,
  remoteCount,
  loadingDirectReports,
  loadingAvailability,
  onNavigateToTeammates,
  onNavigateToEmployee,
  accessToken,
  userOrgData
}) => {
  return (
    <Card data-testid="manager-dashboard-my-team-card">
      <CardHeader className="gba:pb-2">
        <CardTitle className="gba:text-base gba:font-semibold">
          {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.my_team', 'My Team')} (
          {directReports.length - onLeaveCount}/{directReports.length})
        </CardTitle>
        <CardAction>
          <div className="gba:flex gba:items-center gba:gap-2">
            {accessToken && userOrgData && (
              <AppAction
                mode="button"
                buttonVariant="default"
                buttonSize="sm"
                contexts={[
                  {
                    context: FlowContextName.jobRequestSubmit,
                    contextData: {
                      organizationalUnitId: userOrgData.organizationalUnitId,
                      costCenterId: userOrgData.costCenterId,
                      siteLocationId: userOrgData.siteLocationId,
                      companyId: userOrgData.companyId
                    }
                  }
                ]}
                variant="create-primary"
                accessToken={accessToken}
                data-testid="manager-dashboard-my-team-submit-job-request"
              >
                Submit Job Request
              </AppAction>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="gba:text-muted-foreground gba:hover:text-foreground"
              onClick={onNavigateToTeammates}
              data-testid="manager-dashboard-my-team-view-all-button"
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.view_all', 'View All')}
              <ChevronRight size={16} className="gba:ml-1" />
            </Button>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="gba:pt-2">
        {(loadingDirectReports || loadingAvailability) && <LoadingSkeleton />}
        {!loadingDirectReports && !loadingAvailability && directReports.length === 0 && (
          <p className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'master-data:hr.manager_dashboard.status.no_direct_reports',
              'No direct reports found'
            )}
          </p>
        )}
        {!loadingDirectReports && !loadingAvailability && directReports.length > 0 && (
          <div className="gba:space-y-3">
            {/* Main Team Avatars */}
            <div className="gba:flex gba:flex-wrap gba:gap-2" data-testid="manager-dashboard-team-avatars">
              {directReports.map(report => {
                const isAvailable = report.status === 'Available'

                return (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => onNavigateToEmployee(report.id)}
                    className="gba:p-0 gba:bg-transparent gba:border-0 gba:cursor-pointer gba:transition-transform gba:hover:scale-110"
                    title={getAvatarTitle(report, isAvailable)}
                    data-testid={`manager-dashboard-team-avatar-${report.id}`}
                  >
                    <Avatar
                      size="default"
                      className={`gba:h-10 gba:w-10 ${isAvailable ? '' : 'gba:opacity-50 gba:ring-2 gba:ring-primary'}`}
                    >
                      <AvatarImage
                        src={
                          report.pictureThumbnail && !report.pictureThumbnail.startsWith('{')
                            ? `data:image/jpeg;base64,${report.pictureThumbnail}`
                            : undefined
                        }
                        alt={`${report.firstName} ${report.lastName}`}
                      />
                      <AvatarFallback>{`${report.firstName[0]}${report.lastName[0]}`.toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </button>
                )
              })}
            </div>

            {/* Working Remote Section */}
            {remoteCount > 0 && (
              <div className="gba:pt-2 gba:border-t gba:border-muted">
                <div className="gba:text-xs gba:text-muted-foreground gba:mb-2">
                  {getTranslationFromI18nKeyAndLabel(
                    'master-data:hr.manager_dashboard.working_remote',
                    'Working remote'
                  )}{' '}
                  ({remoteCount})
                </div>
                <div className="gba:flex gba:flex-wrap gba:gap-2">
                  {teamAttendance
                    .filter(member => member.isRemote)
                    .map(member => {
                      const report = directReports.find(r => r.id === member.employeeId)
                      if (!report) return null

                      return (
                        <button
                          key={member.employeeId}
                          type="button"
                          onClick={() => onNavigateToEmployee(member.employeeId)}
                          className="gba:p-0 gba:bg-transparent gba:border-0 gba:cursor-pointer gba:transition-transform gba:hover:scale-110"
                          title={`${member.firstName} ${member.lastName} - ${getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.working_remote', 'Working remote')}`}
                          data-testid={`manager-dashboard-remote-avatar-${member.employeeId}`}
                        >
                          <Avatar size="default" className="gba:h-10 gba:w-10 gba:ring-2 gba:ring-info">
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
                        </button>
                      )
                    })}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
