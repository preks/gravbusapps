/* eslint-disable newwork-local/no-hardcoded-colors */
import React from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  Progress
} from '@newwork/nw-design-system'
import {
  ExternalLink,
  Target,
  BookOpen,
  MessageSquare,
  Award,
  Heart,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TeamMemberPerformance } from '../../hooks/useTeamPerformance'
import { TeamMemberSkills } from '../../hooks/useTeamSkills'
import { TeamMemberFeedback } from '../../hooks/useTeamFeedbackOverview'
import { TeamMemberEvaluation } from '../../hooks/useTeamEvaluations'

interface MemberDeepDiveSheetProps {
  isOpen: boolean
  onClose: () => void
  employeeId: string | null
  goalsData: TeamMemberPerformance[]
  skillsData: TeamMemberSkills[]
  feedbackData: TeamMemberFeedback[]
  evaluationsData: TeamMemberEvaluation[]
  onNavigateToEmployee: (employeeId: string) => void
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'ON_TRACK':
    case 'ACHIEVED':
      return 'gba:bg-success/10 gba:text-success'
    case 'AT_RISK':
      return 'gba:bg-warning/10 gba:text-warning'
    case 'BEHIND_TARGET':
    case 'NOT_ACHIEVED':
      return 'gba:bg-destructive/10 gba:text-destructive'
    default:
      return 'gba:bg-muted gba:text-muted-foreground'
  }
}

const ChangeIndicator = ({ value, label }: { value: number | null; label: string }) => {
  if (value == null) return null
  const isPositive = value > 0
  const isNegative = value < 0
  return (
    <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs">
      <span className="gba:text-muted-foreground">{label}:</span>
      {isPositive && <ArrowUp size={10} className="gba:text-success" />}
      {isNegative && <ArrowDown size={10} className="gba:text-destructive" />}
      <span
        className={isPositive ? 'gba:text-success' : isNegative ? 'gba:text-destructive' : 'gba:text-muted-foreground'}
      >
        {value > 0 ? '+' : ''}
        {value.toFixed(1)}
      </span>
    </div>
  )
}

