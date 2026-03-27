/* eslint-disable newwork-local/no-hardcoded-colors -- Recharts bar fills require fixed hex values per spec */
import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@newwork/nw-design-system'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { Heart } from 'lucide-react'
import type { TeamMemberEvaluation } from '../../hooks/useTeamEvaluations'
import type { DimensionAverage } from '../../utils/dashboardComputations'

export interface CompanyValuesAnalysisProps {
  members: TeamMemberEvaluation[]
  dimensionAverages: DimensionAverage[]
  ratingScaleLimit: number
  loading: boolean
}

const employeeLabel = (m: { firstName: string; lastName: string }): string => {
  const initial = m.lastName?.trim()?.charAt(0)
  return initial ? `${m.firstName} ${initial}.` : m.firstName
}

const collectValueNames = (members: TeamMemberEvaluation[]): string[] => {
  const set = new Set<string>()
  for (const m of members) {
    for (const v of m.companyValues) {
      const n = v.name?.trim()
      if (n) set.add(n)
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}

const valueScoreMap = (m: TeamMemberEvaluation): Map<string, number | null> => {
  const map = new Map<string, number | null>()
  for (const v of m.companyValues) {
    if (v.name) map.set(v.name, v.overallAvg)
  }
  return map
}

const companyValueCellClass = (score: number | null, limit: number): string => {
  if (score == null || score === 0 || limit <= 0) {
    return 'gba:bg-gray-100 gba:dark:bg-gray-800 gba:text-muted-foreground'
  }
  const pct = (score / limit) * 100
  if (!Number.isFinite(pct)) {
    return 'gba:bg-gray-100 gba:dark:bg-gray-800 gba:text-muted-foreground'
  }
  if (pct < 40) {
    return 'gba:bg-red-100 gba:dark:bg-red-900/30 gba:text-red-900 gba:dark:text-red-100'
  }
  if (pct < 60) {
    return 'gba:bg-yellow-100 gba:dark:bg-yellow-900/30 gba:text-yellow-900 gba:dark:text-yellow-100'
  }
  if (pct < 80) {
    return 'gba:bg-green-100 gba:dark:bg-green-900/30 gba:text-green-900 gba:dark:text-green-100'
  }
  return 'gba:bg-green-200 gba:dark:bg-green-800/30 gba:text-green-900 gba:dark:text-green-100'
}

const perspectiveChartData = (dimensionAverages: DimensionAverage[]) =>
  dimensionAverages.map(d => ({
    name: d.name,
    self: d.selfAvg,
    peer: d.peerAvg,
    manager: d.managerAvg
  }))

export const CompanyValuesAnalysis: React.FC<CompanyValuesAnalysisProps> = ({
  members,
  dimensionAverages,
  ratingScaleLimit,
  loading
}) => {
  if (loading) {
    return (
      <Card style={{ borderRadius: '12px' }}>
        <CardHeader className="gba:pb-2">
          <div className="gba:flex gba:items-center gba:gap-2">
            <div className="gba:h-5 gba:w-5 gba:rounded gba:bg-muted gba:animate-pulse" />
            <div className="gba:h-5 gba:w-44 gba:rounded gba:bg-muted gba:animate-pulse" />
          </div>
        </CardHeader>
        <CardContent className="gba:space-y-8">
          <div className="gba:space-y-2">
            <div className="gba:h-4 gba:w-36 gba:rounded gba:bg-muted gba:animate-pulse" />
            <div className="gba:h-48 gba:w-full gba:rounded-lg gba:bg-muted gba:animate-pulse" />
          </div>
          <div className="gba:space-y-2">
            <div className="gba:h-4 gba:w-52 gba:rounded gba:bg-muted gba:animate-pulse" />
            <div className="gba:h-56 gba:w-full gba:rounded-lg gba:bg-muted gba:animate-pulse" />
          </div>
          <div className="gba:space-y-2">
            <div className="gba:h-4 gba:w-40 gba:rounded gba:bg-muted gba:animate-pulse" />
            <div className="gba:h-64 gba:w-full gba:rounded-lg gba:bg-muted gba:animate-pulse" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasNoValues = members.length === 0 || members.every(m => m.companyValues.length === 0)
  const valueNames = collectValueNames(members)
  const barRows = dimensionAverages
    .filter(d => d.teamAvg != null)
    .map(d => ({ name: d.name, teamAvg: d.teamAvg as number }))
    .sort((a, b) => b.teamAvg - a.teamAvg)
  const horizontalHeight = Math.max(160, barRows.length * 30 + 48)

  const perspectiveData = perspectiveChartData(dimensionAverages)
  const perspectiveHeight = Math.max(280, Math.min(480, perspectiveData.length * 40 + 120))

  if (hasNoValues) {
    return (
      <Card style={{ borderRadius: '12px' }}>
        <CardHeader className="gba:pb-2">
          <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
            <Heart className="gba:h-5 gba:w-5 gba:text-muted-foreground" aria-hidden />
            Company Values
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="gba:text-sm gba:text-muted-foreground">No company values data available for this cycle.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card style={{ borderRadius: '12px' }}>
      <CardHeader className="gba:pb-2">
        <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
          <Heart className="gba:h-5 gba:w-5 gba:text-muted-foreground" aria-hidden />
          Company Values
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-8">
        <section className="gba:space-y-3">
          <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground">Values heatmap</h3>
          {valueNames.length === 0 ? (
            <p className="gba:text-sm gba:text-muted-foreground">No company values data available for this cycle.</p>
          ) : (
            <div className="gba:overflow-x-auto gba:-mx-1 gba:px-1">
              <div
                className="gba:grid gba:gap-1 gba:min-w-max"
                style={{
                  gridTemplateColumns: `minmax(7rem, auto) repeat(${valueNames.length}, minmax(6rem, 1fr))`
                }}
              >
                <div className="gba:p-1" />
                {valueNames.map(vn => (
                  <div
                    key={vn}
                    className="gba:p-2 gba:flex gba:items-end gba:justify-center gba:text-xs gba:font-medium gba:text-muted-foreground gba:text-center gba:leading-tight"
                  >
                    {vn}
                  </div>
                ))}
                {members.map(m => {
                  const vm = valueScoreMap(m)
                  return (
                    <React.Fragment key={m.employeeId}>
                      <div className="gba:sticky gba:left-0 gba:z-[1] gba:bg-card gba:border-border gba:border gba:rounded-md gba:p-2 gba:text-xs gba:font-medium">
                        {employeeLabel(m)}
                      </div>
                      {valueNames.map(vn => {
                        const score = vm.get(vn) ?? null
                        const display =
                          score != null && score !== 0
                            ? score % 1 === 0
                              ? String(score)
                              : score.toFixed(1)
                            : score === 0
                              ? '0'
                              : '—'
                        return (
                          <div
                            key={vn}
                            className={`gba:flex gba:items-center gba:justify-center gba:rounded-md gba:border gba:border-border gba:p-2 gba:text-xs gba:font-semibold gba:tabular-nums ${companyValueCellClass(score, ratingScaleLimit)}`}
                          >
                            {display}
                          </div>
                        )
                      })}
                    </React.Fragment>
                  )
                })}
              </div>
            </div>
          )}
        </section>

        <section className="gba:space-y-3">
          <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground">Average score by value</h3>
          {barRows.length === 0 ? (
            <p className="gba:text-sm gba:text-muted-foreground">No team averages to chart.</p>
          ) : (
            <div style={{ width: '100%', height: horizontalHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={barRows} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                  <XAxis type="number" domain={[0, ratingScaleLimit]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} interval={0} />
                  <Bar dataKey="teamAvg" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="gba:space-y-3">
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
            <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground">
              Perspective gap (self vs peer vs manager)
            </h3>
            <Badge variant="secondary" className="gba:text-xs">
              By dimension
            </Badge>
          </div>
          {perspectiveData.length === 0 ? (
            <p className="gba:text-sm gba:text-muted-foreground">No perspective data to chart.</p>
          ) : (
            <div style={{ width: '100%', height: perspectiveHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perspectiveData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="gba:stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={72} />
                  <YAxis domain={[0, ratingScaleLimit]} tick={{ fontSize: 11 }} />
                  <Legend />
                  <Bar dataKey="self" name="Self" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="peer" name="Peer" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="manager" name="Manager" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  )
}
