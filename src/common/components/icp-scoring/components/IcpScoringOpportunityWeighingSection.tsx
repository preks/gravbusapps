import React from 'react'
import {
  Alert,
  AlertDescription,
  Input,
  Label,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { InfoIcon } from '@phosphor-icons/react'
import icpScoringI18n from '../_i18n'
import {
  OPPORTUNITY_ICP_WEIGHT_KEYS,
  type OpportunityIcpWeightInputs,
  type OpportunityIcpWeightKey
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

const WEIGHT_TOOLTIP_KEYS: Record<OpportunityIcpWeightKey, string> = {
  fit_score: 'icp-scoring-opportunity-weight-fit-score-tooltip',
  win_probability: 'icp-scoring-opportunity-weight-win-probability-tooltip',
  activity_score: 'icp-scoring-opportunity-weight-activity-score-tooltip'
}

const WEIGHT_VALIDATION_MESSAGE_KEYS: Record<OpportunityIcpWeightValidationErrorKey, string> = {
  required: 'icp-scoring-opportunity-weights-required',
  invalid: 'icp-scoring-opportunity-weights-invalid',
  'exceeds-sum': 'icp-scoring-opportunity-weights-exceeds-sum'
}

export interface IcpScoringOpportunityWeighingSectionProps {
  testIdPrefix: string
  weightInputs: OpportunityIcpWeightInputs
  onWeightInputChange: (key: OpportunityIcpWeightKey, value: string) => void
  weightsValidationErrorKey: OpportunityIcpWeightValidationErrorKey | null
}

export const IcpScoringOpportunityWeighingSection: React.FC<IcpScoringOpportunityWeighingSectionProps> = ({
  testIdPrefix,
  weightInputs,
  onWeightInputChange,
  weightsValidationErrorKey
}) => {
  const { t } = useTranslation(icpScoringI18n)

  return (
    <div className="gba:space-y-3" data-testid={`${testIdPrefix}-weighing-section`}>
      <div className="gba:space-y-2">
        <Label>{t('icp-scoring-opportunity-weighing-label')}</Label>
        <p className="gba:text-sm gba:text-muted-foreground">{t('icp-scoring-opportunity-weighing-hint')}</p>
      </div>

      <div className="gba:grid gba:gap-3 gba:md:grid-cols-3">
        {OPPORTUNITY_ICP_WEIGHT_KEYS.map(key => (
          <div key={key} className="gba:space-y-2">
            <div className="gba:flex gba:items-center gba:gap-1.5">
              <Label htmlFor={`${testIdPrefix}-weight-${key}`}>{t(WEIGHT_LABEL_KEYS[key])}</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon
                      className="gba:h-4 gba:w-4 gba:shrink-0 gba:cursor-help gba:text-muted-foreground"
                      data-testid={`${testIdPrefix}-weight-${key}-info`}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" align="center">
                    <p className="gba:max-w-64 gba:text-sm">{t(WEIGHT_TOOLTIP_KEYS[key])}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
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

      {weightsValidationErrorKey ? (
        <Alert variant="destructive" data-testid={`${testIdPrefix}-weights-validation`}>
          <AlertDescription>{t(WEIGHT_VALIDATION_MESSAGE_KEYS[weightsValidationErrorKey])}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}
