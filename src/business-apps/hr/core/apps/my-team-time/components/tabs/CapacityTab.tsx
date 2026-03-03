import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@newwork/nw-design-system'
import { PiCaretLeft, PiCaretRight, PiArrowUp, PiArrowDown } from 'react-icons/pi'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTeamMembers } from '../../hooks/useTeamMembers'
import { useTeamCapacity } from '../../hooks/useTeamCapacity'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_TEAM_ABSENCES_CALENDAR_RANGE } from '../../queries/queries'
import { CapacityRow, TeamAbsenceToday } from '../../types/types'
import { formatMinutes, toDateString, toLocalDateKey, isWorkingDay } from '../../utils/timeUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

type SortKey = 'name' | 'worked' | 'overtime' | 'deficit' | 'balance' | 'missing'
type SortDir = 'asc' | 'desc'

const HighlightCell: React.FC<{
  value: number
  threshold: number
  format: (v: number) => string
  invert?: boolean
}> = ({ value, threshold, format, invert = false }) => {
  const isOver = invert ? value < threshold : value > threshold
  return <span className={isOver ? 'gba:text-destructive gba:font-semibold' : ''}>{format(value)}</span>
}

export const CapacityTab: React.FC<BusinessAppContextProps> = props => {
  const { members, memberIds, isLoading: membersLoading } = useTeamMembers(props)
  const {
    rows,
    currentMonth,
    prevMonth,
    nextMonth,
    isLoading: capacityLoading,
    error
  } = useTeamCapacity(props.accessToken, members, memberIds)

  const graphqlClient = useGraphQLClient(props.accessToken)

  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const [forecastAbsences, setForecastAbsences] = useState<TeamAbsenceToday[]>([])
  const [forecastLoading, setForecastLoading] = useState(false)

  const fetchForecast = useCallback(async () => {
    if (!graphqlClient || memberIds.length === 0) return
    setForecastLoading(true)
    try {
      const today = new Date()
      const end = new Date(today)
      end.setDate(today.getDate() + 29)
      const result = await graphqlClient.request<any>(GET_TEAM_ABSENCES_CALENDAR_RANGE, {
        employeeIds: memberIds,
        from: toDateString(today),
        to: toDateString(end)
      })
      setForecastAbsences(
        (result?.EmployeeAbsenceCalendarView ?? []).map((r: any) => ({
          employeeId: r.employeeId,
          typeRef: r.typeRef,
          status: r.status,
          dayDate: r.dayDate,
          employeeAbsenceId: r.employeeAbsenceId
        }))
      )
    } catch {
      // forecast is secondary, don't block on errors
    } finally {
      setForecastLoading(false)
    }
  }, [graphqlClient, memberIds.join(',')])

  useEffect(() => {
    if (props.accessToken && memberIds.length > 0) fetchForecast()
  }, [props.accessToken, memberIds.join(','), fetchForecast])

  const isLoading = membersLoading || capacityLoading

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const getSortValue = (row: CapacityRow, key: SortKey): number | string => {
    switch (key) {
      case 'name':
        return `${row.employee.firstName} ${row.employee.lastName}`
      case 'worked':
        return row.workedMinutes
      case 'overtime':
        return row.overtimeMinutes
      case 'deficit':
        return row.deficitMinutes
      case 'balance':
        return row.netBalanceMinutes
      case 'missing':
        return row.missingEntries
      default:
        return 0
    }
  }

  const sortedRows = [...rows].sort((a, b) => {
    const va = getSortValue(a, sortKey)
    const vb = getSortValue(b, sortKey)
    const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number)
    return sortDir === 'asc' ? cmp : -cmp
  })

  const monthLabel = currentMonth.toLocaleDateString(undefined, { year: 'numeric', month: 'long' })

  const SortHeader: React.FC<{ label: string; sortKeyValue: SortKey }> = ({ label, sortKeyValue }) => (
    <th
      className="gba:py-2.5 gba:px-3 gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:cursor-pointer gba:select-none hover:gba:text-foreground gba:transition-colors gba:whitespace-nowrap"
      onClick={() => handleSort(sortKeyValue)}
    >
      <span className="gba:flex gba:items-center gba:gap-1">
        {label}
        {sortKey === sortKeyValue && (sortDir === 'asc' ? <PiArrowUp size={12} /> : <PiArrowDown size={12} />)}
      </span>
    </th>
  )

  const forecastDays: { date: string; label: string }[] = []
  const today = new Date()
  for (let i = 0; i < 30; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    forecastDays.push({
      date: toLocalDateKey(d),
      label: d.toLocaleDateString(undefined, { weekday: 'narrow', day: 'numeric' })
    })
  }

  const getForecastCell = (date: string): { available: number; total: number } => {
    const total = members.filter(m => isWorkingDay(date, m.workingHours)).length
    const absentIds = new Set(
      forecastAbsences.filter(a => a.dayDate === date && a.status === 'APPROVED').map(a => a.employeeId)
    )
    const available = total - absentIds.size
    return { available, total }
  }

  const getHeatmapColor = (pct: number): string => {
    if (pct >= 80) return 'gba:bg-success/20'
    if (pct >= 60) return 'gba:bg-warning/20'
    return 'gba:bg-destructive/20'
  }

  return (
    <div className="gba:space-y-6" data-testid="my-team-time-capacity">
      <Card className="gba:shadow-sm">
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between gba:flex-wrap gba:gap-4">
            <CardTitle className="gba:text-lg gba:font-semibold">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:my_team_time.monthly_capacity_balance',
                'Monthly Capacity & Balance'
              )}
            </CardTitle>
            <div className="gba:flex gba:items-center gba:gap-1">
              <Button variant="outline" size="sm" onClick={prevMonth}>
                <PiCaretLeft />
              </Button>
              <span className="gba:px-3 gba:text-sm gba:font-medium gba:min-w-[140px] gba:text-center">
                {monthLabel}
              </span>
              <Button variant="outline" size="sm" onClick={nextMonth}>
                <PiCaretRight />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="gba:p-0">
          {isLoading ? (
            <div className="gba:text-center gba:py-12 gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.loading_text', 'Loading...')}
            </div>
          ) : error ? (
            <div className="gba:text-center gba:py-12 gba:text-destructive">{error}</div>
          ) : sortedRows.length === 0 ? (
            <div className="gba:text-center gba:py-12 gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.no_data_available', 'No data available.')}
            </div>
          ) : (
            <div className="gba:overflow-x-auto">
              <table className="gba:w-full gba:text-left gba:text-sm">
                <thead>
                  <tr className="gba:border-b gba:border-border gba:bg-muted/30">
                    <SortHeader
                      label={getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.employee', 'Employee')}
                      sortKeyValue="name"
                    />
                    <th className="gba:py-2.5 gba:px-3 gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:whitespace-nowrap">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.target', 'Target')}
                    </th>
                    <SortHeader
                      label={getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.worked', 'Worked')}
                      sortKeyValue="worked"
                    />
                    <SortHeader
                      label={getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.overtime', 'Overtime')}
                      sortKeyValue="overtime"
                    />
                    <SortHeader
                      label={getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.deficit', 'Deficit')}
                      sortKeyValue="deficit"
                    />
                    <th className="gba:py-2.5 gba:px-3 gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:whitespace-nowrap">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.pto_used', 'PTO Used')}
                    </th>
                    <th className="gba:py-2.5 gba:px-3 gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:whitespace-nowrap">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.sick_days', 'Sick Days')}
                    </th>
                    <SortHeader
                      label={getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.balance', 'Balance')}
                      sortKeyValue="balance"
                    />
                    <SortHeader
                      label={getTranslationFromI18nKeyAndLabel('lowcoder:my_team_time.missing', 'Missing')}
                      sortKeyValue="missing"
                    />
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map(row => (
                    <tr
                      key={row.employee.id}
                      className="gba:border-b gba:border-border hover:gba:bg-muted/50 gba:transition-colors"
                    >
                      <td className="gba:py-3 gba:px-3">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <div className="gba:w-7 gba:h-7 gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center gba:text-xs gba:font-medium">
                            {row.employee.firstName?.[0]}
                            {row.employee.lastName?.[0]}
                          </div>
                          <span className="gba:font-medium">
                            {row.employee.firstName} {row.employee.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="gba:py-3 gba:px-3 gba:text-muted-foreground">
                        {formatMinutes(row.contractTargetMinutes)}
                      </td>
                      <td className="gba:py-3 gba:px-3 gba:font-medium">{formatMinutes(row.workedMinutes)}</td>
                      <td className="gba:py-3 gba:px-3">
                        <HighlightCell value={row.overtimeMinutes} threshold={600} format={formatMinutes} />
                      </td>
                      <td className="gba:py-3 gba:px-3">
                        <HighlightCell value={row.deficitMinutes} threshold={120} format={formatMinutes} />
                      </td>
                      <td className="gba:py-3 gba:px-3 gba:text-muted-foreground">{row.ptoUsedDays}d</td>
                      <td className="gba:py-3 gba:px-3 gba:text-muted-foreground">{row.sickDays}d</td>
                      <td className="gba:py-3 gba:px-3">
                        <span
                          className={
                            row.netBalanceMinutes < 0
                              ? 'gba:text-destructive gba:font-semibold'
                              : row.netBalanceMinutes > 0
                                ? 'gba:text-success'
                                : ''
                          }
                        >
                          {formatMinutes(row.netBalanceMinutes)}
                        </span>
                      </td>
                      <td className="gba:py-3 gba:px-3">
                        {row.missingEntries > 0 ? (
                          <Badge variant="destructive">{row.missingEntries}</Badge>
                        ) : (
                          <span className="gba:text-muted-foreground">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="gba:shadow-sm" data-testid="capacity-forecast">
        <CardHeader>
          <CardTitle className="gba:text-lg gba:font-semibold">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:my_team_time.capacity_forecast',
              'Capacity Forecast (30 days)'
            )}
          </CardTitle>
          <p className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:my_team_time.team_availability_heatmap',
              'Team availability heatmap — green = 80%+, amber = 60-79%, red = below 60%'
            )}
          </p>
        </CardHeader>
        <CardContent>
          {forecastLoading ? (
            <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.loading_text', 'Loading...')}
            </div>
          ) : (
            <div className="gba:overflow-x-auto">
              <div className="gba:flex gba:gap-1 gba:min-w-[900px]">
                {forecastDays.map(day => {
                  const { available, total } = getForecastCell(day.date)
                  const pct = total > 0 ? Math.round((available / total) * 100) : 100
                  return (
                    <div
                      key={day.date}
                      className={`gba:flex-1 gba:min-w-[28px] gba:rounded gba:p-1 gba:text-center gba:text-[10px] ${getHeatmapColor(pct)}`}
                      title={`${day.date}: ${available}/${total} available (${pct}%)`}
                    >
                      <div className="gba:font-medium gba:leading-tight">{day.label}</div>
                      <div className="gba:font-bold gba:text-xs">{pct}%</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
