import React, { useCallback, useMemo, useState } from 'react'
import { Card, Button } from '@newwork/nw-design-system'
import { ArrowRightIcon, PencilSimpleIcon } from '@phosphor-icons/react'
import { EveryIcon } from '@newwork/icons'
import { openEveryFabric } from '@/common/utils/openEveryFabric'
import { useWorkplaceTranslation } from '../_i18n/useWorkplaceTranslation'
import { useQuickActions } from '../hooks/useQuickActions'
import { resolveQuickActionIcon, type QuickAction } from '../utils/quickActions'
import ComposerRotatingPlaceholder from './ComposerRotatingPlaceholder'
import QuickActionsEditor from './QuickActionsEditor'

const TEST_ID = 'digital-workplace-ai-console'

export interface WorkplaceAiConsoleProps {
  accessToken?: string
  userId?: string
}

/**
 * Prominent Every AI console. Combines a sleek prompt field (hands the task to
 * EveryFabric) with a row of customizable one-click quick actions, so the user
 * can either type freely or fire a ready-made task. The action set is editable
 * via a subtle pencil affordance and persisted per user (backed by the
 * prompt-manager user-data store, so it follows the user across devices).
 */
const WorkplaceAiConsole: React.FC<WorkplaceAiConsoleProps> = ({ accessToken, userId }) => {
  const { t } = useWorkplaceTranslation()
  const [value, setValue] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)

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
      className="gba:group/console gba:relative gba:flex gba:w-full gba:flex-col gba:gap-4 gba:overflow-hidden gba:rounded-2xl gba:border gba:border-border/60 gba:bg-card gba:p-4 gba:shadow-lg gba:md:p-5"
      data-testid={TEST_ID}
    >
      {/* Soft AI glow in the corner for a premium, alive feel. */}
      <span className="gba:pointer-events-none gba:absolute gba:-right-12 gba:-top-12 gba:size-40 gba:rounded-full gba:bg-ai/5 gba:blur-2xl" />

      <header className="gba:relative gba:flex gba:items-center gba:gap-3">
        <span
          className="dw-idle-turn gba:flex gba:size-9 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-xl gba:bg-ai/10"
          style={{ animation: 'dw-every-idle-turn 6.5s ease-in-out infinite' }}
        >
          <EveryIcon className="gba:size-5" gradient="gba:bg-ai" />
        </span>
        <div className="gba:min-w-0 gba:flex-1">
          <h2 className="gba:truncate gba:text-base gba:font-semibold gba:tracking-tight gba:text-foreground">
            {t('ai-title')}
          </h2>
          <p className="gba:truncate gba:text-sm gba:text-muted-foreground">{t('ai-subtitle')}</p>
        </div>
      </header>

      {/* Prominent prompt field. */}
      <div className="gba:relative gba:flex gba:items-center gba:gap-3 gba:rounded-xl gba:border gba:border-border gba:bg-background gba:px-4 gba:py-3 gba:shadow-sm gba:transition gba:duration-200 gba:focus-within:border-ai/60 gba:focus-within:ring-2 gba:focus-within:ring-ai/20">
        <div className="gba:relative gba:flex gba:min-w-0 gba:flex-1 gba:items-center">
          <input
            type="text"
            value={value}
            onChange={event => setValue(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder=""
            aria-label={t('composer-placeholder')}
            className="gba:relative gba:z-10 gba:w-full gba:min-w-0 gba:bg-transparent gba:text-base gba:text-foreground gba:outline-none"
            data-testid={`${TEST_ID}-input`}
          />
          {value.length === 0 ? <ComposerRotatingPlaceholder /> : null}
        </div>
        <Button onClick={submit} disabled={!value.trim()} data-testid={`${TEST_ID}-send`}>
          {t('composer-send')}
          <ArrowRightIcon className="gba:size-4" />
        </Button>
      </div>

      {/* Customizable quick actions. */}
      <div className="gba:relative gba:flex gba:flex-col gba:gap-2">
        <div className="gba:flex gba:items-center gba:justify-between">
          <span className="gba:text-xs gba:font-semibold gba:uppercase gba:tracking-wider gba:text-muted-foreground">
            {t('ai-quick-heading')}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setEditorOpen(true)}
            title={t('ai-edit')}
            aria-label={t('ai-edit')}
            className="gba:size-7 gba:text-muted-foreground gba:opacity-40 gba:transition gba:hover:opacity-100 gba:group-hover/console:opacity-70"
            data-testid={`${TEST_ID}-edit`}
          >
            <PencilSimpleIcon className="gba:size-4" />
          </Button>
        </div>

        {actions.length > 0 ? (
          <div className="gba:grid gba:grid-cols-2 gba:gap-2.5 gba:lg:grid-cols-4" data-testid={`${TEST_ID}-actions`}>
            {actions.map(action => {
              const ActionIcon = resolveQuickActionIcon(action.iconKey)
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => startAction(action.prompt)}
                  title={action.prompt}
                  className="gba:group/action gba:flex gba:items-center gba:gap-3 gba:rounded-xl gba:border gba:border-border/60 gba:bg-background/60 gba:px-3 gba:py-2.5 gba:text-left gba:transition gba:duration-200 gba:hover:border-ai/40 gba:hover:bg-accent gba:hover:shadow-sm gba:focus-visible:outline-none gba:focus-visible:ring-2 gba:focus-visible:ring-ai/30"
                  data-testid={`${TEST_ID}-action-${action.id}`}
                >
                  <span className="gba:flex gba:size-9 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-lg gba:bg-ai/10 gba:text-ai gba:transition gba:group-hover/action:bg-ai/15">
                    <ActionIcon className="gba:size-5" weight="duotone" />
                  </span>
                  <span className="gba:min-w-0 gba:flex-1 gba:truncate gba:text-sm gba:font-medium gba:text-foreground">
                    {action.label}
                  </span>
                  <ArrowRightIcon className="gba:size-4 gba:shrink-0 gba:text-muted-foreground gba:opacity-0 gba:transition gba:group-hover/action:translate-x-0.5 gba:group-hover/action:opacity-100" />
                </button>
              )
            })}
          </div>
        ) : null}
      </div>

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
