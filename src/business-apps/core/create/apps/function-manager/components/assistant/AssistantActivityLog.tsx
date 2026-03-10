import React from 'react'
import { Loader2 } from 'lucide-react'

export interface AssistantActivityLogProps {
  lines: string[]
  isActive?: boolean
  'data-testid'?: string
}

const MAX_RENDER_LINES = 400
const PINNED_THRESHOLD_PX = 8

export const AssistantActivityLog: React.FC<AssistantActivityLogProps> = ({
  lines,
  isActive,
  'data-testid': testId = 'function-assistant-activity'
}) => {
  const viewportRef = React.useRef<HTMLDivElement | null>(null)
  const [isPinnedToBottom, setIsPinnedToBottom] = React.useState(true)

  const safeLines = React.useMemo(() => lines.slice(-MAX_RENDER_LINES), [lines])

  React.useEffect(() => {
    if (!isPinnedToBottom) return
    const el = viewportRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [safeLines.length, isPinnedToBottom])

  const onScroll = React.useCallback(() => {
    const el = viewportRef.current
    if (!el) return
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight
    setIsPinnedToBottom(remaining < PINNED_THRESHOLD_PX)
  }, [])

  if (!safeLines.length && !isActive) return null

  return (
    <div
      className="gba:rounded-md gba:border gba:border-border gba:bg-muted gba:px-2 gba:pb-2 gba:pt-1"
      data-testid={testId}
      aria-label="Assistant activity"
    >
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
        <span className="gba:text-xs gba:font-medium gba:text-foreground">Activity</span>
        {isActive ? (
          <Loader2
            className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:animate-spin"
            aria-label="Working"
            data-testid={`${testId}-spinner`}
          />
        ) : (
          <span className="gba:text-xs gba:text-muted-foreground">Done</span>
        )}
      </div>

      <div
        ref={viewportRef}
        className="gba:h-20 gba:overflow-y-auto gba:space-y-1 gba:text-xs gba:text-muted-foreground gba:font-mono"
        onScroll={onScroll}
        data-testid={`${testId}-viewport`}
      >
        {safeLines.map((line, idx) => (
          <div key={`${idx}-${line}`} className="gba:whitespace-pre-wrap">
            {line}
          </div>
        ))}
      </div>
    </div>
  )
}
