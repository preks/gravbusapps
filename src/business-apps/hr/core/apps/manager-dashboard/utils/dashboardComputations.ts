import type { TeamMemberEvaluation, EvaluationDimensionScore } from '../hooks/useTeamEvaluations'
import type { TeamMemberPerformance } from '../hooks/useTeamPerformance'
import type { TeamMemberFeedback } from '../hooks/useTeamFeedbackOverview'
import type { TeamMemberSkills } from '../hooks/useTeamSkills'

export interface DashboardAlert {
  employeeId: string
  employeeName: string
  pictureThumbnail?: string
  severity: 'high' | 'medium' | 'low'
  reason: string
  context: string
  suggestedAction: string
  category:
    | 'score-drop'
    | 'goals-blocked'
    | 'no-feedback'
    | 'alignment-gap'
    | 'skill-gap'
    | 'stagnation'
    | 'growth-signal'
}

export type EmployeeSignalType =
  | 'strong-momentum'
  | 'growth-candidate'
  | 'development-momentum'
  | 'plateau-risk'
  | 'low-recognition'
  | 'low-feedback-participation'
  | 'declining-trajectory'
  | 'blocked-execution'
  | 'alignment-gap'

export type TeamSignalType =
  | 'growth-concentration-risk'
  | 'uneven-feedback-coverage'
  | 'team-execution-risk'
  | 'capability-gap'
  | 'values-alignment-gap'
  | 'standout-growth-cluster'
  | 'recognition-gap'

export type SignalCategory = 'positive' | 'attention' | 'warning'

export interface EmployeeSignal {
  employeeId: string
  employeeName: string
  pictureThumbnail?: string
  signalType: EmployeeSignalType
  category: SignalCategory
  description: string
  supportingData: string[]
  suggestedAction: string
  isPrimary: boolean
}

export interface TeamSignal {
  signalType: TeamSignalType
  category: SignalCategory
  description: string
  supportingData: string[]
  suggestedAction: string
}

export interface ScoreDistributionBand {
  band: string
  count: number
  employees: string[]
}

export interface TrendDataPoint {
  cycleName: string
  overall: number | null
  companyValues: number | null
  skills: number | null
}

export interface DimensionAverage {
  name: string
  teamAvg: number | null
  selfAvg: number | null
  peerAvg: number | null
  managerAvg: number | null
}

export interface AlignmentGap {
  employeeId: string
  employeeName: string
  pictureThumbnail?: string
  selfAvg: number | null
  peerAvg: number | null
  managerAvg: number | null
  gap: number
}

export function computeScoreDistribution(
  members: TeamMemberEvaluation[],
  ratingScaleLimit: number = 5
): ScoreDistributionBand[] {
  const step = ratingScaleLimit / 5
  const bands: ScoreDistributionBand[] = [
    { band: 'Low', count: 0, employees: [] },
    { band: 'Developing', count: 0, employees: [] },
    { band: 'Solid', count: 0, employees: [] },
    { band: 'Strong', count: 0, employees: [] },
    { band: 'Top', count: 0, employees: [] }
  ]

  for (const m of members) {
    if (m.latestScore == null) continue
    const name = `${m.firstName} ${m.lastName}`
    const idx = Math.min(Math.floor(m.latestScore / step), 4)
    bands[idx].count++
    bands[idx].employees.push(name)
  }

  return bands
}

interface TrendAccumulator {
  overallSum: number
  overallCount: number
  cvSum: number
  cvCount: number
  skillsSum: number
  skillsCount: number
  evalEndDate: string | null
}

const emptyTrendAccumulator = (evalEndDate: string | null): TrendAccumulator => ({
  overallSum: 0,
  overallCount: 0,
  cvSum: 0,
  cvCount: 0,
  skillsSum: 0,
  skillsCount: 0,
  evalEndDate
})

const roundedAverage = (sum: number, count: number): number | null => {
  if (count === 0) return null
  return Math.round((sum / count) * 10) / 10
}

const updateTrendAccumulator = (
  entry: TrendAccumulator,
  cycleScore: TeamMemberEvaluation['cycleScores'][number]
): void => {
  if (cycleScore.overallScore !== null) {
    entry.overallSum += cycleScore.overallScore
    entry.overallCount++
  }
  if (cycleScore.companyValuesAvg !== null) {
    entry.cvSum += cycleScore.companyValuesAvg
    entry.cvCount++
  }
  if (cycleScore.skillsAvg !== null) {
    entry.skillsSum += cycleScore.skillsAvg
    entry.skillsCount++
  }
}

