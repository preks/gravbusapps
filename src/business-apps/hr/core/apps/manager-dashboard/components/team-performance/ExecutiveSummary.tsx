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
  needsAttentionCount: number
  changeOverall: number | null
  changeCompanyValues: number | null
  changeSkills: number | null
  ratingScaleLimit: number
  loading: boolean
}

function buildTrend(delta: number | null, kind: 'score' | 'percent'): KpiCardData['trend'] | undefined {
  if (delta == null) return undefined
  const positive = delta > 0
  const negative = delta < 0
  const description = kind === 'score' ? 'vs last cycle' : 'this cycle'

  if (kind === 'percent') {
    return {
      value: `${delta > 0 ? '+' : ''}${Math.round(delta)}%`,
      positive,
      description,
      trendIcon: positive ? 'up' : negative ? 'down' : 'none'
    }
  }

  const abs = Math.abs(delta)
  const numLabel = abs % 1 === 0 ? String(abs) : abs.toFixed(1)
  return {
    value: `${positive ? '+' : negative ? '-' : ''}${numLabel}`,
    positive,
    description,
    trendIcon: positive ? 'up' : negative ? 'down' : 'none'
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
        value:
          teamOverallScore != null
            ? `${teamOverallScore % 1 === 0 ? teamOverallScore : teamOverallScore.toFixed(1)} / ${ratingScaleLimit}`
            : '—',
        icon: <TrendingUp className="nw:size-4" />,
        trend: buildTrend(changeOverall, 'score'),
        progress: scoreProgress(teamOverallScore, ratingScaleLimit)
      },
      {
        id: 'company-values',
        title: 'Company Values Score',
        value:
          teamCompanyValuesAvg != null
            ? `${teamCompanyValuesAvg % 1 === 0 ? teamCompanyValuesAvg : teamCompanyValuesAvg.toFixed(1)} / ${ratingScaleLimit}`
            : '—',
        icon: <Heart className="nw:size-4" />,
        trend: buildTrend(changeCompanyValues, 'score'),
        progress: scoreProgress(teamCompanyValuesAvg, ratingScaleLimit)
      },
      {
        id: 'skills-score',
        title: 'Skills Score',
        value:
          teamSkillsAvg != null
            ? `${teamSkillsAvg % 1 === 0 ? teamSkillsAvg : teamSkillsAvg.toFixed(1)} / ${ratingScaleLimit}`
            : '—',
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
