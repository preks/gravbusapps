import React, { useState } from 'react'
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@newwork/nw-design-system'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip
} from 'recharts'
import { computeRadarAverageScore, getActiveRadarSeries, getNextSelectedReviewers } from '../../utils/detailViewData'
import { RadarDataPoint, ReviewerKey, REVIEWER_COLORS, REVIEWER_KEYS } from './types'

const RadarLegend: React.FC<{
  selfLabel: string
  peerLabel: string
  managerLabel: string
  selectedReviewers: ReviewerKey[]
  onToggleReviewer: (reviewer: ReviewerKey) => void
}> = ({ selfLabel, peerLabel, managerLabel, selectedReviewers, onToggleReviewer }) => {
  const entries = [
    { key: 'self' as ReviewerKey, label: selfLabel, color: REVIEWER_COLORS.self },
    { key: 'peer' as ReviewerKey, label: peerLabel, color: REVIEWER_COLORS.peer },
    { key: 'manager' as ReviewerKey, label: managerLabel, color: REVIEWER_COLORS.manager }
  ]

  return (
    <div className="gba:flex gba:flex-wrap gba:gap-2" data-testid="employee-performance-evaluation-radar-legend">
      {entries.map(entry => {
        const isActive = selectedReviewers.includes(entry.key)
        return (
          <button
            key={entry.key}
            type="button"
            className="gba:rounded-full gba:focus-visible:outline-none gba:focus-visible:ring-2 gba:focus-visible:ring-ring gba:focus-visible:ring-offset-2"
            data-testid={`employee-performance-evaluation-radar-legend-${entry.key}`}
            aria-pressed={isActive}
            onClick={() => onToggleReviewer(entry.key)}
          >
            <Badge
              variant="secondary"
              className={`gba:flex gba:items-center gba:gap-2 ${isActive ? '' : 'gba:opacity-50'}`}
            >
              <span
                className="gba:inline-block gba:w-2 gba:h-2 gba:rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span>{entry.label}</span>
            </Badge>
          </button>
        )
      })}
    </div>
  )
}

interface RadarComparisonCardProps {
  testId: string
  title: string
  description: string
  averageScore: string
  averageScoreLabel: string
  data: RadarDataPoint[]
  noDataLabel: string
  selfLabel: string
  peerLabel: string
  managerLabel: string
  radarMaxDomain: number
}

const RadarComparisonCard: React.FC<RadarComparisonCardProps> = ({
  testId,
  title,
  description,
  averageScore,
  averageScoreLabel,
  data,
  noDataLabel,
  selfLabel,
  peerLabel,
  managerLabel,
  radarMaxDomain
}) => {
  const [selectedReviewers, setSelectedReviewers] = useState<ReviewerKey[]>(REVIEWER_KEYS)

  const toggleReviewer = (reviewer: ReviewerKey) =>
    setSelectedReviewers(previous => getNextSelectedReviewers(previous, reviewer))

  const displayedAverageScore =
    selectedReviewers.length === REVIEWER_KEYS.length ? averageScore : computeRadarAverageScore(data, selectedReviewers)
  const activeSeries = getActiveRadarSeries(selectedReviewers, { selfLabel, peerLabel, managerLabel })

  return (
    <Card data-testid={testId}>
      <CardHeader className="gba:pb-2">
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
          <CardTitle>{title}</CardTitle>
          <div className="gba:text-right">
            <p className="gba:text-xs gba:text-muted-foreground">{averageScoreLabel}</p>
            <p className="gba:text-sm gba:font-semibold">{displayedAverageScore}</p>
          </div>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="gba:space-y-3">
        <RadarLegend
          selfLabel={selfLabel}
          peerLabel={peerLabel}
          managerLabel={managerLabel}
          selectedReviewers={selectedReviewers}
          onToggleReviewer={toggleReviewer}
        />
        {data.length > 0 ? (
          <div className="gba:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data} margin={{ top: 16, right: 28, bottom: 8, left: 28 }}>
                <PolarGrid />
                <PolarAngleAxis dataKey="label" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis domain={[0, radarMaxDomain]} />
                <RechartsTooltip />
                {activeSeries.map(series => (
                  <Radar
                    key={`${testId}-radar-${series.reviewer}`}
                    name={series.name}
                    dataKey={series.dataKey}
                    stroke={series.color}
                    fill={series.color}
                    fillOpacity={0.14}
                    strokeWidth={2}
                  />
                ))}
              </RadarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="gba:text-sm gba:text-muted-foreground">{noDataLabel}</p>
        )}
      </CardContent>
    </Card>
  )
}

export default RadarComparisonCard
