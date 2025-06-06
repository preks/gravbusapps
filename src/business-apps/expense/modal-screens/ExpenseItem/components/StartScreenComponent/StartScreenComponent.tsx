import React from "react";
import { Button } from "@newwork/gravity-ui-catalog";
import { useTranslation } from "react-i18next";
import styles from "../../ExpenseItem.module.css";
import UploadComponent from "../UploadComponent";
import { useExpenseItem } from "../../ExpenseItemContext/ExpenseItemContext";

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
    <div className={`${styles.startScreenContainer} gba:startScreenContainer`}>
      <div className={`${styles.uploadWrapper} gba:uploadWrapper`}>
        <UploadComponent 
          fileList={fileList} 
          setFileList={setFileList} 
        />
      </div>
      <div className={`${styles.buttonContainer} gba:buttonContainer`}>
        <Button
          variant="ghost"
          onClick={() => setCurrentStep("form")}
          className={`${styles.continueButton} gba:continueButton`}
          disabled={isProcessingFiles}
        >
          {t("expense_item.continue_without_receipt", "Continue without receipt")}
        </Button>
      </div>
    </div>
  );
};

export default StartScreenComponent;
