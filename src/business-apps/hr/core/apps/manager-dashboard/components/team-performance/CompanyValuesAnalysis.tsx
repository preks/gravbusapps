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
import { Heart, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import type { TeamMemberEvaluation } from '../../hooks/useTeamEvaluations'
import {
  employeeLabel,
  employeeInitials,
  avatarSrc,
  chartBandBg,
  formatScore,
  HEADER_BG,
  HEADER_ACTIVE_BG,
  AVG_ROW_BG
} from '../../utils/heatmapHelpers'

export interface CompanyValuesAnalysisProps {
  members: TeamMemberEvaluation[]
  ratingScaleLimit: number
  loading: boolean
}

type SortDir = 'asc' | 'desc'

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

const SortIcon: React.FC<{ column: string; sortCol: string | null; sortDir: SortDir | null }> = ({
  column,
  sortCol,
  sortDir
}) => {
  if (sortCol !== column) return <ArrowUpDown className="gba:h-3 gba:w-3 gba:opacity-30" />
  return sortDir === 'asc' ? <ArrowUp className="gba:h-3 gba:w-3" /> : <ArrowDown className="gba:h-3 gba:w-3" />
}

export const CompanyValuesAnalysis: React.FC<CompanyValuesAnalysisProps> = ({ members, ratingScaleLimit, loading }) => {
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir | null>(null)

  const valueNames = useMemo(() => collectValueNames(members), [members])

  const memberScoreMaps = useMemo(() => new Map(members.map(m => [m.employeeId, valueScoreMap(m)])), [members])

  const valueAverages = useMemo(() => computeValueAverages(memberScoreMaps, valueNames), [memberScoreMaps, valueNames])

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

  const sortedMembers = useMemo(() => {
    if (!sortCol || !sortDir) return members
    return [...members].sort((a, b) => {
      if (sortCol === '__employee') {
        const cmp = employeeLabel(a).localeCompare(employeeLabel(b))
        return sortDir === 'asc' ? cmp : -cmp
      }
      const aVal = memberScoreMaps.get(a.employeeId)?.get(sortCol) ?? null
      const bVal = memberScoreMaps.get(b.employeeId)?.get(sortCol) ?? null
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    })
  }, [members, memberScoreMaps, sortCol, sortDir])

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

  const hasValues = members.some(m => m.companyValues.length > 0)

  if (hasValues === false) {
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
    <Card className="gba:rounded-xl gba:h-full">
      <CardHeader className="gba:pb-2">
        <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
          <Heart className="gba:h-5 gba:w-5 gba:text-muted-foreground" aria-hidden />
          Company Values
          <span className="gba:text-xs gba:font-normal gba:text-muted-foreground">(scale 1–{ratingScaleLimit})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
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
                {valueNames.map(vn => (
                  <TableHead
                    key={vn}
                    className="gba:sticky gba:top-0 gba:z-20 gba:text-center gba:cursor-pointer gba:select-none gba:min-w-[80px] gba:text-xs"
                    style={sortCol === vn ? HEADER_ACTIVE_BG : HEADER_BG}
                    onClick={() => toggleSort(vn)}
                  >
                    <div className="gba:flex gba:flex-col gba:items-center gba:gap-0.5">
                      <span className="gba:whitespace-nowrap">{vn}</span>
                      <SortIcon column={vn} sortCol={sortCol} sortDir={sortDir} />
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMembers.map(m => {
                const vm = memberScoreMaps.get(m.employeeId) ?? new Map<string, number | null>()
                return (
                  <TableRow key={m.employeeId}>
                    <TableCell className="gba:sticky gba:left-0 gba:bg-background gba:z-10 gba:w-px">
                      <div className="gba:flex gba:items-center gba:gap-1.5 gba:whitespace-nowrap">
                        <Avatar className="gba:h-6 gba:w-6 gba:shrink-0">
                          <AvatarImage src={avatarSrc(m.pictureThumbnail)} alt={employeeLabel(m)} />
                          <AvatarFallback className="gba:text-[9px]">
                            {employeeInitials(m.firstName, m.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="gba:text-xs gba:font-medium">{employeeLabel(m)}</span>
                      </div>
                    </TableCell>
                    {valueNames.map(vn => {
                      const score = vm.get(vn) ?? null
                      const hasValue = score != null && score !== 0
                      return (
                        <TableCell
                          key={vn}
                          className={`gba:text-center gba:text-xs gba:tabular-nums gba:font-semibold ${
                            hasValue ? '' : 'gba:text-muted-foreground'
                          }`}
                          style={hasValue ? chartBandBg(score, ratingScaleLimit) : {}}
                        >
                          {formatScore(score)}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                )
              })}

              {/* Average summary row */}
              <TableRow className="gba:border-t-2">
                <TableCell
                  className="gba:sticky gba:left-0 gba:z-10 gba:w-px gba:text-xs gba:font-bold"
                  style={AVG_ROW_BG}
                >
                  Average
                </TableCell>
                {valueNames.map(vn => {
                  const avg = valueAverages.get(vn) ?? null
                  const avgCellStyle =
                    avg === null ? AVG_ROW_BG : { ...AVG_ROW_BG, ...chartBandBg(avg, ratingScaleLimit) }
                  return (
                    <TableCell
                      key={`avg-${vn}`}
                      className="gba:text-center gba:text-xs gba:font-bold gba:tabular-nums"
                      style={avgCellStyle}
                    >
                      {formatScore(avg)}
                    </TableCell>
                  )
                })}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
