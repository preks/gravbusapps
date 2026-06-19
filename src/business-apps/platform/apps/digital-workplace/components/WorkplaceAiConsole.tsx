import React, { useCallback, useMemo, useState } from 'react'
import { Card, Button, Collapsible, CollapsibleContent, CollapsibleTrigger } from '@newwork/nw-design-system'
import { ArrowRightIcon, PencilSimpleIcon, CaretDownIcon } from '@phosphor-icons/react'
import { EveryIcon } from '@newwork/icons'
import { openEveryFabric } from '@/common/utils/openEveryFabric'
import { useWorkplaceTranslation } from '../_i18n/useWorkplaceTranslation'
import { useQuickActions } from '../hooks/useQuickActions'
import { resolveQuickActionIcon, type QuickAction } from '../utils/quickActions'
import QuickActionsEditor from './QuickActionsEditor'

const TEST_ID = 'digital-workplace-ai-console'

export interface WorkplaceAiConsoleProps {
  accessToken?: string
  userId?: string
}

/**
 * Calm Every AI bar. A single clean prompt field hands the task to EveryFabric;
 * the customizable one-click quick actions are tucked behind a quiet toggle so
 * the console reads as one focused input rather than a busy control panel.
 */
const WorkplaceAiConsole: React.FC<WorkplaceAiConsoleProps> = ({ accessToken, userId }) => {
  const { t } = useWorkplaceTranslation()
  const [value, setValue] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)

  const defaults = useMemo<QuickAction[]>(
    () => [
      { id: 'sales', iconKey: 'analytics', label: t('quick-sales-label'), prompt: t('quick-sales-prompt') },
      { id: 'mail', iconKey: 'mail', label: t('quick-mail-label'), prompt: t('quick-mail-prompt') },
      { id: 'status', iconKey: 'note', label: t('quick-status-label'), prompt: t('quick-status-prompt') },
      { id: 'meeting', iconKey: 'calendar', label: t('quick-meeting-label'), prompt: t('quick-meeting-prompt') }
    ],
    [t]
  )

  const { actions, saveActions, resetActions } = useQuickActions(defaults, { accessToken, userId })

  const submit = useCallback(() => {
    const prompt = value.trim()
    if (!prompt) return
    openEveryFabric({ prompt })
    setValue('')
  }, [value])

  const startAction = useCallback((prompt: string) => {
    const trimmed = prompt.trim()
    if (!trimmed) return
    openEveryFabric({ prompt: trimmed })
  }, [])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        submit()
      }
    },
    [submit]
  )

  return (
    <Card
      variant="surface"
      className="gba:flex gba:w-full gba:flex-col gba:gap-3 gba:rounded-xl gba:p-3"
      data-testid={TEST_ID}
    >
      {/* Single clean prompt field. */}
      <div className="gba:flex gba:items-center gba:gap-3 gba:rounded-lg gba:border gba:border-input gba:bg-background gba:px-3 gba:py-2 gba:transition gba:focus-within:border-ai/60 gba:focus-within:ring-2 gba:focus-within:ring-ai/20">
        <span className="gba:flex gba:size-7 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-lg gba:bg-ai/10">
          <EveryIcon className="gba:size-4" gradient="gba:bg-ai" />
        </span>
        <input
          type="text"
          value={value}
          onChange={event => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('composer-placeholder')}
          aria-label={t('composer-placeholder')}
          className="gba:min-w-0 gba:flex-1 gba:bg-transparent gba:text-sm gba:text-foreground gba:outline-none gba:placeholder:text-muted-foreground"
          data-testid={`${TEST_ID}-input`}
        />
        <Button size="sm" onClick={submit} disabled={!value.trim()} data-testid={`${TEST_ID}-send`}>
          {t('composer-send')}
          <ArrowRightIcon className="gba:size-4" />
        </Button>
      </div>

      {/* Quick actions tucked behind a quiet toggle. */}
      <Collapsible open={actionsOpen} onOpenChange={setActionsOpen}>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="gba:flex gba:items-center gba:gap-1 gba:rounded-md gba:text-xs gba:font-medium gba:text-muted-foreground gba:transition-colors gba:hover:text-foreground"
              data-testid={`${TEST_ID}-toggle`}
            >
              {t('ai-quick-heading')}
              <CaretDownIcon
                className={`gba:size-3.5 gba:transition-transform ${actionsOpen ? 'gba:rotate-180' : ''}`}
              />
            </button>
          </CollapsibleTrigger>
          {actionsOpen ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditorOpen(true)}
              title={t('ai-edit')}
              aria-label={t('ai-edit')}
              className="gba:size-7 gba:text-muted-foreground"
              data-testid={`${TEST_ID}-edit`}
            >
              <PencilSimpleIcon className="gba:size-4" />
            </Button>
          ) : null}
        </div>

        <CollapsibleContent>
          {actions.length > 0 ? (
            <div
              className="gba:grid gba:grid-cols-2 gba:gap-2 gba:pt-2 gba:lg:grid-cols-4"
              data-testid={`${TEST_ID}-actions`}
            >
              {actions.map(action => {
                const ActionIcon = resolveQuickActionIcon(action.iconKey)
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => startAction(action.prompt)}
                    title={action.prompt}
                    className="gba:group/action gba:flex gba:items-center gba:gap-2.5 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-left gba:transition-colors gba:hover:bg-accent gba:focus-visible:outline-none gba:focus-visible:ring-2 gba:focus-visible:ring-ai/30"
                    data-testid={`${TEST_ID}-action-${action.id}`}
                  >
                    <ActionIcon className="gba:size-4 gba:shrink-0 gba:text-ai" weight="duotone" />
                    <span className="gba:min-w-0 gba:flex-1 gba:truncate gba:text-sm gba:text-foreground">
                      {action.label}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : null}
        </CollapsibleContent>
      </Collapsible>

      <QuickActionsEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        actions={actions}
        onSave={saveActions}
        onReset={resetActions}
      />
    </Card>
  )
}

export default WorkplaceAiConsole
export { WorkplaceAiConsole }
