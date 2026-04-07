/* eslint-disable newwork-local/no-hardcoded-colors -- Scale markers require fixed colors */
import React, { useMemo, useState } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
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
import { Scale, AlertTriangle } from 'lucide-react'
import type { TeamMemberEvaluation, EvaluationDimensionScore } from '../../hooks/useTeamEvaluations'
import { employeeLabel, employeeInitials, avatarSrc } from '../../utils/heatmapHelpers'

type ViewMode = 'overall' | 'values' | 'skills'
type SortMode = 'largest-gap' | 'name'

interface DimensionCell {
  selfScore: number | null
  peerScore: number | null
  managerScore: number | null
  gap: number
}

interface AlignmentRow {
  employeeId: string
  firstName: string
  lastName: string
  pictureThumbnail?: string
  overall: DimensionCell
  valuesOverall: DimensionCell
  skillsOverall: DimensionCell
  dimensions: Map<string, DimensionCell>
  maxGap: number
  flagged: boolean
}

export interface AlignmentComparisonProps {
  members: TeamMemberEvaluation[]
  ratingScaleLimit: number
  loading: boolean
  onEmployeeClick: (employeeId: string) => void
}

function computeCell(dims: EvaluationDimensionScore[]): DimensionCell {
  const selfScores = dims.filter(d => d.selfScore != null).map(d => d.selfScore!)
  const peerScores = dims.filter(d => d.peerAvgScore != null).map(d => d.peerAvgScore!)
  const mgrScores = dims.filter(d => d.managerScore != null).map(d => d.managerScore!)
  const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null)
  const s = avg(selfScores)
  const p = avg(peerScores)
  const m = avg(mgrScores)
  const vals = [s, p, m].filter((v): v is number => v !== null)
  const gap = vals.length >= 2 ? Math.round((Math.max(...vals) - Math.min(...vals)) * 10) / 10 : 0
  return {
    selfScore: s != null ? Math.round(s * 10) / 10 : null,
    peerScore: p != null ? Math.round(p * 10) / 10 : null,
    managerScore: m != null ? Math.round(m * 10) / 10 : null,
    gap
  }
}

function computeSingleCell(d: EvaluationDimensionScore): DimensionCell {
  const vals = [d.selfScore, d.peerAvgScore, d.managerScore].filter((v): v is number => v !== null)
  const gap = vals.length >= 2 ? Math.round((Math.max(...vals) - Math.min(...vals)) * 10) / 10 : 0
  return { selfScore: d.selfScore, peerScore: d.peerAvgScore, managerScore: d.managerScore, gap }
}

function gapBgClass(gap: number): string {
  if (gap > 1) return 'gba:bg-red-500/10'
  if (gap > 0.5) return 'gba:bg-amber-500/8'
  return ''
}

function gapTextColor(gap: number): string {
  if (gap > 1) return 'gba:text-red-600 gba:dark:text-red-400'
  if (gap > 0.5) return 'gba:text-amber-600 gba:dark:text-amber-400'
  return 'gba:text-green-600 gba:dark:text-green-400'
}

const ScaleMarker: React.FC<{
  cell: DimensionCell
  scaleMax: number
}> = ({ cell, scaleMax }) => {
  const { selfScore, peerScore, managerScore, gap } = cell
  const hasData = selfScore != null || peerScore != null || managerScore != null
  if (!hasData) return <span className="gba:text-xs gba:text-muted-foreground">—</span>

  const toPercent = (v: number) => Math.min(Math.max((v / scaleMax) * 100, 2), 98)

  return (
    <div className={`gba:flex gba:items-center gba:gap-2 gba:px-1 gba:py-1 gba:rounded ${gapBgClass(gap)}`}>
      <div className="gba:relative gba:h-3 gba:flex-1 gba:min-w-[60px]">
        <div className="gba:absolute gba:inset-x-0 gba:top-1/2 gba:-translate-y-1/2 gba:h-px gba:bg-border" />
        {selfScore != null && (
          <div
            className="gba:absolute gba:top-1/2 gba:-translate-y-1/2 gba:-translate-x-1/2 gba:w-2.5 gba:h-2.5 gba:rounded-full gba:border-2 gba:border-[#3b82f6] gba:bg-background"
            style={{ left: `${toPercent(selfScore)}%` }}
            title={`Self: ${selfScore.toFixed(1)}`}
          />
        )}
        {peerScore != null && (
          <div
            className="gba:absolute gba:top-1/2 gba:-translate-y-1/2 gba:-translate-x-1/2 gba:w-2.5 gba:h-2.5 gba:rounded-full gba:bg-[#10b981]"
            style={{ left: `${toPercent(peerScore)}%` }}
            title={`Peer: ${peerScore.toFixed(1)}`}
          />
        )}
        {managerScore != null && (
          <div
            className="gba:absolute gba:top-1/2 gba:-translate-y-1/2 gba:-translate-x-1/2 gba:w-2 gba:h-2 gba:rotate-45 gba:bg-[#f59e0b]"
            style={{ left: `${toPercent(managerScore)}%` }}
            title={`Manager: ${managerScore.toFixed(1)}`}
          />
        )}
      </div>
      <span className={`gba:text-[10px] gba:tabular-nums gba:font-medium gba:whitespace-nowrap ${gapTextColor(gap)}`}>
        {gap.toFixed(1)}
      </span>
    </div>
  )
}

