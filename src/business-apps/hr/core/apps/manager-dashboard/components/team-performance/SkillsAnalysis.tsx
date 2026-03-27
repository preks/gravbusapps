/* eslint-disable newwork-local/no-hardcoded-colors -- Recharts bar fills require fixed hex values per spec */
import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@newwork/nw-design-system'
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { Brain, Plus, RefreshCw, X } from 'lucide-react'
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

const skillBarData = (members: TeamMemberSkills[]) => {
  const levelSum = new Map<string, { sum: number; count: number }>()
  for (const m of members) {
    for (const s of m.topSkills) {
      const name = s.name?.trim()
      if (!name) continue
      const cur = levelSum.get(name) ?? { sum: 0, count: 0 }
      cur.sum += s.level
      cur.count += 1
      levelSum.set(name, cur)
    }
  }
  return [...levelSum.entries()]
    .map(([name, { sum, count }]) => ({
      name,
      avg: Math.round((sum / count) * 10) / 10
    }))
    .sort((a, b) => b.avg - a.avg)
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

function evalSkillBarData(members: TeamMemberEvaluation[], ratingScaleLimit: number) {
  const sums = new Map<string, { sum: number; count: number }>()
  for (const m of members) {
    for (const s of m.skills) {
      const name = s.name?.trim()
      if (!name || name === 'Unknown' || s.overallAvg == null) continue
      const cur = sums.get(name) ?? { sum: 0, count: 0 }
      cur.sum += s.overallAvg
      cur.count += 1
      sums.set(name, cur)
    }
  }
  return [...sums.entries()]
    .map(([name, { sum, count }]) => ({
      name,
      avg: Math.round((sum / count) * 10) / 10,
      max: ratingScaleLimit
    }))
    .sort((a, b) => b.avg - a.avg)
}

const scoreCellClass = (score: number | undefined, limit: number): string => {
  if (score == null) return 'gba:bg-gray-100 gba:dark:bg-gray-800 gba:text-muted-foreground'
  const pct = score / limit
  if (pct < 0.4) return 'gba:bg-red-100 gba:dark:bg-red-900/30 gba:text-red-900 gba:dark:text-red-100'
  if (pct < 0.6) return 'gba:bg-yellow-100 gba:dark:bg-yellow-900/30 gba:text-yellow-900 gba:dark:text-yellow-100'
  if (pct < 0.8) return 'gba:bg-green-100 gba:dark:bg-green-900/30 gba:text-green-900 gba:dark:text-green-100'
  return 'gba:bg-green-200 gba:dark:bg-green-800/30 gba:text-green-900 gba:dark:text-green-100'
}

const changeIcon = (type: 'added' | 'updated' | 'removed') => {
  if (type === 'added') return <Plus className="gba:h-3.5 gba:w-3.5" aria-hidden />
  if (type === 'updated') return <RefreshCw className="gba:h-3.5 gba:w-3.5" aria-hidden />
  return <X className="gba:h-3.5 gba:w-3.5" aria-hidden />
}

const changeBadgeClass = (type: 'added' | 'updated' | 'removed') => {
  if (type === 'added') return 'gba:text-green-600 gba:border-green-200 gba:dark:text-green-400'
  if (type === 'updated') return 'gba:text-blue-600 gba:border-blue-200 gba:dark:text-blue-400'
  return 'gba:text-red-600 gba:border-red-200 gba:dark:text-red-400'
}

const formatDate = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export const SkillsAnalysis: React.FC<SkillsAnalysisProps> = ({
  skillsMembers,
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
        <CardContent className="gba:space-y-8">
          <div className="gba:space-y-2">
            <div className="gba:h-4 gba:w-32 gba:rounded gba:bg-muted gba:animate-pulse" />
            <div className="gba:h-48 gba:w-full gba:rounded-lg gba:bg-muted gba:animate-pulse" />
          </div>
          <div className="gba:space-y-2">
            <div className="gba:h-4 gba:w-48 gba:rounded gba:bg-muted gba:animate-pulse" />
            <div className="gba:h-56 gba:w-full gba:rounded-lg gba:bg-muted gba:animate-pulse" />
          </div>
          <div className="gba:space-y-2">
            <div className="gba:h-4 gba:w-36 gba:rounded gba:bg-muted gba:animate-pulse" />
            <div className="gba:h-24 gba:w-full gba:rounded-lg gba:bg-muted gba:animate-pulse" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasStandaloneSkills = skillsMembers.some(m => m.topSkills.length > 0)

  const topSkills = topSkillsByFrequency(skillsMembers)
  const barRows = skillBarData(skillsMembers)

  const eSkillNames = evalSkillNames(evaluationMembers)
  const eRows = evalSkillRows(evaluationMembers)
  const ratingLimit = evaluationMembers.find(m => m.ratingScaleLimit != null)?.ratingScaleLimit ?? 5
  const eBarRows = evalSkillBarData(evaluationMembers, ratingLimit)
  const eBarHeight = Math.max(160, eBarRows.length * 30 + 48)

  const barHeight = Math.max(160, barRows.length * 30 + 48)

  const useEvalFallback = !hasStandaloneSkills && eSkillNames.length > 0

  return (
    <Card style={{ borderRadius: '12px' }}>
      <CardHeader className="gba:pb-2">
        <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
          <Brain className="gba:h-5 gba:w-5 gba:text-muted-foreground" aria-hidden />
          Skills Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-8">
        <section className="gba:space-y-3">
          <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground">
            {useEvalFallback ? 'Skills scores (from evaluations)' : 'Skills heatmap'}
          </h3>
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
              </div>
            </div>
          )}
        </section>

        <section className="gba:space-y-3">
          <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground">Team average by skill</h3>
          {useEvalFallback ? (
            eBarRows.length === 0 ? (
              <p className="gba:text-sm gba:text-muted-foreground">No averages to chart.</p>
            ) : (
              <div style={{ width: '100%', height: eBarHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={eBarRows} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                    <XAxis type="number" domain={[0, ratingLimit]} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} interval={0} />
                    <Bar dataKey="avg" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )
          ) : barRows.length === 0 ? (
            <p className="gba:text-sm gba:text-muted-foreground">No averages to chart.</p>
          ) : (
            <div style={{ width: '100%', height: barHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={barRows} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                  <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} interval={0} />
                  <Bar dataKey="avg" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="gba:space-y-3">
          <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground">Skill growth (last 6 months)</h3>
          {skillGrowth.length === 0 ? (
            <p className="gba:text-sm gba:text-muted-foreground">No skill changes detected in the last 6 months</p>
          ) : (
            <div className="gba:space-y-4">
              {skillGrowth.map(entry => (
                <div key={entry.employeeId} className="gba:space-y-1.5">
                  <div className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:text-sm">
                    <span className="gba:font-medium">{employeeLabel(entry)}</span>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      {entry.newSkillsCount > 0 && (
                        <Badge
                          variant="outline"
                          className="gba:gap-1 gba:text-green-600 gba:border-green-200 gba:dark:text-green-400"
                        >
                          <Plus className="gba:h-3 gba:w-3" aria-hidden />
                          {entry.newSkillsCount} added
                        </Badge>
                      )}
                      {entry.updatedSkillsCount > 0 && (
                        <Badge
                          variant="outline"
                          className="gba:gap-1 gba:text-blue-600 gba:border-blue-200 gba:dark:text-blue-400"
                        >
                          <RefreshCw className="gba:h-3 gba:w-3" aria-hidden />
                          {entry.updatedSkillsCount} updated
                        </Badge>
                      )}
                      {entry.removedSkillsCount > 0 && (
                        <Badge
                          variant="outline"
                          className="gba:gap-1 gba:text-red-600 gba:border-red-200 gba:dark:text-red-400"
                        >
                          <X className="gba:h-3 gba:w-3" aria-hidden />
                          {entry.removedSkillsCount} removed
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ul className="gba:pl-4 gba:space-y-0.5">
                    {entry.recentChanges.slice(0, 5).map((c, i) => (
                      <li key={i} className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground">
                        <span className={changeBadgeClass(c.changeType)}>{changeIcon(c.changeType)}</span>
                        <span>{c.skillName}</span>
                        {c.changeType !== 'removed' && <span className="gba:tabular-nums">Lv. {c.level}</span>}
                        <span className="gba:ml-auto gba:tabular-nums">{formatDate(c.changedAt)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  )
}
