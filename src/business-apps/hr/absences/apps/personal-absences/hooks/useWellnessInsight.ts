import { useState, useCallback, useMemo } from 'react'
import dayjs from 'dayjs'
import { computeLongestWorkStreak } from '../utils/wellnessUtils'
import type { AbsenceRow } from '../types/personalAbsences'

export interface WellnessDataSummary {
  totalAbsentDays: number
  totalWorkingDays: number
  sickDays: number
  vacationDays: number
  vacationEntitlement: number
  vacationUsed: number
  vacationRemaining: number
  absenceCount: number
  longestWorkStreak: number
  monthsElapsed: number
}

export function useWellnessInsight(
  absences: AbsenceRow[],
  displayEntitlements: { total: number; used: number }[],
  ytdAbsentDays: number,
  ytdTotalWorkingDays: number,
  accessToken: string | undefined
) {
  const [wellnessInsight, setWellnessInsight] = useState<string | null>(null)
  const [wellnessLoading, setWellnessLoading] = useState(false)
  const [wellnessRequested, setWellnessRequested] = useState(false)

  const wellnessDataSummary = useMemo<WellnessDataSummary | null>(() => {
    if (absences.length === 0) return null
    const year = dayjs().year()
    const yearAbsences = absences.filter(a => a.originalStatus === 'APPROVED' && dayjs(a.startDate).year() === year)

    const sickDays = yearAbsences
      .filter(a => a.typeParentEntryId?.includes('HEALTH'))
      .reduce((sum, a) => sum + (a.workingDays || 0), 0)

    const vacationDays = yearAbsences
      .filter(a => !a.typeParentEntryId?.includes('HEALTH'))
      .reduce((sum, a) => sum + (a.workingDays || 0), 0)

    const vacationEntitlement = displayEntitlements.reduce((sum, e) => sum + e.total, 0)
    const vacationUsed = displayEntitlements.reduce((sum, e) => sum + e.used, 0)
    const longestWorkStreak = computeLongestWorkStreak(yearAbsences)

    return {
      totalAbsentDays: ytdAbsentDays,
      totalWorkingDays: ytdTotalWorkingDays,
      sickDays,
      vacationDays,
      vacationEntitlement,
      vacationUsed,
      vacationRemaining: Math.max(0, vacationEntitlement - vacationUsed),
      absenceCount: yearAbsences.length,
      longestWorkStreak,
      monthsElapsed: dayjs().month() + 1
    }
  }, [absences, ytdAbsentDays, ytdTotalWorkingDays, displayEntitlements])

  const requestWellnessAnalysis = useCallback(async () => {
    if (!wellnessDataSummary || !accessToken || wellnessLoading) return
    setWellnessLoading(true)
    setWellnessRequested(true)

    const d = wellnessDataSummary
    const prompt = `You are a workplace wellness advisor. Analyze this employee's absence data for the current year and provide a brief work-life balance insight.

Data:
- ${d.monthsElapsed} months into the year
- ${d.totalAbsentDays} total absent days out of ${d.totalWorkingDays} working days (${d.totalWorkingDays > 0 ? ((d.totalAbsentDays / d.totalWorkingDays) * 100).toFixed(1) : 0}% absence rate)
- ${d.sickDays} sick leave days
- ${d.vacationDays} vacation/leave days used
- ${d.vacationEntitlement} total vacation entitlement, ${d.vacationRemaining} remaining
- ${d.absenceCount} separate absence periods
- Longest uninterrupted work streak: ${d.longestWorkStreak} days

Based on the flight risk wellness methodology:
- >20 sick days/year = very high burnout risk
- >15 sick days/year = high risk
- >10 sick days/year = medium risk
- >5 sick days/year = low risk
- Work streaks >40 days without breaks need attention

Provide a 2-3 sentence personalized wellness insight. Be encouraging but honest. If vacation entitlement is significantly underused, suggest planning time off. If sick days are elevated, gently recommend attention to wellbeing. Keep the tone supportive and empathetic. Output ONLY the insight text, no JSON, no headers.`

    try {
      const form = new FormData()
      form.append('session_id', '')
      form.append('user_input_text', prompt)
      form.append('model_kind', 'default')
      form.append('use_web_search_tool', 'false')
      form.append(
        'current_page_context',
        JSON.stringify({ type: 'overview', entity_name: 'employee_wellness', url: globalThis.location.href })
      )

      const response = await fetch(`${globalThis.location.origin}/flowbot/api/agent/v2/chat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'text/event-stream' },
        body: form
      })

      if (!response.ok || !response.body) throw new Error('FlowBot request failed')

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
      let result = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += value
        const frames = buffer.split('\n\n')
        buffer = frames.pop() || ''
        for (const frame of frames) {
          const lines = frame.split('\n')
          let eventType = ''
          let data = ''
          for (const line of lines) {
            if (line.startsWith('event: ')) eventType = line.slice(7)
            else if (line.startsWith('data: ')) data = line.slice(6)
          }
          if (eventType === 'output-item' && data) {
            try {
              const parsed = JSON.parse(data)
              if (parsed.type === 'answer' && parsed.displayData) {
                for (const item of parsed.displayData) {
                  if (item.type === 'textBlock' && item.text) result += item.text
                }
              }
            } catch {}
          }
        }
      }

      setWellnessInsight(
        result.trim() || 'Your absence patterns look healthy. Keep maintaining a good work-life balance!'
      )
    } catch {
      setWellnessInsight(null)
      setWellnessRequested(false)
    } finally {
      setWellnessLoading(false)
    }
  }, [wellnessDataSummary, accessToken, wellnessLoading])

  return {
    wellnessDataSummary,
    wellnessInsight,
    wellnessLoading,
    wellnessRequested,
    requestWellnessAnalysis
  }
}
