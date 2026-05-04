import React, { useMemo, useState } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@newwork/nw-design-system'
import {
  BrainIcon as Brain,
  ArrowsDownUpIcon as ArrowUpDown,
  ArrowUpIcon as ArrowUp,
  ArrowDownIcon as ArrowDown
} from '@phosphor-icons/react'
import type { TeamMemberSkills } from '../../hooks/useTeamSkills'
import type { TeamMemberEvaluation } from '../../hooks/useTeamEvaluations'
import {
  employeeInitials,
  avatarSrc,
  chartBandBg,
  formatScore,
  HEADER_BG,
  HEADER_ACTIVE_BG,
  AVG_ROW_BG
} from '../../utils/heatmapHelpers'

export interface SkillsAnalysisProps {
  skillsMembers: TeamMemberSkills[]
  evaluationMembers: TeamMemberEvaluation[]
  loading: boolean
}

type SortDir = 'asc' | 'desc'

const STANDALONE_SKILLS_MAX = 10

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

const computeAverages = (scoreMaps: Map<string, Map<string, number>>, names: string[]): Map<string, number | null> => {
  const avgs = new Map<string, number | null>()
  for (const n of names) {
    let sum = 0
    let count = 0
    for (const [, sm] of scoreMaps) {
      const v = sm.get(n)
      if (v != null && v !== 0) {
        sum += v
        count++
      }
    }
    avgs.set(n, count > 0 ? Math.round((sum / count) * 10) / 10 : null)
  }
  return avgs
}

interface EvalSkillRow {
  employeeId: string
  firstName: string
  lastName: string
  pictureThumbnail?: string
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
  return members.map(m => {
    const scores = new Map<string, number>()
    for (const s of m.skills) {
      if (s.name && s.overallAvg != null) scores.set(s.name, s.overallAvg)
    }
    return {
      employeeId: m.employeeId,
      firstName: m.firstName,
      lastName: m.lastName,
      pictureThumbnail: m.pictureThumbnail,
      scores
    }
  })
}

const SortIcon: React.FC<{ column: string; sortCol: string | null; sortDir: SortDir | null }> = ({
  column,
  sortCol,
  sortDir
}) => {
  if (sortCol !== column) return <ArrowUpDown className="gba:h-3 gba:w-3 gba:opacity-30" />
  return sortDir === 'asc' ? <ArrowUp className="gba:h-3 gba:w-3" /> : <ArrowDown className="gba:h-3 gba:w-3" />
}

interface SkillsTableProps {
  skillNames: string[]
  rows: Array<{
    key: string
    firstName: string
    lastName: string
    pictureThumbnail?: string
    scoreMap: Map<string, number | null>
  }>
  averages: Map<string, number | null>
  scaleMax: number
}

