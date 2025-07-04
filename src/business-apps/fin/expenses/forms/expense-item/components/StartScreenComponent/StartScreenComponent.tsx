import React from "react";
import { Button } from "@newwork/gravity-ui-catalog";
import { useTranslation } from "react-i18next";
import UploadComponent from "../UploadComponent";
import { useExpenseItem } from "../../context/ExpenseItemContext";
import { FORM_STEPS, FormStepType } from "../../constants/constants";
import { ICONS } from "@/business-apps/fin/expenses/utils/icons";

interface StartScreenComponentProps {
  fileList: any[];
  setFileList: (files: any[]) => void;
  setCurrentStep: (step: FormStepType) => void;
}

export const StartScreenComponent: React.FC<StartScreenComponentProps> = ({
  fileList,
  setFileList,
  setCurrentStep,
}) => {
  const { t } = useTranslation();
  const { isProcessingFiles } = useExpenseItem();

  return (
    <div className={`gba:startScreenContainer`} data-testid="start-screen-container">
      <div className={`gba:uploadWrapper`} data-testid="upload-component-wrapper">
        <UploadComponent 
          fileList={fileList} 
          setFileList={setFileList} 
          data-testid="upload-component"
        />
      </div>
      <div className={`gba:buttonContainer`} data-testid="continue-button-container">
        <Button
          variant="ghost"
          onClick={() => setCurrentStep(FORM_STEPS.FORM)}
          className={`gba:continueButton`}
          disabled={isProcessingFiles}
          data-testid="continue-button"
        >
          <div className={`gba:buttonWithIcon`} data-testid="continue-button-content">
            <span className="gba:fontMedium" data-testid="continue-without-receipt-text">{t("lowcoder:create_expense_type_item.continue_button", "Continue without receipt")}</span>
            <img 
              src={ICONS.RIGHT_ARROW} 
              alt={t('lowcoder:create_expense_type_item.continue_alt_text', 'Continue')} 
              className={`gba:arrowIcon`}
              data-testid="continue-button-arrow"
            />
          </div>
        </Button>
      </div>
    </div>
  );
};

export default StartScreenComponent;
