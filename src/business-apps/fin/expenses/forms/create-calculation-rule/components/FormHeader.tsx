import React from 'react'
import { Separator } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface FormHeaderProps {
  isUpdate: boolean
  flowIconUrl: string
}

const FormHeader: React.FC<FormHeaderProps> = ({ isUpdate, flowIconUrl }) => {
  return (
    <div
      className="gba:mx-auto gba:font-primary gba:flex gba:flex-col"
      style={{ width: '100%', maxWidth: '800px' }}
      data-testid="ccr-main-container"
    >
      <div
        className="gba:flex gba:items-center gba:pt-2 gba:font-primary gba:relative gba:pb-[30px] gba:h-8 gba:box-content"
        data-testid="expense-plan-item-header-container"
      >
        <div className="gba:flex gba:items-center gba:gap-3" data-testid="expense-plan-item-title-container">
          <img
            src={flowIconUrl}
            alt="Flow"
            className="gba:w-5 gba:h-5"
            style={{ filter: 'invert(1) brightness(0)' }}
            data-testid="ccr-title-icon"
          />
          <div className="gba:text-[20px] gba:font-semibold gba:m-0" data-testid="expense-plan-item-header-title">
            {isUpdate
              ? getTranslationFromI18nKeyAndLabel(
                  'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.header_title_update',
                  'Update Calculation Rule'
                )
              : getTranslationFromI18nKeyAndLabel(
                  'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.header_title',
                  'Create Calculation Rule'
                )}
          </div>
        </div>
      </div>
      <Separator className="gba:m-0 gba:ml-0 gba:mb-[30px]" data-testid="expense-plan-item-header-divider" />
    </div>
  )
}

export default FormHeader
