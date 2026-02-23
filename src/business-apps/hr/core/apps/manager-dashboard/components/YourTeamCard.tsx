import React from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Badge,
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@newwork/nw-design-system'
import { ChevronRight } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { DirectReport } from '../hooks/useDirectReports'
import { TeamMemberAttendance } from '../hooks/useTeamAttendance'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'

export interface YourTeamCardProps {
  directReports: DirectReport[]
  teamAttendance: TeamMemberAttendance[]
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
      <div key={i} className="gba:h-12 gba:w-12 gba:bg-muted gba:rounded-full gba:animate-pulse" />
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

const getStatusBadgeClass = (report: DirectReport): string => {
  if (report.status === 'On Leave') return 'gba:ring-2 gba:ring-purple-500'
  return ''
}

export const YourTeamCard: React.FC<YourTeamCardProps> = ({
  directReports,
  teamAttendance,
  loadingDirectReports,
  loadingAvailability,
  onNavigateToTeammates,
  onNavigateToEmployee,
  accessToken,
  userOrgData
}) => {
  const displayedReports = directReports.slice(0, 8)
  const remainingCount = directReports.length - displayedReports.length

  return (
    <Card data-testid="your-team-card">
      <CardHeader className="gba:pb-3">
        <div className="gba:flex gba:items-start gba:justify-between">
          <div>
            <CardTitle className="gba:text-base gba:font-semibold gba:mb-1">
              {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.your_team', 'Your Team')}
              <Badge variant="secondary" size="sm" className="gba:ml-2">
                {directReports.length}/{directReports.length + 1}
              </Badge>
            </CardTitle>
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground">
              <span className="gba:flex gba:items-center gba:gap-1">
                <span className="gba:w-2 gba:h-2 gba:rounded-full gba:bg-success" />
                {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.rethes_work', 'Rethes work')}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="gba:space-y-4">
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
          <>
            {/* Main team member card - featured member */}
            <div className="gba:border gba:border-border gba:rounded-lg gba:p-3 gba:bg-muted/30">
              <div className="gba:flex gba:items-center gba:gap-3">
                <Avatar size="lg" className="gba:h-14 gba:w-14">
                  <AvatarImage
                    src={
                      displayedReports[0]?.pictureThumbnail && !displayedReports[0].pictureThumbnail.startsWith('{')
                        ? `data:image/jpeg;base64,${displayedReports[0].pictureThumbnail}`
                        : undefined
                    }
                    alt={`${displayedReports[0]?.firstName} ${displayedReports[0]?.lastName}`}
                  />
                  <AvatarFallback>
                    {displayedReports[0]?.firstName?.[0]}
                    {displayedReports[0]?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>

                <div className="gba:flex-1">
                  <div className="gba:font-medium gba:text-sm gba:text-foreground">
                    {displayedReports[0]?.firstName} {displayedReports[0]?.lastName}
                  </div>
                  <div className="gba:text-xs gba:text-muted-foreground">
                    {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.unallocated', 'Unallocated')}
                  </div>
                  <div className="gba:text-xs gba:text-foreground gba:mt-1">
                    €{Math.round(200)}/
                    {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.day', 'day')}
                  </div>
                </div>

                <div className="gba:flex gba:flex-col gba:gap-2">
                  <Button variant="default" size="sm" className="gba:text-xs">
                    {getTranslationFromI18nKeyAndLabel(
                      'master-data:hr.manager_dashboard.assign_project',
                      'Assign project'
                    )}
                    <ChevronRight size={14} className="gba:ml-1" />
                  </Button>
                  <Button variant="ghost" size="sm" className="gba:text-xs">
                    {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.set_goals', 'Set goals')}
                    <ChevronRight size={14} className="gba:ml-1" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Grid of team member avatars */}
            <div>
              <div className="gba:grid gba:grid-cols-4 gba:gap-3" data-testid="your-team-avatars-grid">
                {displayedReports.slice(1, 8).map(report => {
                  const isAvailable = report.status === 'Available'
                  const isRemote = teamAttendance.some(member => member.employeeId === report.id && member.isRemote)

                  return (
                    <div
                      key={report.id}
                      className="gba:flex gba:flex-col gba:items-center gba:gap-1"
                      data-testid={`your-team-member-${report.id}`}
                    >
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="gba:relative gba:p-0 gba:bg-transparent gba:border-0 gba:cursor-pointer gba:transition-transform gba:hover:scale-110"
                            title={getAvatarTitle(report, isAvailable)}
                          >
                            <Avatar size="default" className={`gba:h-12 gba:w-12 ${getStatusBadgeClass(report)}`}>
                              <AvatarImage
                                src={
                                  report.pictureThumbnail && !report.pictureThumbnail.startsWith('{')
                                    ? `data:image/jpeg;base64,${report.pictureThumbnail}`
                                    : undefined
                                }
                                alt={`${report.firstName} ${report.lastName}`}
                              />
                              <AvatarFallback>
                                {report.firstName?.[0]}
                                {report.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            {(isRemote || !isAvailable) && (
                              <span className="gba:absolute gba:bottom-0 gba:right-0 gba:w-3 gba:h-3 gba:bg-info gba:border-2 gba:border-card gba:rounded-full" />
                            )}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="gba:w-48">
                          <div className="gba:space-y-2">
                            <div className="gba:font-medium gba:text-sm">
                              {report.firstName} {report.lastName}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gba:w-full gba:justify-start"
                              onClick={() => onNavigateToEmployee(report.id)}
                            >
                              {getTranslationFromI18nKeyAndLabel(
                                'master-data:hr.manager_dashboard.view_profile',
                                'View profile'
                              )}
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>

                      <div className="gba:text-[10px] gba:text-center gba:text-muted-foreground gba:line-clamp-1 gba:w-full">
                        {report.firstName}
                      </div>
                    </div>
                  )
                })}

                {/* More button */}
                {remainingCount > 0 && (
                  <div className="gba:flex gba:flex-col gba:items-center gba:gap-1">
                    <button
                      type="button"
                      onClick={onNavigateToTeammates}
                      className="gba:relative gba:p-0 gba:bg-muted gba:border-0 gba:cursor-pointer gba:transition-transform gba:hover:scale-110 gba:rounded-full gba:w-12 gba:h-12 gba:flex gba:items-center gba:justify-center"
                      title={`+${remainingCount} more`}
                    >
                      <span className="gba:text-sm gba:font-medium gba:text-muted-foreground">+{remainingCount}</span>
                    </button>
                    <div className="gba:text-[10px] gba:text-center gba:text-muted-foreground">
                      {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.more', 'More...')}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="gba:flex gba:gap-2 gba:pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="gba:flex-1"
                onClick={onNavigateToTeammates}
                data-testid="your-team-view-all"
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.view_all', 'View All')}
              </Button>
              {accessToken && userOrgData && (
                <AppAction
                  mode="button"
                  buttonVariant="outline"
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
                  data-testid="your-team-submit-job-request"
                  className="gba:flex-1"
                >
                  {getTranslationFromI18nKeyAndLabel(
                    'master-data:hr.manager_dashboard.manage_openings',
                    'Manage openings'
                  )}
                  <ChevronRight size={14} className="gba:ml-1" />
                </AppAction>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
