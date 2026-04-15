import React, { useMemo, useState, useCallback } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  useTranslation
} from '@newwork/nw-design-system'
import { Table2, Columns3, CalendarDays, GanttChart, FileText, LayoutDashboard } from 'lucide-react'
import type { BoardColumn, BoardView, BoardViewType, ViewConfig } from '../../types'
import { getPrimaryColumn } from '../../types'
import translations from '../../_i18n'

export interface AddViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  columns: BoardColumn[]
  existingViews: BoardView[]
  onCreate: (view: BoardView) => Promise<void>
  'data-testid'?: string
}

function createId(): string {
  try {
    return globalThis.crypto?.randomUUID?.() || `v_${Date.now()}_${Math.random().toString(36).slice(2)}`
  } catch {
    return `v_${Date.now()}_${Math.random().toString(36).slice(2)}`
  }
}

interface ViewTypeOption {
  value: BoardViewType
  labelKey: string
  descriptionKey: string
  icon: React.ReactNode
}

const VIEW_TYPES: ViewTypeOption[] = [
  {
    value: 'table',
    labelKey: 'board-view-type-table',
    descriptionKey: 'board-view-desc-table',
    icon: <Table2 className="gba:w-5 gba:h-5" />
  },
  {
    value: 'kanban',
    labelKey: 'board-view-type-kanban',
    descriptionKey: 'board-view-desc-kanban',
    icon: <Columns3 className="gba:w-5 gba:h-5" />
  },
  {
    value: 'calendar',
    labelKey: 'board-view-type-calendar',
    descriptionKey: 'board-view-desc-calendar',
    icon: <CalendarDays className="gba:w-5 gba:h-5" />
  },
  {
    value: 'timeline',
    labelKey: 'board-view-type-timeline',
    descriptionKey: 'board-view-desc-timeline',
    icon: <GanttChart className="gba:w-5 gba:h-5" />
  },
  {
    value: 'form',
    labelKey: 'board-view-type-form',
    descriptionKey: 'board-view-desc-form',
    icon: <FileText className="gba:w-5 gba:h-5" />
  },
  {
    value: 'dashboard',
    labelKey: 'board-view-type-dashboard',
    descriptionKey: 'board-view-desc-dashboard',
    icon: <LayoutDashboard className="gba:w-5 gba:h-5" />
  }
]

function defaultViewName(
  type: BoardViewType,
  existing: BoardView[],
  getLabel: (type: BoardViewType) => string
): string {
  const base = getLabel(type)
  const used = new Set(existing.map(v => v.name))
  if (!used.has(base)) return base
  for (let i = 2; i < 50; i++) {
    const candidate = `${base} ${i}`
    if (!used.has(candidate)) return candidate
  }
  return `${base} ${Date.now()}`
}

function firstColumnName(cols: BoardColumn[], predicate: (c: BoardColumn) => boolean): string {
  const c = cols.find(predicate)
  return c?.name || cols[0]?.name || ''
}

