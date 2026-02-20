'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis
} from 'recharts'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { usePerformanceCycles } from '@/business-apps/hr/core/apps/performance-evaluation/hooks/usePerformanceCycles'
import { employeePerformanceQuery } from '../../queries/performanceQueries'
import { Employee, EmployeePerformanceGoal } from '../../hooks/useEmployeeData'
import { UserInfoProps } from '../../../../../../../common/BusinessAppContext'
import translations from '../../_i18n'

interface PerformanceTabProps {
  employee: Employee
  accessToken: string
  employeeId?: string
  userInfo?: UserInfoProps
  employeePerformanceGoals?: EmployeePerformanceGoal[]
}

type GoalType = 'PERCENTAGE' | 'NUMERIC' | 'MILESTONE'
type TrackState = 'ON_TRACK' | 'AT_RISK' | 'BEHIND_TARGET'

interface Milestone {
  id: string
  title: string
  done: boolean
  doneAt?: string
}

interface GoalUpdateEvent {
  at: string
  progress: number
}

interface ExtendedEmployeePerformanceGoal extends EmployeePerformanceGoal {
  id: string
  version?: number
  createdAt?: string
  updatedAt?: string
  additionalProperties?: {
    goalType?: GoalType
    numeric?: {
      target?: number
      current?: number
      unit?: string
    }
    milestones?: Milestone[]
  }
}

const normalizeProgress = (value: number) => Math.max(0, Math.min(100, value))

