import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  Button,
  Tooltip,
  Modal,
  message,
  Typography,
  Spin,
  Alert,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import type {
  JobLevelVisualization as EnhancedJobLevel,
  JobLevelGroupVisualization as EnhancedJobLevelGroup,
  PayGradeVisualization as EnhancedPayGrade,
} from "../../types";
import { useCompensationDataIntegration } from "../../hooks/useCompensationDataIntegration";
import { startProcess } from "@/common/utils/start-process";

const { Title, Text } = Typography;

// Re-export types from integration hook for consistency
export type PayGrade = EnhancedPayGrade;
export type JobLevelGroup = EnhancedJobLevelGroup;
export type JobLevel = EnhancedJobLevel;

export interface PayGradesTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

// Mock data removed - now using real data from useCompensationDataIntegration

const PayGradesTab: React.FC<PayGradesTabProps> = (context) => {
  const { t } = useTranslation();
  const { prefixDataTestId, userInfo } = context;

  // Use real data integration
  const { payGrades, jobLevelGroups, jobLevels, isLoading, error, refetch } =
    useCompensationDataIntegration(context);

  const [editingPayGrade, setEditingPayGrade] = useState<PayGrade | null>(null);
  const [insertAfterGrade, setInsertAfterGrade] = useState<string | null>(null);

  const formatCurrency = (
    amount: number,
    currency?: { id: string; value: string } | string
  ) => {
    let currencyCode =
      typeof currency === "string" ? currency : currency?.id || "EUR";

    // Extract currency code from format like "Currency:v1:EUR" -> "EUR"
    if (currencyCode.includes(":")) {
      const parts = currencyCode.split(":");
      currencyCode = parts[parts.length - 1]; // Get the last part
    }

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getJobLevelsByPayGradeAndGroup = (
    payGradeId: string,
    groupId: string
  ) => {
    return jobLevels.filter(
      (jl) => jl.payGradeId === payGradeId && jl.jobLevelGroupId === groupId
    );
  };

  const handleAddPayGrade = (afterGradeId?: string) => {
    setEditingPayGrade(null);
    setInsertAfterGrade(afterGradeId || null);
    startProcess({
      domain: "dummy-domain",
      processName: "changePayGrade",
      payload: {
        employeeId: userInfo?.employeeDetails.employeeId,
      },
      builderType: "NATIVE_SCREEN",
    });
  };

  const handleEditPayGrade = (payGrade: PayGrade) => {
    setEditingPayGrade(payGrade);
    startProcess({
      domain: "dummy-domain",
      processName: "changePayGrade",
      payload: {
        employeeId: userInfo?.employeeDetails.employeeId,
        payGrade,
      },
      builderType: "NATIVE_SCREEN",
    });
    setInsertAfterGrade(null);
  };

  const handleDeletePayGrade = (payGrade: PayGrade) => {
    Modal.confirm({
      title: "Delete Pay Grade",
      content: `Are you sure you want to delete "${payGrade.name}" (${payGrade.code})?`,
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        // TODO: Implement API call to delete pay grade
        message.warning(
          "Delete functionality will be implemented with process API integration"
        );
        // Optionally refetch data
        await refetch();
      },
    });
  };

  const sortedPayGrades = [...payGrades].sort((a, b) => a.order - b.order); // Lowest grades first, will be at bottom with flex-reverse
  const sortedJobLevelGroups = [...jobLevelGroups].sort(
    (a, b) => a.order - b.order
  );

  if (isLoading) {
    return (
      <div
        data-testid={`${prefixDataTestId}-PayGradesTab`}
        className="gba:flex gba:justify-center gba:items-center gba:h-64"
      >
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid={`${prefixDataTestId}-PayGradesTab`} className="gba:p-4">
        <Alert
          message="Error Loading Data"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" danger onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div data-testid={`${prefixDataTestId}-PayGradesTab`}>
      <Card className="gba:rounded-lg gba:border gba:bg-card gba:text-card-foreground gba:shadow-sm gba:overflow-hidden">
        <div className="gba:flex gba:flex-col gba:space-y-1.5 gba:p-6 gba:border-b">
          <div className="gba:flex gba:justify-between gba:items-center">
            <div>
              <Title
                level={2}
                className="gba:text-2xl gba:font-semibold gba:leading-none gba:tracking-tight gba:mb-1"
              >
                Pay Grade Overview
              </Title>
              <Text className="gba:text-sm gba:text-muted-foreground">
                Pay grade distribution across career bands. Each row represents
                a pay grade level, showing which groups are assigned to each
                grade.
              </Text>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleAddPayGrade()}
            >
              Add Pay Grade
            </Button>
          </div>
        </div>

        <div className="gba:relative">
          {/* Matrix Rows */}
          <div className="gba:flex gba:flex-col-reverse gba:gap-1">
            {sortedPayGrades.map((payGrade) => (
              <div
                key={payGrade.id}
                className="gba:flex gba:items-center gba:h-10 gba:px-4 gba:bg-white gba:border gba:border-gray-200 gba:rounded gba:group hover:gba:bg-gray-50"
              >
                {/* Pay Grade Label */}
                <div className="gba:w-40 gba:flex gba:items-center gba:justify-start gba:pr-4">
                  <div className="gba:text-sm gba:font-medium gba:text-gray-700 gba:flex gba:items-center gba:gap-2 gba:min-w-0 gba:flex-1">
                    <span
                      className="gba:truncate gba:flex-1"
                      title={payGrade.name}
                    >
                      {payGrade.name}
                    </span>
                    <div className="gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity gba:flex gba:gap-1 gba:flex-shrink-0">
                      <Button
                        size="small"
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => handleEditPayGrade(payGrade)}
                        className="gba:p-1 gba:h-6 gba:w-6"
                      />
                      <Button
                        size="small"
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeletePayGrade(payGrade)}
                        className="gba:p-1 gba:h-6 gba:w-6"
                      />
                      <Button
                        size="small"
                        type="text"
                        icon={<PlusOutlined />}
                        onClick={() => handleAddPayGrade(payGrade.id)}
                        className="gba:p-1 gba:h-6 gba:w-6"
                        title="Add pay grade after this one"
                      />
                    </div>
                  </div>
                </div>

                {/* Job Level Group Cells */}
                <div className="gba:flex-1 gba:flex gba:justify-around gba:gap-2">
                  {sortedJobLevelGroups.map((group) => {
                    const jobLevelsInCell = getJobLevelsByPayGradeAndGroup(
                      payGrade.id,
                      group.id
                    );
                    const hasJobLevels = jobLevelsInCell.length > 0;

                    return (
                      <div
                        key={`${payGrade.id}-${group.id}`}
                        className="gba:flex-1 gba:h-8 gba:flex gba:items-center"
                      >
                        {hasJobLevels ? (
                          <div className="gba:flex gba:gap-1 gba:w-full gba:h-full">
                            {jobLevelsInCell.map(
                              (jobLevel: EnhancedJobLevel) => (
                                <Tooltip
                                  key={jobLevel.id}
                                  title={
                                    <div>
                                      <div className="gba:font-bold">
                                        {jobLevel.name}
                                      </div>
                                      <div>Pay Grade: {payGrade.code}</div>
                                      <div>
                                        Min:{" "}
                                        {formatCurrency(
                                          payGrade.minSalary,
                                          payGrade.currency
                                        )}
                                      </div>
                                      <div className="gba:font-bold">
                                        Std:{" "}
                                        {formatCurrency(
                                          payGrade.standardSalary,
                                          payGrade.currency
                                        )}
                                      </div>
                                      <div>
                                        Max:{" "}
                                        {formatCurrency(
                                          payGrade.maxSalary,
                                          payGrade.currency
                                        )}
                                      </div>
                                    </div>
                                  }
                                  placement="top"
                                >
                                  <div
                                    className={`${group.color} gba:rounded gba:flex-1 gba:flex gba:items-center gba:justify-center gba:text-white gba:text-xs gba:font-medium gba:cursor-pointer gba:transition-colors hover:gba:opacity-80`}
                                  >
                                    <span className="gba:text-center gba:leading-tight gba:drop-shadow-sm">
                                      {jobLevel.name}
                                    </span>
                                  </div>
                                </Tooltip>
                              )
                            )}
                          </div>
                        ) : (
                          <div className="gba:w-full gba:h-full gba:bg-gray-200 gba:rounded gba:opacity-40"></div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Salary Range */}
                <div className="gba:w-48 gba:flex gba:items-center gba:justify-center gba:pl-4">
                  <div className="gba:text-xs gba:text-gray-600 gba:text-center">
                    <div className="gba:font-medium">
                      {formatCurrency(payGrade.minSalary, payGrade.currency)} -{" "}
                      {formatCurrency(payGrade.maxSalary, payGrade.currency)}
                    </div>
                    <div className="gba:text-gray-500">
                      Std:{" "}
                      {formatCurrency(
                        payGrade.standardSalary,
                        payGrade.currency
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Labels */}
          <div className="gba:flex gba:items-center gba:mt-4 gba:px-4">
            <div className="gba:w-40"></div>{" "}
            {/* Empty space for pay grade column */}
            <div className="gba:flex-1 gba:flex gba:justify-around gba:gap-2">
              {sortedJobLevelGroups.map((group) => (
                <div
                  key={group.id}
                  className="gba:flex-1 gba:text-center gba:text-sm gba:font-medium gba:text-gray-600"
                >
                  {group.name}
                </div>
              ))}
            </div>
            <div className="gba:w-48"></div>{" "}
            {/* Empty space for salary range column */}
          </div>
        </div>
      </Card>
    </div>
  );
};

export { PayGradesTab };
