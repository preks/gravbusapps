import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Table,
  Button,
  Space,
  Typography,
  message,
  Modal,
  Tag,
  Spin,
  Alert,
  Tooltip,
  Empty,
  Input,
  Descriptions,
  Card,
  List,
  Avatar,
} from "antd";
import { startProcess } from "@/common/utils/start-process";
import { DataDetailsDrawer } from "@/components/data-details/DataDetailsDrawer";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  BankOutlined,
  UserOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  DownOutlined,
  RightOutlined,
  InfoCircleOutlined,
  DollarOutlined,
  BuildOutlined,
  ApartmentOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useCostCenters } from "../../hooks";
import {
  CostCenter,
  CostCenterEmployee,
  CostCenterOrganizationalUnit,
} from "../../types";

const { Title, Text } = Typography;

export interface CostCentersTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const CostCentersTab: React.FC<CostCentersTabProps> = (context) => {
  const { t } = useTranslation();
  const { prefixDataTestId, userInfo } = context;

  const {
    costCenters,
    isLoading,
    error,
    refetch,
    totalCostCenters,
    activeCostCenters,
    costCentersWithLocation,
    totalEmployeeCount,
  } = useCostCenters(context);

  const [searchTerm, setSearchTerm] = useState("");
  const [editingCostCenter, setEditingCostCenter] = useState<CostCenter | null>(
    null
  );
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedCostCenter, setSelectedCostCenter] =
    useState<CostCenter | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const filteredCostCenters = costCenters.filter(
    (costCenter) =>
      costCenter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      costCenter.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      costCenter.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (costCenter.siteLocationName &&
        costCenter.siteLocationName
          .toLowerCase()
          .includes(searchTerm.toLowerCase()))
  );

  const handleAdd = () => {
    startProcess({
      domain: "dummy-domain",
      processName: "changeCostCenter",
      payload: {
        employeeId: userInfo?.employeeDetails.employeeId,
      },
      builderType: "NATIVE_SCREEN",
    });
  };

  const handleEdit = (record: CostCenter) => {
    // When edit is triggered from the row, just set the selected cost center and show the drawer
    setSelectedCostCenter(record);
    setDrawerVisible(true);
  };
  
  const handleDrawerEdit = (record: CostCenter) => {
    // When edit is triggered from inside the drawer, start the process
    startProcess({
      domain: "dummy-domain",
      processName: "changeCostCenter",
      payload: {
        employeeId: userInfo?.employeeDetails.employeeId,
        costCenter: record,
      },
      builderType: "NATIVE_SCREEN",
    });
  };

  const handleRowClick = useCallback((record: CostCenter) => {
    setSelectedCostCenter(record);
    setDrawerVisible(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerVisible(false);
    setTimeout(() => {
      setSelectedCostCenter(null);
    }, 300); // Clear selected cost center after drawer close animation completes
  }, []);

  const handleDelete = (record: CostCenter) => {
    Modal.confirm({
      title: "Delete Cost Center",
      content: `Are you sure you want to delete "${record.name}"?`,
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        message.warning(
          "Delete functionality will be implemented with process API integration"
        );
        await refetch();
      },
    });
  };

  const handleExpandRow = (costCenterId: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(costCenterId)) {
      newExpandedRows.delete(costCenterId);
    } else {
      newExpandedRows.add(costCenterId);
    }
    setExpandedRows(newExpandedRows);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "green";
      case "Inactive":
        return "red";
      default:
        return "default";
    }
  };

  const renderEmployeeList = (employees: CostCenterEmployee[]) => {
    if (employees.length === 0) {
      return <Empty description="No employees assigned" />;
    }

    return (
      <div className="gba:space-y-2">
        {employees.map((employee, index) => (
          <div
            key={`${employee.employeeId}-${index}`}
            className="gba:flex gba:items-center gba:space-x-3 gba:p-2 gba:bg-gray-50 gba:rounded"
          >
            <UserOutlined className="gba:text-blue-500" />
            <div className="gba:flex-1">
              <Text strong>
                {employee.employeeFirstName} {employee.employeeLastName}
              </Text>
              <div className="gba:text-sm gba:text-gray-600">
                ID: {employee.employeeId}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderOrganizationalUnitList = (
    orgUnits: CostCenterOrganizationalUnit[]
  ) => {
    if (orgUnits.length === 0) {
      return <Empty description="No organizational units assigned" />;
    }

    return (
      <div className="gba:space-y-2">
        {orgUnits.map((orgUnit) => (
          <div
            key={orgUnit.organizationalUnitId}
            className="gba:flex gba:items-center gba:space-x-3 gba:p-2 gba:bg-gray-50 gba:rounded"
          >
            <TeamOutlined className="gba:text-purple-500" />
            <div className="gba:flex-1">
              <Text strong>{orgUnit.organizationalUnitName}</Text>
              <div className="gba:text-sm gba:text-gray-600">
                ID: {orgUnit.organizationalUnitId}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const columns: ColumnsType<CostCenter> = [
    {
      title: "",
      key: "expand",
      width: 40,
      render: (_, record) => (
        <Button
          type="text"
          size="small"
          icon={
            expandedRows.has(record.id) ? <DownOutlined /> : <RightOutlined />
          }
          onClick={() => handleExpandRow(record.id)}
          data-testid={`${prefixDataTestId}-expand-${record.id}`}
        />
      ),
    },
    {
      title: "Cost Center",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text: string, record: CostCenter) => (
        <div className="gba:flex gba:items-center gba:space-x-3">
          <BankOutlined className="gba:text-green-500" />
          <div>
            <Text strong className="gba:text-base">
              {text}
            </Text>
            <Tag color="blue" className="gba:ml-2 gba:text-xs">
              {record.code}
            </Tag>
            {record.description && (
              <div className="gba:text-sm gba:text-gray-600 gba:mt-1">
                <Tooltip title={record.description}>
                  <Text ellipsis style={{ maxWidth: 200 }}>
                    {record.description}
                  </Text>
                </Tooltip>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Location",
      key: "location",
      render: (_, record: CostCenter) => (
        <div className="gba:space-y-1">
          {record.siteLocationName ? (
            <div className="gba:flex gba:items-center gba:space-x-2">
              <EnvironmentOutlined className="gba:text-green-500" />
              <Text>{record.siteLocationName}</Text>
            </div>
          ) : (
            <Text type="secondary" italic>
              No location assigned
            </Text>
          )}
        </div>
      ),
    },
    {
      title: "Statistics",
      key: "statistics",
      render: (_, record: CostCenter) => (
        <div className="gba:flex gba:flex-col gba:space-y-1">
          <Tag color="blue" icon={<UserOutlined />}>
            {record.employeeCount} employees
          </Tag>
          <Tag color="purple" icon={<TeamOutlined />}>
            {record.organizationalUnitCount} org units
          </Tag>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      filters: [
        { text: "Active", value: "Active" },
        { text: "Inactive", value: "Inactive" },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_, record: CostCenter) => (
        <Space size="small">
          <Tooltip title="Edit Cost Center">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              data-testid={`${prefixDataTestId}-edit-${record.id}`}
            />
          </Tooltip>
          <Tooltip title="Delete Cost Center">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
              data-testid={`${prefixDataTestId}-delete-${record.id}`}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error Loading Cost Centers"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={refetch}>
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <div
      data-testid={`${prefixDataTestId || ""}-CostCentersTab`}
      style={{
        background: "linear-gradient(to bottom, #f9fafb, #f3f4f6)",
        minHeight: "100%",
        padding: "24px",
        borderRadius: "8px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Title level={4} style={{ margin: 0, color: "#1f2937" }}>
            Cost Centers
          </Title>
          <Tag color="blue">{totalCostCenters} cost centers</Tag>
          <Tag color="green">{activeCostCenters} active</Tag>
          <Tag color="orange">{costCentersWithLocation} with location</Tag>
          <Tag color="purple">{totalEmployeeCount} total employees</Tag>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          data-testid={`${prefixDataTestId || ""}-CostCentersTab-AddButton`}
        >
          Add Cost Center
        </Button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: "16px" }}>
        <Input
          placeholder={t("hr.search_cost_centers", "Search cost centers...")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          prefix={<BankOutlined />}
          style={{ width: 300 }}
          allowClear
          data-testid={`${prefixDataTestId || ""}-CostCentersTab-SearchInput`}
        />
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={filteredCostCenters}
        rowKey="id"
        loading={isLoading}
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: { cursor: "pointer" },
        })}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} of ${total} cost centers`,
        }}
        expandable={{
          expandedRowKeys: Array.from(expandedRows),
          onExpand: (expanded, record) => handleExpandRow(record.id),
          expandRowByClick: false,
          expandedRowRender: (record) => (
            <div style={{ padding: "16px", backgroundColor: "#f8f9fa" }}>
              <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-6">
                <div>
                  <Title
                    level={5}
                    className="gba:flex gba:items-center gba:gap-2"
                  >
                    <UserOutlined className="gba:text-blue-500" />
                    Employees ({record.employeeCount})
                  </Title>
                  {renderEmployeeList(record.employees)}
                </div>
                <div>
                  <Title
                    level={5}
                    className="gba:flex gba:items-center gba:gap-2"
                  >
                    <TeamOutlined className="gba:text-purple-500" />
                    Organizational Units ({record.organizationalUnitCount})
                  </Title>
                  {renderOrganizationalUnitList(record.organizationalUnits)}
                </div>
              </div>
              {record.additionalProperties &&
                Object.keys(record.additionalProperties).length > 0 && (
                  <div className="gba:mt-4">
                    <Title level={5}>Additional Properties</Title>
                    <div className="gba:bg-gray-50 gba:p-3 gba:rounded">
                      <pre className="gba:text-sm gba:text-gray-700">
                        {JSON.stringify(record.additionalProperties, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
            </div>
          ),
        }}
        data-testid={`${prefixDataTestId || ""}-CostCentersTab-Table`}
        style={{
          background: "white",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      />

      {/* Cost Center Details Drawer */}
      <DataDetailsDrawer
        title="Cost Center Details"
        icon={<BankOutlined className="gba:text-green-500" />}
        placement="right"
        onClose={handleCloseDrawer}
        open={drawerVisible}
        width={450}
        dataTestId={`${prefixDataTestId || ""}-CostCentersTab-Drawer`}
        className="gba:text-base"
      >
        {selectedCostCenter && (
          <div className="gba:space-y-6">
            {/* Basic Information */}
            <Card
              title={
                <span className="gba:flex gba:items-center gba:gap-2">
                  <InfoCircleOutlined /> Basic Information
                </span>
              }
              className="gba:shadow-sm"
            >
              <Descriptions column={1} size="small" layout="vertical">
                <Descriptions.Item label="Name">
                  <div className="gba:flex gba:items-center gba:space-x-2">
                    <Text strong className="gba:text-lg">
                      {selectedCostCenter.name || "-"}
                    </Text>
                  </div>
                </Descriptions.Item>

                <Descriptions.Item label="Code">
                  <Tag color="blue">{selectedCostCenter.code || "-"}</Tag>
                </Descriptions.Item>

                <Descriptions.Item label="Description">
                  {selectedCostCenter.description || "-"}
                </Descriptions.Item>

                <Descriptions.Item label="Status">
                  <Tag
                    color={
                      selectedCostCenter.status === "Active" ? "green" : "red"
                    }
                  >
                    {selectedCostCenter.status || "Unknown"}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Location Information */}
            <Card
              title={
                <span className="gba:flex gba:items-center gba:gap-2">
                  <EnvironmentOutlined /> Location Information
                </span>
              }
              className="gba:shadow-sm"
            >
              {selectedCostCenter.siteLocationId ? (
                <div className="gba:space-y-3">
                  <div>
                    <div className="gba:text-sm gba:text-gray-500">
                      Site Location
                    </div>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Text strong>
                        {selectedCostCenter.siteLocationName || "-"}
                      </Text>
                    </div>
                  </div>

                  <div>
                    <div className="gba:text-sm gba:text-gray-500">
                      Site Location ID
                    </div>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Text copyable>{selectedCostCenter.siteLocationId}</Text>
                    </div>
                  </div>
                </div>
              ) : (
                <Empty description="No location assigned" />
              )}
            </Card>

            {/* Statistics */}
            <Card
              title={
                <span className="gba:flex gba:items-center gba:gap-2">
                  <DollarOutlined /> Statistics
                </span>
              }
              className="gba:shadow-sm"
            >
              <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                <div>
                  <div className="gba:text-sm gba:text-gray-500">Employees</div>
                  <div className="gba:flex gba:items-center gba:gap-2 gba:text-lg">
                    <UserOutlined className="gba:text-blue-500" />
                    <Text strong>{selectedCostCenter.employeeCount}</Text>
                  </div>
                </div>

                <div>
                  <div className="gba:text-sm gba:text-gray-500">Org Units</div>
                  <div className="gba:flex gba:items-center gba:gap-2 gba:text-lg">
                    <TeamOutlined className="gba:text-purple-500" />
                    <Text strong>
                      {selectedCostCenter.organizationalUnitCount}
                    </Text>
                  </div>
                </div>
              </div>
            </Card>

            {/* Employees */}
            {selectedCostCenter.employees &&
              selectedCostCenter.employees.length > 0 && (
                <Card
                  title={
                    <span className="gba:flex gba:items-center gba:gap-2">
                      <UserOutlined /> Employees
                    </span>
                  }
                  className="gba:shadow-sm"
                >
                  <List
                    dataSource={selectedCostCenter.employees.slice(0, 5)}
                    renderItem={(employee) => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={<Avatar icon={<UserOutlined />} />}
                          title={`${employee.employeeFirstName} ${employee.employeeLastName}`}
                          description={`ID: ${employee.employeeId}`}
                        />
                      </List.Item>
                    )}
                    footer={
                      selectedCostCenter.employeeCount > 5 && (
                        <div className="gba:text-center gba:text-sm gba:text-gray-500 gba:mt-2">
                          + {selectedCostCenter.employeeCount - 5} more
                          employees
                        </div>
                      )
                    }
                  />
                </Card>
              )}

            {/* Organizational Units */}
            {selectedCostCenter.organizationalUnits &&
              selectedCostCenter.organizationalUnits.length > 0 && (
                <Card
                  title={
                    <span className="gba:flex gba:items-center gba:gap-2">
                      <TeamOutlined /> Organizational Units
                    </span>
                  }
                  className="gba:shadow-sm"
                >
                  <List
                    dataSource={selectedCostCenter.organizationalUnits.slice(
                      0,
                      5
                    )}
                    renderItem={(orgUnit) => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={
                            <Avatar
                              icon={<TeamOutlined />}
                              style={{ backgroundColor: "#722ED1" }}
                            />
                          }
                          title={orgUnit.organizationalUnitName}
                          description={`ID: ${orgUnit.organizationalUnitId}`}
                        />
                      </List.Item>
                    )}
                    footer={
                      selectedCostCenter.organizationalUnitCount > 5 && (
                        <div className="gba:text-center gba:text-sm gba:text-gray-500 gba:mt-2">
                          + {selectedCostCenter.organizationalUnitCount - 5}{" "}
                          more organizational units
                        </div>
                      )
                    }
                  />
                </Card>
              )}

            {/* Technical Information */}
            <Card
              title={
                <span className="gba:flex gba:items-center gba:gap-2">
                  <BuildOutlined /> Technical Information
                </span>
              }
              className="gba:shadow-sm"
            >
              <div className="gba:space-y-3">
                <div>
                  <div className="gba:text-sm gba:text-gray-500">
                    Cost Center ID
                  </div>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Text copyable>{selectedCostCenter.id}</Text>
                  </div>
                </div>

                <div>
                  <div className="gba:text-sm gba:text-gray-500">
                    Structure ID
                  </div>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Text copyable>{selectedCostCenter.structureId}</Text>
                  </div>
                </div>

                {selectedCostCenter.rankInLayer && (
                  <div>
                    <div className="gba:text-sm gba:text-gray-500">
                      Rank in Layer
                    </div>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Tag color="blue">{selectedCostCenter.rankInLayer}</Tag>
                    </div>
                  </div>
                )}

                {selectedCostCenter.layer && (
                  <div>
                    <div className="gba:text-sm gba:text-gray-500">Layer</div>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <ApartmentOutlined className="gba:text-blue-500" />
                      <Text>{selectedCostCenter.layer}</Text>
                    </div>
                  </div>
                )}

                {selectedCostCenter.groupId && (
                  <div>
                    <div className="gba:text-sm gba:text-gray-500">
                      Group ID
                    </div>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Text copyable>{selectedCostCenter.groupId}</Text>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="gba:flex gba:gap-2">
              <Button
                icon={<EditOutlined />}
                onClick={() => {
                  handleCloseDrawer();
                  if (selectedCostCenter) {
                    handleDrawerEdit(selectedCostCenter);
                  }
                }}
                data-testid={`${
                  prefixDataTestId || ""
                }-CostCentersTab-EditButton`}
              >
                Edit
              </Button>
              <Button
                icon={<DeleteOutlined />}
                danger
                onClick={() => {
                  handleCloseDrawer();
                  handleDelete(selectedCostCenter);
                }}
                data-testid={`${
                  prefixDataTestId || ""
                }-CostCentersTab-DeleteButton`}
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </DataDetailsDrawer>
    </div>
  );
};

export default CostCentersTab;
export { CostCentersTab };
