import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  useTranslation
} from '@newwork/nw-design-system'
import type { SkillDirectoryRecord } from '../types'
import translations from '../_i18n'

interface SkillActivationDialogProps {
  skill: SkillDirectoryRecord | null
  isActive: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (activeFrom: string | null, activeTo: string | null) => void | Promise<void>
  isLoading?: boolean
  prefixDataTestId?: string
}

function getTodayDateInputValue(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function toDateInputValue(value?: string | null): string {
  if (!value) {
    return ''
  }

  return value.split('T')[0]
}

function toStartOfDayInstant(value: string | null): string | null {
  if (!value) {
    return null
  }

  return new Date(`${value}T00:00:00.000Z`).toISOString()
}

function getScheduledActionDate(skill: SkillDirectoryRecord | null, isActive: boolean, today: string): string {
  if (!skill) {
    return ''
  }

  const activeFrom = toDateInputValue(skill.activeFrom)
  const activeTo = toDateInputValue(skill.activeTo)

  if (isActive && activeTo >= today) {
    return activeTo
  }

  if (!isActive && activeFrom >= today) {
    return activeFrom
  }

  return ''
}

export default function SkillActivationDialog({
  skill,
  isActive,
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  prefixDataTestId
}: Readonly<SkillActivationDialogProps>) {
  const { t } = useTranslation(translations)
  const today = useMemo(() => getTodayDateInputValue(), [])
  const [displaySkill, setDisplaySkill] = useState<SkillDirectoryRecord | null>(skill)
  const [displayIsActive, setDisplayIsActive] = useState(isActive)
  const effectiveSkill = skill ?? displaySkill
  const effectiveIsActive = skill ? isActive : displayIsActive
  const scheduledActionDate = getScheduledActionDate(effectiveSkill, effectiveIsActive, today)
  const [selectedDate, setSelectedDate] = useState(today)

  useEffect(() => {
    if (!open || !skill) {
      return
    }

    setDisplaySkill(skill)
    setDisplayIsActive(isActive)
    setSelectedDate(getScheduledActionDate(skill, isActive, today) || today)
  }, [isActive, open, skill, today])

  const title = effectiveIsActive ? t('skill-activation-deactivate-title') : t('skill-activation-activate-title')
  const description = effectiveIsActive
    ? t('skill-activation-deactivate-description', { skillName: effectiveSkill?.name ?? '' })
    : t('skill-activation-activate-description', { skillName: effectiveSkill?.name ?? '' })
  const submitLabel = effectiveIsActive ? t('skill-actions-deactivate') : t('skill-actions-activate')
  const dateLabel = effectiveIsActive ? t('skill-activation-deactivate-from') : t('skill-activation-activate-from')
  const dateInputKey = `${effectiveSkill?.id ?? 'skill'}-${effectiveIsActive ? 'deactivate' : 'activate'}-${selectedDate}`
  const scheduledWarning = effectiveIsActive
    ? t('skill-activation-deactivate-scheduled-warning', { date: scheduledActionDate })
    : t('skill-activation-activate-scheduled-warning', { date: scheduledActionDate })
  const handleSubmit = () => {
    const dateValue = toStartOfDayInstant(selectedDate || null)

    if (effectiveIsActive) {
      return onSubmit(effectiveSkill?.activeFrom ?? null, dateValue)
    }

    return onSubmit(dateValue, null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-md" data-testid={`${prefixDataTestId ?? 'skill'}-activation-dialog`}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-4 gba:py-2">
          {scheduledActionDate && (
            <Alert>
              <AlertDescription>{scheduledWarning}</AlertDescription>
            </Alert>
          )}

          <div className="gba:space-y-2">
            <Label>{dateLabel}</Label>
            <Input
              key={dateInputKey}
              type="date"
              value={selectedDate}
              min={today}
              onChange={event => setSelectedDate(event.target.value)}
              data-testid={`${prefixDataTestId ?? 'skill'}-activation-date`}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {t('skill-form-cancel')}
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={isLoading}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
