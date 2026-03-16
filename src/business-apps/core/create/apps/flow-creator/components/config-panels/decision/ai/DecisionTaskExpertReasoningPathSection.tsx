import React, { useMemo } from 'react'
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../../../../_i18n'

interface DecisionTaskExpertReasoningPathSectionProps {
  value?: string
  schemaPaths: string[]
  onChange: (path: string | undefined) => void
  'data-testid': string
}

export const DecisionTaskExpertReasoningPathSection: React.FC<DecisionTaskExpertReasoningPathSectionProps> = ({
  value,
  schemaPaths,
  onChange,
  'data-testid': testId
}) => {
  const { t } = useTranslation(translations)

  const options = useMemo(() => {
    const current = String(value || '').trim()
    return current && !schemaPaths.includes(current) ? [current, ...schemaPaths] : schemaPaths
  }, [schemaPaths, value])

  const NONE = '__none__'
  const currentValue = String(value || '').trim() || NONE

  return (
    <div className="gba:flex gba:flex-col gba:gap-1.5">
      <Label className="gba:text-xs gba:font-medium">{t('decision-ai-taskexpert-reasoning-label')}</Label>
      <p className="gba:text-xs gba:text-muted-foreground">{t('decision-ai-taskexpert-reasoning-desc')}</p>
      <Select value={currentValue} onValueChange={(v: string) => onChange(v === NONE ? undefined : v)}>
        <SelectTrigger data-testid={testId}>
          <SelectValue placeholder={t('decision-ai-taskexpert-reasoning-placeholder')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{t('decision-ai-taskexpert-reasoning-none')}</SelectItem>
          {options.map(p => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
