import React from "react";
import { Button } from "@newwork/gravity-ui-catalog";
import { useTranslation } from "react-i18next";
import styles from "../../ExpenseItem.module.css";
import UploadComponent from "../UploadComponent";

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

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <UploadComponent fileList={fileList} setFileList={setFileList} />
      <Button
        variant="ghost"
        onClick={() => setCurrentStep("form")}
        className={`${styles.continueButton} gba:continueButton`}
      >
        {t("expense_item.continue_without_receipt", "Continue without receipt")}
      </Button>
    </div>
  );
};

export default StartScreenComponent;
