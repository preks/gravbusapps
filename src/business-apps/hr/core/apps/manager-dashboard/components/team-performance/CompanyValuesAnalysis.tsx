import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@newwork/nw-design-system'
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

const computeValueAverages = (members: TeamMemberEvaluation[], valueNames: string[]): Map<string, number | null> => {
  const avgs = new Map<string, number | null>()
  for (const vn of valueNames) {
    let sum = 0
    let count = 0
    for (const m of members) {
      const vm = valueScoreMap(m)
      const score = vm.get(vn)
      if (score != null && score !== 0) {
        sum += score
        count++
      }
    }
    avgs.set(vn, count > 0 ? Math.round((sum / count) * 10) / 10 : null)
  }
  return avgs
}

export const CompanyValuesAnalysis: React.FC<CompanyValuesAnalysisProps> = ({
  members,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        <CardContent>
          <div className="gba:h-48 gba:w-full gba:rounded-lg gba:bg-muted gba:animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  const hasNoValues = members.length === 0 || members.every(m => m.companyValues.length === 0)
  const valueNames = collectValueNames(members)
  const valueAverages = computeValueAverages(members, valueNames)

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
      <CardContent>
        <section>
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

                {/* Average row */}
                <div className="gba:sticky gba:left-0 gba:z-[1] gba:bg-muted/60 gba:border-border gba:border-t-2 gba:border gba:rounded-md gba:p-2 gba:text-xs gba:font-bold">
                  Average
                </div>
                {valueNames.map(vn => {
                  const avg = valueAverages.get(vn) ?? null
                  const display = avg != null ? (avg % 1 === 0 ? String(avg) : avg.toFixed(1)) : '—'
                  return (
                    <div
                      key={`avg-${vn}`}
                      className={`gba:flex gba:items-center gba:justify-center gba:rounded-md gba:border-t-2 gba:border gba:border-border gba:p-2 gba:text-xs gba:font-bold gba:tabular-nums ${companyValueCellClass(avg, ratingScaleLimit)}`}
                    >
                      {display}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  )
}
