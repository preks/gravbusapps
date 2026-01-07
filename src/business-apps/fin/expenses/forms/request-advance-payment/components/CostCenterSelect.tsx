import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { CostCenter } from '../hooks/useRequestAdvancePaymentData'
import { SelectFieldProps } from '../types/FormTypes'

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
  return (
    <div className="gba:mb-4 gba:bg-gray-100" data-testid={dataTestId}>
      <label className="gba:block gba:text-xs gba:font-medium gba:text-black  gba:bg-gray-100 gba:px-3 gba:py-1 gba:rounded">
        {getTranslationFromI18nKeyAndLabel(
          'lowcoder:create_expense_request.expense_request_container.current_cost_center_label',
          'Cost Center'
        )}
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
          <SelectValue
            placeholder={getTranslationFromI18nKeyAndLabel(
              'lowcoder:create_expense_request.expense_request_container.current_cost_center_placeholder',
              'Select Cost Center'
            )}
          />
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
