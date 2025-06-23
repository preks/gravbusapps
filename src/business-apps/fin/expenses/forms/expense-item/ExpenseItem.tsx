import React from "react";
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
    currencies,
    isEditMode
  } = useExpenseItem();

  return (
    <div className={`gba:mainContainer`}>
      <div className={`gba:headerContainer`}>
        {currentStep === "form" && (
          <Button
            variant="ghost"
            onClick={() => {
              setCurrentStep("start");
              setFileList([]);
            }}
            className={`gba:backButton`}
            data-testid="back-button"
          >
            <img 
              src="https://newwork-dev.newwork.com/_next/static/media/lowcoder-icons/remixicons/arrow-left-s-line.svg" 
              alt="Back" 
              className={`gba:backIcon`}
              width="24"
              height="24"
            />
          </Button>
        )}
        <div className={`gba:titleContainer`}>
          <Title level={4} className={`gba:headerTitle`}>
            {isEditMode 
              ? t("create_expense_type_item.header_container_title_edit", "Edit Item | Expense")
              : t("create_expense_type_item.header_container_title_new", "New Item | Expense")
            }
          </Title>
        </div>
      </div>
      <Divider className={`gba:headerDivider`} />

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
