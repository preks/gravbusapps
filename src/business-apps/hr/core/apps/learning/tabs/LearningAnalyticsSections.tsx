import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import type { LearningAnalyticsAttemptRow, LearningAnalyticsModel } from './learningAnalyticsModel'

interface AnalyticsTableCardProps {
  title: string
  emptyLabel: string
  children: React.ReactNode
  isEmpty: boolean
  testId: string
}

interface MetricTableLabels {
  name: string
  completed: string
  passRate: string
  averageScore: string
}

interface LearnerTableLabels {
  learner: string
  course: string
  status: string
  score: string
  time: string
}

const AnalyticsTableCard: React.FC<AnalyticsTableCardProps> = ({ title, emptyLabel, children, isEmpty, testId }) => (
  <Card data-testid={testId}>
    <CardHeader>
      <CardTitle className="gba:text-sm">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      {isEmpty ? (
        <p className="gba:py-8 gba:text-center gba:text-sm gba:text-muted-foreground">{emptyLabel}</p>
      ) : (
        children
      )}
    </CardContent>
  </Card>
)

function formatPercent(value: number): string {
  return `${Math.round(value)}%`
}

function formatMinutes(value?: number): string {
  return value === undefined ? '-' : `${value}m`
}

export const PassRateTable: React.FC<{
  title: string
  emptyLabel: string
  rows: LearningAnalyticsModel['passRateByCourse']
  labels: MetricTableLabels
  testId: string
}> = ({ title, emptyLabel, rows, labels, testId }) => (
  <AnalyticsTableCard title={title} emptyLabel={emptyLabel} isEmpty={rows.length === 0} testId={testId}>
    <table className="gba:w-full gba:text-sm">
      <thead>
        <tr className="gba:border-b gba:text-left gba:text-muted-foreground">
          <th className="gba:py-2">{labels.name}</th>
          <th className="gba:py-2 gba:text-right">{labels.completed}</th>
          <th className="gba:py-2 gba:text-right">{labels.passRate}</th>
          <th className="gba:py-2 gba:text-right">{labels.averageScore}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr key={row.label} className="gba:border-b last:gba:border-b-0">
            <td className="gba:py-2 gba:font-medium">{row.label}</td>
            <td className="gba:py-2 gba:text-right">{row.completed}</td>
            <td className="gba:py-2 gba:text-right">{formatPercent(row.passRate)}</td>
            <td className="gba:py-2 gba:text-right">{formatPercent(row.averageScore)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </AnalyticsTableCard>
)

export const LearnerDrillDownTable: React.FC<{
  title: string
  emptyLabel: string
  rows: LearningAnalyticsAttemptRow[]
  labels: LearnerTableLabels
}> = ({ title, emptyLabel, rows, labels }) => (
  <AnalyticsTableCard
    title={title}
    emptyLabel={emptyLabel}
    isEmpty={rows.length === 0}
    testId="learning-analytics-learner-table"
  >
    <div className="gba:max-h-[304px] gba:overflow-auto">
      <table className="gba:w-full gba:text-sm">
        <thead>
          <tr className="gba:border-b gba:text-left gba:text-muted-foreground">
            <th className="gba:py-2">{labels.learner}</th>
            <th className="gba:py-2">{labels.course}</th>
            <th className="gba:py-2">{labels.status}</th>
            <th className="gba:py-2 gba:text-right">{labels.score}</th>
            <th className="gba:py-2 gba:text-right">{labels.time}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} className="gba:border-b last:gba:border-b-0">
              <td className="gba:py-2 gba:font-medium">{row.employeeName}</td>
              <td className="gba:py-2">{row.courseTitle}</td>
              <td className="gba:py-2">{row.status.replace(/_/gu, ' ').toLowerCase()}</td>
              <td className="gba:py-2 gba:text-right">
                {row.scorePct === undefined ? '-' : formatPercent(row.scorePct)}
              </td>
              <td className="gba:py-2 gba:text-right">{formatMinutes(row.timeTakenMinutes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </AnalyticsTableCard>
)

export const BandDistributionList: React.FC<{
  title: string
  emptyLabel: string
  rows: LearningAnalyticsModel['bandDistribution']
}> = ({ title, emptyLabel, rows }) => (
  <AnalyticsTableCard
    title={title}
    emptyLabel={emptyLabel}
    isEmpty={rows.length === 0}
    testId="learning-analytics-band-list"
  >
    <div className="gba:space-y-2">
      {rows.map(row => (
        <div key={row.band} className="gba:flex gba:items-center gba:justify-between gba:rounded-md gba:border gba:p-3">
          <span className="gba:text-sm gba:font-medium">{row.band}</span>
          <span className="gba:text-sm gba:text-muted-foreground">{row.value}</span>
        </div>
      ))}
    </div>
  </AnalyticsTableCard>
)

export const AnalyticsPlaceholderCard: React.FC<{
  title: string
  description: string
  items: string[]
  testId: string
}> = ({ title, description, items, testId }) => (
  <Card data-testid={testId}>
    <CardHeader>
      <CardTitle className="gba:text-sm">{title}</CardTitle>
    </CardHeader>
    <CardContent className="gba:space-y-3">
      <p className="gba:text-sm gba:text-muted-foreground">{description}</p>
      <ul className="gba:list-disc gba:space-y-1 gba:pl-5 gba:text-sm gba:text-muted-foreground">
        {items.map(item => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </CardContent>
  </Card>
)
