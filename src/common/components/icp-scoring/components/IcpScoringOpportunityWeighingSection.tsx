import React from 'react'
import {
  Alert,
  AlertDescription,
  Input,
  Label,
  ToggleGroup,
  ToggleGroupItem,
  useTranslation
} from '@newwork/nw-design-system'
import icpScoringI18n from '../_i18n'
import {
  OPPORTUNITY_ICP_WEIGHT_KEYS,
  type OpportunityIcpWeightInputs,
  type OpportunityIcpWeightKey,
  type OpportunityWeighingMethod
} from '../utils/opportunityIcpScoringWeights'
import type { OpportunityIcpWeightValidationErrorKey } from '../hooks/useOpportunityIcpScoringWeighing'

const WEIGHT_LABEL_KEYS: Record<OpportunityIcpWeightKey, string> = {
  fit_score: 'icp-scoring-opportunity-weight-fit-score',
  win_probability: 'icp-scoring-opportunity-weight-win-probability',
  activity_score: 'icp-scoring-opportunity-weight-activity-score'
}

const WEIGHT_PLACEHOLDER_KEYS: Record<OpportunityIcpWeightKey, string> = {
  fit_score: 'icp-scoring-opportunity-weight-fit-score-placeholder',
  win_probability: 'icp-scoring-opportunity-weight-win-probability-placeholder',
  activity_score: 'icp-scoring-opportunity-weight-activity-score-placeholder'
}

const WEIGHT_VALIDATION_MESSAGE_KEYS: Record<OpportunityIcpWeightValidationErrorKey, string> = {
  required: 'icp-scoring-opportunity-weights-required',
  invalid: 'icp-scoring-opportunity-weights-invalid',
  'exceeds-sum': 'icp-scoring-opportunity-weights-exceeds-sum'
}

export interface IcpScoringOpportunityWeighingSectionProps {
  testIdPrefix: string
  weighingMethod: OpportunityWeighingMethod
  onWeighingMethodChange: (method: OpportunityWeighingMethod) => void
  weightInputs: OpportunityIcpWeightInputs
  onWeightInputChange: (key: OpportunityIcpWeightKey, value: string) => void
  weightsValidationErrorKey: OpportunityIcpWeightValidationErrorKey | null
}

export const IcpScoringOpportunityWeighingSection: React.FC<IcpScoringOpportunityWeighingSectionProps> = ({
  testIdPrefix,
  weighingMethod,
  onWeighingMethodChange,
  weightInputs,
  onWeightInputChange,
  weightsValidationErrorKey
}) => {
  const { t } = useTranslation(icpScoringI18n)

  return (
    <div className="gba:space-y-3" data-testid={`${testIdPrefix}-weighing-section`}>
      <div className="gba:space-y-2">
        <Label>{t('icp-scoring-opportunity-weighing-label')}</Label>
        <ToggleGroup
          type="single"
          value={weighingMethod}
          onValueChange={value => {
            if (value === 'ai' || value === 'manual') {
              onWeighingMethodChange(value)
            }
          }}
          variant="outline"
          className="gba:w-full gba:max-w-md"
          data-testid={`${testIdPrefix}-weighing-toggle`}
        >
          <ToggleGroupItem value="ai" className="gba:flex-1" data-testid={`${testIdPrefix}-weighing-ai`}>
            {t('icp-scoring-opportunity-weighing-ai')}
          </ToggleGroupItem>
          <ToggleGroupItem value="manual" className="gba:flex-1" data-testid={`${testIdPrefix}-weighing-manual`}>
            {t('icp-scoring-opportunity-weighing-manual')}
          </ToggleGroupItem>
        </ToggleGroup>
        <p className="gba:text-sm gba:text-muted-foreground">{t('icp-scoring-opportunity-weighing-hint')}</p>
      </div>

      {weighingMethod === 'manual' ? (
        <div className="gba:grid gba:gap-3 gba:md:grid-cols-3">
          {OPPORTUNITY_ICP_WEIGHT_KEYS.map(key => (
            <div key={key} className="gba:space-y-2">
              <Label htmlFor={`${testIdPrefix}-weight-${key}`}>{t(WEIGHT_LABEL_KEYS[key])}</Label>
              <Input
                id={`${testIdPrefix}-weight-${key}`}
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={weightInputs[key]}
                onChange={event => onWeightInputChange(key, event.target.value)}
                placeholder={t(WEIGHT_PLACEHOLDER_KEYS[key])}
                data-testid={`${testIdPrefix}-weight-${key}`}
              />
            </div>
          ))}
        </div>
      ) : null}

      {weightsValidationErrorKey ? (
        <Alert variant="destructive" data-testid={`${testIdPrefix}-weights-validation`}>
          <AlertDescription>{t(WEIGHT_VALIDATION_MESSAGE_KEYS[weightsValidationErrorKey])}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}
