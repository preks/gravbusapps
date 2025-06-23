import React from "react";
import { Button } from "@newwork/gravity-ui-catalog";
import { useTranslation } from "react-i18next";
import UploadComponent from "../UploadComponent";
import { useExpenseItem } from "../../context/ExpenseItemContext";

interface StartScreenComponentProps {
  fileList: any[];
  setFileList: (files: any[]) => void;
  setCurrentStep: (step: "start" | "form") => void;
}

export const StartScreenComponent: React.FC<StartScreenComponentProps> = ({
  fileList,
  setFileList,
  setCurrentStep,
}) => {
  const { t } = useTranslation();
  const { isProcessingFiles } = useExpenseItem();

  return (
    <div className={`gba:startScreenContainer`}>
      <div className={`gba:uploadWrapper`}>
        <UploadComponent 
          fileList={fileList} 
          setFileList={setFileList} 
        />
      </div>
      <div className={`gba:buttonContainer`}>
        <Button
          variant="ghost"
          onClick={() => setCurrentStep("form")}
          className={`gba:continueButton`}
          disabled={isProcessingFiles}
        >
          <div className={`gba:buttonWithIcon`}>
            <span>{t("lowcoder:create_expense_type_item.continue_button", "Continue without receipt")}</span>
            <img 
              src="https://newwork-dev.newwork.com/_next/static/media/lowcoder-icons/remixicons/ArrowRightSLine.svg" 
              alt={t('lowcoder:create_expense_type_item.continue_alt_text', 'Continue')} 
              className={`gba:arrowIcon`}
            />
          </div>
        </Button>
      </div>
    </div>
  );
};

export default StartScreenComponent;