const PerformanceTab: React.FC<PerformanceTabProps> = ({
  employee,
  accessToken,
  employeePerformanceGoals = [],
  userInfo
}) => {
  const { t } = useTranslation(translations)
  const graphQLClient = useGraphqlClient(accessToken)
  const { cycles, loading: cyclesLoading } = usePerformanceCycles(accessToken)

  const [localPerformanceGoals, setLocalPerformanceGoals] = useState<ExtendedEmployeePerformanceGoal[]>([])
  const [goalEvents, setGoalEvents] = useState<Record<string, GoalUpdateEvent[]>>({})
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCycleId, setSelectedCycleId] = useState<string>('')
  const [selectedGoalId, setSelectedGoalId] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [sortBy, setSortBy] = useState<string>('DUE_DATE')
  const [progressInput, setProgressInput] = useState<number>(0)
  const [numericCurrentInput, setNumericCurrentInput] = useState<number>(0)
  const [milestoneDraft, setMilestoneDraft] = useState<Milestone[]>([])

  const supervisorId = useMemo(() => employee.employeePosition?.supervisor?.id, [employee])

  const fetchPerformanceData = useCallback(async () => {
    if (!employee?.id) return
    try {
      setLoading(true)
      setError(null)
      const goalsResponse = await graphQLClient.request(employeePerformanceQuery, { employeeId: employee.id })
      setLocalPerformanceGoals(goalsResponse?.EmployeePerformanceGoal || [])
    } catch (err) {
      console.error('Error fetching performance data:', err)
      setError(t('performance-error-load'))
    } finally {
      setLoading(false)
    }
  }, [employee?.id, graphQLClient, t])

  useEffect(() => {
    if (employeePerformanceGoals.length) {
      setLocalPerformanceGoals(employeePerformanceGoals as ExtendedEmployeePerformanceGoal[])
      return
    }
    fetchPerformanceData()
  }, [employeePerformanceGoals, fetchPerformanceData])

  useEffect(() => {
    if (!selectedCycleId && cycles.length > 0) {
      const active = cycles.find(cycle => cycle.status === 'Active')
      setSelectedCycleId((active || cycles[0]).id)
    }
  }, [cycles, selectedCycleId])

  const getGoalType = (goal: ExtendedEmployeePerformanceGoal): GoalType => {
    const rawType = goal.additionalProperties?.goalType
    if (rawType === 'NUMERIC' || rawType === 'MILESTONE' || rawType === 'PERCENTAGE') return rawType
    if (goal.additionalProperties?.milestones?.length) return 'MILESTONE'
    if (goal.additionalProperties?.numeric?.target) return 'NUMERIC'
    return 'PERCENTAGE'
  }

  const isGoalValid = (goal: ExtendedEmployeePerformanceGoal) => Boolean(goal.title && goal.startDate && goal.dueDate)

  const selectedCycle = useMemo(() => cycles.find(cycle => cycle.id === selectedCycleId), [cycles, selectedCycleId])

  const isGoalContainedInCycle = useCallback(
    (goal: ExtendedEmployeePerformanceGoal, cycleStart: string, cycleEnd: string) => {
      const goalStart = dayjs(goal.startDate)
      const goalEnd = dayjs(goal.dueDate)
      if (!goalStart.isValid() || !goalEnd.isValid()) return false
      return !goalStart.isBefore(dayjs(cycleStart), 'day') && !goalEnd.isAfter(dayjs(cycleEnd), 'day')
    },
    []
  )

  const doesGoalOverlapCycle = useCallback(
    (goal: ExtendedEmployeePerformanceGoal, cycleStart: string, cycleEnd: string) => {
      const goalStart = dayjs(goal.startDate)
      const goalEnd = dayjs(goal.dueDate)
      if (!goalStart.isValid() || !goalEnd.isValid()) return false
      return !goalEnd.isBefore(dayjs(cycleStart), 'day') && !goalStart.isAfter(dayjs(cycleEnd), 'day')
    },
    []
  )

  const sortGoals = useCallback(
    (goals: ExtendedEmployeePerformanceGoal[]) =>
      [...goals].sort((a, b) => {
        if (sortBy === 'STATUS') return (a.status || '').localeCompare(b.status || '')
        if (sortBy === 'UPDATED_RECENTLY') {
          return dayjs(b.updatedAt || b.startDate).valueOf() - dayjs(a.updatedAt || a.startDate).valueOf()
        }
        return dayjs(a.dueDate).valueOf() - dayjs(b.dueDate).valueOf()
      }),
    [sortBy]
  )

  const getInitialEvents = useCallback((goal: ExtendedEmployeePerformanceGoal): GoalUpdateEvent[] => {
    const startDate = dayjs(goal.startDate).startOf('day')
    const dueDate = dayjs(goal.dueDate).startOf('day')
    const baselineDate = startDate.isValid() ? startDate : dayjs().startOf('day')
    const events: GoalUpdateEvent[] = [{ at: baselineDate.toISOString(), progress: 0 }]
    const progress = normalizeProgress(goal.progressPercent || 0)
    if (progress > 0) {
      const rawDate = dayjs(goal.updatedAt || goal.completionDate || goal.startDate)
      const boundedDate = rawDate.isValid()
        ? rawDate.isBefore(startDate)
          ? startDate
          : rawDate.isAfter(dueDate)
            ? dueDate
            : rawDate
        : dayjs()
      events.push({ at: boundedDate.toISOString(), progress })
    }
    return events.sort((a, b) => dayjs(a.at).valueOf() - dayjs(b.at).valueOf())
  }, [])

  useEffect(() => {
    setGoalEvents(prev => {
      const next = { ...prev }
      localPerformanceGoals.forEach(goal => {
        if (!next[goal.id]) next[goal.id] = getInitialEvents(goal)
      })
      return next
    })
  }, [localPerformanceGoals, getInitialEvents])

  const containedGoals = useMemo(() => {
    if (!selectedCycle) return []
    const goals = localPerformanceGoals
      .filter(isGoalValid)
      .filter(goal => isGoalContainedInCycle(goal, selectedCycle.startDate, selectedCycle.endDate))
      .filter(goal => (statusFilter === 'ALL' ? true : goal.status === statusFilter))
      .filter(goal => (typeFilter === 'ALL' ? true : getGoalType(goal) === typeFilter))
    return sortGoals(goals)
  }, [localPerformanceGoals, selectedCycle, statusFilter, typeFilter, sortGoals, isGoalContainedInCycle])

  const outOfCycleGoals = useMemo(() => {
    if (!selectedCycle) return []
    return localPerformanceGoals
      .filter(isGoalValid)
      .filter(goal => doesGoalOverlapCycle(goal, selectedCycle.startDate, selectedCycle.endDate))
      .filter(goal => !isGoalContainedInCycle(goal, selectedCycle.startDate, selectedCycle.endDate))
  }, [localPerformanceGoals, selectedCycle, doesGoalOverlapCycle, isGoalContainedInCycle])

  useEffect(() => {
    const visibleGoalIds = [...containedGoals, ...outOfCycleGoals].map(goal => goal.id)
    if (visibleGoalIds.length === 0) {
      setSelectedGoalId('')
      return
    }
    if (!selectedGoalId || !visibleGoalIds.includes(selectedGoalId)) setSelectedGoalId(visibleGoalIds[0])
  }, [containedGoals, outOfCycleGoals, selectedGoalId])

  const selectedGoal = useMemo(
    () => [...containedGoals, ...outOfCycleGoals].find(goal => goal.id === selectedGoalId),
    [containedGoals, outOfCycleGoals, selectedGoalId]
  )

  const getProgressAtDate = (events: GoalUpdateEvent[], pointDate: dayjs.Dayjs) => {
    let current = 0
    ;[...events]
      .sort((a, b) => dayjs(a.at).valueOf() - dayjs(b.at).valueOf())
      .forEach(event => {
        if (!dayjs(event.at).isAfter(pointDate)) current = normalizeProgress(event.progress)
      })
    return current
  }

  const getIdealProgressAtDate = (startDate: dayjs.Dayjs, dueDate: dayjs.Dayjs, pointDate: dayjs.Dayjs) => {
    const totalDuration = Math.max(dueDate.diff(startDate, 'day'), 1)
    const elapsed = Math.max(Math.min(pointDate.diff(startDate, 'day'), totalDuration), 0)
    return normalizeProgress((elapsed / totalDuration) * 100)
  }

  const getTrackState = useCallback(
    (goal: ExtendedEmployeePerformanceGoal): TrackState => {
      const startDate = dayjs(goal.startDate).startOf('day')
      const dueDate = dayjs(goal.dueDate).startOf('day')
      if (!startDate.isValid() || !dueDate.isValid()) return 'ON_TRACK'
      const events = goalEvents[goal.id] || getInitialEvents(goal)
      const today = dayjs().startOf('day')
      const actual = getProgressAtDate(events, today)
      const ideal = getIdealProgressAtDate(startDate, dueDate, today)
      if (actual >= ideal - 5) return 'ON_TRACK'
      if (actual >= ideal - 15) return 'AT_RISK'
      return 'BEHIND_TARGET'
    },
    [goalEvents, getInitialEvents]
  )

  const summary = useMemo(() => {
    const total = containedGoals.length
    const achieved = containedGoals.filter(goal => goal.status === 'ACHIEVED' || goal.progressPercent >= 100).length
    const onTrack = containedGoals.filter(goal => getTrackState(goal) === 'ON_TRACK').length
    const atRisk = containedGoals.filter(goal => getTrackState(goal) === 'AT_RISK').length
    const behind = containedGoals.filter(goal => getTrackState(goal) === 'BEHIND_TARGET').length
    return { total, achieved, onTrack, atRisk, behind }
  }, [containedGoals, getTrackState])

  useEffect(() => {
    if (!selectedGoal) return
    setProgressInput(normalizeProgress(selectedGoal.progressPercent || 0))
    setNumericCurrentInput(selectedGoal.additionalProperties?.numeric?.current || 0)
    setMilestoneDraft(selectedGoal.additionalProperties?.milestones || [])
  }, [selectedGoal])

  const buildChartData = (goal: ExtendedEmployeePerformanceGoal) => {
    const startDate = dayjs(goal.startDate).startOf('day')
    const dueDate = dayjs(goal.dueDate).startOf('day')
    if (!startDate.isValid() || !dueDate.isValid()) return []
    const days = Math.max(dueDate.diff(startDate, 'day'), 1)
    const pointCount = Math.min(days + 1, 31)
    const events = goalEvents[goal.id] || getInitialEvents(goal)

    return Array.from({ length: pointCount }, (_, index) => {
      const ratio = pointCount === 1 ? 0 : index / (pointCount - 1)
      const date = startDate.add(Math.round(days * ratio), 'day')
      return {
        label: date.format('MMM D'),
        ideal: getIdealProgressAtDate(startDate, dueDate, date),
        actual: getProgressAtDate(events, date)
      }
    })
  }

  const updateGoal = (
    goalId: string,
    updater: (goal: ExtendedEmployeePerformanceGoal) => ExtendedEmployeePerformanceGoal
  ) => {
    setLocalPerformanceGoals(previous => previous.map(goal => (goal.id === goalId ? updater(goal) : goal)))
  }

  const applyProgressUpdate = () => {
    if (!selectedGoal) return
    const type = getGoalType(selectedGoal)
    let nextProgress = normalizeProgress(progressInput)
    let nextAdditional = selectedGoal.additionalProperties || {}

    if (type === 'NUMERIC') {
      const target = selectedGoal.additionalProperties?.numeric?.target || 0
      const safeTarget = target <= 0 ? 1 : target
      nextProgress = normalizeProgress((numericCurrentInput / safeTarget) * 100)
      nextAdditional = {
        ...nextAdditional,
        goalType: 'NUMERIC',
        numeric: {
          target,
          current: numericCurrentInput,
          unit: selectedGoal.additionalProperties?.numeric?.unit || ''
        }
      }
    }

    if (type === 'MILESTONE') {
      const total = milestoneDraft.length
      const completed = milestoneDraft.filter(item => item.done).length
      nextProgress = total > 0 ? normalizeProgress((completed / total) * 100) : 0
      nextAdditional = { ...nextAdditional, goalType: 'MILESTONE', milestones: milestoneDraft }
    }

    const now = dayjs().toISOString()
    updateGoal(selectedGoal.id, goal => ({
      ...goal,
      progressPercent: nextProgress,
      updatedAt: now,
      additionalProperties: nextAdditional
    }))
    setGoalEvents(previous => ({
      ...previous,
      [selectedGoal.id]: [
        ...(previous[selectedGoal.id] || getInitialEvents(selectedGoal)),
        { at: now, progress: nextProgress }
      ]
    }))
  }

  const setGoalStatusLocally = (status: string) => {
    if (!selectedGoal) return
    updateGoal(selectedGoal.id, goal => ({
      ...goal,
      status,
      progressPercent: status === 'ACHIEVED' ? 100 : goal.progressPercent
    }))
  }

  const statusMap: Record<string, { label: string; color: string }> = {
    ON_TRACK: { label: t('performance-status-on-track'), color: 'gba:bg-success-secondary gba:text-success' },
    BEHIND_TARGET: {
      label: t('performance-status-behind-target'),
      color: 'gba:bg-destructive-secondary gba:text-destructive'
    },
    AT_RISK: { label: t('performance-status-at-risk'), color: 'gba:bg-warning-secondary gba:text-warning' },
    ACHIEVED: { label: t('performance-status-achieved'), color: 'gba:bg-info-secondary gba:text-info' },
    NOT_ACHIEVED: { label: t('performance-status-not-achieved'), color: 'gba:bg-muted gba:text-muted-foreground' }
  }

  if (loading || cyclesLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-40" data-testid="performance-loading">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:text-center gba:text-destructive gba:py-8" data-testid="performance-error">
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="gba:space-y-6" data-testid="performance-tab-container">
      <div className="gba:flex gba:justify-between gba:items-start gba:gap-4" data-testid="performance-goals-header">
        <div>
          <div className="gba:font-bold gba:text-2xl" data-testid="performance-goals-title">
            {t('performance-title')}
          </div>
          <div className="gba:text-muted-foreground gba:text-lg" data-testid="performance-goals-description">
            {t('performance-description')}
          </div>
        </div>

        <div className="gba:flex gba:items-center gba:gap-3">
          <select
            value={selectedCycleId}
            onChange={event => setSelectedCycleId(event.target.value)}
            className="gba:h-9 gba:min-w-[220px] gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:text-sm"
            data-testid="performance-cycle-select"
          >
            {cycles.map(cycle => (
              <option value={cycle.id} key={cycle.id}>
                {cycle.name} ({dayjs(cycle.startDate).format('MMM D')} - {dayjs(cycle.endDate).format('MMM D')})
              </option>
            ))}
          </select>

          <AppAction
            variant="update-primary"
            data-testid="employee-goal-add-button"
            contexts={[
              {
                context: FlowContextName.employeePerformanceGoal,
                contextData: {
                  employeeId: employee.id,
                  employee,
                  cycleStartDate: selectedCycle?.startDate,
                  cycleEndDate: selectedCycle?.endDate,
                  cycleName: selectedCycle?.name
                }
              }
            ]}
            prefixDataTestId="employee-goal-add"
            accessToken={accessToken}
            autoExecute={true}
          >
            {t('performance-edit-button')}
          </AppAction>
        </div>
      </div>

      <div className="gba:grid gba:grid-cols-2 gba:md:grid-cols-5 gba:gap-3">
        <Card>
          <CardContent className="gba:p-4">
            <div className="gba:text-xs gba:text-muted-foreground">Total goals</div>
            <div className="gba:text-xl gba:font-semibold">{summary.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="gba:p-4">
            <div className="gba:text-xs gba:text-muted-foreground">On Track</div>
            <div className="gba:text-xl gba:font-semibold">{summary.onTrack}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="gba:p-4">
            <div className="gba:text-xs gba:text-muted-foreground">At Risk</div>
            <div className="gba:text-xl gba:font-semibold">{summary.atRisk}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="gba:p-4">
            <div className="gba:text-xs gba:text-muted-foreground">Behind Target</div>
            <div className="gba:text-xl gba:font-semibold">{summary.behind}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="gba:p-4">
            <div className="gba:text-xs gba:text-muted-foreground">Achieved</div>
            <div className="gba:text-xl gba:font-semibold">{summary.achieved}</div>
          </CardContent>
        </Card>
      </div>

      <div className="gba:grid gba:grid-cols-1 gba:xl:grid-cols-12 gba:gap-6">
        <section className="gba:xl:col-span-5 gba:space-y-4">
          <div className="gba:grid gba:grid-cols-3 gba:gap-2">
            <select
              value={statusFilter}
              onChange={event => setStatusFilter(event.target.value)}
              className="gba:h-9 gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:text-sm"
            >
              <option value="ALL">All status</option>
              {Object.entries(statusMap).map(([value, info]) => (
                <option value={value} key={value}>
                  {info.label}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={event => setTypeFilter(event.target.value)}
              className="gba:h-9 gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:text-sm"
            >
              <option value="ALL">All types</option>
              <option value="PERCENTAGE">Percentage</option>
              <option value="NUMERIC">Numeric</option>
              <option value="MILESTONE">Milestone</option>
            </select>
            <select
              value={sortBy}
              onChange={event => setSortBy(event.target.value)}
              className="gba:h-9 gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:text-sm"
            >
              <option value="DUE_DATE">Due date</option>
              <option value="STATUS">Status</option>
              <option value="UPDATED_RECENTLY">Updated recently</option>
            </select>
          </div>

          {!containedGoals.length && !outOfCycleGoals.length ? (
            <EmptyState title={t('performance-empty')} className="gba:py-10" data-testid="empty-goals-state" />
          ) : (
            <div className="gba:space-y-3">
              {containedGoals.map(goal => (
                <Card
                  key={goal.id}
                  className={`gba:cursor-pointer ${selectedGoalId === goal.id ? 'gba:border-primary' : ''}`}
                  onClick={() => setSelectedGoalId(goal.id)}
                >
                  <CardContent className="gba:p-4">
                    <div className="gba:flex gba:justify-between gba:items-start gba:gap-3">
                      <div>
                        <div className="gba:font-medium">{goal.title}</div>
                        <div className="gba:text-xs gba:text-muted-foreground">
                          Due {dayjs(goal.dueDate).format('MMM D, YYYY')}
                        </div>
                      </div>
                      <div className="gba:text-xs gba:text-muted-foreground">{getGoalType(goal)}</div>
                    </div>
                    <div className="gba:mt-3">
                      <div className="gba:w-full gba:bg-muted gba:rounded-full gba:h-2.5">
                        <div
                          className="gba:bg-primary gba:h-2.5 gba:rounded-full"
                          style={{ width: `${normalizeProgress(goal.progressPercent || 0)}%` }}
                        />
                      </div>
                      <div className="gba:flex gba:justify-between gba:mt-1 gba:text-xs gba:text-muted-foreground">
                        <span>{t('performance-progress')}</span>
                        <span>{normalizeProgress(goal.progressPercent || 0)}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {outOfCycleGoals.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="gba:text-sm">Out-of-cycle goals</CardTitle>
                  </CardHeader>
                  <CardContent className="gba:space-y-2">
                    {outOfCycleGoals.map(goal => (
                      <div
                        key={goal.id}
                        className="gba:flex gba:items-center gba:justify-between gba:text-sm gba:cursor-pointer"
                        onClick={() => setSelectedGoalId(goal.id)}
                      >
                        <span>{goal.title}</span>
                        <span className="gba:text-warning">Fix dates to edit</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </section>

        <section className="gba:xl:col-span-7">
          {!selectedGoal ? (
            <Card>
              <CardContent className="gba:p-6">
                <EmptyState title="Select a goal to view details" />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
                  <div>
                    <CardTitle>{selectedGoal.title}</CardTitle>
                    <div className="gba:text-sm gba:text-muted-foreground">
                      {dayjs(selectedGoal.startDate).format('MMM D, YYYY')} -{' '}
                      {dayjs(selectedGoal.dueDate).format('MMM D, YYYY')}
                    </div>
                  </div>
                  <div className="gba:text-xs gba:text-muted-foreground">{getGoalType(selectedGoal)}</div>
                </div>
              </CardHeader>
              <CardContent className="gba:space-y-6">
                {selectedCycle &&
                  !isGoalContainedInCycle(selectedGoal, selectedCycle.startDate, selectedCycle.endDate) && (
                    <div className="gba:text-sm gba:text-warning">
                      This goal is outside the selected cycle and cannot be edited until dates are corrected.
                    </div>
                  )}

                <div className="gba:space-y-3">
                  <div className="gba:text-sm gba:font-medium">Progress editor</div>
                  {getGoalType(selectedGoal) === 'PERCENTAGE' && (
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={String(progressInput)}
                        onChange={event => setProgressInput(normalizeProgress(Number(event.target.value) || 0))}
                      />
                      <span className="gba:text-sm">%</span>
                    </div>
                  )}

                  {getGoalType(selectedGoal) === 'NUMERIC' && (
                    <div className="gba:grid gba:grid-cols-3 gba:gap-3">
                      <div>
                        <div className="gba:text-xs gba:text-muted-foreground">Target</div>
                        <div className="gba:text-sm">{selectedGoal.additionalProperties?.numeric?.target || 0}</div>
                      </div>
                      <div>
                        <div className="gba:text-xs gba:text-muted-foreground">Unit</div>
                        <div className="gba:text-sm">{selectedGoal.additionalProperties?.numeric?.unit || '-'}</div>
                      </div>
                      <div>
                        <div className="gba:text-xs gba:text-muted-foreground">Current</div>
                        <Input
                          type="number"
                          value={String(numericCurrentInput)}
                          onChange={event => setNumericCurrentInput(Number(event.target.value) || 0)}
                        />
                      </div>
                    </div>
                  )}

                  {getGoalType(selectedGoal) === 'MILESTONE' && (
                    <div className="gba:space-y-2">
                      {milestoneDraft.map(milestone => (
                        <label key={milestone.id} className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
                          <input
                            type="checkbox"
                            checked={milestone.done}
                            onChange={event => {
                              const now = dayjs().toISOString()
                              setMilestoneDraft(previous =>
                                previous.map(item =>
                                  item.id === milestone.id
                                    ? {
                                        ...item,
                                        done: event.target.checked,
                                        doneAt: event.target.checked ? now : undefined
                                      }
                                    : item
                                )
                              )
                            }}
                          />
                          {milestone.title}
                        </label>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    className="gba:h-9 gba:px-4 gba:rounded-md gba:bg-primary gba:text-primary-foreground gba:text-sm"
                    onClick={applyProgressUpdate}
                  >
                    Update progress
                  </button>
                </div>

                <div className="gba:h-64 gba:border gba:border-border gba:rounded-md gba:p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={buildChartData(selectedGoal)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis domain={[0, 100]} />
                      <RechartsTooltip formatter={(value: number) => `${Math.round(value)}%`} />
                      <Line dataKey="ideal" type="monotone" stroke="var(--nw-chart-2)" dot={false} name="Ideal" />
                      <Line dataKey="actual" type="stepAfter" stroke="var(--nw-chart-1)" dot={false} name="Actual" />
                      <ReferenceLine x={dayjs().format('MMM D')} stroke="var(--warning)" strokeDasharray="3 3" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
                  <button
                    type="button"
                    className="gba:h-9 gba:px-4 gba:rounded-md gba:bg-secondary gba:text-secondary-foreground gba:text-sm"
                    onClick={() => setGoalStatusLocally('ACHIEVED')}
                  >
                    Mark achieved
                  </button>
                  <button
                    type="button"
                    className="gba:h-9 gba:px-4 gba:rounded-md gba:bg-secondary gba:text-secondary-foreground gba:text-sm"
                    onClick={() => setGoalStatusLocally('NOT_ACHIEVED')}
                  >
                    Mark not achieved
                  </button>
                  {userInfo?.employeeDetails?.employeeId === supervisorId &&
                    selectedCycle &&
                    isGoalContainedInCycle(selectedGoal, selectedCycle.startDate, selectedCycle.endDate) && (
                      <AppAction
                        variant="update-secondary"
                        data-testid={`employee-goal-edit-button-${selectedGoal.id}`}
                        contexts={[
                          {
                            context: FlowContextName.employeePerformanceGoal,
                            contextData: {
                              employeeId: employee.id,
                              goalId: selectedGoal.id,
                              title: selectedGoal.title,
                              startDate: selectedGoal.startDate,
                              dueDate: selectedGoal.dueDate,
                              completionDate: selectedGoal.completionDate,
                              progressPercent: selectedGoal.progressPercent,
                              status: selectedGoal.status,
                              version: selectedGoal.version,
                              cycleStartDate: selectedCycle.startDate,
                              cycleEndDate: selectedCycle.endDate,
                              cycleName: selectedCycle.name
                            }
                          }
                        ]}
                        prefixDataTestId={`employee-goal-edit-${selectedGoal.id}`}
                        accessToken={accessToken}
                        autoExecute={true}
                      />
                    )}
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </div>
  )
}

export default PerformanceTab
