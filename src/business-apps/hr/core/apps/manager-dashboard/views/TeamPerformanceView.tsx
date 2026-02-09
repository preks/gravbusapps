import React from 'react'
import dayjs from 'dayjs'
import { Button, Badge, Spinner, Card, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { ChevronLeft } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { TeamMemberPerformance } from '../hooks/useTeamPerformance'

export interface TeamPerformanceViewProps {
  teamPerformance: TeamMemberPerformance[]
  totalPerformanceGoals: number
  averageTeamProgress: number
  goalsOnTrack: number
  goalsAtRisk: number
  goalsBehindTarget: number
  loadingTeamPerformance: boolean
  filterGoalsBehindOnly?: boolean
  onNavigateBack: () => void
  onNavigateToEmployee: (employeeId: string) => void
}

const getProgressColorClass = (progress: number): string => {
  if (progress >= 70) return 'gba:bg-success'
  if (progress >= 40) return 'gba:bg-warning'
  return 'gba:bg-destructive'
}

export const TeamPerformanceView: React.FC<TeamPerformanceViewProps> = ({
  teamPerformance,
  totalPerformanceGoals,
  averageTeamProgress,
  goalsOnTrack,
  goalsAtRisk,
  goalsBehindTarget,
  loadingTeamPerformance,
  filterGoalsBehindOnly = false,
  onNavigateBack,
  onNavigateToEmployee
}) => {
  // Filter the team performance data if needed
  const filteredTeamPerformance = filterGoalsBehindOnly
    ? teamPerformance.filter(member => member.goalsBehindTarget > 0)
    : teamPerformance

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
            data-testid="manager-dashboard-team-performance-back-button"
          >
            <ChevronLeft size={16} className="gba:mr-1" />
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_backoffice.absence_details.back_to_dashboard',
              'Back to Dashboard'
            )}
          </Button>
          <h1 className="gba:text-xl gba:font-semibold">
            {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.team_performance', 'Team Performance')}
          </h1>
          {filterGoalsBehindOnly ? (
            <Badge variant="destructive" className="gba:ml-3">
              Behind Target Only
            </Badge>
          ) : (
            <Badge variant="info" className="gba:ml-3">
              {`${totalPerformanceGoals} ${getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.goals', 'goals')}`}
            </Badge>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="gba:grid gba:grid-cols-4 gba:gap-4 gba:mb-6">
        <Card className="gba:p-4">
          <div className="gba:text-2xl gba:font-bold gba:text-foreground">{averageTeamProgress}%</div>
          <div className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.avg_progress', 'Avg. Progress')}
          </div>
        </Card>
        <Card className="gba:p-4">
          <div className="gba:text-2xl gba:font-bold gba:text-success">{goalsOnTrack}</div>
          <div className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.on_track', 'On Track')}
          </div>
        </Card>
        <Card className="gba:p-4">
          <div className="gba:text-2xl gba:font-bold gba:text-warning">{goalsAtRisk}</div>
          <div className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.at_risk', 'At Risk')}
          </div>
        </Card>
        <Card className="gba:p-4">
          <div className="gba:text-2xl gba:font-bold gba:text-destructive">{goalsBehindTarget}</div>
          <div className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.behind_target', 'Behind Target')}
          </div>
        </Card>
      </div>

      {/* Loading State */}
      {loadingTeamPerformance && (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
          <Spinner size="lg" />
        </div>
      )}

      {/* Empty State */}
      {!loadingTeamPerformance && filteredTeamPerformance.length === 0 && (
        <div className="gba:text-center gba:py-12 gba:text-muted-foreground">
          {filterGoalsBehindOnly
            ? 'No team members have goals behind target'
            : getTranslationFromI18nKeyAndLabel(
                'master-data:hr.manager_dashboard.no_performance_data',
                'No performance data available for your team'
              )}
        </div>
      )}

      {/* Team Members Performance List */}
      {!loadingTeamPerformance && filteredTeamPerformance.length > 0 && (
        <div className="gba:flex-1 gba:overflow-auto">
          <div className="gba:space-y-4">
            {filteredTeamPerformance.map(member => {
              // If filtering by behind target, also filter the goals shown
              const displayedGoals = filterGoalsBehindOnly
                ? member.goals.filter(goal => goal.status === 'BEHIND_TARGET')
                : member.goals

              return (
                <Card key={member.employeeId} className="gba:p-4">
                  <div className="gba:flex gba:items-start gba:gap-4">
                    {/* Employee Info */}
                    <button
                      type="button"
                      onClick={() => onNavigateToEmployee(member.employeeId)}
                      className="gba:flex gba:items-center gba:gap-3 gba:p-0 gba:bg-transparent gba:border-0 gba:cursor-pointer hover:gba:opacity-80"
                    >
                      <Avatar className="gba:h-12 gba:w-12">
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
                      <div className="gba:text-left">
                        <div className="gba:font-medium">
                          {member.firstName} {member.lastName}
                        </div>
                        <div className="gba:text-sm gba:text-muted-foreground">{member.jobPositionName || '-'}</div>
                      </div>
                    </button>

                    {/* Progress Overview */}
                    <div className="gba:flex-1 gba:ml-4">
                      <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                        <span className="gba:text-sm gba:text-muted-foreground">
                          {member.totalGoals} {member.totalGoals === 1 ? 'goal' : 'goals'}
                        </span>
                        <span className="gba:text-sm gba:font-medium">{member.averageProgress}% avg.</span>
                      </div>
                      <div className="gba:h-2 gba:bg-muted gba:rounded-full gba:overflow-hidden">
                        <div
                          className={`gba:h-full gba:rounded-full gba:transition-all gba:duration-500 ${getProgressColorClass(member.averageProgress)}`}
                          style={{ width: `${member.averageProgress}%` }}
                        />
                      </div>
                      <div className="gba:flex gba:gap-3 gba:mt-2">
                        {member.goalsOnTrack > 0 && (
                          <Badge variant="success" className="gba:text-xs">
                            {member.goalsOnTrack} on track
                          </Badge>
                        )}
                        {member.goalsAtRisk > 0 && (
                          <Badge variant="warning" className="gba:text-xs">
                            {member.goalsAtRisk} at risk
                          </Badge>
                        )}
                        {member.goalsBehindTarget > 0 && (
                          <Badge variant="destructive" className="gba:text-xs">
                            {member.goalsBehindTarget} behind
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Goals Details (expandable) */}
                  {displayedGoals.length > 0 && (
                    <div className="gba:mt-4 gba:pt-4 gba:border-t gba:border-muted">
                      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-3">
                        {displayedGoals.map(goal => {
                          const statusColors: Record<string, string> = {
                            ON_TRACK: 'gba:bg-success-secondary gba:text-success',
                            ACHIEVED: 'gba:bg-info-secondary gba:text-info',
                            AT_RISK: 'gba:bg-warning-secondary gba:text-warning',
                            BEHIND_TARGET: 'gba:bg-destructive-secondary gba:text-destructive',
                            NOT_ACHIEVED: 'gba:bg-muted gba:text-muted-foreground'
                          }
                          const statusLabels: Record<string, string> = {
                            ON_TRACK: 'On Track',
                            ACHIEVED: 'Achieved',
                            AT_RISK: 'At Risk',
                            BEHIND_TARGET: 'Behind Target',
                            NOT_ACHIEVED: 'Not Achieved'
                          }

                          return (
                            <div key={goal.id} className="gba:p-3 gba:bg-muted/30 gba:rounded-lg">
                              <div className="gba:flex gba:items-start gba:justify-between gba:mb-2">
                                <span className="gba:text-sm gba:font-medium gba:flex-1 gba:mr-2">{goal.title}</span>
                                <span
                                  className={`gba:text-xs gba:px-2 gba:py-0.5 gba:rounded-full gba:whitespace-nowrap ${statusColors[goal.status] || 'gba:bg-muted gba:text-muted-foreground'}`}
                                >
                                  {statusLabels[goal.status] || goal.status}
                                </span>
                              </div>
                              <div className="gba:h-1.5 gba:bg-muted gba:rounded-full gba:overflow-hidden gba:mb-2">
                                <div
                                  className="gba:h-full gba:bg-primary gba:rounded-full"
                                  style={{ width: `${goal.progressPercent}%` }}
                                />
                              </div>
                              <div className="gba:flex gba:justify-between gba:text-xs gba:text-muted-foreground">
                                <span>{goal.progressPercent}%</span>
                                <span>Due: {dayjs(goal.dueDate).format('MMM D, YYYY')}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
