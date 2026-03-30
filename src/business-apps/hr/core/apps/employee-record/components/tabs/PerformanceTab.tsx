'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Icon,
  Input,
  SectionKpiCards,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  type KpiCardData,
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
import { CheckCircleIcon, TargetIcon, Trash, TrendUpIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { startProcess } from '@/common/utils/start-process'
import { beginSilentSave, tryConsumeSilentSave } from '@/common/utils/silent-processes'
import { FilterBar } from './components/CompactFilterBar'

interface PerformanceTabProps {
  employee: Employee
  accessToken: string
  employeeId?: string
  userInfo?: UserInfoProps
  employeePerformanceGoals?: EmployeePerformanceGoal[]
}

type GoalType = 'PERCENTAGE' | 'NUMERIC' | 'MILESTONE'
type TrackState = 'ON_TRACK' | 'BEHIND_TARGET'

interface Milestone {
  id: string
  title: string
  done: boolean
  doneAt?: string
  sortOrder?: number
  version?: number
}

interface MilestoneDelta {
  id: string
  done: boolean
  doneAt?: string | null
}

interface GoalUpdate {
  id: string
  progressPercent?: number
  comment?: string
  updateTime?: string
  updateDelta?: { milestones?: MilestoneDelta[] } | null
  employee?: { firstName?: string; lastName?: string }
}

interface GoalUpdateEvent {
  at: string
  progress: number
  details?: string
  author?: string
  completedMilestones?: string[]
  reopenedMilestones?: string[]
}

interface ExtendedEmployeePerformanceGoal extends EmployeePerformanceGoal {
  id: string
  version?: number
  createdAt?: string
  updatedAt?: string
  objectiveType?: string
  startValue?: number
  targetValue?: number
  employeePerformanceGoalMilestone?: Milestone[]
  employeePerformanceGoalUpdate?: GoalUpdate[]
  additionalProperties?: {
    goalType?: GoalType
    numeric?: {
      target?: number
      current?: number
      unit?: string
    }
    note?: string
  }
}

const normalizeProgress = (value: number) => Math.round(Math.max(0, Math.min(100, value)) * 100) / 100

const PerformanceTab: React.FC<PerformanceTabProps> = ({ employee, accessToken, userInfo }) => {
  const { t } = useTranslation(translations)
  const graphQLClient = useGraphqlClient(accessToken)
  const { cycles, loading: cyclesLoading } = usePerformanceCycles(accessToken)

  const [localPerformanceGoals, setLocalPerformanceGoals] = useState<ExtendedEmployeePerformanceGoal[]>([])
  const [goalEvents, setGoalEvents] = useState<Record<string, GoalUpdateEvent[]>>({})
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCycleId, setSelectedCycleId] = useState<string>('')
  const [selectedGoalId, setSelectedGoalId] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [sortBy, setSortBy] = useState<string>('DUE_DATE')
  const [progressInput, setProgressInput] = useState<number>(0)
  const [numericCurrentInput, setNumericCurrentInput] = useState<number>(0)
  const [milestoneDraft, setMilestoneDraft] = useState<Milestone[]>([])
  const [detailsInput, setDetailsInput] = useState<string>('')
  const [showCompletedModal, setShowCompletedModal] = useState(false)
  const [goalToDelete, setGoalToDelete] = useState<ExtendedEmployeePerformanceGoal | null>(null)

  const supervisorId = useMemo(() => employee.employeePosition?.supervisor?.id, [employee])
  const currentUserEmployeeId = userInfo?.employeeDetails?.employeeId
  const isSelfView = currentUserEmployeeId === employee.id
  const isManagerView = currentUserEmployeeId === supervisorId
  const canManageGoals = isSelfView || isManagerView

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
    // Always fetch using the full query (objectiveType, milestones, updates, etc.)
    // The prop data from useEmployeeData is incomplete and lacks these fields.
    fetchPerformanceData()
  }, [fetchPerformanceData])

  // Re-fetch when external processes complete (e.g. edit form, goal creation).
  // Silent saves (Save Update, Mark Completed) are handled optimistically and skip this.
  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ resolution: 'success' | 'failure' }>
      if (customEvent.detail.resolution !== 'success') return
      if (tryConsumeSilentSave()) return // our own background save — already handled optimistically
      fetchPerformanceData()
    }
    window.addEventListener('com.newwork.process.processCompletion', handler)
    return () => window.removeEventListener('com.newwork.process.processCompletion', handler)
  }, [fetchPerformanceData])

  useEffect(() => {
    if (cycles.length === 0) return

    const cycleExists = cycles.some(cycle => cycle.id === selectedCycleId)
    if (cycleExists) return

    const active = cycles.find(cycle => cycle.status === 'Active')
    setSelectedCycleId((active || cycles[0]).id)
  }, [cycles, selectedCycleId])

  const getGoalType = (goal: ExtendedEmployeePerformanceGoal): GoalType => {
    // Prefer the proper objectiveType DB column
    if (goal.objectiveType === 'NUMERIC_PERFORMANCE_GOAL') return 'NUMERIC'
    if (goal.objectiveType === 'MILESTONE_PERFORMANCE_GOAL') return 'MILESTONE'
    if (goal.objectiveType === 'PERCENTAGE_PERFORMANCE_GOAL') return 'PERCENTAGE'
    // Fallback for legacy data stored in additionalProperties
    const rawType = goal.additionalProperties?.goalType
    if (rawType === 'NUMERIC' || rawType === 'MILESTONE' || rawType === 'PERCENTAGE') return rawType
    if (goal.employeePerformanceGoalMilestone?.length) return 'MILESTONE'
    if (goal.targetValue) return 'NUMERIC'
    return 'PERCENTAGE'
  }

  const isGoalValid = (goal: ExtendedEmployeePerformanceGoal) => Boolean(goal.title && goal.startDate && goal.dueDate)

  const selectedCycle = useMemo(() => {
    const cycleFromSelection = cycles.find(cycle => cycle.id === selectedCycleId)
    if (cycleFromSelection) return cycleFromSelection

    const activeCycle = cycles.find(cycle => cycle.status === 'Active')
    return activeCycle || cycles[0]
  }, [cycles, selectedCycleId])
  const selectedCycleStartDate = selectedCycle?.evaluationPeriodStartDate || selectedCycle?.startDate
  const selectedCycleEndDate = selectedCycle?.evaluationPeriodEndDate || selectedCycle?.endDate

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
    const baselineDate = startDate.isValid() ? startDate : dayjs().startOf('day')
    const events: GoalUpdateEvent[] = [{ at: baselineDate.toISOString(), progress: 0 }]

    // Use real update records from the DB when available
    if (goal.employeePerformanceGoalUpdate?.length) {
      const milestoneTitleMap = new Map(
        (goal.employeePerformanceGoalMilestone || []).map(milestone => [milestone.id, milestone.title])
      )
      let previousMilestoneState = new Map(
        (goal.employeePerformanceGoalMilestone || []).map(milestone => [milestone.id, milestone.done ?? false])
      )

      goal.employeePerformanceGoalUpdate.forEach(update => {
        const author = [update.employee?.firstName, update.employee?.lastName].filter(Boolean).join(' ')
        const completedMilestones: string[] = []
        const reopenedMilestones: string[] = []
        const milestoneSnapshot = update.updateDelta?.milestones

        milestoneSnapshot?.forEach(milestone => {
          const wasDone = previousMilestoneState.get(milestone.id) ?? false
          const title = milestoneTitleMap.get(milestone.id)
          if (!title || wasDone === milestone.done) return

          if (milestone.done) {
            completedMilestones.push(title)
          } else {
            reopenedMilestones.push(title)
          }
        })

        if (milestoneSnapshot?.length) {
          previousMilestoneState = new Map(milestoneSnapshot.map(milestone => [milestone.id, milestone.done]))
        }

        events.push({
          at: update.updateTime || baselineDate.toISOString(),
          progress: normalizeProgress(update.progressPercent ?? 0),
          details: update.comment || undefined,
          author: author || undefined,
          completedMilestones: completedMilestones.length ? completedMilestones : undefined,
          reopenedMilestones: reopenedMilestones.length ? reopenedMilestones : undefined
        })
      })
    } else if ((goal.progressPercent || 0) > 0) {
      // Fallback: synthesize a single event from the goal's current progress
      const dueDate = dayjs(goal.dueDate).startOf('day')
      const rawDate = dayjs(goal.updatedAt || goal.completionDate || goal.startDate)
      let boundedDate = rawDate.isValid() ? rawDate : dayjs()
      if (boundedDate.isBefore(startDate)) boundedDate = startDate
      if (boundedDate.isAfter(dueDate)) boundedDate = dueDate
      events.push({ at: boundedDate.toISOString(), progress: normalizeProgress(goal.progressPercent || 0) })
    }

    return events.sort((a, b) => dayjs(a.at).valueOf() - dayjs(b.at).valueOf())
  }, [])

  useEffect(() => {
    // Always rebuild from DB data so real persisted updates are shown
    setGoalEvents(() => {
      const next: Record<string, GoalUpdateEvent[]> = {}
      localPerformanceGoals.forEach(goal => {
        next[goal.id] = getInitialEvents(goal)
      })
      return next
    })
  }, [localPerformanceGoals, getInitialEvents])

  const normalizedSearchTerm = useMemo(() => searchTerm.trim().toLowerCase(), [searchTerm])

  const matchesGoalFilters = useCallback(
    (goal: ExtendedEmployeePerformanceGoal) => {
      if (statusFilter !== 'ALL' && goal.status !== statusFilter) return false
      if (typeFilter !== 'ALL' && getGoalType(goal) !== typeFilter) return false
      if (!normalizedSearchTerm) return true
      const title = goal.title?.toLowerCase() || ''
      const note = goal.additionalProperties?.note?.toLowerCase() || ''
      return title.includes(normalizedSearchTerm) || note.includes(normalizedSearchTerm)
    },
    [statusFilter, typeFilter, normalizedSearchTerm]
  )

  const cycleRelevantGoals = useMemo(() => {
    if (!selectedCycleStartDate || !selectedCycleEndDate) return []
    return localPerformanceGoals
      .filter(isGoalValid)
      .filter(goal => doesGoalOverlapCycle(goal, selectedCycleStartDate, selectedCycleEndDate))
      .filter(matchesGoalFilters)
  }, [localPerformanceGoals, selectedCycleStartDate, selectedCycleEndDate, doesGoalOverlapCycle, matchesGoalFilters])

  const containedGoals = useMemo(() => {
    if (!selectedCycleStartDate || !selectedCycleEndDate) return []
    return sortGoals(
      cycleRelevantGoals.filter(goal => isGoalContainedInCycle(goal, selectedCycleStartDate, selectedCycleEndDate))
    )
  }, [cycleRelevantGoals, selectedCycleStartDate, selectedCycleEndDate, sortGoals, isGoalContainedInCycle])

  const outOfCycleGoals = useMemo(() => {
    if (!selectedCycleStartDate || !selectedCycleEndDate) return []
    return cycleRelevantGoals.filter(
      goal => !isGoalContainedInCycle(goal, selectedCycleStartDate, selectedCycleEndDate)
    )
  }, [cycleRelevantGoals, selectedCycleStartDate, selectedCycleEndDate, isGoalContainedInCycle])

  useEffect(() => {
    const visibleGoalIds = [...containedGoals, ...outOfCycleGoals].map(goal => goal.id)
    if (visibleGoalIds.length === 0) {
      setSelectedGoalId('')
      return
    }
    if (selectedGoalId && !visibleGoalIds.includes(selectedGoalId)) setSelectedGoalId('')
  }, [containedGoals, outOfCycleGoals, selectedGoalId])

  const selectedGoal = useMemo(
    () => [...containedGoals, ...outOfCycleGoals].find(goal => goal.id === selectedGoalId),
    [containedGoals, outOfCycleGoals, selectedGoalId]
  )

  const getProgressAtDate = (events: GoalUpdateEvent[], pointDate: dayjs.Dayjs) => {
    let current = 0
    // Compare at day granularity so intra-day events (e.g. 11:42 vs midnight) are included correctly
    ;[...events]
      .sort((a, b) => dayjs(a.at).valueOf() - dayjs(b.at).valueOf())
      .forEach(event => {
        if (!dayjs(event.at).startOf('day').isAfter(pointDate)) current = normalizeProgress(event.progress)
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
      if (actual >= ideal - 10) return 'ON_TRACK'
      return 'BEHIND_TARGET'
    },
    [goalEvents, getInitialEvents]
  )

  const summary = useMemo(() => {
    const activeContainedGoals = containedGoals
    const total = containedGoals.length
    const achieved = activeContainedGoals.filter(
      goal => goal.status === 'ACHIEVED' || goal.progressPercent >= 100
    ).length
    const onTrack = activeContainedGoals.filter(goal => getTrackState(goal) === 'ON_TRACK').length
    const behind = activeContainedGoals.filter(goal => getTrackState(goal) === 'BEHIND_TARGET').length
    return { total, achieved, onTrack, behind }
  }, [containedGoals, getTrackState])

  const kpiCards = useMemo<KpiCardData[]>(
    () => [
      {
        id: 'performance-total-goals',
        title: 'Total goals',
        value: String(summary.total),
        icon: <Icon icon={TargetIcon} size="sm" decorative />,
        iconColor: 'var(--nw-info)',
        footer: 'In selected cycle'
      },
      {
        id: 'performance-on-track-goals',
        title: 'On track',
        value: String(summary.onTrack),
        icon: <Icon icon={TrendUpIcon} size="sm" decorative />,
        iconColor: 'var(--nw-success)',
        footer: 'Healthy progress'
      },
      {
        id: 'performance-behind-goals',
        title: 'Behind target',
        value: String(summary.behind),
        icon: <Icon icon={WarningCircleIcon} size="sm" decorative />,
        iconColor: 'var(--nw-warning)',
        footer: 'Needs attention'
      },
      {
        id: 'performance-achieved-goals',
        title: 'Achieved',
        value: String(summary.achieved),
        icon: <Icon icon={CheckCircleIcon} size="sm" decorative />,
        iconColor: 'var(--nw-decorative)',
        footer: 'Completed goals'
      }
    ],
    [summary.total, summary.onTrack, summary.behind, summary.achieved]
  )

  useEffect(() => {
    if (!selectedGoal) return
    setProgressInput(normalizeProgress(selectedGoal.progressPercent || 0))
    setNumericCurrentInput(selectedGoal.additionalProperties?.numeric?.current || 0)

    const baseMilestones: Milestone[] = selectedGoal.employeePerformanceGoalMilestone?.length
      ? selectedGoal.employeePerformanceGoalMilestone
      : (selectedGoal.additionalProperties as any)?.milestones || []

    // Restore done states from the most recent update that has milestone snapshot in updateDelta
    const updates = selectedGoal.employeePerformanceGoalUpdate || []
    const latestWithDelta = [...updates].reverse().find(u => u.updateDelta?.milestones?.length)

    if (latestWithDelta?.updateDelta?.milestones) {
      const doneMap = Object.fromEntries(latestWithDelta.updateDelta.milestones.map(m => [m.id, m]))
      setMilestoneDraft(
        baseMilestones.map(m => ({
          ...m,
          done: doneMap[m.id]?.done ?? m.done,
          doneAt: doneMap[m.id]?.doneAt ?? m.doneAt
        }))
      )
    } else {
      setMilestoneDraft(baseMilestones)
    }
  }, [selectedGoal])

  const buildChartData = (goal: ExtendedEmployeePerformanceGoal) => {
    const startDate = dayjs(goal.startDate).startOf('day')
    const dueDate = dayjs(goal.dueDate).startOf('day')
    if (!startDate.isValid() || !dueDate.isValid()) return []
    const days = Math.max(dueDate.diff(startDate, 'day'), 1)
    const pointCount = Math.min(days + 1, 31)
    const events = goalEvents[goal.id] || getInitialEvents(goal)

    const today = dayjs().startOf('day')
    return Array.from({ length: pointCount }, (_, index) => {
      const ratio = pointCount === 1 ? 0 : index / (pointCount - 1)
      const date = startDate.add(Math.round(days * ratio), 'day')
      // Don't plot actual progress for future dates — only show what has happened so far
      const actual = date.isAfter(today) ? null : getProgressAtDate(events, date)
      return {
        label: date.format('MMM D'),
        ideal: getIdealProgressAtDate(startDate, dueDate, date),
        actual
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
      const target = selectedGoal.targetValue ?? selectedGoal.additionalProperties?.numeric?.target ?? 0
      const safeTarget = target <= 0 ? 1 : target
      nextProgress = normalizeProgress((numericCurrentInput / safeTarget) * 100)
      nextAdditional = {
        ...nextAdditional,
        numeric: {
          current: numericCurrentInput,
          unit: selectedGoal.additionalProperties?.numeric?.unit || ''
        }
      }
    }

    if (type === 'MILESTONE') {
      const total = milestoneDraft.length
      const completed = milestoneDraft.filter(item => item.done).length
      nextProgress = total > 0 ? normalizeProgress((completed / total) * 100) : 0
    }

    const now = dayjs().toISOString()
    const comment = detailsInput.trim()
    if (!comment) return

    // Build milestone snapshot for updateDelta so we can restore done states on reload
    const milestoneDeltaForUpdate =
      type === 'MILESTONE'
        ? milestoneDraft.map(m => ({ id: m.id, done: m.done, doneAt: m.done ? (m.doneAt ?? now) : null }))
        : undefined

    // Build the optimistic update record so the history panel updates immediately
    const optimisticUpdate: GoalUpdate = {
      id: `optimistic-${now}`,
      progressPercent: nextProgress,
      comment,
      updateTime: now,
      updateDelta: milestoneDeltaForUpdate ? { milestones: milestoneDeltaForUpdate } : null,
      employee: { firstName: employee.firstName, lastName: employee.lastName }
    }

    // Optimistic local update — also append the new update record so getInitialEvents
    // rebuilds the history correctly when localPerformanceGoals changes.
    updateGoal(selectedGoal.id, goal => ({
      ...goal,
      progressPercent: nextProgress,
      version: (goal.version ?? 0) + 1,
      updatedAt: now,
      additionalProperties: nextAdditional,
      employeePerformanceGoalUpdate: [...(goal.employeePerformanceGoalUpdate || []), optimisticUpdate],
      ...(type === 'MILESTONE' ? { employeePerformanceGoalMilestone: milestoneDraft } : {})
    }))
    setDetailsInput('')
    // Persist the progress update record (comment is required by the backend)
    beginSilentSave()
    startProcess({
      domain: 'employee',
      processName: 'saveEmployeePerformanceGoalUpdate',
      payload: {
        changeMode: 'INSERT',
        employeePerformanceGoalUpdate: {
          progressPercent: nextProgress,
          comment,
          updateTime: now,
          performanceGoal: selectedGoal.id,
          employee: employee.id,
          // Store milestone done states in updateDelta so they survive a page reload
          ...(milestoneDeltaForUpdate ? { updateDelta: { milestones: milestoneDeltaForUpdate } } : {})
        }
      },
      skipScreen: true
    })
  }

  const toggleMilestone = useCallback((milestoneId: string, checked: boolean) => {
    const now = dayjs().toISOString()
    setMilestoneDraft(previous =>
      previous.map(item =>
        item.id === milestoneId ? { ...item, done: checked, doneAt: checked ? now : undefined } : item
      )
    )
  }, [])

  const markGoalCompleted = () => {
    if (!selectedGoal) return
    const now = new Date().toISOString()
    const currentProgress = selectedGoal.progressPercent || 0

    // Optimistic update — keep current progress, mark status as ACHIEVED
    const optimisticUpdate: GoalUpdate = {
      id: `optimistic-${now}`,
      progressPercent: currentProgress,
      comment: 'Goal marked as completed',
      updateTime: now,
      employee: { firstName: employee.firstName, lastName: employee.lastName }
    }
    updateGoal(selectedGoal.id, goal => ({
      ...goal,
      status: 'ACHIEVED',
      version: (goal.version ?? 0) + 1,
      employeePerformanceGoalUpdate: [...(goal.employeePerformanceGoalUpdate || []), optimisticUpdate]
    }))
    setShowCompletedModal(false)

    // Persist status: 'ACHIEVED' on the goal record so it survives a page refresh
    beginSilentSave()
    startProcess({
      domain: 'employee',
      processName: 'saveEmployeePerformanceGoal',
      payload: {
        changeMode: 'UPDATE',
        employeePerformanceGoal: {
          id: selectedGoal.id,
          version: selectedGoal.version ?? 0,
          title: selectedGoal.title,
          startDate: selectedGoal.startDate,
          dueDate: selectedGoal.dueDate,
          objectiveType: selectedGoal.objectiveType,
          status: 'ACHIEVED',
          progressPercent: currentProgress,
          employee: employee.id
        }
      },
      skipScreen: true
    })
  }

  const confirmDeleteGoal = () => {
    if (!goalToDelete) return
    const { id, version } = goalToDelete

    // Optimistically remove from local state
    setLocalPerformanceGoals(prev => prev.filter(g => g.id !== id))
    if (selectedGoalId === id) setSelectedGoalId('')
    setGoalToDelete(null)

    beginSilentSave()
    startProcess({
      domain: 'employee',
      processName: 'saveEmployeePerformanceGoal',
      payload: {
        changeMode: 'DELETE',
        employeePerformanceGoal: {
          id,
          version: version ?? 0,
          employee: employee.id
        }
      },
      skipScreen: true
    })
  }

  const getGoalLabel = (goal: ExtendedEmployeePerformanceGoal): 'COMPLETED' | 'ON_TRACK' | 'BEHIND_TARGET' => {
    if (goal.status === 'ACHIEVED' || (goal.progressPercent || 0) >= 100) return 'COMPLETED'
    return getTrackState(goal) === 'BEHIND_TARGET' ? 'BEHIND_TARGET' : 'ON_TRACK'
  }

  const statusMap: Record<string, { label: string; color: string }> = {
    ON_TRACK: { label: t('performance-status-on-track'), color: 'gba:bg-success-secondary gba:text-success' },
    BEHIND_TARGET: {
      label: t('performance-status-behind-target'),
      color: 'gba:bg-destructive-secondary gba:text-destructive'
    },
    COMPLETED: { label: 'Completed', color: 'gba:bg-info-secondary gba:text-info' }
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
          <Select value={selectedCycle?.id || ''} onValueChange={setSelectedCycleId}>
            <SelectTrigger className="gba:min-w-[260px]" data-testid="performance-cycle-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {cycles.map(cycle => (
                <SelectItem value={cycle.id} key={cycle.id}>
                  {cycle.name} ({dayjs(cycle.evaluationPeriodStartDate || cycle.startDate).format('MMM D, YYYY')} -{' '}
                  {dayjs(cycle.evaluationPeriodEndDate || cycle.endDate).format('MMM D, YYYY')})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <AppAction
            variant="update-primary"
            data-testid="employee-goal-add-button"
            disabled={!selectedCycle}
            contexts={[
              {
                context: FlowContextName.employeePerformanceGoal,
                contextData: {
                  employeeId: employee.id,
                  employee,
                  cycleId: selectedCycle?.id,
                  cycleStartDate: selectedCycleStartDate,
                  cycleEndDate: selectedCycleEndDate,
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

      <SectionKpiCards cards={kpiCards} className="gba:w-full gba:md:grid-cols-4 nw:md:grid-cols-4" />

      <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-12 gba:gap-6">
        <section className="gba:lg:col-span-5 gba:space-y-4">
          <FilterBar
            dataTestId="performance-goals-filters-card"
            className="gba:bg-card gba:border gba:border-border gba:rounded-lg gba:p-1.5"
            controlsClassName="gba:gap-1.5"
            search={{
              value: searchTerm,
              onChange: setSearchTerm,
              placeholder: 'Search goals',
              minWidthClassName: 'gba:min-w-[260px] gba:flex-1',
              'data-testid': 'performance-goals-search-input'
            }}
            clear={{
              label: 'Clear',
              onClick: () => {
                setSearchTerm('')
                setStatusFilter('ALL')
                setTypeFilter('ALL')
                setSortBy('DUE_DATE')
              },
              'data-testid': 'performance-goals-clear-filters'
            }}
          >
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="gba:min-w-[150px]" data-testid="performance-goals-status-filter">
                <SelectValue placeholder="All status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All status</SelectItem>
                {Object.entries(statusMap).map(([value, info]) => (
                  <SelectItem value={value} key={value}>
                    {info.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="gba:min-w-[150px]" data-testid="performance-goals-type-filter">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                <SelectItem value="NUMERIC">Numeric</SelectItem>
                <SelectItem value="MILESTONE">Milestone</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="gba:min-w-[170px]" data-testid="performance-goals-sort-filter">
                <SelectValue placeholder="Due date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DUE_DATE">Due date</SelectItem>
                <SelectItem value="STATUS">Status</SelectItem>
                <SelectItem value="UPDATED_RECENTLY">Updated recently</SelectItem>
              </SelectContent>
            </Select>
          </FilterBar>

          {!containedGoals.length && !outOfCycleGoals.length ? (
            <EmptyState title={t('performance-empty')} className="gba:py-10" data-testid="empty-goals-state" />
          ) : (
            <div className="gba:space-y-3">
              {containedGoals.map(goal => (
                <Card
                  key={goal.id}
                  className={`gba:cursor-pointer gba:transition-colors ${
                    selectedGoalId === goal.id
                      ? 'gba:border-primary gba:bg-primary/5'
                      : 'gba:hover:border-primary/40 gba:hover:bg-muted/40'
                  }`}
                  onClick={() => setSelectedGoalId(goal.id)}
                >
                  <CardContent className="gba:p-4">
                    <div className="gba:flex gba:justify-between gba:items-start gba:gap-3">
                      <div className="gba:flex-1 gba:min-w-0">
                        <div
                          className={`gba:font-medium gba:truncate ${selectedGoalId === goal.id ? 'gba:text-primary' : ''}`}
                        >
                          {goal.title}
                        </div>
                        <div className="gba:text-xs gba:text-muted-foreground">
                          Due {dayjs(goal.dueDate).format('MMM D, YYYY')}
                        </div>
                      </div>
                      <div className="gba:flex gba:flex-col gba:items-end gba:gap-1 gba:shrink-0">
                        <div className="gba:flex gba:items-center gba:gap-1">
                          <span className="gba:text-xs gba:text-muted-foreground gba:capitalize gba:lowercase">
                            {getGoalType(goal).charAt(0) + getGoalType(goal).slice(1).toLowerCase()}
                          </span>
                          {canManageGoals && (
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation()
                                setGoalToDelete(goal)
                              }}
                              className="gba:p-1 gba:rounded gba:text-muted-foreground gba:hover:text-destructive gba:hover:bg-destructive/10 gba:transition-colors"
                              aria-label="Delete goal"
                            >
                              <Trash className="gba:w-3.5 gba:h-3.5" />
                            </button>
                          )}
                        </div>
                        {(() => {
                          const badge = statusMap[getGoalLabel(goal)]
                          return badge ? (
                            <span
                              className={`gba:text-xs gba:font-medium gba:px-2 gba:py-0.5 gba:rounded-full ${badge.color}`}
                            >
                              {badge.label}
                            </span>
                          ) : null
                        })()}
                      </div>
                    </div>
                    <div className="gba:mt-3">
                      <div className="gba:w-full gba:bg-muted gba:rounded-full gba:h-2">
                        <div
                          className="gba:bg-primary gba:h-2 gba:rounded-full gba:transition-all"
                          style={{ width: `${normalizeProgress(goal.progressPercent || 0)}%` }}
                        />
                      </div>
                      <div className="gba:flex gba:justify-between gba:mt-1 gba:text-xs gba:text-muted-foreground">
                        <span>{t('performance-progress')}</span>
                        <span className={selectedGoalId === goal.id ? 'gba:text-primary gba:font-medium' : ''}>
                          {normalizeProgress(goal.progressPercent || 0)}%
                        </span>
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
                      <button
                        key={goal.id}
                        type="button"
                        className="gba:flex gba:items-center gba:justify-between gba:text-sm gba:cursor-pointer gba:w-full gba:text-left"
                        onClick={() => setSelectedGoalId(goal.id)}
                      >
                        <span>{goal.title}</span>
                        <span className="gba:text-warning">Fix dates to edit</span>
                      </button>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </section>

        <section className="gba:lg:col-span-7">
          {selectedGoal ? (
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
                  <div className="gba:flex gba:items-center gba:gap-2 gba:shrink-0">
                    {selectedGoal.status !== 'ACHIEVED' && (selectedGoal.progressPercent || 0) < 100 && (
                      <button
                        type="button"
                        className="gba:h-8 gba:px-3 gba:rounded-md gba:bg-secondary gba:text-secondary-foreground gba:text-sm gba:whitespace-nowrap"
                        onClick={() => setShowCompletedModal(true)}
                      >
                        Mark Completed
                      </button>
                    )}
                    {canManageGoals &&
                      selectedGoal.status !== 'ACHIEVED' &&
                      (selectedGoal.progressPercent || 0) < 100 && (
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
                                objectiveType: selectedGoal.objectiveType,
                                startValue: selectedGoal.startValue,
                                targetValue: selectedGoal.targetValue,
                                version: selectedGoal.version,
                                cycleId: selectedCycle?.id,
                                cycleStartDate: selectedCycleStartDate,
                                cycleEndDate: selectedCycleEndDate,
                                cycleName: selectedCycle?.name,
                                additionalProperties: selectedGoal.additionalProperties,
                                existingMilestonesJson: JSON.stringify(
                                  selectedGoal.employeePerformanceGoalMilestone?.map(m => ({
                                    id: m.id,
                                    title: m.title,
                                    version: m.version ?? 0,
                                    done: m.done ?? false,
                                    doneAt: m.doneAt ?? null
                                  })) || []
                                ),
                                existingUpdatesJson: JSON.stringify(
                                  selectedGoal.employeePerformanceGoalUpdate?.map(u => ({
                                    id: u.id,
                                    comment: u.comment,
                                    progressPercent: u.progressPercent,
                                    updateTime: u.updateTime
                                  })) || []
                                )
                              }
                            }
                          ]}
                          prefixDataTestId={`employee-goal-edit-${selectedGoal.id}`}
                          accessToken={accessToken}
                          autoExecute={true}
                        />
                      )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="gba:space-y-6">
                {selectedCycleStartDate &&
                  selectedCycleEndDate &&
                  !isGoalContainedInCycle(selectedGoal, selectedCycleStartDate, selectedCycleEndDate) && (
                    <div className="gba:text-sm gba:text-warning gba:bg-warning/10 gba:rounded-md gba:px-3 gba:py-2">
                      This goal is outside the selected cycle and cannot be edited until dates are corrected.
                    </div>
                  )}

                <div className="gba:space-y-3">
                  <div className="gba:text-sm gba:font-medium">Update Progress</div>
                  {getGoalType(selectedGoal) === 'PERCENTAGE' && (
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        disabled={selectedGoal.status === 'ACHIEVED' || (selectedGoal.progressPercent || 0) >= 100}
                        value={String(progressInput)}
                        onChange={event => setProgressInput(normalizeProgress(Number(event.target.value) || 0))}
                      />
                      <span className="gba:text-sm">%</span>
                    </div>
                  )}

                  {getGoalType(selectedGoal) === 'NUMERIC' && (
                    <div className="gba:grid gba:grid-cols-2 gba:gap-3">
                      <div>
                        <div className="gba:text-xs gba:text-muted-foreground">Target</div>
                        <div className="gba:text-sm gba:mt-1">
                          {selectedGoal.targetValue ?? selectedGoal.additionalProperties?.numeric?.target ?? 0}
                        </div>
                      </div>
                      <div>
                        <div className="gba:text-xs gba:text-muted-foreground">Current</div>
                        <Input
                          type="number"
                          disabled={selectedGoal.status === 'ACHIEVED' || (selectedGoal.progressPercent || 0) >= 100}
                          value={String(numericCurrentInput)}
                          onChange={event => setNumericCurrentInput(Number(event.target.value) || 0)}
                        />
                      </div>
                    </div>
                  )}

                  {(() => {
                    const isCompleted = selectedGoal.status === 'ACHIEVED' || (selectedGoal.progressPercent || 0) >= 100
                    return (
                      <>
                        {getGoalType(selectedGoal) === 'MILESTONE' && (
                          <div className="gba:space-y-2">
                            {milestoneDraft.map(milestone => (
                              <label
                                key={milestone.id}
                                className={`gba:flex gba:items-center gba:gap-2 gba:text-sm ${isCompleted ? 'gba:opacity-50 gba:cursor-not-allowed' : ''}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={milestone.done}
                                  disabled={isCompleted}
                                  onChange={event => toggleMilestone(milestone.id, event.target.checked)}
                                />
                                {milestone.title}
                              </label>
                            ))}
                          </div>
                        )}

                        <div>
                          <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">Details / Notes</div>
                          <textarea
                            rows={3}
                            value={detailsInput}
                            disabled={isCompleted}
                            onChange={event => setDetailsInput(event.target.value)}
                            placeholder={
                              isCompleted
                                ? 'This goal is completed and can no longer be modified.'
                                : 'Describe what you accomplished or any blockers…'
                            }
                            className={`gba:w-full gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:resize-none gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-ring ${isCompleted ? 'gba:opacity-50 gba:cursor-not-allowed' : ''}`}
                          />
                          {!isCompleted && !detailsInput.trim() && (
                            <p
                              className="gba:mt-1 gba:text-xs gba:text-destructive"
                              data-testid="performance-goal-update-comment-required"
                            >
                              Please add a comment before saving this update.
                            </p>
                          )}
                        </div>

                        {!isCompleted && (
                          <button
                            type="button"
                            className="gba:h-9 gba:px-4 gba:rounded-md gba:bg-primary gba:text-primary-foreground gba:text-sm disabled:gba:opacity-40 disabled:gba:cursor-not-allowed"
                            disabled={!detailsInput.trim()}
                            onClick={applyProgressUpdate}
                          >
                            Save Update
                          </button>
                        )}
                      </>
                    )
                  })()}
                </div>

                <div className="gba:space-y-2">
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <div className="gba:text-sm gba:font-medium">Burnup Chart</div>
                    <div className="gba:flex gba:items-center gba:gap-4 gba:text-xs gba:text-muted-foreground">
                      <span className="gba:flex gba:items-center gba:gap-1">
                        <span className="gba:inline-block gba:w-4 gba:h-0.5 gba:bg-[var(--nw-chart-2)]" />
                        Ideal
                      </span>
                      <span className="gba:flex gba:items-center gba:gap-1">
                        <span className="gba:inline-block gba:w-4 gba:h-0.5 gba:bg-[var(--nw-chart-1)]" />
                        Actual
                      </span>
                      <span className="gba:flex gba:items-center gba:gap-1">
                        <span className="gba:inline-block gba:w-4 gba:h-0.5 gba:border-t gba:border-dashed gba:border-warning" />
                        Today
                      </span>
                    </div>
                  </div>
                  <div className="gba:h-56 gba:border gba:border-border gba:rounded-md gba:p-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={buildChartData(selectedGoal)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11 }} />
                        <RechartsTooltip
                          formatter={(value: number | undefined) => (value != null ? `${Math.round(value)}%` : '')}
                        />
                        <Line dataKey="ideal" type="monotone" stroke="var(--nw-chart-2)" dot={false} name="Ideal" />
                        <Line
                          dataKey="actual"
                          type="stepAfter"
                          stroke="var(--nw-chart-1)"
                          dot={false}
                          name="Actual"
                          strokeWidth={2}
                          connectNulls={false}
                        />
                        <ReferenceLine x={dayjs().format('MMM D')} stroke="var(--warning)" strokeDasharray="3 3" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {(() => {
                  const events = (goalEvents[selectedGoal.id] || []).filter(
                    e =>
                      e.progress > 0 ||
                      e.details ||
                      e.author ||
                      e.completedMilestones?.length ||
                      e.reopenedMilestones?.length
                  )
                  if (events.length === 0) return null
                  return (
                    <div className="gba:space-y-2">
                      <div className="gba:text-sm gba:font-medium">Update History</div>
                      <div className="gba:space-y-3">
                        {[...events].reverse().map((event, index) => (
                          <div key={index} className="gba:flex gba:gap-3">
                            <div className="gba:flex gba:flex-col gba:items-center">
                              <div className="gba:w-2 gba:h-2 gba:rounded-full gba:bg-primary gba:mt-1 gba:shrink-0" />
                              {index < events.length - 1 && (
                                <div className="gba:w-px gba:flex-1 gba:bg-border gba:mt-1" />
                              )}
                            </div>
                            <div className="gba:pb-3">
                              <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
                                <span className="gba:text-xs gba:font-medium">
                                  Progress → {Math.round(event.progress)}%
                                </span>
                                <span className="gba:text-xs gba:text-muted-foreground">
                                  {dayjs(event.at).format('MMM D, YYYY HH:mm')}
                                </span>
                                {event.author && (
                                  <span className="gba:text-xs gba:text-muted-foreground">· {event.author}</span>
                                )}
                              </div>
                              {event.details && (
                                <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">{event.details}</p>
                              )}
                              {event.completedMilestones?.length ? (
                                <p
                                  className="gba:text-xs gba:text-muted-foreground gba:mt-0.5"
                                  data-testid={`performance-goal-update-history-completed-${index}`}
                                >
                                  Completed: {event.completedMilestones.join(', ')}
                                </p>
                              ) : null}
                              {event.reopenedMilestones?.length ? (
                                <p
                                  className="gba:text-xs gba:text-muted-foreground gba:mt-0.5"
                                  data-testid={`performance-goal-update-history-reopened-${index}`}
                                >
                                  Reopened: {event.reopenedMilestones.join(', ')}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {/* Completed confirmation modal */}
                {showCompletedModal && (
                  <div className="gba:fixed gba:inset-0 gba:z-50 gba:flex gba:items-center gba:justify-center gba:bg-black/40">
                    <div className="gba:bg-background gba:rounded-lg gba:shadow-lg gba:p-6 gba:max-w-sm gba:w-full gba:mx-4 gba:space-y-4">
                      <div className="gba:text-base gba:font-semibold">Mark as Completed?</div>
                      <p className="gba:text-sm gba:text-muted-foreground">
                        You will no longer be able to modify this goal's progress.
                      </p>
                      <div className="gba:flex gba:gap-3 gba:justify-end">
                        <button
                          type="button"
                          className="gba:h-9 gba:px-4 gba:rounded-md gba:bg-secondary gba:text-secondary-foreground gba:text-sm"
                          onClick={() => setShowCompletedModal(false)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="gba:h-9 gba:px-4 gba:rounded-md gba:bg-primary gba:text-primary-foreground gba:text-sm"
                          onClick={markGoalCompleted}
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="gba:border-dashed">
              <CardContent className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-16 gba:px-6 gba:text-center">
                <div className="gba:text-3xl gba:mb-4">🎯</div>
                <div className="gba:text-base gba:font-medium gba:text-foreground gba:mb-1">
                  Select a goal to view details
                </div>
                <div className="gba:text-sm gba:text-muted-foreground">
                  Click on any goal from the list to see progress, chart, and update history.
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      </div>

      {/* Delete confirmation modal — rendered at top level so it works regardless of selected goal */}
      {goalToDelete && (
        <div className="gba:fixed gba:inset-0 gba:z-50 gba:flex gba:items-center gba:justify-center gba:bg-black/40">
          <div className="gba:bg-background gba:rounded-lg gba:shadow-lg gba:p-6 gba:max-w-sm gba:w-full gba:mx-4 gba:space-y-4">
            <div className="gba:text-base gba:font-semibold">Delete Goal?</div>
            <p className="gba:text-sm gba:text-muted-foreground">
              Are you sure you want to delete{' '}
              <span className="gba:font-medium gba:text-foreground">"{goalToDelete.title}"</span>? This action cannot be
              undone.
            </p>
            <div className="gba:flex gba:gap-3 gba:justify-end">
              <button
                type="button"
                className="gba:h-9 gba:px-4 gba:rounded-md gba:bg-secondary gba:text-secondary-foreground gba:text-sm"
                onClick={() => setGoalToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="gba:h-9 gba:px-4 gba:rounded-md gba:bg-destructive gba:text-destructive-foreground gba:text-sm"
                onClick={confirmDeleteGoal}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PerformanceTab
