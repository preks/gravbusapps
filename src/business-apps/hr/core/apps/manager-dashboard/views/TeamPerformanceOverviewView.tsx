import React, { useState, useMemo } from 'react'
import { Button, Badge, Spinner } from '@newwork/nw-design-system'
import { ChevronLeft } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { TeamScorecard } from '../components/team-performance/TeamScorecard'
import { TeamInsightsPanel } from '../components/team-performance/TeamInsightsPanel'
import { EnhancedMemberCard } from '../components/team-performance/EnhancedMemberCard'
import { MemberDeepDiveSheet } from '../components/team-performance/MemberDeepDiveSheet'
import { TeamMemberPerformance } from '../hooks/useTeamPerformance'
import { TeamMemberSkills } from '../hooks/useTeamSkills'
import { TeamMemberFeedback } from '../hooks/useTeamFeedbackOverview'
import { TeamMemberEvaluation } from '../hooks/useTeamEvaluations'
import { TeamPerformanceInsightsResult } from '../hooks/useTeamPerformanceInsights'

export interface TeamPerformanceOverviewViewProps {
  // Goals data (from existing performanceGrowth)
  teamPerformance: TeamMemberPerformance[]
  averageTeamProgress: number
  totalGoals: number
  goalsOnTrack: number
  goalsAtRisk: number
  goalsBehindTarget: number
  loadingGoals: boolean
  // Skills data
  skillsMembers: TeamMemberSkills[]
  teamSkillCoverage: number
  topSkillGaps: Array<{ skillName: string; employeeName: string }>
  topTeamStrengths: string[]
  loadingSkills: boolean
  // Feedback data
  feedbackMembers: TeamMemberFeedback[]
  teamAvgRating: number | null
  totalFeedbackCount: number
  membersWithNoRecentFeedback: string[]
  loadingFeedback: boolean
  // Evaluations data
  evaluationsMembers: TeamMemberEvaluation[]
  teamAvgScore: number | null
  pendingEvaluations: number
  completedEvaluations: number
  loadingEvaluations: boolean
  // AI Insights
  insights: TeamPerformanceInsightsResult
  // Navigation
  onNavigateBack: () => void
  onNavigateToEmployee: (employeeId: string) => void
}

