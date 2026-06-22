import { useState } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { CaretDownIcon, CaretRightIcon, CheckIcon, ClockIcon, SpinnerGapIcon, XIcon } from '@phosphor-icons/react'
import type { TodoItem } from '../../types/enterpriseAgent'
import translations from '../../_i18n'

interface PlanRendererProps {
  todos: TodoItem[]
  isLive: boolean
}

const TODO_ICON = {
  pending: <ClockIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground/50" />,
  in_progress: <SpinnerGapIcon className="gba:h-3.5 gba:w-3.5 gba:text-primary gba:animate-spin" />,
  done: <CheckIcon className="gba:h-3.5 gba:w-3.5 gba:text-primary" />,
  failed: <XIcon className="gba:h-3.5 gba:w-3.5 gba:text-destructive" />,
  skipped: (
    <span className="gba:h-3.5 gba:w-3.5 gba:flex gba:items-center gba:justify-center gba:text-xs gba:text-muted-foreground/40">
      —
    </span>
  )
}

function planTodoTextClass(status: TodoItem['status']): string {
  if (status === 'done') return 'gba:text-muted-foreground gba:line-through'
  if (status === 'failed') return 'gba:text-destructive'
  return 'gba:text-foreground'
}

export const PlanRenderer = ({ todos, isLive }: PlanRendererProps) => {
  const { t } = useTranslation(translations)
  const [expanded, setExpanded] = useState(false)
  const doneCount = todos.filter(item => item.status === 'done').length
  const totalCount = todos.length
  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0
  const current = todos.find(item => item.status === 'in_progress')

  return (
    <div
      className="gba:rounded-xl gba:border gba:border-border gba:bg-card gba:overflow-hidden gba:max-w-3xl"
      data-testid="enterprise-agent-plan"
    >
      <button
        className="gba:w-full gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-3 gba:hover:bg-muted/30 gba:transition-colors"
        onClick={() => setExpanded(v => !v)}
        data-testid="enterprise-agent-plan-toggle"
      >
        <div className="gba:flex-1 gba:min-w-0 gba:text-left">
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1.5">
            <span className="gba:text-xs gba:font-semibold gba:text-foreground gba:uppercase gba:tracking-wide">
              {t('renderer-plan-title')}
            </span>
            <span className="gba:text-xs gba:text-muted-foreground">
              {t('renderer-plan-steps', { done: doneCount, total: totalCount })}
            </span>
            {isLive && current && <span className="gba:text-xs gba:text-primary gba:truncate">· {current.text}</span>}
          </div>
          <div className="gba:h-1 gba:bg-muted gba:rounded-full gba:overflow-hidden">
            <div
              className="gba:h-full gba:bg-primary gba:rounded-full gba:transition-all gba:duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        {expanded ? (
          <CaretDownIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:flex-shrink-0" />
        ) : (
          <CaretRightIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="gba:border-t gba:border-border gba:divide-y gba:divide-border/50">
          {todos.map(todo => (
            <div
              key={todo.id}
              className={`gba:flex gba:items-start gba:gap-2.5 gba:px-4 gba:py-2.5 gba:transition-colors ${
                todo.status === 'in_progress' ? 'gba:bg-primary/5' : ''
              }`}
              data-testid={`enterprise-agent-todo-${todo.id}`}
            >
              <div className="gba:flex-shrink-0 gba:mt-0.5">{TODO_ICON[todo.status]}</div>
              <div className="gba:flex-1 gba:min-w-0">
                <span className={`gba:text-sm gba:leading-snug ${planTodoTextClass(todo.status)}`}>{todo.text}</span>
                {todo.tool_used && (
                  <span className="gba:ml-2 gba:inline-flex gba:items-center gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-muted gba:text-xs gba:font-mono gba:text-muted-foreground">
                    {todo.tool_used}
                  </span>
                )}
              </div>
              {todo.duration_ms !== undefined && (
                <span className="gba:text-xs gba:text-muted-foreground/60 gba:flex-shrink-0">
                  {(todo.duration_ms / 1000).toFixed(1)}s
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
