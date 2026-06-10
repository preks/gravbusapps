import React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import { CostCenter } from '../hooks/useRequestAdvancePaymentData'
import { SelectFieldProps } from '../types/FormTypes'
import translations from '../_i18n'

interface CostCenterSelectProps extends SelectFieldProps {
  costCenters: CostCenter[]
  selectedPlanCostCenterId?: string
}

const CostCenterSelect: React.FC<CostCenterSelectProps> = ({
  costCenters,
  selectedPlanCostCenterId,
  value,
  onChange,
  disabled,
  'data-testid': dataTestId = 'request-advance-payment-cost-center-field'
}) => {
  const { t } = useTranslation(translations)

  return (
    <div className="gba:mb-4 gba:bg-gray-100" data-testid={dataTestId}>
      <label className="gba:block gba:text-xs gba:font-medium gba:text-black  gba:bg-gray-100 gba:px-3 gba:py-1 gba:rounded">
        {t('cost-center-label')}
        <span className="gba:text-muted-foreground"> *</span>
      </label>
      <Select
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        data-testid="request-advance-payment-cost-center-select"
      >
        <SelectTrigger
          className="gba:h-10 gba:bg-gray-100 gba:border-none"
          style={{ width: '100%', justifyContent: 'space-between' }}
        >
          <SelectValue placeholder={t('cost-center-placeholder')} />
        </SelectTrigger>
        <SelectContent>
          {selectedPlanCostCenterId && (
            <SelectItem key={selectedPlanCostCenterId} value={selectedPlanCostCenterId}>
              {costCenters.find(cc => cc.id === selectedPlanCostCenterId)?.name ||
                `Cost Center ${selectedPlanCostCenterId}`}{' '}
              (Plan Default)
            </SelectItem>
          )}
          {costCenters
            .filter(cc => !selectedPlanCostCenterId || cc.id !== selectedPlanCostCenterId)
            .map(cc => (
              <SelectItem key={cc.id} value={cc.id}>
                {cc.name}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
      {selectedPlanCostCenterId && value === selectedPlanCostCenterId}
    </div>
  )
}

export default CostCenterSelect
