import {
  activityLabelsEqual,
  activityStepId,
  FALLBACK_ACTIVITY_STATUS_TEXT,
  sanitizeActivityStatusText
} from './agentActivitySanitize'

export type ActivityTimelineStepState = 'completed' | 'active'

export interface ActivityTimelineStep {
  id: string
  label: string
  state: ActivityTimelineStepState
}

const dedupeConsecutiveLabels = (values: string[]): string[] => {
  const out: string[] = []
  for (const v of values) {
    const prev = out[out.length - 1]
    if (prev && activityLabelsEqual(prev, v)) continue
    out.push(v)
  }
  return out
}

const appendIfDistinct = (lines: string[], candidate: string | null): string[] => {
  if (!candidate) return lines
  const last = lines[lines.length - 1]
  if (last && activityLabelsEqual(last, candidate)) return lines
  return [...lines, candidate]
}

export function buildAgentActivityTimelineSteps(
  activityLines: readonly string[],
  currentStatus: string | null,
  isStreaming: boolean,
  maxSteps = 5
): ActivityTimelineStep[] {
  const sanitizedActivity = activityLines
    .map(line => sanitizeActivityStatusText(line))
    .filter((line): line is string => Boolean(line))

  const sanitizedStatus = sanitizeActivityStatusText(currentStatus)

  let labels = dedupeConsecutiveLabels(sanitizedActivity)
  labels = appendIfDistinct(labels, sanitizedStatus)

  if (labels.length === 0) {
    if (!isStreaming) return []
    labels = [sanitizedStatus ?? FALLBACK_ACTIVITY_STATUS_TEXT]
  }

  const capped = labels.slice(-maxSteps)

  return capped.map((label, index) => {
    const isLast = index === capped.length - 1
    const state: ActivityTimelineStepState = isLast && isStreaming ? 'active' : 'completed'
    return {
      id: `${activityStepId(label)}-${index}`,
      label,
      state
    }
  })
}
