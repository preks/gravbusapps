import { useState } from 'react'
import { Button } from '@newwork/nw-design-system'
import { ChevronLeft, LayoutDashboard, Sparkles } from 'lucide-react'
import { TeamMemberPerformance } from '../hooks/useTeamPerformance'
import { TeamMemberSkills, SkillGrowthEntry } from '../hooks/useTeamSkills'
import { TeamMemberFeedback } from '../hooks/useTeamFeedbackOverview'
import { TeamMemberEvaluation } from '../hooks/useTeamEvaluations'
import { TeamPerformanceInsightsResult } from '../hooks/useTeamPerformanceInsights'
import type {
  DashboardAlert,
  TalentSignal,
  EmployeeSignal,
  TeamSignal,
  ScoreDistributionBand,
  TrendDataPoint,
  DimensionAverage,
  AlignmentGap
} from '../utils/dashboardComputations'
import {
  ExecutiveSummary,
  ActionCenter,
  PerformanceTrends,
  GoalsHealth,
  SkillsAnalysis,
  CompanyValuesAnalysis,
  FeedbackHealth,
  AlignmentComparison,
  TalentSignals,
  TeamMemberTable,
  DashboardFilters,
  MemberDeepDiveSheet,
  TeamInsightsPanel
} from '../components/team-performance'

export interface TeamPerformanceDashboardProps {
  teamPerformance: TeamMemberPerformance[]
  totalGoals: number
  goalsOnTrack: number
  goalsAtRisk: number
  goalsBehindTarget: number
  loadingGoals: boolean

  skillsMembers: TeamMemberSkills[]
  skillGrowth: SkillGrowthEntry[]
  loadingSkills: boolean

  feedbackMembers: TeamMemberFeedback[]
  feedbackCoverage: number
  recognitionRatio: number | null
  totalReceivedCount: number
  totalGivenCount: number
  loadingFeedback: boolean

  evaluationMembers: TeamMemberEvaluation[]
  teamAvgScore: number | null
  teamCompanyValuesAvg: number | null
  teamSkillsAvg: number | null
  loadingEvaluations: boolean

  availableCycles: Array<{ id: string; name: string; apiStatus?: string }>
  selectedCycleId: string | null
  onCycleChange: (cycleId: string) => void

  alerts: DashboardAlert[]
  talentSignals: TalentSignal[]
  employeeSignals: EmployeeSignal[]
  teamSignals: TeamSignal[]
  scoreDistribution: ScoreDistributionBand[]
  trendSeries: TrendDataPoint[]
  companyValuesDimensionAverages: DimensionAverage[]
  skillsDimensionAverages: DimensionAverage[]
  alignmentGaps: AlignmentGap[]

  ratingScaleLimit: number
  skillGrowthRate: number
  needsAttentionCount: number
  changeOverall: number | null
  changeCompanyValues: number | null
  changeSkills: number | null

  insights: TeamPerformanceInsightsResult

  onNavigateBack: () => void
  onNavigateToEmployee: (employeeId: string) => void
}

export const TeamPerformanceDashboard = (props: TeamPerformanceDashboardProps) => {
  const {
    teamPerformance,
    totalGoals,
    goalsOnTrack,
    goalsAtRisk,
    goalsBehindTarget,
    loadingGoals,
    skillsMembers,
    skillGrowth,
    loadingSkills,
    feedbackMembers,
    feedbackCoverage,
    recognitionRatio,
    totalReceivedCount,
    totalGivenCount,
    loadingFeedback,
    evaluationMembers,
    teamAvgScore,
    teamCompanyValuesAvg,
    teamSkillsAvg,
    loadingEvaluations,
    availableCycles,
    selectedCycleId,
    onCycleChange,
    alerts,
    talentSignals,
    employeeSignals,
    teamSignals,
    scoreDistribution,
    trendSeries,
    companyValuesDimensionAverages,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    skillsDimensionAverages,
    alignmentGaps,
    ratingScaleLimit,
    skillGrowthRate,
    needsAttentionCount,
    changeOverall,
    changeCompanyValues,
    changeSkills,
    insights,
    onNavigateBack,
    onNavigateToEmployee
  } = props

  const [deepDiveEmployeeId, setDeepDiveEmployeeId] = useState<string | null>(null)
  const [showInsights, setShowInsights] = useState(false)

  const isLoading = loadingGoals || loadingSkills || loadingFeedback || loadingEvaluations
  const goalsOnTrackRate = totalGoals > 0 ? Math.round((goalsOnTrack / totalGoals) * 100) : 0

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
        goalsOnTrackRate={goalsOnTrackRate}
        feedbackCoverage={feedbackCoverage}
        skillGrowthRate={skillGrowthRate}
        needsAttentionCount={needsAttentionCount}
        changeOverall={changeOverall}
        changeCompanyValues={changeCompanyValues}
        changeSkills={changeSkills}
        ratingScaleLimit={ratingScaleLimit}
        loading={isLoading}
      />

      {/* Action Center + Team Signals — side by side */}
      <div className="gba:flex gba:gap-6" style={{ minHeight: 0 }}>
        <div className="gba:flex-1 gba:min-w-0">
          <ActionCenter alerts={alerts} onEmployeeClick={handleEmployeeClick} loading={isLoading} />
        </div>
        <div className="gba:flex-1 gba:min-w-0">
          <TalentSignals
            employeeSignals={employeeSignals}
            teamSignals={teamSignals}
            onEmployeeClick={handleEmployeeClick}
            loading={isLoading}
          />
        </div>
      </div>

      {/* Performance Trends + Score Distribution — side by side (handled inside component) */}
      <PerformanceTrends
        trendData={trendSeries}
        distributionData={scoreDistribution}
        ratingScaleLimit={ratingScaleLimit}
        loading={loadingEvaluations}
      />

      {/* Skills & Development + Company Values Alignment — side by side */}
      <div style={{ display: 'flex', gap: '1.5rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <SkillsAnalysis
            skillsMembers={skillsMembers}
            skillGrowth={skillGrowth}
            evaluationMembers={evaluationMembers}
            loading={loadingSkills || loadingEvaluations}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <CompanyValuesAnalysis
            members={evaluationMembers}
            dimensionAverages={companyValuesDimensionAverages}
            ratingScaleLimit={ratingScaleLimit}
            loading={loadingEvaluations}
          />
        </div>
      </div>

      {/* Goals Health + Feedback Health — side by side */}
      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
        <GoalsHealth
          members={teamPerformance}
          totalGoals={totalGoals}
          goalsOnTrack={goalsOnTrack}
          goalsAtRisk={goalsAtRisk}
          goalsBehindTarget={goalsBehindTarget}
          loading={loadingGoals}
        />
        <FeedbackHealth
          members={feedbackMembers}
          feedbackCoverage={feedbackCoverage}
          recognitionRatio={recognitionRatio}
          totalReceivedCount={totalReceivedCount}
          totalGivenCount={totalGivenCount}
          loading={loadingFeedback}
        />
      </div>

      {/* Alignment Comparison — full width */}
      <AlignmentComparison gaps={alignmentGaps} ratingScaleLimit={ratingScaleLimit} loading={loadingEvaluations} />

      {/* Team Member Table — full width */}
      <TeamMemberTable
        evaluations={evaluationMembers}
        goals={teamPerformance}
        feedback={feedbackMembers}
        skills={skillsMembers}
        alerts={alerts}
        signals={talentSignals}
        onEmployeeClick={handleEmployeeClick}
        loading={isLoading}
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
