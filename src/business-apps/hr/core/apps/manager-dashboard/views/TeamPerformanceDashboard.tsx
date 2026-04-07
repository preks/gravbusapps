import { useState } from 'react'
import { Button } from '@newwork/nw-design-system'
import { ChevronLeft, LayoutDashboard, Sparkles } from 'lucide-react'
import { TeamMemberPerformance } from '../hooks/useTeamPerformance'
import { TeamMemberSkills } from '../hooks/useTeamSkills'
import { TeamMemberFeedback } from '../hooks/useTeamFeedbackOverview'
import { TeamMemberEvaluation } from '../hooks/useTeamEvaluations'
import { TeamPerformanceInsightsResult } from '../hooks/useTeamPerformanceInsights'
import type { ScoreDistributionBand, TrendDataPoint } from '../utils/dashboardComputations'
import {
  ExecutiveSummary,
  PerformanceTrends,
  SkillsAnalysis,
  CompanyValuesAnalysis,
  AlignmentComparison,
  TeamMemberTable,
  DashboardFilters,
  MemberDeepDiveSheet,
  TeamInsightsPanel
} from '../components/team-performance'

export interface TeamPerformanceDashboardProps {
  teamPerformance: TeamMemberPerformance[]
  averageGoalProgress: number
  loadingGoals: boolean

  skillsMembers: TeamMemberSkills[]
  loadingSkills: boolean

  feedbackMembers: TeamMemberFeedback[]
  loadingFeedback: boolean

  evaluationMembers: TeamMemberEvaluation[]
  teamAvgScore: number | null
  teamCompanyValuesAvg: number | null
  teamSkillsAvg: number | null
  loadingEvaluations: boolean

  availableCycles: Array<{ id: string; name: string; apiStatus?: string }>
  selectedCycleId: string | null
  onCycleChange: (cycleId: string) => void

  scoreDistribution: ScoreDistributionBand[]
  trendSeries: TrendDataPoint[]

  ratingScaleLimit: number
  skillGrowthRate: number
  needsAttentionCount: number
  changeOverall: number | null
  changeCompanyValues: number | null
  changeSkills: number | null

  insights: TeamPerformanceInsightsResult

  accessToken: string

  onNavigateBack: () => void
  onNavigateToEmployee: (employeeId: string) => void
}

export const TeamPerformanceDashboard = (props: TeamPerformanceDashboardProps) => {
  const {
    teamPerformance,
    averageGoalProgress,
    loadingGoals,
    skillsMembers,
    loadingSkills,
    feedbackMembers,
    loadingFeedback,
    evaluationMembers,
    teamAvgScore,
    teamCompanyValuesAvg,
    teamSkillsAvg,
    loadingEvaluations,
    availableCycles,
    selectedCycleId,
    onCycleChange,
    scoreDistribution,
    trendSeries,
    ratingScaleLimit,
    skillGrowthRate,
    needsAttentionCount,
    changeOverall,
    changeCompanyValues,
    changeSkills,
    insights,
    accessToken,
    onNavigateBack,
    onNavigateToEmployee
  } = props

  const [deepDiveEmployeeId, setDeepDiveEmployeeId] = useState<string | null>(null)
  const [showInsights, setShowInsights] = useState(false)

  const isLoading = loadingGoals || loadingSkills || loadingFeedback || loadingEvaluations

  const handleEmployeeClick = (employeeId: string) => {
    setDeepDiveEmployeeId(employeeId)
  }

  return (
    <div className="gba:space-y-6 gba:px-6">
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between">
        <div className="gba:flex gba:items-center gba:gap-3">
          <Button variant="ghost" size="icon" onClick={onNavigateBack}>
            <ChevronLeft className="gba:h-5 gba:w-5" />
          </Button>
          <LayoutDashboard className="gba:h-5 gba:w-5 gba:text-muted-foreground" />
          <h2 className="gba:text-xl gba:font-semibold">Performance Trends</h2>
        </div>
        <div className="gba:flex gba:items-center gba:gap-3">
          <Button
            variant={showInsights ? 'default' : 'outline'}
            size="sm"
            className="gba:gap-1.5"
            onClick={() => {
              setShowInsights(prev => !prev)
              if (!showInsights && !insights.data && !insights.isAnalyzing) {
                void insights.analyze()
              }
            }}
          >
            <Sparkles className="gba:h-4 gba:w-4" />
            Team Performance Summary
          </Button>
          <DashboardFilters
            availableCycles={availableCycles}
            selectedCycleId={selectedCycleId}
            onCycleChange={onCycleChange}
          />
        </div>
      </div>

      {showInsights && (
        <TeamInsightsPanel
          data={insights.data}
          isAnalyzing={insights.isAnalyzing}
          error={insights.error}
          onAnalyze={insights.analyze}
          onClear={insights.clear}
        />
      )}

      {/* Executive Summary — 5 cards */}
      <ExecutiveSummary
        teamOverallScore={teamAvgScore}
        teamCompanyValuesAvg={teamCompanyValuesAvg}
        teamSkillsAvg={teamSkillsAvg}
        goalsCompletionRate={averageGoalProgress}
        skillGrowthRate={skillGrowthRate}
        needsAttentionCount={needsAttentionCount}
        changeOverall={changeOverall}
        changeCompanyValues={changeCompanyValues}
        changeSkills={changeSkills}
        ratingScaleLimit={ratingScaleLimit}
        loading={isLoading}
      />

      {/* Performance Trends + Score Distribution — side by side (handled inside component) */}
      <PerformanceTrends
        trendData={trendSeries}
        distributionData={scoreDistribution}
        ratingScaleLimit={ratingScaleLimit}
        loading={loadingEvaluations}
      />

      {/* Team Member Table — full width */}
      <TeamMemberTable
        evaluations={evaluationMembers}
        goals={teamPerformance}
        feedback={feedbackMembers}
        skills={skillsMembers}
        onEmployeeClick={handleEmployeeClick}
        loading={isLoading}
        accessToken={accessToken}
      />

      {/* Company Values + Skills & Development — side by side */}
      <div className="gba:flex gba:gap-6">
        <div className="gba:flex-1 gba:min-w-0">
          <CompanyValuesAnalysis
            members={evaluationMembers}
            ratingScaleLimit={ratingScaleLimit}
            loading={loadingEvaluations}
          />
        </div>
        <div className="gba:flex-1 gba:min-w-0">
          <SkillsAnalysis
            skillsMembers={skillsMembers}
            evaluationMembers={evaluationMembers}
            loading={loadingSkills || loadingEvaluations}
          />
        </div>
      </div>

      {/* Alignment Comparison — full width */}
      <AlignmentComparison
        members={evaluationMembers}
        ratingScaleLimit={ratingScaleLimit}
        loading={loadingEvaluations}
        onEmployeeClick={handleEmployeeClick}
      />

      {/* Deep Dive Sheet */}
      <MemberDeepDiveSheet
        isOpen={deepDiveEmployeeId !== null}
        onClose={() => setDeepDiveEmployeeId(null)}
        employeeId={deepDiveEmployeeId || ''}
        goalsData={teamPerformance}
        skillsData={skillsMembers}
        feedbackData={feedbackMembers}
        evaluationsData={evaluationMembers}
        onNavigateToEmployee={onNavigateToEmployee}
      />
    </div>
  )
}