export function computeTrendSeries(members: TeamMemberEvaluation[]): TrendDataPoint[] {
  if (members.length === 0) return []

  const cycleMap = new Map<string, TrendAccumulator>()

  for (const member of members) {
    for (const cycleScore of member.cycleScores) {
      const existing = cycleMap.get(cycleScore.cycleName)
      if (existing) {
        updateTrendAccumulator(existing, cycleScore)
        continue
      }

      const next = emptyTrendAccumulator(cycleScore.evaluationPeriodEndDate)
      updateTrendAccumulator(next, cycleScore)
      cycleMap.set(cycleScore.cycleName, next)
    }
  }

  return Array.from(cycleMap.entries())
    .toSorted((a, b) => (a[1].evalEndDate ?? '').localeCompare(b[1].evalEndDate ?? ''))
    .map(([cycleName, accumulator]) => ({
      cycleName,
      overall: roundedAverage(accumulator.overallSum, accumulator.overallCount),
      companyValues: roundedAverage(accumulator.cvSum, accumulator.cvCount),
      skills: roundedAverage(accumulator.skillsSum, accumulator.skillsCount)
    }))
}

const signPrefix = (value: number): string => {
  if (value > 0) return '+'
  return ''
}

const scoreDropAlert = (evaluation: TeamMemberEvaluation, employeeName: string): DashboardAlert | null => {
  if (evaluation.changeOverall === null || evaluation.changeOverall >= -0.5) return null

  return {
    employeeId: evaluation.employeeId,
    employeeName,
    pictureThumbnail: evaluation.pictureThumbnail,
    severity: 'high',
    reason: 'Overall score dropped significantly',
    context: `Score changed by ${signPrefix(evaluation.changeOverall)}${evaluation.changeOverall.toFixed(1)} vs previous cycle`,
    suggestedAction: 'Schedule a coaching 1:1',
    category: 'score-drop'
  }
}

const goalsBlockedAlert = (
  evaluation: TeamMemberEvaluation,
  employeeName: string,
  goals: TeamMemberPerformance | undefined
): DashboardAlert | null => {
  if (!goals || goals.totalGoals === 0) return null

  if (goals.averageProgress < 30) {
    return {
      employeeId: evaluation.employeeId,
      employeeName,
      pictureThumbnail: evaluation.pictureThumbnail,
      severity: 'high',
      reason: 'Very low goals progress',
      context: `${goals.averageProgress}% average progress across ${goals.totalGoals} goals`,
      suggestedAction: 'Review goals and remove blockers',
      category: 'goals-blocked'
    }
  }

  const troubleGoals = goals.goalsAtRisk + goals.goalsBehindTarget
  if (troubleGoals <= goals.totalGoals * 0.5) return null

  return {
    employeeId: evaluation.employeeId,
    employeeName,
    pictureThumbnail: evaluation.pictureThumbnail,
    severity: 'medium',
    reason: 'Majority of goals at risk or behind',
    context: `${troubleGoals} of ${goals.totalGoals} goals need attention`,
    suggestedAction: 'Prioritize and realign goals',
    category: 'goals-blocked'
  }
}

const noFeedbackAlert = (
  evaluation: TeamMemberEvaluation,
  employeeName: string,
  feedback: TeamMemberFeedback | undefined
): DashboardAlert | null => {
  if (feedback?.feedbackReceivedCount !== 0) return null

  return {
    employeeId: evaluation.employeeId,
    employeeName,
    pictureThumbnail: evaluation.pictureThumbnail,
    severity: 'medium',
    reason: 'No feedback received recently',
    context: 'No feedback in the last 30 days',
    suggestedAction: 'Encourage peer feedback or give direct feedback',
    category: 'no-feedback'
  }
}

const alignmentGapAlert = (evaluation: TeamMemberEvaluation, employeeName: string): DashboardAlert | null => {
  if (evaluation.companyValues.length === 0) return null

  const selfScores = evaluation.companyValues.filter(value => value.selfScore !== null).map(value => value.selfScore!)
  const managerScores = evaluation.companyValues
    .filter(value => value.managerScore !== null)
    .map(value => value.managerScore!)
  if (selfScores.length === 0 || managerScores.length === 0) return null

  const selfAvg = selfScores.reduce((a, b) => a + b, 0) / selfScores.length
  const managerAvg = managerScores.reduce((a, b) => a + b, 0) / managerScores.length
  if (Math.abs(selfAvg - managerAvg) <= 1) return null

  return {
    employeeId: evaluation.employeeId,
    employeeName,
    pictureThumbnail: evaluation.pictureThumbnail,
    severity: 'medium',
    reason: 'Self-assessment vs manager gap',
    context: `Self avg: ${selfAvg.toFixed(1)}, Manager avg: ${managerAvg.toFixed(1)}`,
    suggestedAction: 'Align on expectations in next review',
    category: 'alignment-gap'
  }
}

