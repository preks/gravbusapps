import {
  CalendarCheckIcon,
  ChartLineIcon,
  EnvelopeSimpleIcon,
  ListChecksIcon,
  SparkleIcon,
  TrashIcon,
  type IconProps
} from '@phosphor-icons/react'
import type {
  ScheduledTaskFrequency,
  ScheduledTaskTemplate
} from '@/common/network/ai/prompt-manager/PromptManagerClient'

/** Repeat cadence for the create/edit form. `'once'` schedules a single
 *  future run (no recurrence); the other values come from templates. */
export type ScheduledTaskRepeat = ScheduledTaskFrequency | 'once'

export interface ScheduledTaskDraft {
  title: string
  task: string
  scheduledAt: string
  frequency: ScheduledTaskRepeat
}

interface ScheduledTaskTemplatesProps {
  templates: ScheduledTaskTemplate[]
  isLoading: boolean
  onApply: (draft: ScheduledTaskDraft) => void
  onDelete: (templateId: string) => void
}

const ICONS: Record<string, React.FC<IconProps>> = {
  'chart-line': ChartLineIcon,
  checklist: ListChecksIcon,
  envelope: EnvelopeSimpleIcon,
  calendar: CalendarCheckIcon
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * Compute the next future local datetime as a `datetime-local` value
 * (YYYY-MM-DDTHH:MM) from a template's default time + frequency.
 */
function nextOccurrenceLocal(time: string, frequency: ScheduledTaskFrequency, weekday?: number | null): string {
  const [hhRaw, mmRaw] = time.split(':')
  const hh = Number(hhRaw)
  const mm = Number(mmRaw)
  const now = new Date()
  const next = new Date()
  next.setHours(Number.isNaN(hh) ? 9 : hh, Number.isNaN(mm) ? 0 : mm, 0, 0)

  if (frequency === 'weekly' && typeof weekday === 'number') {
    // Template weekday is 0=Mon..6=Sun; JS getDay() is 0=Sun..6=Sat.
    const jsTarget = (weekday + 1) % 7
    let diff = (jsTarget - next.getDay() + 7) % 7
    if (diff === 0 && next <= now) diff = 7
    next.setDate(next.getDate() + diff)
  } else if (frequency === 'monthly') {
    if (next <= now) next.setMonth(next.getMonth() + 1)
  } else if (next <= now) {
    next.setDate(next.getDate() + 1)
  }

  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}T${pad(next.getHours())}:${pad(next.getMinutes())}`
}

export const ScheduledTaskTemplates: React.FC<ScheduledTaskTemplatesProps> = ({
  templates,
  isLoading,
  onApply,
  onDelete
}) => {
  if (!isLoading && templates.length === 0) return null

  const applyTemplate = (template: ScheduledTaskTemplate) => {
    onApply({
      title: template.title,
      task: template.task,
      scheduledAt: nextOccurrenceLocal(template.defaultTime, template.defaultFrequency, template.defaultWeekday),
      frequency: template.defaultFrequency
    })
  }

  return (
    <div className="gba:space-y-2">
      <div className="gba:flex gba:items-center gba:gap-1.5">
        <SparkleIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
        <p className="gba:text-[11px] gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide">
          Quick start
        </p>
      </div>
      <div className="gba:grid gba:grid-cols-1 gba:gap-3 gba:sm:grid-cols-2">
        {templates.map(template => {
          const Icon = ICONS[template.icon] ?? CalendarCheckIcon
          return (
            <div
              key={template.templateId}
              className="gba:group gba:relative gba:h-full gba:rounded-xl gba:border gba:border-border/60 gba:bg-background gba:transition-colors gba:hover:border-foreground/30 gba:hover:bg-muted/40"
            >
              <button
                type="button"
                onClick={() => applyTemplate(template)}
                className="gba:flex gba:h-full gba:w-full gba:flex-col gba:gap-2 gba:bg-transparent gba:border-0 gba:p-3.5 gba:text-left gba:cursor-pointer"
                data-testid={`scheduled-template-${template.templateId}`}
              >
                <span className="gba:flex gba:items-center gba:gap-2.5">
                  <span className="gba:inline-flex gba:h-8 gba:w-8 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-lg gba:bg-muted gba:text-foreground">
                    <Icon className="gba:h-4 gba:w-4" />
                  </span>
                  <span className="gba:flex-1 gba:min-w-0 gba:text-[13px] gba:font-semibold gba:leading-snug gba:text-foreground gba:line-clamp-2">
                    {template.title}
                  </span>
                </span>
                <span className="gba:text-[11px] gba:leading-snug gba:text-muted-foreground gba:line-clamp-2">
                  {template.description}
                </span>
                <span className="gba:mt-auto gba:inline-flex gba:w-fit gba:items-center gba:rounded-full gba:bg-muted gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-muted-foreground gba:capitalize">
                  {template.defaultFrequency} · {template.defaultTime}
                </span>
              </button>
              {!template.isSystem && (
                <button
                  type="button"
                  onClick={() => onDelete(template.templateId)}
                  aria-label="Delete template"
                  className="gba:absolute gba:right-2 gba:top-2 gba:hidden gba:h-6 gba:w-6 gba:items-center gba:justify-center gba:rounded-md gba:bg-background/80 gba:text-muted-foreground gba:hover:bg-destructive/10 gba:hover:text-destructive gba:group-hover:flex"
                >
                  <TrashIcon className="gba:h-3.5 gba:w-3.5" />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
