import dayjs from 'dayjs'

export type TrackState = 'ON_TRACK' | 'BEHIND_TARGET'

interface GoalUpdateEmployee {
  firstName?: string
  lastName?: string
}

interface GoalUpdate {
  id: string
  progressPercent?: number
  comment?: string
  updateTime?: string
  employee?: GoalUpdateEmployee
}

export interface PerformanceGoalSummaryItem {
  id: string
  title: string
  startDate: string
  dueDate: string
  status: string
  progressPercent: number
  updatedAt?: string
  completionDate?: string
  employeePerformanceGoalUpdate?: GoalUpdate[]
}

interface GoalUpdateEvent {
  at: string
  progress: number
}

export interface PerformanceGoalsSummary {
  total: number
  achieved: number
  onTrack: number
  behind: number
  averageProgressPercent: number
}

export const normalizeProgress = (value: number) => Math.round(Math.max(0, Math.min(100, value)) * 100) / 100

export const isGoalValid = (goal: PerformanceGoalSummaryItem) => Boolean(goal.title && goal.startDate && goal.dueDate)

export const isGoalContainedInCycle = (
  goal: PerformanceGoalSummaryItem,
  cycleStart: string,
  cycleEnd: string
): boolean => {
  const goalStart = dayjs(goal.startDate)
  const goalEnd = dayjs(goal.dueDate)
  if (!goalStart.isValid() || !goalEnd.isValid()) return false
  return !goalStart.isBefore(dayjs(cycleStart), 'day') && !goalEnd.isAfter(dayjs(cycleEnd), 'day')
}

const getInitialEvents = (goal: PerformanceGoalSummaryItem): GoalUpdateEvent[] => {
  const startDate = dayjs(goal.startDate).startOf('day')
  const baselineDate = startDate.isValid() ? startDate : dayjs().startOf('day')
  const events: GoalUpdateEvent[] = [{ at: baselineDate.toISOString(), progress: 0 }]

  if (goal.employeePerformanceGoalUpdate?.length) {
    goal.employeePerformanceGoalUpdate.forEach(update => {
      events.push({
        at: update.updateTime || baselineDate.toISOString(),
        progress: normalizeProgress(update.progressPercent ?? 0)
      })
    })
  } else if ((goal.progressPercent || 0) > 0) {
    const dueDate = dayjs(goal.dueDate).startOf('day')
    const rawDate = dayjs(goal.updatedAt || goal.completionDate || goal.startDate)
    let boundedDate = rawDate.isValid() ? rawDate : dayjs()
    if (boundedDate.isBefore(startDate)) boundedDate = startDate
    if (boundedDate.isAfter(dueDate)) boundedDate = dueDate
    events.push({ at: boundedDate.toISOString(), progress: normalizeProgress(goal.progressPercent || 0) })
  }

  return events.sort((a, b) => dayjs(a.at).valueOf() - dayjs(b.at).valueOf())
}

const getProgressAtDate = (events: GoalUpdateEvent[], pointDate: dayjs.Dayjs): number => {
  let current = 0
  ;[...events]
    .sort((a, b) => dayjs(a.at).valueOf() - dayjs(b.at).valueOf())
    .forEach(event => {
      if (!dayjs(event.at).startOf('day').isAfter(pointDate)) current = normalizeProgress(event.progress)
    })
  return current
}

const getIdealProgressAtDate = (startDate: dayjs.Dayjs, dueDate: dayjs.Dayjs, pointDate: dayjs.Dayjs): number => {
  const totalDuration = Math.max(dueDate.diff(startDate, 'day'), 1)
  const elapsed = Math.max(Math.min(pointDate.diff(startDate, 'day'), totalDuration), 0)
  return normalizeProgress((elapsed / totalDuration) * 100)
}

export const getTrackState = (goal: PerformanceGoalSummaryItem): TrackState => {
  const startDate = dayjs(goal.startDate).startOf('day')
  const dueDate = dayjs(goal.dueDate).startOf('day')
  if (!startDate.isValid() || !dueDate.isValid()) return 'ON_TRACK'
  const events = getInitialEvents(goal)
  const today = dayjs().startOf('day')
  const actual = getProgressAtDate(events, today)
  const ideal = getIdealProgressAtDate(startDate, dueDate, today)
  if (actual >= ideal - 10) return 'ON_TRACK'
  return 'BEHIND_TARGET'
}

const isAchieved = (goal: PerformanceGoalSummaryItem): boolean =>
  goal.status === 'ACHIEVED' || normalizeProgress(goal.progressPercent || 0) >= 100

export const emptyPerformanceGoalsSummary = (): PerformanceGoalsSummary => ({
  total: 0,
  achieved: 0,
  onTrack: 0,
  behind: 0,
  averageProgressPercent: 0
})

export const computePerformanceGoalsSummary = (
  goals: PerformanceGoalSummaryItem[],
  cycleStartDate?: string | null,
  cycleEndDate?: string | null
): PerformanceGoalsSummary => {
  if (!cycleStartDate || !cycleEndDate) return emptyPerformanceGoalsSummary()

  const containedGoals = goals
    .filter(isGoalValid)
    .filter(goal => isGoalContainedInCycle(goal, cycleStartDate, cycleEndDate))

  const total = containedGoals.length
  const achieved = containedGoals.filter(goal => isAchieved(goal)).length
  const onTrack = containedGoals.filter(goal => getTrackState(goal) === 'ON_TRACK').length
  const behind = containedGoals.filter(goal => getTrackState(goal) === 'BEHIND_TARGET').length
  const averageProgressPercent =
    total === 0
      ? 0
      : Math.round(containedGoals.reduce((acc, goal) => acc + normalizeProgress(goal.progressPercent || 0), 0) / total)

  return { total, achieved, onTrack, behind, averageProgressPercent }
}
