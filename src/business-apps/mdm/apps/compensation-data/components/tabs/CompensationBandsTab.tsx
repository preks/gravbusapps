import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Table,
  Button,
  Input,
  Space,
  Typography,
  message,
  Modal,
  Spin,
  Alert,
  Descriptions,
  Tag,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  DollarCircleOutlined,
} from "@ant-design/icons";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useUserLocale } from "@/common/locale/useUserLocale";
import { useCompensationDataIntegration } from "../../hooks/useCompensationDataIntegration";
import { DataDetailsDrawer } from "@/components/data-details/DataDetailsDrawer";
import { PayGrade } from "./PayGradesTab";
import { startProcess } from "@/common/utils/start-process";

const { Title } = Typography;

export interface CompensationBandsTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const currencies = [
  { value: "EUR", label: "Euro (EUR)" },
  { value: "USD", label: "US Dollar (USD)" },
  { value: "GBP", label: "British Pound (GBP)" },
  { value: "CHF", label: "Swiss Franc (CHF)" },
];

const CompensationBandsTab: React.FC<CompensationBandsTabProps> = (context) => {
  const { t } = useTranslation();
  const { prefixDataTestId, userInfo } = context;
  const userLocale = useUserLocale() ?? "en-US";

  // Use real data integration
  const { payGrades, isLoading, error, refetch } =
    useCompensationDataIntegration(context);
  const [selectedBand, setSelectedBand] = useState<PayGrade | null>(null);
  const [drawerVisible, setDrawerVisible] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingBand, setEditingBand] = useState<PayGrade | null>(null);

  const filteredBands = payGrades.filter(
    (band) =>
      band.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      band.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

    return new Intl.NumberFormat(userLocale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleAdd = () => {
    startProcess({
      domain: "dummy-domain",
      processName: "changeCompensationBand",
      payload: {
        employeeId: userInfo?.employeeDetails.employeeId,
      },
      builderType: "NATIVE_SCREEN",
    });
  };

  const handleRowClick = (record: PayGrade) => {
    setSelectedBand(record);
    setDrawerVisible(true);
  };

  const handleDrawerClose = () => {
    setDrawerVisible(false);
    setSelectedBand(null);
  };

  const handleEdit = (record: PayGrade) => {
    setEditingBand(record);
    // Just set the state for the drawer, no process needed
  };
  
  const handleDrawerEdit = (record: PayGrade) => {
    // When editing from drawer button, start the process
    startProcess({
      domain: "dummy-domain",
      processName: "changeCompensationBand",
      payload: {
        employeeId: userInfo?.employeeDetails.employeeId,
        compensationBand: record,
      },
      builderType: "NATIVE_SCREEN",
    });
  };

  const handleDelete = async (record: PayGrade) => {
    Modal.confirm({
      title: "Delete Compensation Band",
      content: `Are you sure you want to delete "${record.name}"?`,
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        // TODO: Implement API call to delete compensation band
        message.warning(
          "Delete functionality will be implemented with process API integration"
        );
        // Optionally refetch data
        await refetch();
      },
    });
  };

  if (isLoading) {
    return (
      <div
        data-testid={`${prefixDataTestId}-CompensationBandsTab`}
        className="gba:flex gba:justify-center gba:items-center gba:h-64"
      >
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        data-testid={`${prefixDataTestId}-CompensationBandsTab`}
        className="gba:p-4"
      >
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

  const columns = [
    {
      title: "Code",
      dataIndex: "code",
      key: "code",
      width: 100,
      sorter: (a: PayGrade, b: PayGrade) =>
        (a.code || "").localeCompare(b.code || ""),
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      sorter: (a: PayGrade, b: PayGrade) => a.name.localeCompare(b.name),
    },
    {
      title: "Minimum Salary",
      key: "minSalary",
      width: 150,
      render: (_: any, record: PayGrade) =>
        formatCurrency(record.minSalary, record.currency),
      sorter: (a: PayGrade, b: PayGrade) => a.minSalary - b.minSalary,
    },
    {
      title: "Standard Salary",
      key: "standardSalary",
      width: 150,
      render: (_: any, record: PayGrade) => (
        <span className="gba:font-medium">
          {formatCurrency(record.standardSalary, record.currency)}
        </span>
      ),
      sorter: (a: PayGrade, b: PayGrade) => a.standardSalary - b.standardSalary,
    },
    {
      title: "Maximum Salary",
      key: "maxSalary",
      width: 150,
      render: (_: any, record: PayGrade) =>
        formatCurrency(record.maxSalary, record.currency),
      sorter: (a: PayGrade, b: PayGrade) => a.maxSalary - b.maxSalary,
    },
    {
      title: "Range",
      key: "range",
      width: 150,
      render: (_: any, record: PayGrade) =>
        formatCurrency(record.maxSalary - record.minSalary, record.currency),
      sorter: (a: PayGrade, b: PayGrade) =>
        a.maxSalary - a.minSalary - (b.maxSalary - b.minSalary),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_: any, record: PayGrade) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          />
          <Button
            type="text"
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
            size="small"
            danger
          />
        </Space>
      ),
    },
  ];

  return (
    <div
      data-testid={`${prefixDataTestId || ""}-CompensationBandsTab`}
      className="gba:p-6"
    >
      <div className="gba:mb-6">
        <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
          <div>
            <Title level={2} className="gba:mb-2">
              Compensation Bands
            </Title>
            <p className="gba:text-gray-600">
              Manage compensation bands and salary ranges for different pay
              grades
            </p>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            data-testid={`${
              prefixDataTestId || ""
            }-CompensationBandsTab-AddButton`}
          >
            Add Compensation Band
          </Button>
        </div>

        <Input
          placeholder="Search compensation bands..."
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: "300px" }}
          allowClear
          data-testid={`${
            prefixDataTestId || ""
          }-CompensationBandsTab-SearchInput`}
        />
      </div>

      <Table
        columns={columns}
        dataSource={filteredBands}
        rowKey="id"
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
        })}
        className="gba:cursor-pointer"
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} of ${total} compensation bands`,
        }}
        data-testid={`${prefixDataTestId || ""}-CompensationBandsTab-Table`}
      />

      {/* Compensation Band Details Drawer */}
      <DataDetailsDrawer
        title="Compensation Band Details"
        icon={<DollarCircleOutlined />}
        open={drawerVisible}
        onClose={handleDrawerClose}
        width={500}
        placement="right"
        dataTestId={`${
          prefixDataTestId || ""
        }-CompensationBandsTab-DetailsDrawer`}
        footer={
          <div className="gba:flex gba:justify-end gba:gap-2">
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => {
                handleDrawerClose();
                if (selectedBand) {
                  handleDrawerEdit(selectedBand);
                }
              }}
            >
              Edit
            </Button>
          </div>
        }
      >
        {selectedBand && (
          <div className="gba:space-y-6">
            {/* Basic Information */}
            <Descriptions
              title="Basic Information"
              bordered
              column={1}
              size="small"
            >
              <Descriptions.Item label="Name">
                {selectedBand.name || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Code">
                {selectedBand.code || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Pay Grade">
                {selectedBand.payGrade !== undefined
                  ? selectedBand.payGrade
                  : "-"}
              </Descriptions.Item>
            </Descriptions>

            {/* Salary Information */}
            <Descriptions
              title="Salary Information"
              bordered
              column={1}
              size="small"
            >
              <Descriptions.Item label="Currency">
                {typeof selectedBand.currency === "string"
                  ? selectedBand.currency
                  : selectedBand.currency?.value ||
                    selectedBand.currency?.id ||
                    "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Minimum Salary">
                <span className="gba:text-green-600 gba:font-medium">
                  {formatCurrency(
                    selectedBand.minSalary,
                    selectedBand.currency
                  )}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Standard Salary">
                <span className="gba:text-blue-600 gba:font-semibold">
                  {formatCurrency(
                    selectedBand.standardSalary,
                    selectedBand.currency
                  )}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Maximum Salary">
                <span className="gba:text-red-600 gba:font-medium">
                  {formatCurrency(
                    selectedBand.maxSalary,
                    selectedBand.currency
                  )}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Salary Range">
                <span className="gba:text-purple-600 gba:font-medium">
                  {formatCurrency(
                    selectedBand.maxSalary - selectedBand.minSalary,
                    selectedBand.currency
                  )}
                </span>
              </Descriptions.Item>
            </Descriptions>

            {/* Translations Section - if available */}
            {selectedBand.nameI18n &&
              Object.keys(selectedBand.nameI18n || {}).length > 0 && (
                <Descriptions
                  title="Name Translations"
                  bordered
                  column={1}
                  size="small"
                >
                  {Object.entries(selectedBand.nameI18n || {}).map(
                    ([locale, translation]) => (
                      <Descriptions.Item key={locale} label={locale}>
                        {translation || "-"}
                      </Descriptions.Item>
                    )
                  )}
                </Descriptions>
              )}

            {selectedBand.descriptionI18n &&
              Object.keys(selectedBand.descriptionI18n || {}).length > 0 && (
                <Descriptions
                  title="Description Translations"
                  bordered
                  column={1}
                  size="small"
                >
                  {Object.entries(selectedBand.descriptionI18n || {}).map(
                    ([locale, translation]) => (
                      <Descriptions.Item key={locale} label={locale}>
                        {translation || "-"}
                      </Descriptions.Item>
                    )
                  )}
                </Descriptions>
              )}

            {/* Additional Details */}
            {selectedBand.description && (
              <Descriptions
                title="Description"
                bordered
                column={1}
                size="small"
              >
                <Descriptions.Item label="Description">
                  {selectedBand.description || "-"}
                </Descriptions.Item>
              </Descriptions>
            )}

            {/* Technical Information */}
            <Descriptions
              title="System Information"
              bordered
              column={1}
              size="small"
            >
              <Descriptions.Item label="ID">
                {selectedBand.id}
              </Descriptions.Item>
              <Descriptions.Item label="Version">
                {selectedBand.version !== undefined
                  ? selectedBand.version
                  : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Currency Reference">
                {selectedBand.currencyRef || "-"}
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </DataDetailsDrawer>
    </div>
  );
};

export { CompensationBandsTab };
