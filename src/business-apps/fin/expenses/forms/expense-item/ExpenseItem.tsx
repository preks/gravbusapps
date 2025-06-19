import React from "react";
import styles from "./ExpenseItem.module.css";
import { useTranslation } from "react-i18next";
import { ExpenseItemProvider, useExpenseItem } from './context';
import { Button } from "@newwork/gravity-ui-catalog";
import { Typography, Divider } from "antd";
import { ExpenseItemProps } from "./types";
import StartScreenComponent from "./components/StartScreenComponent";
import FormScreenComponent from "./components/FormScreenComponent";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";

const { Title } = Typography;

const ExpenseItemContent: React.FC = () => {
  const { t } = useTranslation();
  
  // Get all states and functions from context
  const {
    form,
    currentStep,
    setCurrentStep,
    fileList,
    setFileList,
    positions,
    setPositions,
    expenseGroups,
    expenseRequests,
    loading,
    expenseTypes,
    customFields,
    costCenters,
    multiPosition,
    setCurrentSelectedDate,
    setMultiPosition,
    handleSubmit,
    handleExpenseGroupChange,
    handleExpenseTypeChange,
    handleAddPosition,
    handleRemovePosition,
    calculateTotal,
    currencies
  } = useExpenseItem();

  return (
    <div className={`${styles.mainContainer} gba:mainContainer`}>
      <div className={`${styles.headerContainer} gba:headerContainer`}>
        {currentStep === "form" && (
          <Button
            variant="ghost"
            onClick={() => {
              setCurrentStep("start");
              setFileList([]);
            }}
            className={`${styles.backButton} gba:backButton`}
            data-testid="back-button"
          >
            <img 
              src="https://newwork-dev.newwork.com/_next/static/media/lowcoder-icons/remixicons/arrow-left-s-line.svg" 
              alt="Back" 
              className={`${styles.backIcon} gba:backIcon`}
              width="24"
              height="24"
            />
          </Button>
        )}
        <div className={`${styles.titleContainer} gba:titleContainer`}>
          <Title level={4} className={`${styles.headerTitle} gba:headerTitle`}>
            {t("expense_item.title", "New Expense Item")}
          </Title>
        </div>
      </div>
      <Divider className={`${styles.headerDivider} gba:headerDivider`} />

      {currentStep === "start" ? (
        <StartScreenComponent 
          fileList={fileList}
          setFileList={setFileList}
          setCurrentStep={setCurrentStep}
        />
      ) : (
        <FormScreenComponent
          form={form}
          fileList={fileList}
          setFileList={setFileList}
          positions={positions}
          setPositions={setPositions}
          expenseGroups={expenseGroups}
          expenseTypes={expenseTypes}
          customFields={customFields}
          costCenters={costCenters}
          currencies={currencies}
          expenseRequests={expenseRequests}
          multiPosition={multiPosition}
          setCurrentSelectedDate={setCurrentSelectedDate}
          setMultiPosition={setMultiPosition}
          handleSubmit={handleSubmit}
          handleExpenseGroupChange={handleExpenseGroupChange}
          handleExpenseTypeChange={handleExpenseTypeChange}
          handleAddPosition={handleAddPosition}
          handleRemovePosition={handleRemovePosition}
          loading={loading}
          calculateTotal={calculateTotal}
        />
      )}
    </div>
  );
};

// Wrapper component that provides the context
const ExpenseItem: React.FC<BusinessAppContextProps & ExpenseItemProps> = ({ accessToken, userInfo, additionalData }) => {
  return (
    <ExpenseItemProvider accessToken={accessToken} userInfo={userInfo} additionalData={additionalData}>
      <ExpenseItemContent />
    </ExpenseItemProvider>
  );
};

export default ExpenseItem;
