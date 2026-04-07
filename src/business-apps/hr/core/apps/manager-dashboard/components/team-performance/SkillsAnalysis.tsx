import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@newwork/nw-design-system'
import { Brain } from 'lucide-react'
import type { TeamMemberSkills, SkillGrowthEntry } from '../../hooks/useTeamSkills'
import type { TeamMemberEvaluation } from '../../hooks/useTeamEvaluations'

export interface SkillsAnalysisProps {
  skillsMembers: TeamMemberSkills[]
  skillGrowth: SkillGrowthEntry[]
  evaluationMembers: TeamMemberEvaluation[]
  loading: boolean
}

const employeeLabel = (m: { firstName: string; lastName: string }): string => {
  const initial = m.lastName?.trim()?.charAt(0)
  return initial ? `${m.firstName} ${initial}.` : m.firstName
}

const topSkillsByFrequency = (members: TeamMemberSkills[]): string[] => {
  const freq = new Map<string, number>()
  for (const m of members) {
    for (const s of m.topSkills) {
      const name = s.name?.trim()
      if (!name) continue
      freq.set(name, (freq.get(name) ?? 0) + 1)
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([name]) => name)
}

const memberSkillMap = (m: TeamMemberSkills): Map<string, number> => {
  const map = new Map<string, number>()
  for (const s of m.topSkills) {
    if (s.name) map.set(s.name, s.level)
  }
  return map
}

const skillLevelCellClass = (level: number | undefined): string => {
  if (level == null || level === 0) {
    return 'gba:bg-gray-100 gba:dark:bg-gray-800 gba:text-muted-foreground'
  }
  if (level <= 2) {
    return 'gba:bg-red-100 gba:dark:bg-red-900/30 gba:text-red-900 gba:dark:text-red-100'
  }
  if (level === 3) {
    return 'gba:bg-yellow-100 gba:dark:bg-yellow-900/30 gba:text-yellow-900 gba:dark:text-yellow-100'
  }
  if (level === 4) {
    return 'gba:bg-green-100 gba:dark:bg-green-900/30 gba:text-green-900 gba:dark:text-green-100'
  }
  return 'gba:bg-green-200 gba:dark:bg-green-800/30 gba:text-green-900 gba:dark:text-green-100'
}

const computeSkillAverages = (members: TeamMemberSkills[], skillNames: string[]): Map<string, number | null> => {
  const avgs = new Map<string, number | null>()
  for (const sn of skillNames) {
    let sum = 0
    let count = 0
    for (const m of members) {
      const sm = memberSkillMap(m)
      const level = sm.get(sn)
      if (level != null && level !== 0) {
        sum += level
        count++
      }
    }
    avgs.set(sn, count > 0 ? Math.round((sum / count) * 10) / 10 : null)
  }
  return avgs
}

const computeEvalSkillAverages = (rows: EvalSkillRow[], skillNames: string[]): Map<string, number | null> => {
  const avgs = new Map<string, number | null>()
  for (const sn of skillNames) {
    let sum = 0
    let count = 0
    for (const m of rows) {
      const score = m.scores.get(sn)
      if (score != null) {
        sum += score
        count++
      }
    }
    avgs.set(sn, count > 0 ? Math.round((sum / count) * 10) / 10 : null)
  }
  return avgs
}

interface EvalSkillRow {
  employeeId: string
  firstName: string
  lastName: string
  scores: Map<string, number>
}

function evalSkillNames(members: TeamMemberEvaluation[]): string[] {
  const freq = new Map<string, number>()
  for (const m of members) {
    for (const s of m.skills) {
      const name = s.name?.trim()
      if (!name || name === 'Unknown') continue
      freq.set(name, (freq.get(name) ?? 0) + 1)
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([name]) => name)
}

function evalSkillRows(members: TeamMemberEvaluation[]): EvalSkillRow[] {
  return members
    .filter(m => m.skills.length > 0)
    .map(m => {
      const scores = new Map<string, number>()
      for (const s of m.skills) {
        if (s.name && s.overallAvg != null) scores.set(s.name, s.overallAvg)
      }
      return { employeeId: m.employeeId, firstName: m.firstName, lastName: m.lastName, scores }
    })
}

const scoreCellClass = (score: number | undefined, limit: number): string => {
  if (score == null) return 'gba:bg-gray-100 gba:dark:bg-gray-800 gba:text-muted-foreground'
  const pct = score / limit
  if (pct < 0.4) return 'gba:bg-red-100 gba:dark:bg-red-900/30 gba:text-red-900 gba:dark:text-red-100'
  if (pct < 0.6) return 'gba:bg-yellow-100 gba:dark:bg-yellow-900/30 gba:text-yellow-900 gba:dark:text-yellow-100'
  if (pct < 0.8) return 'gba:bg-green-100 gba:dark:bg-green-900/30 gba:text-green-900 gba:dark:text-green-100'
  return 'gba:bg-green-200 gba:dark:bg-green-800/30 gba:text-green-900 gba:dark:text-green-100'
}

export const SkillsAnalysis: React.FC<SkillsAnalysisProps> = ({
  skillsMembers,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  skillGrowth,
  evaluationMembers,
  loading
}) => {
  if (loading) {
    return (
      <Card style={{ borderRadius: '12px' }}>
        <CardHeader className="gba:pb-2">
          <div className="gba:flex gba:items-center gba:gap-2">
            <div className="gba:h-5 gba:w-5 gba:rounded gba:bg-muted gba:animate-pulse" />
            <div className="gba:h-5 gba:w-40 gba:rounded gba:bg-muted gba:animate-pulse" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="gba:h-48 gba:w-full gba:rounded-lg gba:bg-muted gba:animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  const hasStandaloneSkills = skillsMembers.some(m => m.topSkills.length > 0)

  const topSkills = topSkillsByFrequency(skillsMembers)

  const eSkillNames = evalSkillNames(evaluationMembers)
  const eRows = evalSkillRows(evaluationMembers)
  const ratingLimit = evaluationMembers.find(m => m.ratingScaleLimit != null)?.ratingScaleLimit ?? 5

  const useEvalFallback = !hasStandaloneSkills && eSkillNames.length > 0

  const evalAvgs = computeEvalSkillAverages(eRows, eSkillNames)
  const standaloneAvgs = computeSkillAverages(skillsMembers, topSkills)

  return (
    <Card style={{ borderRadius: '12px' }}>
      <CardHeader className="gba:pb-2">
        <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
          <Brain className="gba:h-5 gba:w-5 gba:text-muted-foreground" aria-hidden />
          Skills Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <section>
          {useEvalFallback ? (
            eRows.length === 0 ? (
              <p className="gba:text-sm gba:text-muted-foreground">No skill data to display.</p>
            ) : (
              <div className="gba:overflow-x-auto gba:-mx-1 gba:px-1">
                <div
                  className="gba:grid gba:gap-1 gba:min-w-max"
                  style={{
                    gridTemplateColumns: `minmax(7rem, auto) repeat(${eSkillNames.length}, minmax(6rem, 1fr))`
                  }}
                >
                  <div className="gba:p-1" />
                  {eSkillNames.map(skill => (
                    <div
                      key={skill}
                      className="gba:p-2 gba:flex gba:items-end gba:justify-center gba:text-xs gba:font-medium gba:text-muted-foreground gba:text-center gba:leading-tight"
                    >
                      {skill}
                    </div>
                  ))}
                  {eRows.map(m => (
                    <React.Fragment key={m.employeeId}>
                      <div className="gba:sticky gba:left-0 gba:z-[1] gba:bg-card gba:border-border gba:border gba:rounded-md gba:p-2 gba:text-xs gba:font-medium">
                        {employeeLabel(m)}
                      </div>
                      {eSkillNames.map(skill => {
                        const score = m.scores.get(skill)
                        const display = score != null ? score.toFixed(1) : '—'
                        return (
                          <div
                            key={skill}
                            className={`gba:flex gba:items-center gba:justify-center gba:rounded-md gba:border gba:border-border gba:p-2 gba:text-xs gba:font-semibold gba:tabular-nums ${scoreCellClass(score, ratingLimit)}`}
                          >
                            {display}
                          </div>
                        )
                      })}
                    </React.Fragment>
                  ))}

                  {/* Average row */}
                  <div className="gba:sticky gba:left-0 gba:z-[1] gba:bg-muted/60 gba:border-border gba:border-t-2 gba:border gba:rounded-md gba:p-2 gba:text-xs gba:font-bold">
                    Average
                  </div>
                  {eSkillNames.map(skill => {
                    const avg = evalAvgs.get(skill) ?? null
                    const display = avg != null ? avg.toFixed(1) : '—'
                    return (
                      <div
                        key={`avg-${skill}`}
                        className={`gba:flex gba:items-center gba:justify-center gba:rounded-md gba:border-t-2 gba:border gba:border-border gba:p-2 gba:text-xs gba:font-bold gba:tabular-nums ${scoreCellClass(avg ?? undefined, ratingLimit)}`}
                      >
                        {display}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          ) : topSkills.length === 0 || skillsMembers.length === 0 ? (
            <p className="gba:text-sm gba:text-muted-foreground">No skill data to display.</p>
          ) : (
            <div className="gba:overflow-x-auto gba:-mx-1 gba:px-1">
              <div
                className="gba:grid gba:gap-1 gba:min-w-max"
                style={{
                  gridTemplateColumns: `minmax(7rem, auto) repeat(${topSkills.length}, minmax(6rem, 1fr))`
                }}
              >
                <div className="gba:p-1" />
                {topSkills.map(skill => (
                  <div
                    key={skill}
                    className="gba:p-2 gba:flex gba:items-end gba:justify-center gba:text-xs gba:font-medium gba:text-muted-foreground gba:text-center gba:leading-tight"
                  >
                    {skill}
                  </div>
                ))}
                {skillsMembers.map(m => {
                  const sm = memberSkillMap(m)
                  return (
                    <React.Fragment key={m.employeeId}>
                      <div className="gba:sticky gba:left-0 gba:z-[1] gba:bg-card gba:border-border gba:border gba:rounded-md gba:p-2 gba:text-xs gba:font-medium">
                        {employeeLabel(m)}
                      </div>
                      {topSkills.map(skill => {
                        const level = sm.get(skill)
                        const display = level != null && level !== 0 ? String(level) : level === 0 ? '0' : '—'
                        return (
                          <div
                            key={skill}
                            className={`gba:flex gba:items-center gba:justify-center gba:rounded-md gba:border gba:border-border gba:p-2 gba:text-xs gba:font-semibold gba:tabular-nums ${skillLevelCellClass(level)}`}
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
                {topSkills.map(skill => {
                  const avg = standaloneAvgs.get(skill) ?? null
                  const display = avg != null ? (avg % 1 === 0 ? String(avg) : avg.toFixed(1)) : '—'
                  return (
                    <div
                      key={`avg-${skill}`}
                      className={`gba:flex gba:items-center gba:justify-center gba:rounded-md gba:border-t-2 gba:border gba:border-border gba:p-2 gba:text-xs gba:font-bold gba:tabular-nums ${skillLevelCellClass(avg != null ? Math.round(avg) : undefined)}`}
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
