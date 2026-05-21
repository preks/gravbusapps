import { getEntityStatusDisplay } from './statusDisplayUtils'

type TranslateFn = (key: string, vars?: Record<string, string>) => string

const STATUS_CHANGE_PATTERN = /^status\s+changed\s+from:?\s*([A-Za-z_]+)\s+to:?\s*([A-Za-z_]+)\s*$/i

type CommentEntityKind = 'plan' | 'request' | 'advance'

export function formatExpenseRecordCommentText(
  comment: string,
  commentType: string,
  t: TranslateFn,
  options: {
    approvedEmptyKey: string
    statusChangedKey: string
    entity?: CommentEntityKind
  }
): string {
  if (commentType === 'APPROVE_COMMENT' && comment === '') {
    return t(options.approvedEmptyKey)
  }

  const statusMatch = comment.trim().match(STATUS_CHANGE_PATTERN)
  if (statusMatch) {
    const fromStatus = statusMatch[1].toUpperCase()
    const toStatus = statusMatch[2].toUpperCase()
    const entity = options.entity ?? 'advance'
    const fromLabel = getEntityStatusDisplay(entity, fromStatus, t).label
    const toLabel = getEntityStatusDisplay(entity, toStatus, t).label
    return t(options.statusChangedKey, { from: fromLabel, to: toLabel })
  }

  return comment
}
