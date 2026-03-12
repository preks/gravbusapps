import React from 'react'
import { Button, Label, useTranslation } from '@newwork/nw-design-system'
import { Code, Sparkles, User } from 'lucide-react'
import translations from '../../../_i18n'
import type { DecisionMode } from '../../../types/studioTypes'

const MODES: Array<{ id: DecisionMode; titleKey: string; Icon: React.FC<{ className?: string }> }> = [
  { id: 'USER', titleKey: 'decision-mode-user', Icon: User },
  { id: 'AI', titleKey: 'decision-mode-ai', Icon: Sparkles },
  { id: 'LOGIC', titleKey: 'decision-mode-logic', Icon: Code }
]

interface DecisionKindSelectorProps {
  value: DecisionMode
  onChange: (value: DecisionMode) => void
  testId: string
}

export const DecisionKindSelector: React.FC<DecisionKindSelectorProps> = ({ value, onChange, testId }) => {
  const { t } = useTranslation(translations)

  return (
    <div className="gba:flex gba:flex-col gba:gap-2" data-testid={`${testId}-kind-selector`}>
      <Label className="gba:text-xs gba:font-medium">Decision kind</Label>
      <div className="gba:grid gba:grid-cols-3 gba:gap-2">
        {MODES.map(m => {
          const selected = value === m.id
          return (
            <Button
              key={m.id}
              type="button"
              variant="outline"
              onClick={() => onChange(m.id)}
              className={[
                'gba:h-16 gba:py-2 gba:px-3 gba:justify-start gba:items-start gba:flex gba:flex-col gba:gap-1 gba:bg-background gba:overflow-hidden',
                selected ? 'gba:border-primary gba:ring-1 gba:ring-ring' : 'gba:border-border'
              ].join(' ')}
              data-testid={`${testId}-kind-${m.id.toLowerCase()}`}
            >
              <div className="gba:flex gba:items-center gba:gap-2 gba:w-full gba:min-w-0">
                <m.Icon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                <span className="gba:text-xs gba:font-semibold gba:text-foreground gba:text-left gba:truncate gba:flex-1 gba:min-w-0">
                  {t(m.titleKey)}
                </span>
              </div>
              {(() => {
                const desc = m.id === 'USER' ? 'Ask a user' : m.id === 'AI' ? 'AI picks an outcome' : 'Route by rules'
                return (
                  <span
                    className="gba:text-[11px] gba:text-muted-foreground gba:truncate gba:leading-snug gba:text-left gba:w-full"
                    title={desc}
                  >
                    {desc}
                  </span>
                )
              })()}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
