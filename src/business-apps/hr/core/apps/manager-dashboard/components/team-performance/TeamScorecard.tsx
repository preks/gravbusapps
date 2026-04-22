import React from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'
import { Target, BookOpen, MessageSquare, Award, Activity } from 'lucide-react'

interface TeamScorecardProps {
  goalsProgress: number
  totalGoals: number
  skillsCoverage: number
  skillGapsCount: number
  employeesWithoutProfile: number
  feedbackCoverage: number
  totalFeedbackCount: number
  evaluationsAvgScore: number | null
  pendingEvaluations: number
  teamHealthScore?: number | null
  loading: boolean
  onDimensionClick?: (dimension: 'goals' | 'skills' | 'feedback' | 'evaluations') => void
}

const computeHealthScore = (
  goalsProgress: number,
  skillsCoverage: number,
  feedbackCoverage: number,
  evaluationsAvgScore: number | null
): number => {
  const goalsScore = goalsProgress
  const skillsScore = skillsCoverage
  const feedbackScore = feedbackCoverage
  const evalScore = evaluationsAvgScore === null ? null : Math.round((evaluationsAvgScore / 5) * 100)

  const scores = [goalsScore, skillsScore, feedbackScore, evalScore].filter((s): s is number => s != null)
  if (scores.length === 0) return 0
  return Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
}

const getScoreColor = (score: number): string => {
  if (score >= 80) return 'gba:text-success'
  if (score >= 60) return 'gba:text-info'
  if (score >= 40) return 'gba:text-warning'
  return 'gba:text-destructive'
}

const getProgressColor = (score: number): string => {
  if (score >= 80) return 'gba:bg-success'
  if (score >= 60) return 'gba:bg-info'
  if (score >= 40) return 'gba:bg-warning'
  return 'gba:bg-destructive'
}

const SCORECARD_SKELETON_IDS = [
  'scorecard-skeleton-1',
  'scorecard-skeleton-2',
  'scorecard-skeleton-3',
  'scorecard-skeleton-4'
]

const skillsDetailText = (employeesWithoutProfile: number, skillGapsCount: number): string => {
  if (employeesWithoutProfile > 0) return `${employeesWithoutProfile} no profile`
  if (skillGapsCount > 0) return `${skillGapsCount} gaps`
  return 'No gaps'
}

export const TeamScorecard: React.FC<TeamScorecardProps> = ({
  goalsProgress,
  totalGoals,
  skillsCoverage,
  skillGapsCount,
  employeesWithoutProfile,
  feedbackCoverage,
  totalFeedbackCount,
  evaluationsAvgScore,
  pendingEvaluations,
  teamHealthScore,
  loading,
  onDimensionClick
}) => {
  if (loading) {
    return (
      <Card className="gba:rounded-xl">
        <CardContent className="gba:p-6">
          <div className="gba:animate-pulse gba:space-y-4">
            <div className="gba:h-8 gba:bg-muted gba:rounded gba:w-48" />
            <div className="gba:grid gba:grid-cols-4 gba:gap-4">
              {SCORECARD_SKELETON_IDS.map(id => (
                <div key={id} className="gba:h-24 gba:bg-muted gba:rounded-lg" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const healthScore =
    teamHealthScore ?? computeHealthScore(goalsProgress, skillsCoverage, feedbackCoverage, evaluationsAvgScore)

  const evaluationsNormalized = evaluationsAvgScore === null ? 0 : Math.round((evaluationsAvgScore / 5) * 100)

  const dimensions = [
    {
      key: 'goals' as const,
      label: 'Goals',
      icon: Target,
      score: goalsProgress,
      detail: `${totalGoals} total`,
      color: getProgressColor(goalsProgress)
    },
    {
      key: 'skills' as const,
      label: 'Skills',
      icon: BookOpen,
      score: skillsCoverage,
      detail: skillsDetailText(employeesWithoutProfile, skillGapsCount),
      color: getProgressColor(skillsCoverage)
    },
    {
      key: 'feedback' as const,
      label: 'Feedback',
      icon: MessageSquare,
      score: feedbackCoverage,
      detail: totalFeedbackCount > 0 ? `${totalFeedbackCount} received` : 'No data',
      color: getProgressColor(feedbackCoverage)
    },
    {
      key: 'evaluations' as const,
      label: 'Evals',
      icon: Award,
      score: evaluationsNormalized,
      detail: pendingEvaluations > 0 ? `${pendingEvaluations} pending` : `avg ${evaluationsAvgScore ?? '-'}`,
      color: getProgressColor(evaluationsNormalized)
    }
  ]

  return (
    <Card className="gba:rounded-xl" data-testid="team-scorecard">
      <CardContent className="gba:p-6">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
          <div className="gba:flex gba:items-center gba:gap-3">
            <Activity size={20} className={getScoreColor(healthScore)} />
            <div>
              <h3 className="gba:text-lg gba:font-semibold">Team Health Score</h3>
              <p className="gba:text-xs gba:text-muted-foreground">Multi-dimensional overview</p>
            </div>
          </div>
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className={`gba:text-3xl gba:font-bold ${getScoreColor(healthScore)}`}>{healthScore}</span>
            <span className="gba:text-sm gba:text-muted-foreground">/100</span>
          </div>
        </div>

        <div className="gba:grid gba:grid-cols-2 md:gba:grid-cols-4 gba:gap-3">
          {dimensions.map(dim => (
            <button
              key={dim.key}
              type="button"
              onClick={() => onDimensionClick?.(dim.key)}
              className="gba:text-left gba:p-3 gba:rounded-lg gba:bg-surface gba:border gba:border-border hover:gba:border-primary/50 gba:transition-colors gba:cursor-pointer"
            >
              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                <dim.icon size={14} className="gba:text-muted-foreground" />
                <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">{dim.label}</span>
              </div>
              <div className="gba:mb-1.5">
                <span className="gba:text-lg gba:font-bold">{dim.score}%</span>
              </div>
              <div className="gba:h-1.5 gba:bg-muted gba:rounded-full gba:overflow-hidden gba:mb-1.5">
                <div
                  className={`gba:h-full gba:rounded-full gba:transition-all gba:duration-500 ${dim.color}`}
                  style={{ width: `${dim.score}%` }}
                />
              </div>
              <p className="gba:text-[10px] gba:text-muted-foreground">{dim.detail}</p>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
