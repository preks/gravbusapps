import React from 'react'
import { Button, Divider } from '@newwork/gravity-ui-catalog'
import UploadComponent from '../UploadComponent'
import { useExpenseItem } from '../../context/ExpenseItemContext'
import { FORM_STEPS, FormStepType } from '../../constants/constants'
import { ICONS } from '@/business-apps/fin/expenses/utils/icons'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface StartScreenComponentProps {
  fileList: any[]
  setFileList: (files: any[]) => void
  setCurrentStep: (step: FormStepType) => void
  handleCancel: () => void
}

export const StartScreenComponent: React.FC<StartScreenComponentProps> = ({
  fileList,
  setFileList,
  setCurrentStep,
  handleCancel
}) => {
  const { isProcessingFiles } = useExpenseItem()

  return (
    <div
      className="gba:text-center gba:flex gba:flex-col gba:items-center gba:gap-4 gba:flex-1 gba:min-h-0"
      data-testid="start-screen-container"
    >
      <div style={{ width: '100%', maxWidth: '100%' }} data-testid="upload-component-wrapper">
        <UploadComponent fileList={fileList} setFileList={setFileList} data-testid="upload-component" />
      </div>

      <div className="gba:flex gba:justify-center" style={{ width: '100%' }} data-testid="continue-button-container">
        <Button
          variant="ghost"
          onClick={() => setCurrentStep(FORM_STEPS.FORM)}
          disabled={isProcessingFiles}
          data-testid="continue-button"
        >
          <div className="gba:flex gba:items-center gba:justify-center gba:gap-2" data-testid="continue-button-content">
            <span className="gba:font-medium gba:text-black" data-testid="continue-without-receipt-text">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:create_expense_type_item.continue_button',
                'Continue without receipt'
              )}
            </span>
            <img
              src={ICONS.RIGHT_ARROW}
              alt={getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_type_item.continue_alt_text', 'Continue')}
              className="gba:w-6 gba:h-6"
              data-testid="continue-button-arrow"
            />
          </div>
        </Button>
      </div>

      {/* Spacer to push content to the bottom */}
      <div className="gba:flex-grow" data-testid="start-screen-spacer" />
      <div className="gba:flex gba:flex-col" style={{ width: '100%' }}>
        <Divider
          color="border"
          horizontal
          size={1}
          className="gba:mt-[30px] gba:mb-[30px]"
          data-testid="start-screen-divider"
        />

        <div
          className="gba:flex gba:justify-between gba:py-4"
          style={{ width: '100%' }}
          data-testid="start-screen-actions"
        >
          <Button
            variant="outline"
            onClick={handleCancel}
            className="gba:min-w-[100px] gba:border-2 gba:text-base gba:font-semibold gba:px-4"
            style={{ borderRadius: '22px', height: '40px' }}
            data-testid="start-screen-cancel-button"
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.initiate_cancel_button', 'Cancel')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default StartScreenComponent
