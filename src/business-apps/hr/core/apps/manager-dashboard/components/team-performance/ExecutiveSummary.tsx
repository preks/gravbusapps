import React, { useMemo } from 'react'
import { SectionKpiCards } from '@newwork/nw-design-system'
import type { KpiCardData } from '@newwork/nw-design-system'
import { TrendingUp, Heart, Lightbulb, Target, Zap } from 'lucide-react'

export interface ExecutiveSummaryProps {
  teamOverallScore: number | null
  teamCompanyValuesAvg: number | null
  teamSkillsAvg: number | null
  goalsCompletionRate: number
  skillGrowthRate: number
  changeOverall: number | null
  changeCompanyValues: number | null
  changeSkills: number | null
  ratingScaleLimit: number
  loading: boolean
}

const formatScoreValue = (score: number | null, ratingScaleLimit: number): string => {
  if (score === null) return '—'
  const formattedScore = score % 1 === 0 ? score : score.toFixed(1)
  return `${formattedScore} / ${ratingScaleLimit}`
}

const trendDirection = (delta: number): 'up' | 'down' | 'none' => {
  if (delta > 0) return 'up'
  if (delta < 0) return 'down'
  return 'none'
}

const formatPercentDelta = (delta: number): string => {
  const sign = delta > 0 ? '+' : ''
  return `${sign}${Math.round(delta)}%`
}

const formatScoreDelta = (delta: number): string => {
  if (delta === 0) return '0'
  const abs = Math.abs(delta)
  const formattedAbs = abs % 1 === 0 ? String(abs) : abs.toFixed(1)
  const sign = delta > 0 ? '+' : '-'
  return `${sign}${formattedAbs}`
}

function buildTrend(delta: number | null, kind: 'score' | 'percent'): KpiCardData['trend'] | undefined {
  if (delta == null) return undefined
  const positive = delta > 0
  const description = kind === 'score' ? 'vs last cycle' : 'this cycle'
  const direction = trendDirection(delta)

  if (kind === 'percent') {
    return {
      value: formatPercentDelta(delta),
      positive,
      description,
      trendIcon: direction
    }
  }

  return {
    value: formatScoreDelta(delta),
    positive,
    description,
    trendIcon: direction
  }
}

function scoreProgress(score: number | null, scaleLimit: number): KpiCardData['progress'] | undefined {
  if (score == null || scaleLimit <= 0) return undefined
  return { value: Math.min(100, Math.round((score / scaleLimit) * 100)) }
}

function pctProgress(pct: number): KpiCardData['progress'] | undefined {
  return { value: Math.min(100, Math.max(0, Math.round(pct))) }
}

export const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({
  teamOverallScore,
  teamCompanyValuesAvg,
  teamSkillsAvg,
  goalsCompletionRate,
  skillGrowthRate,
  changeOverall,
  changeCompanyValues,
  changeSkills,
  ratingScaleLimit,
  loading
}) => {
  const cards: KpiCardData[] = useMemo(
    () => [
      {
        id: 'team-overall',
        title: 'Team Overall Score',
        value: formatScoreValue(teamOverallScore, ratingScaleLimit),
        icon: <TrendingUp className="nw:size-4" />,
        trend: buildTrend(changeOverall, 'score'),
        progress: scoreProgress(teamOverallScore, ratingScaleLimit)
      },
      {
        id: 'company-values',
        title: 'Company Values Score',
        value: formatScoreValue(teamCompanyValuesAvg, ratingScaleLimit),
        icon: <Heart className="nw:size-4" />,
        trend: buildTrend(changeCompanyValues, 'score'),
        progress: scoreProgress(teamCompanyValuesAvg, ratingScaleLimit)
      },
      {
        id: 'skills-score',
        title: 'Skills Score',
        value: formatScoreValue(teamSkillsAvg, ratingScaleLimit),
        icon: <Lightbulb className="nw:size-4" />,
        trend: buildTrend(changeSkills, 'score'),
        progress: scoreProgress(teamSkillsAvg, ratingScaleLimit)
      },
      {
        id: 'goals-completion',
        title: 'Goals Completion',
        value: `${Math.round(goalsCompletionRate)}%`,
        icon: <Target className="nw:size-4" />,
        trend: buildTrend(null, 'percent'),
        progress: pctProgress(goalsCompletionRate)
      },
      {
        id: 'skill-growth',
        title: 'Skill Growth',
        value: `${Math.round(skillGrowthRate)}%`,
        icon: <Zap className="nw:size-4" />,
        trend: buildTrend(null, 'percent'),
        progress: pctProgress(skillGrowthRate)
      }
    ],
    [
      teamOverallScore,
      teamCompanyValuesAvg,
      teamSkillsAvg,
      goalsCompletionRate,
      skillGrowthRate,
      changeOverall,
      changeCompanyValues,
      changeSkills,
      ratingScaleLimit
    ]
  )

  if (loading) {
    return (
      <SectionKpiCards
        cards={[
          { id: 'loading-1', title: 'Team Overall Score', value: '—' },
          { id: 'loading-2', title: 'Company Values Score', value: '—' },
          { id: 'loading-3', title: 'Skills Score', value: '—' },
          { id: 'loading-4', title: 'Goals Completion', value: '—' },
          { id: 'loading-5', title: 'Skill Growth', value: '—' }
        ]}
        className="gba:w-full gba:md:grid-cols-5 nw:md:grid-cols-5"
      />
    )
  }

  return <SectionKpiCards cards={cards} className="gba:w-full gba:md:grid-cols-5 nw:md:grid-cols-5" />
}
