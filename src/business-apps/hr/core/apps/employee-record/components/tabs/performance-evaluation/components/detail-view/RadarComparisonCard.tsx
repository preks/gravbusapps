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
import { RadarDataPoint, ReviewerKey, REVIEWER_COLORS } from './types'

const RADAR_AXIS_ANGLE = 90

const getRadarTicks = (maxDomain: number): number[] => {
  const step = maxDomain <= 5 ? 1 : 2
  const ticks: number[] = []
  for (let value = 0; value <= maxDomain; value += step) {
    ticks.push(value)
  }
  return ticks
}

const RadarAxisTick: React.FC<{
  x?: number
  y?: number
  payload?: { value: number }
}> = ({ x = 0, y = 0, payload }) => {
  if (!payload || payload.value === 0) return null
  return (
    <text x={x} y={y} dx={-10} dy={4} textAnchor="end" fontSize={11} fill="hsl(var(--nw-muted-foreground))">
      {payload.value}
    </text>
  )
}

const RadarLegend: React.FC<{
  selfLabel: string
  peerLabel: string
  managerLabel: string
  activeReviewerKeys: ReviewerKey[]
  selectedReviewers: ReviewerKey[]
  onToggleReviewer: (reviewer: ReviewerKey) => void
}> = ({ selfLabel, peerLabel, managerLabel, activeReviewerKeys, selectedReviewers, onToggleReviewer }) => {
  const allEntries = [
    { key: 'self' as ReviewerKey, label: selfLabel, color: REVIEWER_COLORS.self },
    { key: 'peer' as ReviewerKey, label: peerLabel, color: REVIEWER_COLORS.peer },
    { key: 'manager' as ReviewerKey, label: managerLabel, color: REVIEWER_COLORS.manager }
  ]
  const entries = allEntries.filter(entry => activeReviewerKeys.includes(entry.key))

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
  activeReviewerKeys: ReviewerKey[]
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
  activeReviewerKeys,
  radarMaxDomain
}) => {
  const [selectedReviewers, setSelectedReviewers] = useState<ReviewerKey[]>(activeReviewerKeys)

  const toggleReviewer = (reviewer: ReviewerKey) =>
    setSelectedReviewers(previous => getNextSelectedReviewers(previous, reviewer))

  const allActiveSelected =
    activeReviewerKeys.length > 0 && activeReviewerKeys.every(key => selectedReviewers.includes(key))
  const displayedAverageScore = allActiveSelected ? averageScore : computeRadarAverageScore(data, selectedReviewers)
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
          activeReviewerKeys={activeReviewerKeys}
          selectedReviewers={selectedReviewers}
          onToggleReviewer={toggleReviewer}
        />
        {data.length > 0 ? (
          <div className="gba:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data} margin={{ top: 20, right: 32, bottom: 8, left: 32 }}>
                <PolarGrid />
                <PolarAngleAxis dataKey="label" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis
                  angle={RADAR_AXIS_ANGLE}
                  domain={[0, radarMaxDomain]}
                  tickCount={getRadarTicks(radarMaxDomain).length}
                  axisLine={false}
                  tick={<RadarAxisTick />}
                />
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