export const MemberDeepDiveSheet: React.FC<MemberDeepDiveSheetProps> = ({
  isOpen,
  onClose,
  employeeId,
  goalsData,
  skillsData,
  feedbackData,
  evaluationsData,
  onNavigateToEmployee
}) => {
  if (!employeeId) return null

  const memberGoals = goalsData.find(m => m.employeeId === employeeId)
  const memberSkills = skillsData.find(m => m.employeeId === employeeId)
  const memberFeedback = feedbackData.find(m => m.employeeId === employeeId)
  const memberEval = evaluationsData.find(m => m.employeeId === employeeId)

  const firstName = memberGoals?.firstName ?? memberSkills?.firstName ?? memberEval?.firstName ?? ''
  const lastName = memberGoals?.lastName ?? memberSkills?.lastName ?? memberEval?.lastName ?? ''
  const pictureThumbnail =
    memberGoals?.pictureThumbnail ?? memberSkills?.pictureThumbnail ?? memberEval?.pictureThumbnail
  const jobPositionName = memberGoals?.jobPositionName ?? memberSkills?.jobPositionName ?? memberEval?.jobPositionName

  const perspectiveData = memberEval
    ? (() => {
        const allDims = [...memberEval.companyValues, ...memberEval.skills]
        const selfScores = allDims.filter(d => d.selfScore != null).map(d => d.selfScore!)
        const peerScores = allDims.filter(d => d.peerAvgScore != null).map(d => d.peerAvgScore!)
        const mgrScores = allDims.filter(d => d.managerScore != null).map(d => d.managerScore!)
        const avg = (arr: number[]) =>
          arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null
        return { selfAvg: avg(selfScores), peerAvg: avg(peerScores), managerAvg: avg(mgrScores) }
      })()
    : null

  const perspectiveChartData = perspectiveData
    ? [
        { name: 'Self', score: perspectiveData.selfAvg ?? 0 },
        { name: 'Peer', score: perspectiveData.peerAvg ?? 0 },
        { name: 'Manager', score: perspectiveData.managerAvg ?? 0 }
      ]
    : []

  return (
    <Sheet
      open={isOpen}
      onOpenChange={open => {
        if (!open) onClose()
      }}
    >
      <SheetContent className="gba:w-full sm:gba:max-w-lg gba:flex gba:flex-col gba:p-0 gba:overflow-hidden">
        <SheetHeader className="gba:p-6 gba:pb-4 gba:border-b gba:shrink-0">
          <div className="gba:flex gba:items-center gba:gap-3">
            <Avatar className="gba:h-12 gba:w-12">
              <AvatarImage
                src={
                  pictureThumbnail && !pictureThumbnail.startsWith('{')
                    ? `data:image/jpeg;base64,${pictureThumbnail}`
                    : undefined
                }
                alt={`${firstName} ${lastName}`}
              />
              <AvatarFallback>
                {firstName?.[0]}
                {lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="gba:flex-1">
              <SheetTitle className="gba:text-base">
                {firstName} {lastName}
              </SheetTitle>
              <p className="gba:text-xs gba:text-muted-foreground">{jobPositionName || '-'}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateToEmployee(employeeId)}
              className="gba:gap-1 gba:shrink-0"
            >
              <ExternalLink size={12} />
              View Profile
            </Button>
          </div>
        </SheetHeader>

        <div className="gba:flex-1 gba:overflow-y-auto gba:p-6 gba:space-y-4">
          {/* Score Summary */}
          {memberEval && (
            <Card>
              <CardContent className="gba:p-4">
                <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
                  <Award size={16} className="gba:text-primary" />
                  <h4 className="gba:text-sm gba:font-semibold">Performance Summary</h4>
                  {memberEval.cycleName && (
                    <Badge variant="outline" className="gba:ml-auto gba:text-[10px]">
                      {memberEval.cycleName}
                    </Badge>
                  )}
                </div>
                <div className="gba:grid gba:grid-cols-3 gba:gap-3 gba:mb-3">
                  <div className="gba:text-center gba:p-2 gba:rounded gba:bg-surface">
                    <div className="gba:text-lg gba:font-bold">{memberEval.latestScore?.toFixed(1) ?? '-'}</div>
                    <div className="gba:text-[10px] gba:text-muted-foreground">Overall</div>
                  </div>
                  <div className="gba:text-center gba:p-2 gba:rounded gba:bg-surface">
                    <div className="gba:text-lg gba:font-bold">{memberEval.companyValuesAvg?.toFixed(1) ?? '-'}</div>
                    <div className="gba:text-[10px] gba:text-muted-foreground">Values</div>
                  </div>
                  <div className="gba:text-center gba:p-2 gba:rounded gba:bg-surface">
                    <div className="gba:text-lg gba:font-bold">{memberEval.skillsAvg?.toFixed(1) ?? '-'}</div>
                    <div className="gba:text-[10px] gba:text-muted-foreground">Skills</div>
                  </div>
                </div>
                <div className="gba:flex gba:flex-wrap gba:gap-3">
                  <ChangeIndicator value={memberEval.changeOverall} label="Overall" />
                  <ChangeIndicator value={memberEval.changeCompanyValues} label="Values" />
                  <ChangeIndicator value={memberEval.changeSkills} label="Skills" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Perspective Comparison */}
          {perspectiveData &&
            (perspectiveData.selfAvg != null ||
              perspectiveData.peerAvg != null ||
              perspectiveData.managerAvg != null) && (
              <Card>
                <CardContent className="gba:p-4">
                  <h4 className="gba:text-sm gba:font-semibold gba:mb-3">Perspective Comparison</h4>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={perspectiveChartData} layout="vertical">
                      <XAxis type="number" domain={[0, memberEval?.ratingScaleLimit ?? 5]} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="score" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

          {/* Company Values Breakdown */}
          {memberEval && memberEval.companyValues.length > 0 && (
            <Card>
              <CardContent className="gba:p-4">
                <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
                  <Heart size={16} className="gba:text-primary" />
                  <h4 className="gba:text-sm gba:font-semibold">Company Values</h4>
                </div>
                <div className="gba:space-y-2">
                  {memberEval.companyValues.map((v, i) => (
                    <div key={i} className="gba:p-2 gba:rounded gba:bg-surface">
                      <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
                        <span className="gba:text-xs gba:font-medium">{v.name}</span>
                        <span className="gba:text-xs gba:text-muted-foreground">{v.overallAvg?.toFixed(1) ?? '-'}</span>
                      </div>
                      <div className="gba:flex gba:gap-2 gba:text-[10px] gba:text-muted-foreground">
                        {v.selfScore != null && <span>Self: {v.selfScore.toFixed(1)}</span>}
                        {v.peerAvgScore != null && <span>Peer: {v.peerAvgScore.toFixed(1)}</span>}
                        {v.managerScore != null && <span>Mgr: {v.managerScore.toFixed(1)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cycle Trend */}
          {memberEval && memberEval.cycleScores.length > 1 && (
            <Card>
              <CardContent className="gba:p-4">
                <h4 className="gba:text-sm gba:font-semibold gba:mb-3">Score Across Cycles</h4>
                <div className="gba:space-y-1">
                  {memberEval.cycleScores.map((cs, i) => (
                    <div
                      key={i}
                      className="gba:flex gba:items-center gba:justify-between gba:text-xs gba:p-1.5 gba:rounded gba:bg-surface"
                    >
                      <span className="gba:text-muted-foreground">{cs.cycleName}</span>
                      <span className="gba:font-medium">{cs.overallScore?.toFixed(1) ?? '-'}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Goals Section */}
          <Card>
            <CardContent className="gba:p-4">
              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
                <Target size={16} className="gba:text-primary" />
                <h4 className="gba:text-sm gba:font-semibold">Goals</h4>
                {memberGoals && (
                  <Badge variant="outline" className="gba:ml-auto gba:text-[10px]">
                    {memberGoals.totalGoals} total
                  </Badge>
                )}
              </div>
              {memberGoals && memberGoals.goals.length > 0 ? (
                <div className="gba:space-y-2">
                  <div className="gba:flex gba:gap-2 gba:mb-2">
                    <Badge variant="secondary" className="gba:text-[10px]">
                      {memberGoals.goalsOnTrack} on track
                    </Badge>
                    {memberGoals.goalsAtRisk > 0 && (
                      <Badge variant="default" className="gba:text-[10px]">
                        {memberGoals.goalsAtRisk} at risk
                      </Badge>
                    )}
                    {memberGoals.goalsBehindTarget > 0 && (
                      <Badge variant="destructive" className="gba:text-[10px]">
                        {memberGoals.goalsBehindTarget} behind
                      </Badge>
                    )}
                  </div>
                  {memberGoals.goals.slice(0, 5).map(goal => (
                    <div key={goal.id} className="gba:p-2 gba:rounded gba:bg-surface">
                      <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
                        <span className="gba:text-xs gba:font-medium gba:flex-1 gba:mr-2 gba:truncate">
                          {goal.title}
                        </span>
                        <span
                          className={`gba:text-[10px] gba:px-1.5 gba:py-0.5 gba:rounded-full ${getStatusColor(goal.status)}`}
                        >
                          {goal.status.replace('_', ' ')}
                        </span>
                      </div>
                      <Progress value={goal.progressPercent} className="gba:h-1" />
                      <span className="gba:text-[10px] gba:text-muted-foreground">{goal.progressPercent}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="gba:text-xs gba:text-muted-foreground">No goals set</p>
              )}
            </CardContent>
          </Card>

          {/* Skills Section */}
          <Card>
            <CardContent className="gba:p-4">
              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
                <BookOpen size={16} className="gba:text-primary" />
                <h4 className="gba:text-sm gba:font-semibold">Skills</h4>
                {memberSkills && (
                  <Badge variant="outline" className="gba:ml-auto gba:text-[10px]">
                    {memberSkills.skillCount} skills · avg {memberSkills.avgLevel}
                  </Badge>
                )}
              </div>
              {memberSkills ? (
                <div className="gba:space-y-2">
                  {memberSkills.topSkills.length > 0 && (
                    <div>
                      <p className="gba:text-[10px] gba:text-muted-foreground gba:mb-1">Top Skills</p>
                      <div className="gba:flex gba:gap-1 gba:flex-wrap">
                        {memberSkills.topSkills.map((s, i) => (
                          <Badge key={i} variant="secondary" className="gba:text-[10px]">
                            {s.name} ({s.level})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {memberSkills.missingRequired.length > 0 && (
                    <div>
                      <p className="gba:text-[10px] gba:text-muted-foreground gba:mb-1">Missing Required</p>
                      <div className="gba:flex gba:gap-1 gba:flex-wrap">
                        {memberSkills.missingRequired.map((s, i) => (
                          <Badge key={i} variant="destructive" className="gba:text-[10px]">
                            {s.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {memberSkills.belowLevel.length > 0 && (
                    <div>
                      <p className="gba:text-[10px] gba:text-muted-foreground gba:mb-1">Below Required Level</p>
                      <div className="gba:space-y-1">
                        {memberSkills.belowLevel.map((s, i) => (
                          <div
                            key={i}
                            className="gba:flex gba:items-center gba:justify-between gba:text-xs gba:p-1.5 gba:rounded gba:bg-warning/5"
                          >
                            <span>{s.skillName}</span>
                            <span className="gba:text-muted-foreground">
                              Level {s.employeeLevel} / {s.profileLevel} required
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {memberEval && memberEval.changeSkills != null && (
                    <div className="gba:flex gba:items-center gba:gap-1 gba:mt-2">
                      {memberEval.changeSkills > 0.05 ? (
                        <TrendingUp size={12} className="gba:text-success" />
                      ) : memberEval.changeSkills < -0.05 ? (
                        <TrendingDown size={12} className="gba:text-destructive" />
                      ) : (
                        <Minus size={12} className="gba:text-muted-foreground" />
                      )}
                      <span className="gba:text-xs gba:text-muted-foreground">
                        Skill eval change: {memberEval.changeSkills > 0 ? '+' : ''}
                        {memberEval.changeSkills.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="gba:text-xs gba:text-muted-foreground">No skills data</p>
              )}
            </CardContent>
          </Card>

          {/* Feedback Section */}
          <Card>
            <CardContent className="gba:p-4">
              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
                <MessageSquare size={16} className="gba:text-primary" />
                <h4 className="gba:text-sm gba:font-semibold">Feedback</h4>
              </div>
              {memberFeedback ? (
                <div className="gba:grid gba:grid-cols-4 gba:gap-2">
                  <div className="gba:text-center gba:p-2 gba:rounded gba:bg-surface">
                    <div className="gba:text-lg gba:font-bold">{memberFeedback.feedbackReceivedCount}</div>
                    <div className="gba:text-[10px] gba:text-muted-foreground">Received</div>
                  </div>
                  <div className="gba:text-center gba:p-2 gba:rounded gba:bg-surface">
                    <div className="gba:text-lg gba:font-bold">{memberFeedback.feedbackGivenCount}</div>
                    <div className="gba:text-[10px] gba:text-muted-foreground">Given</div>
                  </div>
                  <div className="gba:text-center gba:p-2 gba:rounded gba:bg-surface">
                    <div className="gba:text-lg gba:font-bold">{memberFeedback.avgRating?.toFixed(1) ?? '-'}</div>
                    <div className="gba:text-[10px] gba:text-muted-foreground">Avg Rating</div>
                  </div>
                  <div className="gba:text-center gba:p-2 gba:rounded gba:bg-surface">
                    <div className="gba:text-xs gba:font-medium gba:mt-1">
                      {memberFeedback.lastFeedbackDate
                        ? new Date(memberFeedback.lastFeedbackDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })
                        : '-'}
                    </div>
                    <div className="gba:text-[10px] gba:text-muted-foreground">Last</div>
                  </div>
                </div>
              ) : (
                <p className="gba:text-xs gba:text-muted-foreground">No feedback data</p>
              )}
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  )
}
