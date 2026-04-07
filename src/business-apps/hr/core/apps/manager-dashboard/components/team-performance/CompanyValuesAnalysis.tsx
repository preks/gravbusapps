import React from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@newwork/nw-design-system'
import { Heart } from 'lucide-react'
import type { TeamMemberEvaluation } from '../../hooks/useTeamEvaluations'
import { employeeLabel, employeeInitials, avatarSrc, heatmapScoreCellClass } from '../../utils/heatmapHelpers'

export interface CompanyValuesAnalysisProps {
  members: TeamMemberEvaluation[]
  ratingScaleLimit: number
  loading: boolean
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

const computeValueAverages = (
  scoreMaps: Map<string, Map<string, number | null>>,
  valueNames: string[]
): Map<string, number | null> => {
  const avgs = new Map<string, number | null>()
  for (const vn of valueNames) {
    let sum = 0
    let count = 0
    for (const [, vm] of scoreMaps) {
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

export const CompanyValuesAnalysis: React.FC<CompanyValuesAnalysisProps> = ({ members, ratingScaleLimit, loading }) => {
  if (loading) {
    return (
      <Card className="gba:rounded-xl">
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
  const memberScoreMaps = new Map(members.map(m => [m.employeeId, valueScoreMap(m)]))
  const valueAverages = computeValueAverages(memberScoreMaps, valueNames)

  if (hasNoValues) {
    return (
      <Card className="gba:rounded-xl">
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
    <Card className="gba:rounded-xl">
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
                  const vm = memberScoreMaps.get(m.employeeId) ?? new Map()
                  return (
                    <React.Fragment key={m.employeeId}>
                      <div className="gba:sticky gba:left-0 gba:z-[1] gba:bg-card gba:border-border gba:border gba:rounded-md gba:p-2 gba:text-xs gba:font-medium gba:flex gba:items-center gba:gap-1.5">
                        <Avatar className="gba:h-6 gba:w-6 gba:shrink-0">
                          <AvatarImage src={avatarSrc(m.pictureThumbnail)} alt={employeeLabel(m)} />
                          <AvatarFallback className="gba:text-[9px]">
                            {employeeInitials(m.firstName, m.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="gba:truncate">{employeeLabel(m)}</span>
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
                            className={`gba:flex gba:items-center gba:justify-center gba:rounded-md gba:border gba:border-border gba:p-2 gba:text-xs gba:font-semibold gba:tabular-nums ${heatmapScoreCellClass(score, ratingScaleLimit)}`}
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
                      className={`gba:flex gba:items-center gba:justify-center gba:rounded-md gba:border-t-2 gba:border gba:border-border gba:p-2 gba:text-xs gba:font-bold gba:tabular-nums ${heatmapScoreCellClass(avg, ratingScaleLimit)}`}
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