interface ColumnDef {
  key: string
  label: string
  getCell: (row: AlignmentRow) => DimensionCell | undefined
}

function buildColumns(viewMode: ViewMode, valueNames: string[], skillNames: string[]): ColumnDef[] {
  if (viewMode === 'overall') {
    return [
      { key: '__overall', label: 'Overall Score', getCell: r => r.overall },
      { key: '__cv', label: 'Company Values', getCell: r => r.valuesOverall },
      { key: '__sk', label: 'Skills', getCell: r => r.skillsOverall }
    ]
  }
  if (viewMode === 'values') {
    return [
      { key: '__cv', label: 'Values Overall', getCell: r => r.valuesOverall },
      ...valueNames.map(name => ({
        key: `v:${name}`,
        label: name,
        getCell: (r: AlignmentRow) => r.dimensions.get(`v:${name}`)
      }))
    ]
  }
  return [
    { key: '__sk', label: 'Skills Overall', getCell: r => r.skillsOverall },
    ...skillNames.map(name => ({
      key: `s:${name}`,
      label: name,
      getCell: (r: AlignmentRow) => r.dimensions.get(`s:${name}`)
    }))
  ]
}

export const AlignmentComparison: React.FC<AlignmentComparisonProps> = ({
  members,
  ratingScaleLimit,
  loading,
  onEmployeeClick
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('overall')
  const [sortMode, setSortMode] = useState<SortMode>('largest-gap')
  const [onlyFlagged, setOnlyFlagged] = useState(false)

  const { rows, columns } = useMemo(() => {
    const valueNamesSet = new Set<string>()
    const skillNamesSet = new Set<string>()
    for (const m of members) {
      for (const d of m.companyValues) valueNamesSet.add(d.name)
      for (const d of m.skills) skillNamesSet.add(d.name)
    }
    const valueNames = Array.from(valueNamesSet).sort()
    const skillNames = Array.from(skillNamesSet).sort()

    const allRows: AlignmentRow[] = members.map(m => {
      const overallCell = computeCell([...m.companyValues, ...m.skills])
      const valuesOverall = computeCell(m.companyValues)
      const skillsOverall = computeCell(m.skills)
      const dims = new Map<string, DimensionCell>()

      for (const d of m.companyValues) dims.set(`v:${d.name}`, computeSingleCell(d))
      for (const d of m.skills) dims.set(`s:${d.name}`, computeSingleCell(d))

      const allGaps = [
        overallCell.gap,
        valuesOverall.gap,
        skillsOverall.gap,
        ...Array.from(dims.values()).map(c => c.gap)
      ]
      const maxGap = Math.max(...allGaps, 0)

      return {
        employeeId: m.employeeId,
        firstName: m.firstName,
        lastName: m.lastName,
        pictureThumbnail: m.pictureThumbnail,
        overall: overallCell,
        valuesOverall,
        skillsOverall,
        dimensions: dims,
        maxGap,
        flagged: maxGap > 1
      }
    })

    return { rows: allRows, columns: buildColumns(viewMode, valueNames, skillNames) }
  }, [members, viewMode])

  const filteredRows = useMemo(() => {
    let r = rows
    if (onlyFlagged) r = r.filter(row => row.flagged)
    if (sortMode === 'largest-gap') r = [...r].sort((a, b) => b.maxGap - a.maxGap)
    else r = [...r].sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`))
    return r
  }, [rows, onlyFlagged, sortMode])

  const columnAverages = useMemo(() => {
    const avgs = new Map<string, number>()
    for (const col of columns) {
      const gaps: number[] = []
      for (const row of filteredRows) {
        const cell = col.getCell(row)
        if (cell) gaps.push(cell.gap)
      }
      if (gaps.length > 0) {
        avgs.set(col.key, Math.round((gaps.reduce((a, b) => a + b, 0) / gaps.length) * 10) / 10)
      }
    }
    return avgs
  }, [filteredRows, columns])

  if (loading) {
    return (
      <Card className="gba:rounded-xl">
        <CardHeader className="gba:pb-2">
          <div className="gba:flex gba:items-center gba:gap-2">
            <div className="gba:h-5 gba:w-5 gba:rounded gba:bg-muted gba:animate-pulse" />
            <div className="gba:h-5 gba:w-64 gba:rounded gba:bg-muted gba:animate-pulse" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="gba:h-[280px] gba:w-full gba:rounded-lg gba:bg-muted gba:animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  const hasPerspectiveData = members.some(m => m.companyValues.length > 0 || m.skills.length > 0)

  if (!hasPerspectiveData) {
    return (
      <Card className="gba:rounded-xl">
        <CardHeader className="gba:pb-2">
          <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
            <Scale className="gba:h-5 gba:w-5 gba:text-muted-foreground" aria-hidden />
            Alignment & Perspective Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-8">
            No perspective data available
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="gba:rounded-xl">
      <CardHeader className="gba:pb-2">
        <div className="gba:flex gba:items-center gba:justify-between gba:flex-wrap gba:gap-3">
          <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
            <Scale className="gba:h-5 gba:w-5 gba:text-muted-foreground" aria-hidden />
            Alignment & Perspective Comparison
          </CardTitle>
          <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
            <div className="gba:flex gba:rounded-md gba:border gba:border-border gba:overflow-hidden">
              {(['overall', 'values', 'skills'] as ViewMode[]).map(mode => (
                <button
                  key={mode}
                  type="button"
                  className={`gba:px-2.5 gba:py-1 gba:text-xs gba:font-medium gba:transition-colors ${
                    viewMode === mode
                      ? 'gba:bg-primary gba:text-primary-foreground'
                      : 'gba:bg-background gba:text-muted-foreground hover:gba:bg-muted'
                  }`}
                  onClick={() => setViewMode(mode)}
                >
                  {mode === 'overall' ? 'Overall' : mode === 'values' ? 'Values' : 'Skills'}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gba:text-xs gba:h-7"
              onClick={() => setSortMode(prev => (prev === 'largest-gap' ? 'name' : 'largest-gap'))}
            >
              {sortMode === 'largest-gap' ? 'Largest gap ▼' : 'Name A-Z'}
            </Button>
            <Button
              variant={onlyFlagged ? 'default' : 'outline'}
              size="sm"
              className="gba:text-xs gba:h-7 gba:gap-1"
              onClick={() => setOnlyFlagged(prev => !prev)}
            >
              <AlertTriangle className="gba:h-3 gba:w-3" />
              Only flagged
            </Button>
          </div>
        </div>
        <div className="gba:flex gba:items-center gba:gap-4 gba:mt-2 gba:text-[10px] gba:text-muted-foreground">
          <span className="gba:flex gba:items-center gba:gap-1">
            <span className="gba:inline-block gba:w-2 gba:h-2 gba:rounded-full gba:border-2 gba:border-[#3b82f6] gba:bg-background" />
            Self
          </span>
          <span className="gba:flex gba:items-center gba:gap-1">
            <span className="gba:inline-block gba:w-2 gba:h-2 gba:rounded-full gba:bg-[#10b981]" />
            Peer
          </span>
          <span className="gba:flex gba:items-center gba:gap-1">
            <span className="gba:inline-block gba:w-1.5 gba:h-1.5 gba:rotate-45 gba:bg-[#f59e0b]" />
            Manager
          </span>
          <span>Cell tint = disagreement severity</span>
        </div>
      </CardHeader>
      <CardContent className="gba:overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="gba:sticky gba:left-0 gba:bg-background gba:z-10 gba:w-px" />
              {columns.map(col => (
                <TableHead key={col.key} className="gba:text-center gba:min-w-[110px]">
                  <div className="gba:text-center gba:whitespace-nowrap">{col.label}</div>
                  <div className="gba:text-[10px] gba:font-normal gba:text-muted-foreground gba:text-center">
                    Avg gap {columnAverages.get(col.key)?.toFixed(1) ?? '—'}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.map(row => {
              const label = employeeLabel(row)
              return (
                <TableRow
                  key={row.employeeId}
                  className="gba:cursor-pointer hover:gba:bg-muted/50"
                  onClick={() => onEmployeeClick(row.employeeId)}
                >
                  <TableCell className="gba:sticky gba:left-0 gba:bg-background gba:z-10 gba:w-px gba:pr-3">
                    <div className="gba:flex gba:items-center gba:gap-1.5 gba:whitespace-nowrap">
                      <Avatar className="gba:h-6 gba:w-6 gba:shrink-0">
                        <AvatarImage src={avatarSrc(row.pictureThumbnail)} alt={label} />
                        <AvatarFallback className="gba:text-[9px]">
                          {employeeInitials(row.firstName, row.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="gba:text-xs gba:font-medium">{label}</span>
                      {row.flagged && <AlertTriangle className="gba:h-3 gba:w-3 gba:text-red-500 gba:shrink-0" />}
                    </div>
                  </TableCell>
                  {columns.map(col => {
                    const cell = col.getCell(row)
                    return (
                      <TableCell key={col.key}>
                        {cell ? (
                          <ScaleMarker cell={cell} scaleMax={ratingScaleLimit} />
                        ) : (
                          <span className="gba:text-xs gba:text-muted-foreground gba:text-center gba:block">—</span>
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              )
            })}
            {filteredRows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={1 + columns.length}
                  className="gba:text-center gba:text-sm gba:text-muted-foreground gba:py-8"
                >
                  {onlyFlagged ? 'No flagged employees (gap > 1.0)' : 'No perspective data'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