export const AddViewDialog: React.FC<AddViewDialogProps> = ({
  open,
  onOpenChange,
  columns,
  existingViews,
  onCreate,
  'data-testid': testId = 'add-view-dialog'
}) => {
  const { t } = useTranslation(translations)
  const [type, setType] = useState<BoardViewType>('table')
  const [name, setName] = useState('')
  const getViewLabel = useCallback(
    (viewType: BoardViewType) => {
      const option = VIEW_TYPES.find(item => item.value === viewType)
      return option ? t(option.labelKey) : t('board-view-default-name')
    },
    [t]
  )
  const localizedViewTypes = useMemo(
    () =>
      VIEW_TYPES.map(option => ({
        ...option,
        label: t(option.labelKey),
        description: t(option.descriptionKey)
      })),
    [t]
  )

  const statusCandidates = useMemo(() => {
    const preferred = columns.filter(c => c.type === 'status' || c.type === 'priority' || c.type === 'select')
    if (preferred.length > 0) return preferred
    return columns.filter(c => c.type === 'text' || c.type === 'multiselect')
  }, [columns])
  const dateCandidates = useMemo(() => columns.filter(c => c.type === 'date' || c.type === 'datetime'), [columns])
  const relationCandidates = useMemo(() => columns.filter(c => c.type === 'relation'), [columns])

  const [kanbanStatus, setKanbanStatus] = useState('')
  const [kanbanTitle, setKanbanTitle] = useState('')
  const [calendarDate, setCalendarDate] = useState('')
  const [calendarTitle, setCalendarTitle] = useState('')
  const [timelineStart, setTimelineStart] = useState('')
  const [timelineEnd, setTimelineEnd] = useState('')
  const [timelineTitle, setTimelineTitle] = useState('')
  const [timelineDeps, setTimelineDeps] = useState('')

  const canCreate = useMemo(() => Boolean(name.trim()), [name])

  const reset = useCallback(() => {
    setType('table')
    setName('')
    setKanbanStatus('')
    setKanbanTitle('')
    setCalendarDate('')
    setCalendarTitle('')
    setTimelineStart('')
    setTimelineEnd('')
    setTimelineTitle('')
    setTimelineDeps('')
  }, [])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      onOpenChange(next)
      if (!next) reset()
    },
    [onOpenChange, reset]
  )

  const ensureDefaultsForType = useCallback(
    (nextType: BoardViewType) => {
      const prevName = name.trim()
      const isAutoName =
        !prevName || VIEW_TYPES.some(option => prevName === defaultViewName(option.value, existingViews, getViewLabel))
      if (isAutoName) setName(defaultViewName(nextType, existingViews, getViewLabel))

      const primaryName = getPrimaryColumn(columns)?.name || columns[0]?.name || ''

      if (nextType === 'kanban') {
        setKanbanStatus(prev => prev || firstColumnName(statusCandidates, () => true) || primaryName)
        setKanbanTitle(prev => prev || primaryName)
      }
      if (nextType === 'calendar') {
        setCalendarDate(
          prev => prev || firstColumnName(dateCandidates, () => true) || firstColumnName(columns, () => true)
        )
        setCalendarTitle(prev => prev || primaryName)
      }
      if (nextType === 'timeline') {
        const firstDate = firstColumnName(dateCandidates, () => true) || firstColumnName(columns, () => true)
        setTimelineStart(prev => prev || firstDate)
        setTimelineEnd(prev => prev || firstDate)
        setTimelineTitle(prev => prev || primaryName)
      }
    },
    [name, existingViews, columns, statusCandidates, dateCandidates, getViewLabel]
  )

  const handleTypeChange = useCallback(
    (nextType: BoardViewType) => {
      setType(nextType)
      ensureDefaultsForType(nextType)
    },
    [ensureDefaultsForType]
  )

  const handleCreate = useCallback(async () => {
    if (!canCreate) return
    const primaryName = getPrimaryColumn(columns)?.name || columns[0]?.name || ''

    let config: ViewConfig
    if (type === 'table') {
      config = { type: 'table', density: 'compact' }
    } else if (type === 'kanban') {
      config = {
        type: 'kanban',
        statusColumn: kanbanStatus || firstColumnName(statusCandidates, () => true) || primaryName,
        titleColumn: kanbanTitle || primaryName
      }
    } else if (type === 'calendar') {
      config = {
        type: 'calendar',
        dateColumn: calendarDate || firstColumnName(dateCandidates, () => true) || primaryName,
        titleColumn: calendarTitle || primaryName
      }
    } else if (type === 'timeline') {
      const fd = firstColumnName(dateCandidates, () => true) || primaryName
      config = {
        type: 'timeline',
        startDateColumn: timelineStart || fd,
        endDateColumn: timelineEnd || fd,
        titleColumn: timelineTitle || primaryName,
        dependencyColumn: timelineDeps && timelineDeps !== '__none__' ? timelineDeps : undefined
      }
    } else if (type === 'form') {
      config = { type: 'form', fields: [], layout: 'single', submitLabel: t('board-add-row') }
    } else {
      config = { type: 'dashboard', widgets: [] }
    }

    const view: BoardView = {
      id: createId(),
      name: name.trim(),
      type,
      isDefault: existingViews.length === 0,
      config
    }

    await onCreate(view)
    handleOpenChange(false)
  }, [
    canCreate,
    type,
    name,
    existingViews.length,
    onCreate,
    handleOpenChange,
    columns,
    statusCandidates,
    dateCandidates,
    kanbanStatus,
    kanbanTitle,
    calendarDate,
    calendarTitle,
    timelineStart,
    timelineEnd,
    timelineTitle,
    t
  ])

  const needsConfig = type === 'kanban' || type === 'calendar' || type === 'timeline'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gba:max-w-[520px] gba:p-0 gba:gap-0 gba:overflow-hidden" data-testid={testId}>
        <DialogHeader className="gba:px-5 gba:pt-5 gba:pb-3">
          <DialogTitle className="gba:text-base">{t('board-add-view-dialog-title')}</DialogTitle>
          <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">{t('board-add-view-dialog-description')}</p>
        </DialogHeader>

        <div className="gba:px-5 gba:pb-4 gba:space-y-4">
          {/* View type selector grid */}
          <div className="gba:grid gba:grid-cols-3 gba:gap-2" role="radiogroup" aria-label={t('board-view-type-aria')}>
            {localizedViewTypes.map(opt => {
              const selected = type === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => handleTypeChange(opt.value)}
                  className={[
                    'gba:flex gba:flex-col gba:items-start gba:gap-1.5 gba:rounded-lg gba:p-3',
                    'gba:border gba:text-left gba:transition-all gba:cursor-pointer',
                    selected
                      ? 'gba:border-primary gba:bg-primary/5 gba:ring-1 gba:ring-primary/30'
                      : 'gba:border-border gba:hover:border-primary/40 gba:hover:bg-accent/30'
                  ].join(' ')}
                  data-testid={`${testId}-type-${opt.value}`}
                >
                  <div
                    className={[
                      'gba:flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:rounded-md',
                      selected ? 'gba:bg-primary gba:text-primary-foreground' : 'gba:bg-muted gba:text-muted-foreground'
                    ].join(' ')}
                  >
                    {opt.icon}
                  </div>
                  <span className="gba:text-sm gba:font-medium gba:text-foreground">{opt.label}</span>
                  <span className="gba:text-[11px] gba:leading-snug gba:text-muted-foreground">{opt.description}</span>
                </button>
              )
            })}
          </div>

          {/* Separator */}
          <div className="gba:border-t gba:border-border" />

          {/* Name input */}
          <div>
            <Label className="gba:text-xs gba:font-medium" htmlFor={`${testId}-name`}>
              {t('board-view-name-label')}
            </Label>
            <Input
              id={`${testId}-name`}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={defaultViewName(type, existingViews, getViewLabel)}
              className="gba:mt-1 gba:h-8 gba:text-sm"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter' && canCreate) handleCreate()
              }}
              data-testid={`${testId}-input-name`}
            />
          </div>

          {/* Type-specific configuration */}
          {needsConfig && (
            <div className="gba:rounded-lg gba:border gba:border-border gba:bg-muted/30 gba:p-3 gba:space-y-3">
              <p className="gba:text-xs gba:font-medium gba:text-foreground">{t('board-view-configuration')}</p>

              {type === 'kanban' && (
                <div className="gba:grid gba:grid-cols-2 gba:gap-3">
                  <div>
                    <Label className="gba:text-[11px] gba:text-muted-foreground">
                      {t('board-view-group-by-column')}
                    </Label>
                    <Select value={kanbanStatus} onValueChange={setKanbanStatus}>
                      <SelectTrigger
                        className="gba:h-8 gba:text-xs gba:mt-1 gba:bg-background"
                        data-testid={`${testId}-kanban-status`}
                      >
                        <SelectValue placeholder={t('board-view-select-column')} />
                      </SelectTrigger>
                      <SelectContent>
                        {statusCandidates.map(c => (
                          <SelectItem key={c.id} value={c.name}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="gba:text-[11px] gba:text-muted-foreground">{t('board-view-card-title')}</Label>
                    <Select value={kanbanTitle} onValueChange={setKanbanTitle}>
                      <SelectTrigger
                        className="gba:h-8 gba:text-xs gba:mt-1 gba:bg-background"
                        data-testid={`${testId}-kanban-title`}
                      >
                        <SelectValue placeholder={t('board-view-select-column')} />
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map(c => (
                          <SelectItem key={c.id} value={c.name}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {type === 'calendar' && (
                <div className="gba:grid gba:grid-cols-2 gba:gap-3">
                  <div>
                    <Label className="gba:text-[11px] gba:text-muted-foreground">{t('board-view-date-column')}</Label>
                    <Select value={calendarDate} onValueChange={setCalendarDate}>
                      <SelectTrigger
                        className="gba:h-8 gba:text-xs gba:mt-1 gba:bg-background"
                        data-testid={`${testId}-calendar-date`}
                      >
                        <SelectValue placeholder={t('board-view-select-column')} />
                      </SelectTrigger>
                      <SelectContent>
                        {dateCandidates.map(c => (
                          <SelectItem key={c.id} value={c.name}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="gba:text-[11px] gba:text-muted-foreground">{t('board-view-card-title')}</Label>
                    <Select value={calendarTitle} onValueChange={setCalendarTitle}>
                      <SelectTrigger
                        className="gba:h-8 gba:text-xs gba:mt-1 gba:bg-background"
                        data-testid={`${testId}-calendar-title`}
                      >
                        <SelectValue placeholder={t('board-view-select-column')} />
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map(c => (
                          <SelectItem key={c.id} value={c.name}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {type === 'timeline' && (
                <div className="gba:space-y-3">
                  <div className="gba:grid gba:grid-cols-2 gba:gap-3">
                    <div>
                      <Label className="gba:text-[11px] gba:text-muted-foreground">{t('board-view-start-date')}</Label>
                      <Select value={timelineStart} onValueChange={setTimelineStart}>
                        <SelectTrigger
                          className="gba:h-8 gba:text-xs gba:mt-1 gba:bg-background"
                          data-testid={`${testId}-timeline-start`}
                        >
                          <SelectValue placeholder={t('board-view-select-column')} />
                        </SelectTrigger>
                        <SelectContent>
                          {dateCandidates.map(c => (
                            <SelectItem key={c.id} value={c.name}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="gba:text-[11px] gba:text-muted-foreground">{t('board-view-end-date')}</Label>
                      <Select value={timelineEnd} onValueChange={setTimelineEnd}>
                        <SelectTrigger
                          className="gba:h-8 gba:text-xs gba:mt-1 gba:bg-background"
                          data-testid={`${testId}-timeline-end`}
                        >
                          <SelectValue placeholder={t('board-view-select-column')} />
                        </SelectTrigger>
                        <SelectContent>
                          {dateCandidates.map(c => (
                            <SelectItem key={c.id} value={c.name}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="gba:text-[11px] gba:text-muted-foreground">{t('board-view-bar-label')}</Label>
                    <Select value={timelineTitle} onValueChange={setTimelineTitle}>
                      <SelectTrigger
                        className="gba:h-8 gba:text-xs gba:mt-1 gba:bg-background"
                        data-testid={`${testId}-timeline-title`}
                      >
                        <SelectValue placeholder={t('board-view-select-column')} />
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map(c => (
                          <SelectItem key={c.id} value={c.name}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {relationCandidates.length > 0 && (
                    <div>
                      <Label className="gba:text-[11px] gba:text-muted-foreground">
                        {t('board-view-dependencies')}
                      </Label>
                      <Select value={timelineDeps} onValueChange={setTimelineDeps}>
                        <SelectTrigger
                          className="gba:h-8 gba:text-xs gba:mt-1 gba:bg-background"
                          data-testid={`${testId}-timeline-deps`}
                        >
                          <SelectValue placeholder={t('board-view-none-optional')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">{t('board-view-none')}</SelectItem>
                          {relationCandidates.map(c => (
                            <SelectItem key={c.id} value={c.name}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gba:px-5 gba:py-3 gba:border-t gba:border-border gba:bg-muted/20">
          <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)} data-testid={`${testId}-cancel`}>
            {t('common-cancel')}
          </Button>
          <Button size="sm" onClick={handleCreate} disabled={!canCreate} data-testid={`${testId}-create`}>
            {t('board-add-view-submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