export const TeamPerformanceOverviewView: React.FC<TeamPerformanceOverviewViewProps> = ({
  teamPerformance,
  averageTeamProgress,
  totalGoals,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  goalsOnTrack,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  goalsAtRisk,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  goalsBehindTarget,
  loadingGoals,
  skillsMembers,
  teamSkillCoverage,
  topSkillGaps,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  topTeamStrengths,
  loadingSkills,
  feedbackMembers,
  teamAvgRating,
  totalFeedbackCount,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  membersWithNoRecentFeedback,
  loadingFeedback,
  evaluationsMembers,
  teamAvgScore,
  pendingEvaluations,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  completedEvaluations,
  loadingEvaluations,
  insights,
  onNavigateBack,
  onNavigateToEmployee
}) => {
  const [deepDiveEmployeeId, setDeepDiveEmployeeId] = useState<string | null>(null)
  const isAnyLoading = loadingGoals || loadingSkills || loadingFeedback || loadingEvaluations

  const allEmployeeIds = useMemo(() => {
    const ids = new Set<string>()
    teamPerformance.forEach(m => ids.add(m.employeeId))
    skillsMembers.forEach(m => ids.add(m.employeeId))
    feedbackMembers.forEach(m => ids.add(m.employeeId))
    evaluationsMembers.forEach(m => ids.add(m.employeeId))
    return [...ids]
  }, [teamPerformance, skillsMembers, feedbackMembers, evaluationsMembers])

  const memberDimensionsMap = useMemo(() => {
    const map = new Map<
      string,
      {
        firstName: string
        lastName: string
        pictureThumbnail?: string
        jobPositionName?: string
        goalsProgress: number
        totalGoals: number
        skillsCoverage: number
        feedbackAvgRating: number | null
        feedbackCount: number
        evaluationScore: number | null
      }
    >()

    for (const empId of allEmployeeIds) {
      const goals = teamPerformance.find(m => m.employeeId === empId)
      const skills = skillsMembers.find(m => m.employeeId === empId)
      const feedback = feedbackMembers.find(m => m.employeeId === empId)
      const evaluation = evaluationsMembers.find(m => m.employeeId === empId)

      const firstName = goals?.firstName ?? skills?.firstName ?? evaluation?.firstName ?? ''
      const lastName = goals?.lastName ?? skills?.lastName ?? evaluation?.lastName ?? ''

      // Compute per-member skill coverage
      let skillCoverage = 100
      if (skills) {
        const totalRequired =
          skills.missingRequired.length + skills.belowLevel.length + (skills.skillCount - skills.missingRequired.length)
        const covered = totalRequired > 0 ? totalRequired - skills.missingRequired.length : 0
        skillCoverage = totalRequired > 0 ? Math.round((covered / totalRequired) * 100) : 100
      }

      map.set(empId, {
        firstName,
        lastName,
        pictureThumbnail: goals?.pictureThumbnail ?? skills?.pictureThumbnail ?? evaluation?.pictureThumbnail,
        jobPositionName: goals?.jobPositionName ?? skills?.jobPositionName ?? evaluation?.jobPositionName,
        goalsProgress: goals?.averageProgress ?? 0,
        totalGoals: goals?.totalGoals ?? 0,
        skillsCoverage: skillCoverage,
        feedbackAvgRating: feedback?.avgRating ?? null,
        feedbackCount: feedback?.feedbackCount ?? 0,
        evaluationScore: evaluation?.latestScore ?? null
      })
    }

    return map
  }, [allEmployeeIds, teamPerformance, skillsMembers, feedbackMembers, evaluationsMembers])

  return (
    <div className="gba:p-6 gba:h-full gba:flex gba:flex-col gba:overflow-hidden">
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-6 gba:shrink-0">
        <div className="gba:flex gba:items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateBack}
            className="gba:mr-4"
            data-testid="team-performance-overview-back-button"
          >
            <ChevronLeft size={16} className="gba:mr-1" />
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_backoffice.absence_details.back_to_dashboard',
              'Back to Dashboard'
            )}
          </Button>
          <h1 className="gba:text-xl gba:font-semibold">Team Performance Overview</h1>
          <Badge variant="info" className="gba:ml-3">
            {allEmployeeIds.length} members
          </Badge>
        </div>
      </div>

      {/* Loading State */}
      {isAnyLoading && allEmployeeIds.length === 0 && (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
          <Spinner size="lg" />
        </div>
      )}

      {/* Content */}
      {allEmployeeIds.length > 0 && (
        <div className="gba:flex-1 gba:overflow-y-auto gba:space-y-6">
          {/* Scorecard */}
          <TeamScorecard
            goalsProgress={averageTeamProgress}
            totalGoals={totalGoals}
            skillsCoverage={teamSkillCoverage}
            skillGapsCount={topSkillGaps.length}
            feedbackAvgRating={teamAvgRating}
            totalFeedbackCount={totalFeedbackCount}
            evaluationsAvgScore={teamAvgScore}
            pendingEvaluations={pendingEvaluations}
            teamHealthScore={insights.data?.team_health_score ?? null}
            loading={isAnyLoading}
          />

          {/* AI Insights */}
          <TeamInsightsPanel
            data={insights.data}
            isAnalyzing={insights.isAnalyzing}
            error={insights.error}
            onAnalyze={insights.analyze}
            onClear={insights.clear}
          />

          {/* Member Cards */}
          <div>
            <h3 className="gba:text-sm gba:font-semibold gba:mb-3">Team Members</h3>
            <div className="gba:space-y-2">
              {allEmployeeIds.map(empId => {
                const dims = memberDimensionsMap.get(empId)
                if (!dims) return null
                return (
                  <EnhancedMemberCard
                    key={empId}
                    employeeId={empId}
                    firstName={dims.firstName}
                    lastName={dims.lastName}
                    pictureThumbnail={dims.pictureThumbnail}
                    jobPositionName={dims.jobPositionName}
                    dimensions={{
                      goalsProgress: dims.goalsProgress,
                      totalGoals: dims.totalGoals,
                      skillsCoverage: dims.skillsCoverage,
                      feedbackAvgRating: dims.feedbackAvgRating,
                      feedbackCount: dims.feedbackCount,
                      evaluationScore: dims.evaluationScore
                    }}
                    onViewDetails={setDeepDiveEmployeeId}
                    onNavigateToEmployee={onNavigateToEmployee}
                  />
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Deep Dive Sheet */}
      <MemberDeepDiveSheet
        isOpen={deepDiveEmployeeId != null}
        onClose={() => setDeepDiveEmployeeId(null)}
        employeeId={deepDiveEmployeeId}
        goalsData={teamPerformance}
        skillsData={skillsMembers}
        feedbackData={feedbackMembers}
        evaluationsData={evaluationsMembers}
        onNavigateToEmployee={onNavigateToEmployee}
      />
    </div>
  )
}
