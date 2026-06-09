import React, { useState, useCallback } from 'react'
import { Card, Button } from '@newwork/nw-design-system'
import { ArrowRightIcon } from '@phosphor-icons/react'
import { EveryIcon } from '@newwork/icons'
import { openEveryFabric } from '@/common/utils/openEveryFabric'
import { useWorkplaceTranslation } from '../_i18n/useWorkplaceTranslation'
import ComposerRotatingPlaceholder from './ComposerRotatingPlaceholder'

const TEST_ID = 'digital-workplace-composer'

/**
 * EveryFabric quick composer. Submitting hands the prompt to the EveryFabric
 * app (via openEveryFabric), which starts a brand-new agent session from the
 * entered task — so the user can kick off work from the workplace overview.
 */
const WorkplaceComposer: React.FC = () => {
  const { t } = useWorkplaceTranslation()
  const [value, setValue] = useState('')

  const submit = useCallback(() => {
    const prompt = value.trim()
    if (!prompt) return
    openEveryFabric({ prompt })
    setValue('')
  }, [value])

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
      className="gba:mx-auto gba:flex gba:w-full gba:max-w-2xl gba:flex-row gba:items-center gba:gap-3 gba:rounded-full gba:border gba:border-border/40 gba:bg-card/45 gba:px-4 gba:py-2 gba:opacity-80 gba:shadow-lg gba:backdrop-blur-xl gba:transition gba:duration-200 gba:hover:opacity-100 gba:focus-within:border-border gba:focus-within:bg-card/95 gba:focus-within:opacity-100 gba:focus-within:shadow-xl"
      data-testid={TEST_ID}
    >
      {/* Periodic gentle rotation signals Every is alive and waiting (paused under reduced-motion). */}
      <span
        className="dw-idle-turn gba:flex gba:shrink-0"
        style={{ animation: 'dw-every-idle-turn 6.5s ease-in-out infinite' }}
      >
        <EveryIcon className="gba:size-5" gradient="gba:bg-ai" />
      </span>
      <div className="gba:relative gba:flex gba:min-w-0 gba:flex-1 gba:items-center">
        <input
          type="text"
          value={value}
          onChange={event => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder=""
          aria-label={t('composer-placeholder')}
          className="gba:relative gba:z-10 gba:min-w-0 gba:flex-1 gba:bg-transparent gba:text-sm gba:text-foreground gba:outline-none"
          data-testid={`${TEST_ID}-input`}
        />
        {value.length === 0 ? <ComposerRotatingPlaceholder /> : null}
      </div>
      <Button size="sm" onClick={submit} disabled={!value.trim()} data-testid={`${TEST_ID}-send`}>
        {t('composer-send')}
        <ArrowRightIcon className="gba:size-4" />
      </Button>
    </Card>
  )
}

export default WorkplaceComposer
export { WorkplaceComposer }
