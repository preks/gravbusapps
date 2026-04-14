import React from 'react'
import { PlusIcon } from '@phosphor-icons/react'
import { Button, Card, useTranslation } from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import customerSettingsI18n from '../../_i18n'
import { IcpCriterionRowCard } from './IcpCriterionRowCard'
import { IcpFormWeightHints } from './IcpFormWeightHints'
import {
  createEmptyCriterionRow,
  type IcpCriterionRowState,
  type IcpFormState,
  isWeightsTotalOverLimit,
  totalWeightPct
} from './icpFormState'

export interface IcpCriteriaFormProps {
  formState: IcpFormState
  onChange: (next: IcpFormState) => void
  dataTestIdPrefix: string
  accessToken: BusinessAppContextProps['accessToken']
}

export const IcpCriteriaForm: React.FC<IcpCriteriaFormProps> = ({
  formState,
  onChange,
  dataTestIdPrefix,
  accessToken
}) => {
  const { t } = useTranslation(customerSettingsI18n)
  const sumPct = totalWeightPct(formState)
  const overLimit = isWeightsTotalOverLimit(formState)

  const savedCriteria = formState.criteria.filter(row => !row.isDraft)
  const draftCriteria = formState.criteria.filter(row => row.isDraft)
  const isCompletelyEmpty = savedCriteria.length === 0 && draftCriteria.length === 0

  const updateCriterion = (clientId: string, patch: Partial<IcpCriterionRowState>) => {
    onChange({
      ...formState,
      criteria: formState.criteria.map(row => (row.clientId === clientId ? { ...row, ...patch } : row))
    })
  }

  const removeCriterion = (clientId: string) => {
    onChange({
      ...formState,
      criteria: formState.criteria.filter(row => row.clientId !== clientId)
    })
  }

  const addCriterion = () => {
    onChange({
      ...formState,
      criteria: [...formState.criteria, createEmptyCriterionRow({ draft: true })]
    })
  }

  return (
    <div className="gba:space-y-6" data-testid={`${dataTestIdPrefix}-criteria-form`}>
      <IcpFormWeightHints overLimit={overLimit} sumPct={sumPct} dataTestIdPrefix={dataTestIdPrefix} />

      <Card className="gba:p-6">
        <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-4">{t('icp-criteria-heading')}</h3>

        {isCompletelyEmpty ? (
          <p className="gba:text-sm gba:text-muted-foreground gba:mb-6">{t('icp-no-criteria')}</p>
        ) : (
          savedCriteria.length > 0 && (
            <div className="gba:space-y-4 gba:mb-6">
              {savedCriteria.map(row => (
                <IcpCriterionRowCard
                  key={row.clientId}
                  row={row}
                  dataTestIdPrefix={dataTestIdPrefix}
                  onUpdate={updateCriterion}
                  onRemove={removeCriterion}
                  accessToken={accessToken}
                />
              ))}
            </div>
          )
        )}

        <div
          className="gba:rounded-md gba:border gba:border-dashed gba:border-border gba:bg-muted/30 gba:p-4"
          data-testid={`${dataTestIdPrefix}-new-criterion-section`}
        >
          <div className="gba:flex gba:flex-col gba:gap-3 gba:sm:flex-row gba:sm:items-center gba:sm:justify-between">
            <h4 className="gba:text-sm gba:font-medium gba:text-foreground">{t('icp-new-criterion-section')}</h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCriterion}
              data-testid={`${dataTestIdPrefix}-add-criterion`}
            >
              <PlusIcon className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('icp-add-criterion')}
            </Button>
          </div>
          {draftCriteria.length > 0 && (
            <div className="gba:space-y-3 gba:mt-4">
              {draftCriteria.map(row => (
                <IcpCriterionRowCard
                  key={row.clientId}
                  row={row}
                  dataTestIdPrefix={dataTestIdPrefix}
                  onUpdate={updateCriterion}
                  onRemove={removeCriterion}
                  compact
                  accessToken={accessToken}
                />
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
