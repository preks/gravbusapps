import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Table,
  Button,
  Input,
  Space,
  Typography,
  message,
  Modal,
  Form,
  Spin,
  Tag,
  Divider,
  Descriptions,
} from "antd";
import { DataDetailsDrawer } from "@/components/data-details/DataDetailsDrawer";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  FileTextOutlined,
  CodeOutlined,
  GlobalOutlined,
  TagOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useCatalogManagerClient } from "@/common/network/catalogs/useCatalogManagerClient";
import { useUserLocale } from "@/common/locale/useUserLocale";
import { startProcess } from "@/common/utils/start-process";

const { Title } = Typography;

export interface ContractType {
  id: string;
  code: string;
  value: string;
  alternativeCode?: string;
  additionalValue1?: string;
  additionalValue2?: string;
  additionalValue3?: string;
  translations: Array<{
    localeCode: string;
    value: string;
  }>;
}

export interface ContractTypesTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const ContractTypesTab: React.FC<ContractTypesTabProps> = ({
  accessToken,
  prefixDataTestId,
  userInfo,
}) => {
  const { t } = useTranslation();
  const userLocale = useUserLocale() ?? "en-US";
  const catalogClient = useCatalogManagerClient(accessToken);

  const [contractTypes, setContractTypes] = useState<ContractType[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingType, setEditingType] = useState<ContractType | null>(null);
  const [selectedType, setSelectedType] = useState<ContractType | null>(null);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [form] = Form.useForm();

  const fetchContractTypes = async () => {
    try {
      setLoading(true);
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: "ContractType",
          version: "v1",
        },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          localeCode: userLocale,
          ...(searchTerm ? { searchCriteria: searchTerm } : {}),
        }
      );

      if (response.data) {
        const types: ContractType[] = response.data.map((entry: any) => ({
          id: entry.id,
          code: entry.code,
          value: entry.value,
          alternativeCode: entry.alternativeCode,
          additionalValue1: entry.additionalValue1,
          additionalValue2: entry.additionalValue2,
          additionalValue3: entry.additionalValue3,
          translations: entry.translations || [],
        }));
        setContractTypes(types);
      }
    } catch (error) {
      console.error("Error fetching contract types:", error);
      message.error("Failed to load contract types");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContractTypes();
  }, [searchTerm, userLocale]);

  const handleAdd = () => {
    setEditingType(null);
    startProcess({
      domain: "dummy-domain",
      processName: "changeContractType",
      payload: {
        employeeId: userInfo?.employeeDetails.employeeId,
      },
      builderType: "NATIVE_SCREEN",
    });
  };

  const handleEdit = (record: ContractType) => {
    setEditingType(record);
    // Just set the state for the drawer, no process needed
  };

  const handleDrawerEdit = (record: ContractType) => {
    // When editing from drawer button, start the process
    startProcess({
      domain: "dummy-domain",
      processName: "changeContractType",
      payload: {
        employeeId: userInfo?.employeeDetails.employeeId,
        contractType: record,
      },
      builderType: "NATIVE_SCREEN",
    });
  };

  const handleDelete = async (record: ContractType) => {
    Modal.confirm({
      title: "Delete Contract Type",
      content: `Are you sure you want to delete "${record.value}"?`,
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          // Note: Actual delete implementation would depend on the catalog API
          message.success("Contract type deleted successfully");
          fetchContractTypes();
        } catch (error) {
          console.error("Error deleting contract type:", error);
          message.error("Failed to delete contract type");
        }
      },
    });
  };

  const handleViewDetails = (record: ContractType) => {
    setSelectedType(record);
    setIsDrawerVisible(true);
  };

  const handleDrawerClose = () => {
    setIsDrawerVisible(false);
    setSelectedType(null);
  };

  const columns = [
    {
      title: "Code",
      dataIndex: "code",
      key: "code",
      width: 120,
      sorter: (a: ContractType, b: ContractType) =>
        a.code.localeCompare(b.code),
    },
    {
      title: "Name",
      dataIndex: "value",
      key: "value",
      sorter: (a: ContractType, b: ContractType) =>
        a.value.localeCompare(b.value),
    },
    {
      title: "Alternative Code",
      dataIndex: "alternativeCode",
      key: "alternativeCode",
      width: 150,
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_: any, record: ContractType) => (
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
      data-testid={`${prefixDataTestId || ""}-ContractTypesTab`}
      style={{
        background: "linear-gradient(to bottom, #f9fafb, #f3f4f6)",
        minHeight: "100%",
        padding: "24px",
      }}
    >
      <div style={{ marginBottom: "24px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <Title level={3} style={{ margin: 0 }}>
            {t("hr.contract_types", "Contract Types")}
          </Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            data-testid={`${prefixDataTestId || ""}-ContractTypesTab-AddButton`}
          >
            Add Contract Type
          </Button>
        </div>

        <Input
          placeholder="Search contract types..."
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: "300px" }}
          allowClear
          data-testid={`${prefixDataTestId || ""}-ContractTypesTab-SearchInput`}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <Spin size="large" />
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={contractTypes}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} contract types`,
          }}
          data-testid={`${prefixDataTestId || ""}-ContractTypesTab-Table`}
          style={{ background: "white", borderRadius: "8px" }}
          onRow={(record) => ({
            onClick: () => handleViewDetails(record),
            className: "gba:cursor-pointer",
            "data-testid": `${
              prefixDataTestId || ""
            }-ContractTypesTab-TableRow-${record.id}`,
          })}
        />
      )}

      <DataDetailsDrawer
        title="Contract Type Details"
        icon={<FileTextOutlined />}
        open={isDrawerVisible}
        onClose={handleDrawerClose}
        width={600}
        placement="right"
        dataTestId={`${prefixDataTestId || ""}-ContractTypesTab-Drawer`}
        footer={
          <div className="gba:flex gba:justify-end gba:gap-2">
            {selectedType && (
              <Button
                icon={<EditOutlined />}
                onClick={() => {
                  handleDrawerEdit(selectedType);
                  handleDrawerClose();
                }}
              >
                Edit
              </Button>
            )}
            <Button onClick={handleDrawerClose}>Close</Button>
          </div>
        }
      >
        {selectedType && (
          <div className="gba:space-y-6">
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex-1">
                <h3 className="gba:text-lg gba:font-semibold gba:mb-1">
                  {selectedType.value}
                </h3>
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Tag color="blue" className="gba:px-2">
                    <CodeOutlined /> {selectedType.code || "-"}
                  </Tag>
                  {selectedType.alternativeCode && (
                    <Tag color="green" className="gba:px-2">
                      Alt: {selectedType.alternativeCode}
                    </Tag>
                  )}
                </div>
              </div>
            </div>

            <Divider className="gba:my-3" />

            <Descriptions
              title="Basic Information"
              bordered
              size="small"
              column={1}
            >
              <Descriptions.Item label="ID">
                <span className="gba:text-gray-600 gba:font-mono gba:text-xs">
                  {selectedType.id}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Code">
                <Tag color="blue" icon={<CodeOutlined />}>
                  {selectedType.code || "-"}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Value">
                {selectedType.value || "-"}
              </Descriptions.Item>
              {selectedType.alternativeCode && (
                <Descriptions.Item label="Alternative Code">
                  {selectedType.alternativeCode}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Descriptions
              title="Additional Values"
              bordered
              size="small"
              column={1}
            >
              <Descriptions.Item label="Additional Value 1">
                {selectedType.additionalValue1 ? (
                  <Tag
                    color="purple"
                    icon={<DollarOutlined />}
                    className="gba:px-2"
                  >
                    {selectedType.additionalValue1}
                  </Tag>
                ) : (
                  "-"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Additional Value 2">
                {selectedType.additionalValue2 || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Additional Value 3">
                {selectedType.additionalValue3 || "-"}
              </Descriptions.Item>
            </Descriptions>

            {selectedType.translations?.length > 0 && (
              <Descriptions
                title="Translations"
                bordered
                size="small"
                column={1}
              >
                {selectedType.translations.map((translation, index) => (
                  <Descriptions.Item
                    key={index}
                    label={
                      <span>
                        <GlobalOutlined /> {translation.localeCode}
                      </span>
                    }
                  >
                    {translation.value}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            )}

            <div className="gba:bg-gray-50 gba:rounded-md gba:p-4 gba:mt-4">
              <p className="gba:text-xs gba:text-gray-500 gba:mb-0">
                <TagOutlined className="gba:mr-1" /> This contract type can be
                used to classify employees and job positions.
              </p>
            </div>
          </div>
        )}
      </DataDetailsDrawer>
    </div>
  );
};

export { ContractTypesTab };
