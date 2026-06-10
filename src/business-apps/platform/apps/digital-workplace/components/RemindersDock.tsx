import React, { useCallback, useState } from 'react'
import { Badge, Button, Input, Spinner } from '@newwork/nw-design-system'
import { BellIcon, PlusIcon, CheckIcon, XIcon } from '@phosphor-icons/react'
import dayjs from 'dayjs'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useWorkplaceTranslation } from '../_i18n/useWorkplaceTranslation'
import { useReminders } from '../hooks/useReminders'
import { relativeFromNow, isPast } from '../utils/timeFormat'

const TEST_ID = 'digital-workplace-reminders-dock'

export interface RemindersDockProps {
  context: BusinessAppContextProps
}

function defaultDateTime(): string {
  const now = dayjs()
  return now
    .add(1, 'hour')
    .minute(Math.ceil(now.minute() / 15) * 15)
    .second(0)
    .format('YYYY-MM-DDTHH:mm')
}

/**
 * Floating reminders dock pinned to the right edge of the workplace. Collapsed
 * it is a slim pill showing the reminder count; on hover (or while adding) it
 * expands into a sleek panel for viewing, creating and ticking off reminders.
 */
const RemindersDock: React.FC<RemindersDockProps> = ({ context }) => {
  const { t } = useWorkplaceTranslation()
  const { reminders, isLoading, error, createReminder, completeReminder } = useReminders(context)

  const [hovered, setHovered] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [dateTime, setDateTime] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const expanded = hovered || showForm

  const openForm = useCallback(() => {
    setShowForm(true)
    setFormError(null)
    setDateTime(prev => prev || defaultDateTime())
  }, [])

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
      setTitle('')
      setDateTime('')
      setShowForm(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('reminders-create-failed'))
    } finally {
      setIsSaving(false)
    }
  }, [title, dateTime, createReminder, t])

  const renderList = () => {
    if (isLoading && reminders.length === 0) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-8" data-testid={`${TEST_ID}-loading`}>
          <Spinner size="md" />
        </div>
      )
    }

    if (error) {
      return (
        <p className="gba:px-1 gba:py-4 gba:text-xs gba:text-destructive" data-testid={`${TEST_ID}-error`}>
          {error}
        </p>
      )
    }

    if (!showForm && reminders.length === 0) {
      return (
        <div
          className="gba:flex gba:flex-col gba:items-center gba:gap-1 gba:py-8 gba:text-center"
          data-testid={`${TEST_ID}-empty`}
        >
          <p className="gba:text-sm gba:font-medium gba:text-foreground">{t('reminders-empty-title')}</p>
          <p className="gba:text-xs gba:text-muted-foreground">{t('reminders-empty-desc')}</p>
        </div>
      )
    }

    return reminders.map(reminder => {
      const overdue = isPast(reminder.reminderDateTime)
      return (
        <div
          key={reminder.workflowId}
          className="gba:flex gba:items-start gba:justify-between gba:gap-2 gba:rounded-lg gba:border gba:border-border gba:p-3"
          data-testid={`${TEST_ID}-item-${reminder.workflowId}`}
        >
          <div className="gba:min-w-0 gba:flex-1">
            <p className="gba:truncate gba:text-sm gba:font-medium gba:text-foreground">{reminder.title}</p>
            <div className="gba:mt-0.5 gba:flex gba:items-center gba:gap-2">
              <span className="gba:text-xs gba:text-muted-foreground">{t('reminders-due')}</span>
              {overdue ? (
                <Badge variant="destructive" size="sm">
                  {t('reminders-overdue')}
                </Badge>
              ) : (
                <span className="gba:text-xs gba:font-medium gba:text-foreground">
                  {relativeFromNow(reminder.reminderDateTime)}
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
            data-testid={`${TEST_ID}-done-${reminder.workflowId}`}
          >
            <CheckIcon className="gba:size-4" />
          </Button>
        </div>
      )
    })
  }

  return (
    <div
      className="gba:absolute gba:right-3 gba:top-1/2 gba:z-30 gba:-translate-y-1/2"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      data-testid={TEST_ID}
    >
      <div
        className={`gba:flex gba:flex-col gba:overflow-hidden gba:rounded-2xl gba:border gba:border-border gba:bg-card gba:shadow-xl gba:transition-all gba:duration-300 gba:ease-out ${
          expanded ? 'gba:max-h-96 gba:w-80' : 'gba:max-h-16 gba:w-14'
        }`}
      >
        <div className="gba:flex gba:shrink-0 gba:items-center gba:gap-2 gba:p-3">
          <span className="gba:relative gba:flex gba:size-8 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-lg gba:bg-primary/10 gba:text-primary">
            <BellIcon className="gba:size-5" weight="duotone" />
            {reminders.length > 0 && !expanded ? (
              <span
                className="gba:absolute gba:-right-1 gba:-top-1 gba:flex gba:size-4 gba:items-center gba:justify-center gba:rounded-full gba:bg-primary gba:text-[10px] gba:font-semibold gba:text-primary-foreground"
                data-testid={`${TEST_ID}-badge`}
              >
                {reminders.length}
              </span>
            ) : null}
          </span>

          {expanded ? (
            <>
              <span className="gba:flex-1 gba:truncate gba:text-sm gba:font-semibold gba:text-foreground">
                {t('reminders-title')}
              </span>
              {reminders.length > 0 ? (
                <Badge variant="secondary" size="sm" data-testid={`${TEST_ID}-count`}>
                  {reminders.length}
                </Badge>
              ) : null}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => (showForm ? setShowForm(false) : openForm())}
                title={t('reminders-add')}
                aria-label={t('reminders-add')}
                data-testid={`${TEST_ID}-add`}
              >
                {showForm ? <XIcon className="gba:size-4" /> : <PlusIcon className="gba:size-4" />}
              </Button>
            </>
          ) : null}
        </div>

        {expanded ? (
          <div className="gba:flex gba:min-h-0 gba:flex-1 gba:flex-col gba:gap-3 gba:overflow-y-auto gba:px-3 gba:pb-3">
            {showForm ? (
              <div
                className="gba:flex gba:flex-col gba:gap-2 gba:rounded-lg gba:border gba:border-border gba:p-3"
                data-testid={`${TEST_ID}-form`}
              >
                <Input
                  value={title}
                  onChange={event => setTitle(event.target.value)}
                  placeholder={t('reminders-input-placeholder')}
                  data-testid={`${TEST_ID}-form-title`}
                />
                <input
                  type="datetime-local"
                  value={dateTime}
                  min={dayjs().format('YYYY-MM-DDTHH:mm')}
                  onChange={event => setDateTime(event.target.value)}
                  className="gba:w-full gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                  data-testid={`${TEST_ID}-form-datetime`}
                />
                {formError ? (
                  <p className="gba:text-xs gba:text-destructive" data-testid={`${TEST_ID}-form-error`}>
                    {formError}
                  </p>
                ) : null}
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Button size="sm" onClick={submit} disabled={isSaving} data-testid={`${TEST_ID}-form-submit`}>
                    {isSaving ? t('reminders-saving') : t('reminders-create')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowForm(false)}
                    disabled={isSaving}
                    data-testid={`${TEST_ID}-form-cancel`}
                  >
                    {t('reminders-cancel')}
                  </Button>
                </div>
              </div>
            ) : null}

            {renderList()}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default RemindersDock
export { RemindersDock }
