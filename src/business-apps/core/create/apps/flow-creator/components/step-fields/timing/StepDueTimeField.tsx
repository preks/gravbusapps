import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../../../_i18n'
import { DueDateField } from './DueDateField'

interface StepDueTimeFieldProps {
  valueMinutes?: number
  onChange: (minutes: number | undefined) => void
  showDescription?: boolean
  'data-testid': string
}

export const StepDueTimeField: React.FC<StepDueTimeFieldProps> = ({
  valueMinutes,
  onChange,
  showDescription = true,
  'data-testid': testId
}) => {
  const { t } = useTranslation(translations)

  return (
    <DueDateField
      valueMinutes={valueMinutes}
      onChange={onChange}
      label={t('step-due-label')}
      description={showDescription ? t('step-due-description') : undefined}
      placeholder={t('step-due-placeholder')}
      unitLabels={{
        minutes: t('step-due-unit-minutes'),
        hours: t('step-due-unit-hours'),
        days: t('step-due-unit-days')
      }}
      data-testid={testId}
    />
  )
}
