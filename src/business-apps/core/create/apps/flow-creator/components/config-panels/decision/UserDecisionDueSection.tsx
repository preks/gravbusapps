import React, { useMemo } from 'react'
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../../../_i18n'
import type { DueUnit } from './decisionConfigUtils'
import { deriveTimeUnit, MINUTES_PER } from './decisionConfigUtils'

interface UserDecisionDueSectionProps {
  timeoutMinutes?: number
  onChangeTimeoutMinutes: (timeoutMinutes: number | undefined) => void
  'data-testid': string
}

export const UserDecisionDueSection: React.FC<UserDecisionDueSectionProps> = ({
  timeoutMinutes,
  onChangeTimeoutMinutes,
  'data-testid': testId
}) => {
  const { t } = useTranslation(translations)
  const unit = useMemo(() => deriveTimeUnit(timeoutMinutes), [timeoutMinutes])
  const amountValue = useMemo(() => {
    const mins = Number(timeoutMinutes || 0)
    if (!mins) return ''
    const per = MINUTES_PER[unit]
    const val = Math.round(mins / per)
    return String(val > 0 ? val : '')
  }, [timeoutMinutes, unit])

  return (
    <div className="gba:flex gba:flex-col gba:gap-2">
      <Label className="gba:text-xs gba:font-semibold gba:text-foreground">{t('decision-due-label')}</Label>
      <div className="gba:flex gba:items-center gba:gap-2">
        <Input
          type="number"
          min={1}
          value={amountValue}
          placeholder={t('decision-due-placeholder')}
          onChange={e => {
            const raw = String(e.target.value || '').trim()
            if (!raw) {
              onChangeTimeoutMinutes(undefined)
              return
            }
            const n = Number.parseInt(raw, 10)
            if (!Number.isFinite(n) || n <= 0) {
              onChangeTimeoutMinutes(undefined)
              return
            }
            onChangeTimeoutMinutes(n * MINUTES_PER[unit])
          }}
          className="gba:flex-1"
          data-testid={`${testId}-amount`}
        />
        <Select
          value={unit}
          onValueChange={(next: string) => {
            const nextUnit = next as DueUnit
            const currentAmount = Number.parseInt(String(amountValue || '1'), 10) || 1
            onChangeTimeoutMinutes(currentAmount * MINUTES_PER[nextUnit])
          }}
        >
          <SelectTrigger className="gba:w-32" data-testid={`${testId}-unit`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minutes">{t('decision-due-unit-minutes')}</SelectItem>
            <SelectItem value="hours">{t('decision-due-unit-hours')}</SelectItem>
            <SelectItem value="days">{t('decision-due-unit-days')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