const skillGapAlert = (
  evaluation: TeamMemberEvaluation,
  employeeName: string,
  skills: TeamMemberSkills | undefined
): DashboardAlert | null => {
  if (!skills) return null

  if (skills.hasJobProfile === false) {
    return {
      employeeId: evaluation.employeeId,
      employeeName,
      pictureThumbnail: evaluation.pictureThumbnail,
      severity: 'medium',
      reason: 'No job profile skills defined',
      context: 'Skill coverage cannot be measured',
      suggestedAction: 'Assign a job profile with required skills',
      category: 'skill-gap'
    }
  }

  if (skills.missingRequired.length <= 2) return null

  return {
    employeeId: evaluation.employeeId,
    employeeName,
    pictureThumbnail: evaluation.pictureThumbnail,
    severity: 'medium',
    reason: 'Multiple required skills missing',
    context: `${skills.missingRequired.length} required skills not covered`,
    suggestedAction: 'Create a skill development plan',
    category: 'skill-gap'
  }
}

const growthSignalAlert = (
  evaluation: TeamMemberEvaluation,
  employeeName: string,
  goals: TeamMemberPerformance | undefined
): DashboardAlert | null => {
  if (evaluation.changeOverall === null || evaluation.changeOverall <= 0.5) return null
  if (!goals || goals.goalsOnTrack <= goals.goalsAtRisk) return null

  return {
    employeeId: evaluation.employeeId,
    employeeName,
    pictureThumbnail: evaluation.pictureThumbnail,
    severity: 'low',
    reason: 'Strong positive momentum',
    context: `Score improved by +${evaluation.changeOverall.toFixed(1)} with goals on track`,
    suggestedAction: 'Recognize achievements and explore growth',
    category: 'growth-signal'
  }
}

const alertsForEvaluation = (
  evaluation: TeamMemberEvaluation,
  goals: TeamMemberPerformance | undefined,
  feedback: TeamMemberFeedback | undefined,
  skills: TeamMemberSkills | undefined
): DashboardAlert[] => {
  const employeeName = `${evaluation.firstName} ${evaluation.lastName}`
  const alerts: DashboardAlert[] = []

  const candidates = [
    scoreDropAlert(evaluation, employeeName),
    goalsBlockedAlert(evaluation, employeeName, goals),
    noFeedbackAlert(evaluation, employeeName, feedback),
    alignmentGapAlert(evaluation, employeeName),
    skillGapAlert(evaluation, employeeName, skills),
    growthSignalAlert(evaluation, employeeName, goals)
  ]

  for (const candidate of candidates) {
    if (candidate) alerts.push(candidate)
  }

  return alerts
}