const SkillsTable: React.FC<SkillsTableProps> = ({ skillNames, rows, averages, scaleMax }) => {
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir | null>(null)

  const toggleSort = (col: string) => {
    if (sortCol === col) {
      if (sortDir === 'desc') setSortDir('asc')
      else {
        setSortCol(null)
        setSortDir(null)
      }
    } else {
      setSortCol(col)
      setSortDir('desc')
    }
  }

  const sortedRows = useMemo(() => {
    if (!sortCol || !sortDir) return rows
    return [...rows].sort((a, b) => {
      if (sortCol === '__employee') {
        const cmp = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
        return sortDir === 'asc' ? cmp : -cmp
      }
      const aVal = a.scoreMap.get(sortCol) ?? null
      const bVal = b.scoreMap.get(sortCol) ?? null
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    })
  }, [rows, sortCol, sortDir])

  return (
    <div className="gba:overflow-auto gba:max-h-[520px] gba:rounded-md gba:border gba:border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className="gba:sticky gba:top-0 gba:left-0 gba:z-30 gba:w-px gba:cursor-pointer gba:select-none gba:text-xs"
              style={sortCol === '__employee' ? HEADER_ACTIVE_BG : HEADER_BG}
              onClick={() => toggleSort('__employee')}
            >
              <span className="gba:inline-flex gba:items-center gba:gap-1 gba:whitespace-nowrap">
                Employee
                <SortIcon column="__employee" sortCol={sortCol} sortDir={sortDir} />
              </span>
            </TableHead>
            {skillNames.map(sn => (
              <TableHead
                key={sn}
                className="gba:sticky gba:top-0 gba:z-20 gba:text-center gba:cursor-pointer gba:select-none gba:min-w-[80px] gba:text-xs"
                style={sortCol === sn ? HEADER_ACTIVE_BG : HEADER_BG}
                onClick={() => toggleSort(sn)}
              >
                <div className="gba:flex gba:flex-col gba:items-center gba:gap-0.5">
                  <span className="gba:whitespace-nowrap">{sn}</span>
                  <SortIcon column={sn} sortCol={sortCol} sortDir={sortDir} />
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRows.map(row => (
            <TableRow key={row.key}>
              <TableCell className="gba:sticky gba:left-0 gba:bg-background gba:z-10 gba:w-px">
                <div className="gba:flex gba:items-center gba:gap-1.5 gba:whitespace-nowrap">
                  <Avatar className="gba:h-6 gba:w-6 gba:shrink-0">
                    <AvatarImage src={avatarSrc(row.pictureThumbnail)} alt={`${row.firstName} ${row.lastName}`} />
                    <AvatarFallback className="gba:text-[9px]">
                      {employeeInitials(row.firstName, row.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="gba:text-xs gba:font-medium">{`${row.firstName} ${row.lastName}`.trim()}</span>
                </div>
              </TableCell>
              {skillNames.map(sn => {
                const score = row.scoreMap.get(sn) ?? null
                const hasValue = score != null && score !== 0
                return (
                  <TableCell
                    key={sn}
                    className={`gba:text-center gba:text-xs gba:tabular-nums gba:font-semibold ${
                      hasValue ? '' : 'gba:text-muted-foreground'
                    }`}
                    style={hasValue ? chartBandBg(score, scaleMax) : {}}
                  >
                    {formatScore(score)}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}

          {/* Average summary row */}
          <TableRow className="gba:border-t-2">
            <TableCell className="gba:sticky gba:left-0 gba:z-10 gba:w-px gba:text-xs gba:font-bold" style={AVG_ROW_BG}>
              Average
            </TableCell>
            {skillNames.map(sn => {
              const avg = averages.get(sn) ?? null
              const avgStyle = avg === null ? {} : chartBandBg(avg, scaleMax)
              return (
                <TableCell
                  key={`avg-${sn}`}
                  className="gba:text-center gba:text-xs gba:font-bold gba:tabular-nums"
                  style={{ ...AVG_ROW_BG, ...avgStyle }}
                >
                  {formatScore(avg)}
                </TableCell>
              )
            })}
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}

export const SkillsAnalysis: React.FC<SkillsAnalysisProps> = ({ skillsMembers, evaluationMembers, loading }) => {
  const hasStandaloneSkills = skillsMembers.some(m => m.topSkills.length > 0)
  const topSkills = topSkillsByFrequency(skillsMembers)
  const eSkillNames = evalSkillNames(evaluationMembers)
  const eRows = evalSkillRows(evaluationMembers)
  const ratingLimit = evaluationMembers.find(m => m.ratingScaleLimit != null)?.ratingScaleLimit ?? 5
  const useEvalFallback = !hasStandaloneSkills && eSkillNames.length > 0

  const memberSkillMaps = useMemo(
    () => new Map(skillsMembers.map(m => [m.employeeId, memberSkillMap(m)])),
    [skillsMembers]
  )

  const evalScoreMaps = useMemo(() => new Map(eRows.map(r => [r.employeeId, r.scores])), [eRows])

  const standaloneAvgs = useMemo(() => computeAverages(memberSkillMaps, topSkills), [memberSkillMaps, topSkills])

  const evalAvgs = useMemo(() => computeAverages(evalScoreMaps, eSkillNames), [evalScoreMaps, eSkillNames])

  if (loading) {
    return (
      <Card className="gba:rounded-xl gba:h-full">
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

  if (useEvalFallback) {
    const rows = eRows.map(r => ({
      key: r.employeeId,
      firstName: r.firstName,
      lastName: r.lastName,
      pictureThumbnail: r.pictureThumbnail,
      scoreMap: r.scores
    }))

    return (
      <Card className="gba:rounded-xl gba:h-full">
        <CardHeader className="gba:pb-2">
          <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
            <Brain className="gba:h-5 gba:w-5 gba:text-muted-foreground" aria-hidden />
            Skills Analysis
            <span className="gba:text-xs gba:font-normal gba:text-muted-foreground">(scale 0–{ratingLimit})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SkillsTable skillNames={eSkillNames} rows={rows} averages={evalAvgs} scaleMax={ratingLimit} />
        </CardContent>
      </Card>
    )
  }

  if (topSkills.length === 0 || skillsMembers.length === 0) {
    return (
      <Card className="gba:rounded-xl gba:h-full">
        <CardHeader className="gba:pb-2">
          <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
            <Brain className="gba:h-5 gba:w-5 gba:text-muted-foreground" aria-hidden />
            Skills Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="gba:text-sm gba:text-muted-foreground">No skill data to display.</p>
        </CardContent>
      </Card>
    )
  }

  const rows = skillsMembers.map(m => ({
    key: m.employeeId,
    firstName: m.firstName,
    lastName: m.lastName,
    pictureThumbnail: m.pictureThumbnail,
    scoreMap: memberSkillMaps.get(m.employeeId) ?? new Map<string, number | null>()
  }))

  return (
    <Card className="gba:rounded-xl gba:h-full">
      <CardHeader className="gba:pb-2">
        <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
          <Brain className="gba:h-5 gba:w-5 gba:text-muted-foreground" aria-hidden />
          Skills Analysis
          <span className="gba:text-xs gba:font-normal gba:text-muted-foreground">
            (scale 0–{STANDALONE_SKILLS_MAX})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <SkillsTable skillNames={topSkills} rows={rows} averages={standaloneAvgs} scaleMax={STANDALONE_SKILLS_MAX} />
      </CardContent>
    </Card>
  )
}
