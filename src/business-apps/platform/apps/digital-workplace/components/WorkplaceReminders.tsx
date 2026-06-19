import React, { useCallback, useState } from 'react'
import { Badge, Button, Input, Popover, PopoverContent, PopoverTrigger, Spinner } from '@newwork/nw-design-system'
import { PlusIcon, CheckIcon } from '@phosphor-icons/react'
import dayjs from 'dayjs'
import { useWorkplaceTranslation } from '../_i18n/useWorkplaceTranslation'
import type { UseRemindersResult } from '../hooks/useReminders'
import { relativeFromNow, isPast } from '../utils/timeFormat'

const TEST_ID = 'digital-workplace-reminders'

export type WorkplaceRemindersProps = Pick<
  UseRemindersResult,
  'reminders' | 'isLoading' | 'error' | 'createReminder' | 'completeReminder'
>

const DATETIME_FORMAT = 'YYYY-MM-DDTHH:mm'

function defaultDateTime(): string {
  const now = dayjs()
  return now
    .add(1, 'hour')
    .minute(Math.ceil(now.minute() / 15) * 15)
    .second(0)
    .format(DATETIME_FORMAT)
}

function inOneHour(): string {
  return dayjs().add(1, 'hour').second(0).format(DATETIME_FORMAT)
}

function thisEvening(): string {
  const evening = dayjs().hour(18).minute(0).second(0)
  return (evening.isAfter(dayjs()) ? evening : evening.add(1, 'day')).format(DATETIME_FORMAT)
}

function tomorrowMorning(): string {
  return dayjs().add(1, 'day').hour(9).minute(0).second(0).format(DATETIME_FORMAT)
}

/** Compact reminders list with a quick add popover. */
const WorkplaceReminders: React.FC<WorkplaceRemindersProps> = ({
  reminders,
  isLoading,
  error,
  createReminder,
  completeReminder
}) => {
  const { t } = useWorkplaceTranslation()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [dateTime, setDateTime] = useState(defaultDateTime())
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const resetForm = useCallback(() => {
    setTitle('')
    setDateTime(defaultDateTime())
    setFormError(null)
  }, [])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next)
      if (next) resetForm()
    },
    [resetForm]
  )

  const submit = useCallback(async () => {
    setFormError(null)
    if (!title.trim()) {
      setFormError(t('reminders-need-title'))
      return
    }
    if (!dateTime) {
      setFormError(t('reminders-datetime-required'))
      return
    }
    setIsSaving(true)
    try {
      await createReminder({ title, dateTime })
      setOpen(false)
      resetForm()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('reminders-create-failed'))
    } finally {
      setIsSaving(false)
    }
  }, [title, dateTime, createReminder, resetForm, t])

  const quickPicks: { id: string; label: string; value: () => string }[] = [
    { id: 'hour', label: t('reminders-quick-hour'), value: inOneHour },
    { id: 'evening', label: t('reminders-quick-evening'), value: thisEvening },
    { id: 'tomorrow', label: t('reminders-quick-tomorrow'), value: tomorrowMorning }
  ]

  return (
    <div className="gba:flex gba:flex-col gba:gap-2" data-testid={TEST_ID}>
      <div className="gba:flex gba:items-center gba:justify-end">
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" data-testid={`${TEST_ID}-add`}>
              <PlusIcon className="gba:size-4" />
              {t('reminders-add')}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="gba:w-80 gba:max-w-sm" data-testid={`${TEST_ID}-form`}>
            <div className="gba:flex gba:flex-col gba:gap-3">
              <p className="gba:text-sm gba:font-semibold gba:text-foreground">{t('reminders-new')}</p>

              <Input
                autoFocus
                value={title}
                onChange={event => setTitle(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !isSaving) {
                    event.preventDefault()
                    void submit()
                  }
                }}
                placeholder={t('reminders-input-placeholder')}
                data-testid={`${TEST_ID}-form-title`}
              />

              <div className="gba:flex gba:flex-col gba:gap-1.5">
                <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">{t('reminders-when')}</span>
                <div className="gba:flex gba:flex-wrap gba:gap-1.5">
                  {quickPicks.map(pick => (
                    <Button
                      key={pick.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDateTime(pick.value())}
                      data-testid={`${TEST_ID}-quick-${pick.id}`}
                    >
                      {pick.label}
                    </Button>
                  ))}
                </div>
                <input
                  type="datetime-local"
                  value={dateTime}
                  min={dayjs().format(DATETIME_FORMAT)}
                  onChange={event => setDateTime(event.target.value)}
                  className="gba:w-full gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                  data-testid={`${TEST_ID}-form-datetime`}
                />
              </div>

              {formError ? (
                <p className="gba:text-xs gba:text-destructive" data-testid={`${TEST_ID}-form-error`}>
                  {formError}
                </p>
              ) : null}

              <Button
                size="sm"
                onClick={submit}
                disabled={isSaving}
                className="gba:w-full"
                data-testid={`${TEST_ID}-form-submit`}
              >
                {isSaving ? t('reminders-saving') : t('reminders-create')}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {isLoading && reminders.length === 0 ? (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-6" data-testid={`${TEST_ID}-loading`}>
          <Spinner size="md" />
        </div>
      ) : null}

      {error ? (
        <p className="gba:py-2 gba:text-xs gba:text-destructive" data-testid={`${TEST_ID}-error`}>
          {error}
        </p>
      ) : null}

      {!isLoading && !error && reminders.length === 0 ? (
        <p className="gba:py-4 gba:text-center gba:text-xs gba:text-muted-foreground" data-testid={`${TEST_ID}-empty`}>
          {t('reminders-empty-desc')}
        </p>
      ) : null}

      <div className="gba:flex gba:flex-col gba:gap-0.5">
        {reminders.map(reminder => {
          const overdue = isPast(reminder.reminderDateTime)
          return (
            <div
              key={reminder.workflowId}
              className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:rounded-lg gba:px-2 gba:py-2 gba:transition-colors gba:hover:bg-accent"
              data-testid={`${TEST_ID}-item-${reminder.workflowId}`}
            >
              <div className="gba:min-w-0 gba:flex-1">
                <p className="gba:truncate gba:text-sm gba:font-medium gba:text-foreground">{reminder.title}</p>
                <div className="gba:mt-0.5 gba:flex gba:items-center gba:gap-2">
                  {overdue ? (
                    <Badge variant="destructive" size="sm">
                      {t('reminders-overdue')}
                    </Badge>
                  ) : (
                    <span className="gba:text-xs gba:text-muted-foreground">
                      {t('reminders-due')} {relativeFromNow(reminder.reminderDateTime)}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => completeReminder(reminder.workflowId)}
                title={t('reminders-done')}
                aria-label={t('reminders-done')}
                className="gba:size-8 gba:shrink-0 gba:text-muted-foreground"
                data-testid={`${TEST_ID}-done-${reminder.workflowId}`}
              >
                <CheckIcon className="gba:size-4" />
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default WorkplaceReminders
export { WorkplaceReminders }