export function generateAlerts(
  evaluations: TeamMemberEvaluation[],
  goals: TeamMemberPerformance[],
  feedback: TeamMemberFeedback[],
  skills: TeamMemberSkills[]
): DashboardAlert[] {
  const goalsMap = new Map(goals.map(goal => [goal.employeeId, goal]))
  const feedbackMap = new Map(feedback.map(entry => [entry.employeeId, entry]))
  const skillsMap = new Map(skills.map(entry => [entry.employeeId, entry]))

  const alerts = evaluations.flatMap(evaluation =>
    alertsForEvaluation(
      evaluation,
      goalsMap.get(evaluation.employeeId),
      feedbackMap.get(evaluation.employeeId),
      skillsMap.get(evaluation.employeeId)
    )
  )

  const severityOrder = { high: 0, medium: 1, low: 2 }
  return alerts.toSorted((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
}

const EMPLOYEE_SIGNAL_PRIORITY: EmployeeSignalType[] = [
  'declining-trajectory',
  'blocked-execution',
  'alignment-gap',
  'plateau-risk',
  'low-feedback-participation',
  'low-recognition',
  'strong-momentum',
  'growth-candidate',
  'development-momentum'
]

const createEmployeeSignal = (
  evaluation: TeamMemberEvaluation,
  employeeName: string,
  signalType: EmployeeSignalType,
  category: SignalCategory,
  description: string,
  supportingData: string[],
  suggestedAction: string
): EmployeeSignal => ({
  employeeId: evaluation.employeeId,
  employeeName,
  pictureThumbnail: evaluation.pictureThumbnail,
  signalType,
  category,
  description,
  supportingData,
  suggestedAction,
  isPrimary: false
})

const strongMomentumSignal = (
  evaluation: TeamMemberEvaluation,
  employeeName: string,
  goals: TeamMemberPerformance | undefined,
  hasCycleHistory: boolean,
  scaleLimit: number
): EmployeeSignal | null => {
  if (!hasCycleHistory || evaluation.changeOverall === null || evaluation.changeOverall <= 0.5) return null
  if (evaluation.latestScore === null || evaluation.latestScore < scaleLimit * 0.5) return null
  if (!goals || goals.totalGoals < 1 || goals.goalsOnTrack <= goals.goalsAtRisk) return null

  return createEmployeeSignal(
    evaluation,
    employeeName,
    'strong-momentum',
    'positive',
    'Consistent improvement across scores and goal execution',
    [
      `Score improved by +${evaluation.changeOverall.toFixed(1)} since last cycle`,
      `${goals.goalsOnTrack} of ${goals.totalGoals} goals on track`
    ],
    'Recognize progress. Discuss stretch opportunities in next 1:1.'
  )
}

const growthCandidateSignal = (
  evaluation: TeamMemberEvaluation,
  employeeName: string,
  goals: TeamMemberPerformance | undefined,
  scaleLimit: number
): EmployeeSignal | null => {
  if (evaluation.latestScore === null || evaluation.latestScore < scaleLimit * 0.8) return null
  if (!goals || goals.totalGoals < 2 || goals.averageProgress < 70) return null
  if (evaluation.companyValuesAvg !== null && evaluation.companyValuesAvg < scaleLimit * 0.6) return null

  const supportingData = [
    `Overall score: ${evaluation.latestScore.toFixed(1)}/${scaleLimit}`,
    `${goals.averageProgress}% average goal progress`
  ]
  if (evaluation.companyValuesAvg !== null) {
    supportingData.push(`Values score: ${evaluation.companyValuesAvg.toFixed(1)}`)
  }

  return createEmployeeSignal(
    evaluation,
    employeeName,
    'growth-candidate',
    'positive',
    'Consistently scores high and delivers on goals — may be ready for expanded responsibilities',
    supportingData,
    'Discuss career development. Consider for stretch assignments or leadership opportunities.'
  )
}

const developmentMomentumSignal = (
  evaluation: TeamMemberEvaluation,
  employeeName: string,
  hasCycleHistory: boolean
): EmployeeSignal | null => {
  if (!hasCycleHistory) return null
  if (evaluation.changeSkills === null || evaluation.changeSkills <= 0.5) return null
  if (evaluation.changeOverall === null || evaluation.changeOverall <= 0) return null

  return createEmployeeSignal(
    evaluation,
    employeeName,
    'development-momentum',
    'positive',
    'Significant skill growth alongside improving performance',
    [
      `Skills score improved by +${evaluation.changeSkills.toFixed(1)}`,
      `Overall score change: +${evaluation.changeOverall.toFixed(1)}`
    ],
    'Acknowledge development efforts. Identify next skill areas to focus on.'
  )
}

const plateauRiskSignal = (
  evaluation: TeamMemberEvaluation,
  employeeName: string,
  feedback: TeamMemberFeedback | undefined,
  hasCycleHistory: boolean,
  scaleLimit: number
): EmployeeSignal | null => {
  if (!hasCycleHistory || evaluation.changeOverall === null || evaluation.changeSkills === null) return null
  if (Math.abs(evaluation.changeOverall) >= 0.2 || Math.abs(evaluation.changeSkills) >= 0.2) return null
  if (!feedback || feedback.feedbackReceivedCount >= 3) return null
  if (evaluation.latestScore !== null && evaluation.latestScore >= scaleLimit * 0.8) return null

  return createEmployeeSignal(
    evaluation,
    employeeName,
    'plateau-risk',
    'attention',
    'Scores and skills have remained flat across cycles with minimal feedback activity',
    [
      `Score change: ${evaluation.changeOverall.toFixed(1)}`,
      `Skills change: ${evaluation.changeSkills.toFixed(1)}`,
      `${feedback.feedbackReceivedCount} feedback received`
    ],
    'Have a development conversation. Explore whether they need new challenges or support.'
  )
}

const lowRecognitionSignal = (
  evaluation: TeamMemberEvaluation,
  employeeName: string,
  feedback: TeamMemberFeedback | undefined,
  scaleLimit: number
): EmployeeSignal | null => {
  if (evaluation.latestScore === null || evaluation.latestScore < scaleLimit * 0.6) return null
  if (!feedback || feedback.feedbackReceivedCount > 1) return null

  return createEmployeeSignal(
    evaluation,
    employeeName,
    'low-recognition',
    'attention',
    'Solid performer receiving very little feedback from peers and managers',
    [
      `Score: ${evaluation.latestScore.toFixed(1)}/${scaleLimit}`,
      `Only ${feedback.feedbackReceivedCount} feedback received this cycle`
    ],
    'Encourage peers to provide feedback. Ensure contributions are visible.'
  )
}

const lowFeedbackParticipationSignal = (
  evaluation: TeamMemberEvaluation,
  employeeName: string,
  feedback: TeamMemberFeedback | undefined,
  teamSize: number
): EmployeeSignal | null => {
  if (!feedback || teamSize < 3) return null
  if (feedback.feedbackReceivedCount > 1 || feedback.feedbackGivenCount > 1) return null

  return createEmployeeSignal(
    evaluation,
    employeeName,
    'low-feedback-participation',
    'attention',
    'Not actively participating in the feedback culture — neither giving nor receiving',
    [`${feedback.feedbackReceivedCount} feedback received`, `${feedback.feedbackGivenCount} feedback given`],
    'Discuss the value of feedback participation. Set expectations for peer feedback.'
  )
}

const decliningTrajectorySignal = (
  evaluation: TeamMemberEvaluation,
  employeeName: string,
  feedback: TeamMemberFeedback | undefined,
  hasCycleHistory: boolean,
  scaleLimit: number
): EmployeeSignal | null => {
  if (!hasCycleHistory || !feedback || feedback.feedbackReceivedCount >= 3) return null
  if (evaluation.latestScore === null || evaluation.latestScore < scaleLimit * 0.7) return null
  if (evaluation.changeOverall === null || evaluation.changeOverall >= -0.3) return null

  return createEmployeeSignal(
    evaluation,
    employeeName,
    'declining-trajectory',
    'warning',
    'Scores are dropping despite a strong baseline',
    [
      `Score dropped by ${evaluation.changeOverall.toFixed(1)} from last cycle`,
      `Current score: ${evaluation.latestScore.toFixed(1)}/${scaleLimit}`,
      `Only ${feedback.feedbackReceivedCount} feedback received`
    ],
    'Schedule a 1:1 to understand context. Check for workload, blockers, or personal factors.'
  )
}

const blockedExecutionSignal = (
  evaluation: TeamMemberEvaluation,
  employeeName: string,
  goals: TeamMemberPerformance | undefined
): EmployeeSignal | null => {
  if (!goals || goals.totalGoals < 2) return null
  if (goals.goalsBehindTarget < 2 || goals.averageProgress >= 40) return null

  return createEmployeeSignal(
    evaluation,
    employeeName,
    'blocked-execution',
    'warning',
    'Multiple goals behind target despite otherwise adequate performance',
    [`${goals.goalsBehindTarget} goals behind target`, `${goals.averageProgress}% average progress`],
    'Review blockers together. Reprioritize or remove obstacles.'
  )
}

const averageOrNull = (values: number[]): number | null => {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

const alignmentGapSignal = (evaluation: TeamMemberEvaluation, employeeName: string): EmployeeSignal | null => {
  const dimensions = [...evaluation.companyValues, ...evaluation.skills]
  const selfScores = dimensions.filter(dimension => dimension.selfScore !== null).map(dimension => dimension.selfScore!)
  const peerScores = dimensions
    .filter(dimension => dimension.peerAvgScore !== null)
    .map(dimension => dimension.peerAvgScore!)
  const managerScores = dimensions
    .filter(dimension => dimension.managerScore !== null)
    .map(dimension => dimension.managerScore!)

  const selfAvg = averageOrNull(selfScores)
  const peerAvg = averageOrNull(peerScores)
  const managerAvg = averageOrNull(managerScores)
  const perspectiveValues = [selfAvg, peerAvg, managerAvg].filter((value): value is number => value !== null)
  if (perspectiveValues.length < 2) return null

  const maxGap = Math.max(...perspectiveValues) - Math.min(...perspectiveValues)
  if (maxGap <= 1) return null

  const supportingData: string[] = []
  if (selfAvg !== null) supportingData.push(`Self: ${selfAvg.toFixed(1)}`)
  if (peerAvg !== null) supportingData.push(`Peer avg: ${peerAvg.toFixed(1)}`)
  if (managerAvg !== null) supportingData.push(`Manager: ${managerAvg.toFixed(1)}`)

  return createEmployeeSignal(
    evaluation,
    employeeName,
    'alignment-gap',
    'warning',
    `Significant divergence between assessment perspectives — gap of ${maxGap.toFixed(1)} points`,
    supportingData,
    'Discuss perception differences. Use specific examples to align expectations.'
  )
}

export function detectEmployeeSignals(
  evaluations: TeamMemberEvaluation[],
  goals: TeamMemberPerformance[],
  feedback: TeamMemberFeedback[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _skills: TeamMemberSkills[]
): EmployeeSignal[] {
  const goalsMap = new Map(goals.map(goal => [goal.employeeId, goal]))
  const feedbackMap = new Map(feedback.map(entry => [entry.employeeId, entry]))
  const allRaw: EmployeeSignal[] = []
  const teamSize = evaluations.length

  for (const evaluation of evaluations) {
    const employeeName = `${evaluation.firstName} ${evaluation.lastName}`
    const employeeGoals = goalsMap.get(evaluation.employeeId)
    const employeeFeedback = feedbackMap.get(evaluation.employeeId)
    const scaleLimit = evaluation.ratingScaleLimit ?? 5
    const hasCycleHistory = evaluation.cycleScores.length >= 2

    const candidates: Array<EmployeeSignal | null> = [
      strongMomentumSignal(evaluation, employeeName, employeeGoals, hasCycleHistory, scaleLimit),
      growthCandidateSignal(evaluation, employeeName, employeeGoals, scaleLimit),
      developmentMomentumSignal(evaluation, employeeName, hasCycleHistory),
      plateauRiskSignal(evaluation, employeeName, employeeFeedback, hasCycleHistory, scaleLimit),
      lowRecognitionSignal(evaluation, employeeName, employeeFeedback, scaleLimit),
      lowFeedbackParticipationSignal(evaluation, employeeName, employeeFeedback, teamSize),
      decliningTrajectorySignal(evaluation, employeeName, employeeFeedback, hasCycleHistory, scaleLimit),
      blockedExecutionSignal(evaluation, employeeName, employeeGoals),
      alignmentGapSignal(evaluation, employeeName)
    ]

    for (const candidate of candidates) {
      if (candidate) allRaw.push(candidate)
    }
  }

  // Assign primary signal per employee (highest priority wins)
  const byEmployee = new Map<string, EmployeeSignal[]>()
  for (const s of allRaw) {
    const list = byEmployee.get(s.employeeId) ?? []
    list.push(s)
    byEmployee.set(s.employeeId, list)
  }
  const result: EmployeeSignal[] = []
  for (const [, empSignals] of byEmployee) {
    empSignals.sort(
      (a, b) => EMPLOYEE_SIGNAL_PRIORITY.indexOf(a.signalType) - EMPLOYEE_SIGNAL_PRIORITY.indexOf(b.signalType)
    )
    empSignals.forEach((s, i) => {
      s.isPrimary = i === 0
    })
    result.push(...empSignals)
  }

  return result
}

const createTeamSignal = (
  signalType: TeamSignalType,
  category: SignalCategory,
  description: string,
  supportingData: string[],
  suggestedAction: string
): TeamSignal => ({ signalType, category, description, supportingData, suggestedAction })

const growthConcentrationRiskSignal = (evaluations: TeamMemberEvaluation[], teamSize: number): TeamSignal | null => {
  if (teamSize < 4) return null

  const skillChanges = evaluations
    .filter(evaluation => evaluation.changeSkills !== null && evaluation.changeSkills > 0)
    .map(evaluation => ({ id: evaluation.employeeId, change: evaluation.changeSkills! }))
  const totalGrowth = skillChanges.reduce((sum, entry) => sum + entry.change, 0)
  if (totalGrowth <= 0.2) return null

  const sortedChanges = skillChanges.toSorted((a, b) => b.change - a.change)
  const topQuarter = Math.max(1, Math.ceil(sortedChanges.length * 0.25))
  const topGrowth = sortedChanges.slice(0, topQuarter).reduce((sum, entry) => sum + entry.change, 0)
  if (topGrowth / totalGrowth < 0.7) return null

  return createTeamSignal(
    'growth-concentration-risk',
    'attention',
    `${Math.round((topGrowth / totalGrowth) * 100)}% of team skill improvement came from ${topQuarter} of ${sortedChanges.length} team members`,
    [`Top ${topQuarter} contributor${topQuarter > 1 ? 's' : ''} account for most growth`],
    'Distribute development opportunities more broadly. Review training and mentoring plans.'
  )
}

const unevenFeedbackCoverageSignal = (feedback: TeamMemberFeedback[], teamSize: number): TeamSignal | null => {
  const feedbackCounts = feedback.map(entry => entry.feedbackReceivedCount)
  const totalFeedback = feedbackCounts.reduce((sum, count) => sum + count, 0)
  if (totalFeedback < 5) return null

  const membersWithFeedback = feedbackCounts.filter(count => count > 0).length
  const coverage = (membersWithFeedback / teamSize) * 100
  if (coverage >= 60) return null

  return createTeamSignal(
    'uneven-feedback-coverage',
    'attention',
    `Only ${membersWithFeedback} of ${teamSize} team members have received feedback this cycle`,
    [`${Math.round(coverage)}% coverage`],
    'Encourage a culture of regular feedback. Set team-wide feedback norms.'
  )
}

const teamExecutionRiskSignal = (goals: TeamMemberPerformance[]): TeamSignal | null => {
  const membersWithBlockedGoals = goals.filter(
    goal => goal.totalGoals > 0 && (goal.goalsBehindTarget > 0 || goal.goalsAtRisk > goal.goalsOnTrack)
  ).length
  if (goals.length < 3 || membersWithBlockedGoals / goals.length < 0.4) return null

  return createTeamSignal(
    'team-execution-risk',
    'warning',
    `${membersWithBlockedGoals} of ${goals.length} team members have goals behind target or at risk`,
    [`${Math.round((membersWithBlockedGoals / goals.length) * 100)}% of team affected`],
    'Review team-wide blockers. Consider reprioritization or resource reallocation.'
  )
}

const collectDimensionMap = (
  evaluations: TeamMemberEvaluation[],
  dimension: 'skills' | 'companyValues'
): Map<string, number[]> => {
  const dimensionMap = new Map<string, number[]>()
  for (const evaluation of evaluations) {
    const entries = dimension === 'skills' ? evaluation.skills : evaluation.companyValues
    for (const entry of entries) {
      if (entry.overallAvg === null) continue
      const values = dimensionMap.get(entry.name) ?? []
      values.push(entry.overallAvg)
      dimensionMap.set(entry.name, values)
    }
  }
  return dimensionMap
}

const capabilityGapSignals = (skillDimensionMap: Map<string, number[]>, scaleLimit: number): TeamSignal[] => {
  const signals: TeamSignal[] = []
  for (const [skillName, scores] of skillDimensionMap) {
    if (scores.length < 3) continue
    const average = scores.reduce((a, b) => a + b, 0) / scores.length
    if (average >= scaleLimit * 0.4) continue
    signals.push(
      createTeamSignal(
        'capability-gap',
        'attention',
        `${skillName} averages ${average.toFixed(1)}/${scaleLimit} across the team — the lowest of all skills`,
        [`${scores.length} team members evaluated`, `Team average: ${average.toFixed(1)}`],
        'Plan targeted team development. Consider workshops, coaching, or hiring for the gap.'
      )
    )
  }
  return signals
}

const valuesAlignmentGapSignals = (valuesDimensionMap: Map<string, number[]>, scaleLimit: number): TeamSignal[] => {
  const signals: TeamSignal[] = []
  for (const [valueName, scores] of valuesDimensionMap) {
    if (scores.length < 3) continue
    const average = scores.reduce((a, b) => a + b, 0) / scores.length
    if (average >= scaleLimit * 0.5) continue
    signals.push(
      createTeamSignal(
        'values-alignment-gap',
        'attention',
        `${valueName} averages ${average.toFixed(1)}/${scaleLimit} — below the expected baseline`,
        [`${scores.length} team members evaluated`],
        'Reinforce the value through team discussions and role modeling.'
      )
    )
  }
  return signals
}

const standoutGrowthClusterSignal = (employeeSignals: EmployeeSignal[], teamSize: number): TeamSignal | null => {
  const growthSignalCount = employeeSignals.filter(
    signal =>
      signal.isPrimary && (signal.signalType === 'strong-momentum' || signal.signalType === 'development-momentum')
  ).length
  if (teamSize < 5 || growthSignalCount < 3) return null

  return createTeamSignal(
    'standout-growth-cluster',
    'positive',
    `${growthSignalCount} of ${teamSize} team members are showing strong performance or skill growth this cycle`,
    [],
    "Celebrate team progress. Identify what's working and reinforce it."
  )
}

const recognitionGapSignal = (employeeSignals: EmployeeSignal[]): TeamSignal | null => {
  const lowRecognitionCount = employeeSignals.filter(signal => signal.signalType === 'low-recognition').length
  if (lowRecognitionCount < 2) return null

  return createTeamSignal(
    'recognition-gap',
    'attention',
    `${lowRecognitionCount} strong performers have received little or no feedback this cycle`,
    [],
    'Create visibility for strong contributors. Prompt peer feedback and recognition.'
  )
}

export function detectTeamSignals(
  evaluations: TeamMemberEvaluation[],
  goals: TeamMemberPerformance[],
  feedback: TeamMemberFeedback[],
  employeeSignals: EmployeeSignal[]
): TeamSignal[] {
  const teamSize = evaluations.length
  if (teamSize < 3) return []

  const scaleLimit = evaluations[0]?.ratingScaleLimit ?? 5
  const candidates: TeamSignal[] = []
  const primarySignals = [
    growthConcentrationRiskSignal(evaluations, teamSize),
    unevenFeedbackCoverageSignal(feedback, teamSize),
    teamExecutionRiskSignal(goals),
    standoutGrowthClusterSignal(employeeSignals, teamSize),
    recognitionGapSignal(employeeSignals)
  ]

  for (const signal of primarySignals) {
    if (signal) candidates.push(signal)
  }

  const skillDimensionMap = collectDimensionMap(evaluations, 'skills')
  const valuesDimensionMap = collectDimensionMap(evaluations, 'companyValues')
  candidates.push(...capabilityGapSignals(skillDimensionMap, scaleLimit))
  candidates.push(...valuesAlignmentGapSignals(valuesDimensionMap, scaleLimit))

  const categoryOrder: Record<SignalCategory, number> = { warning: 0, attention: 1, positive: 2 }
  return candidates.toSorted((a, b) => categoryOrder[a.category] - categoryOrder[b.category])
}

export function computeTeamDimensionAverages(
  members: TeamMemberEvaluation[],
  dimension: 'companyValues' | 'skills'
): DimensionAverage[] {
  const nameMap = new Map<
    string,
    { selfScores: number[]; peerScores: number[]; mgrScores: number[]; allScores: number[] }
  >()

  for (const m of members) {
    const entries: EvaluationDimensionScore[] = dimension === 'companyValues' ? m.companyValues : m.skills
    for (const entry of entries) {
      if (!nameMap.has(entry.name)) {
        nameMap.set(entry.name, { selfScores: [], peerScores: [], mgrScores: [], allScores: [] })
      }
      const agg = nameMap.get(entry.name)!
      if (entry.selfScore != null) agg.selfScores.push(entry.selfScore)
      if (entry.peerAvgScore != null) agg.peerScores.push(entry.peerAvgScore)
      if (entry.managerScore != null) agg.mgrScores.push(entry.managerScore)
      if (entry.overallAvg != null) agg.allScores.push(entry.overallAvg)
    }
  }

  const avg = (arr: number[]) =>
    arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null

  return Array.from(nameMap.entries())
    .map(([name, agg]) => ({
      name,
      teamAvg: avg(agg.allScores),
      selfAvg: avg(agg.selfScores),
      peerAvg: avg(agg.peerScores),
      managerAvg: avg(agg.mgrScores)
    }))
    .sort((a, b) => (b.teamAvg ?? 0) - (a.teamAvg ?? 0))
}

export function computeAlignmentGaps(members: TeamMemberEvaluation[]): AlignmentGap[] {
  return members
    .map(m => {
      const allDimensions = [...m.companyValues, ...m.skills]
      const selfScores = allDimensions.filter(d => d.selfScore != null).map(d => d.selfScore!)
      const peerScores = allDimensions.filter(d => d.peerAvgScore != null).map(d => d.peerAvgScore!)
      const mgrScores = allDimensions.filter(d => d.managerScore != null).map(d => d.managerScore!)

      const avg = (arr: number[]) =>
        arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null
      const selfAvg = avg(selfScores)
      const peerAvg = avg(peerScores)
      const managerAvg = avg(mgrScores)

      const values = [selfAvg, peerAvg, managerAvg].filter((v): v is number => v !== null)
      const gap = values.length >= 2 ? Math.round((Math.max(...values) - Math.min(...values)) * 10) / 10 : 0

      return {
        employeeId: m.employeeId,
        employeeName: `${m.firstName} ${m.lastName}`,
        pictureThumbnail: m.pictureThumbnail,
        selfAvg,
        peerAvg,
        managerAvg,
        gap
      }
    })
    .sort((a, b) => b.gap - a.gap)
}
